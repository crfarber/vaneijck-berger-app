/**
 * Payload adapters for submitting a service-form phase to the CRM.
 *
 * Pure functions that turn the form's `answers` into the two request shapes the API expects:
 *  - `servicePostBody` — the plain CRM field/value map sent to `PUT /api/services/{id}`.
 *  - `SignatureDataInput` — the fixed 5-key signature shape sent to the signature upload endpoint.
 *
 * The coercion rules are ported from the legacy `ProcessingService.PostAllDataToServer()`
 * (docs/legacy.md), kept field-for-field compatible with what CRM expects, but keyed by the form's
 * stable `field.key` instead of tab/array indices. One legacy bug is intentionally NOT reproduced:
 * `hideSignature`/`noEmailConfirmation` there were indexed inconsistently (tab index in the submit
 * loop vs. field index everywhere else). Here both are keyed by `field.key`, correct by
 * construction.
 */
import { SERVICE_STATUS } from '@/domeinen/services';
import { isLastServiceFormPhase } from './form-context';
import { isSignatureKey, type SignatureDataInput } from './signature';
import type { ServiceFormAnswer, ServiceFormAnswers, ServiceFormField } from './types';

export { isSignatureKey };

/** The signature field that represents the sending party's signature. */
const SENDER_SIGNATURE_KEY = 'signature_sender' as const;
/** Signature fields that represent the receiving party's signature. */
const RECEIVER_SIGNATURE_KEYS = ['signature_receiver', 'signature_addressee'] as const;

/**
 * An answer counts as "empty" (and is skipped during submission) when it has never been filled
 * in, or still shows the localized "please select" placeholder. Mirrors legacy's
 * `!name || name === PleaseSelect` check.
 */
export function isAnswerEmpty(
  answer: ServiceFormAnswer | undefined,
  pleaseSelectLabel: string,
): boolean {
  if (!answer) {
    return true;
  }
  const { displayValue } = answer;
  return (
    displayValue === undefined ||
    displayValue === null ||
    displayValue === '' ||
    displayValue === pleaseSelectLabel
  );
}

/**
 * Legacy yes/no toggles store CRM option codes, not raw booleans — except for `dn_truefalse`,
 * where Dynamics accepts actual booleans. This normalizes any stale boolean answers before
 * submit.
 */
export function coerceBooleanSelectSubmissionValue(
  field: ServiceFormField,
  value: unknown,
): unknown {
  if (typeof value !== 'boolean') {
    return value;
  }

  if (field.table === 'dn_truefalse') {
    return value;
  }

  if (field.table?.includes('optionalyesno')) {
    return value ? 1 : 0;
  }

  return value;
}

/**
 * Coerces a single (non-signature) field's answer into the value CRM expects, replicating
 * legacy's type-coercion quirks exactly:
 * - `dn_numberofkilometers` is always sent as a `Number` of the display value.
 * - Non-`select` fields: prefer the raw `value` when it already matches the display value;
 *   otherwise send a numeric `displayValue` if `value` looks like a numeric string, else fall
 *   back to the display value as-is.
 * - `select` fields always send the raw `value` (the chosen option's id/code).
 * - When there is no `value` at all (falsy, and not explicitly `false`/`0`): `decimal` fields are
 *   coerced to `Number`, everything else sends the display value as-is.
 */
export function coerceFieldValue(field: ServiceFormField, answer: ServiceFormAnswer): unknown {
  const { value, displayValue } = answer;
  const type = field.type.toLowerCase();
  const hasValue = value === false || value === 0 || Boolean(value);

  if (hasValue) {
    if (field.key === 'dn_numberofkilometers') {
      return Number(displayValue);
    }
    if (type !== 'select') {
      if (displayValue === value) {
        return value;
      }
      const looksNumeric = /^\d+$/.test(String(value));
      return looksNumeric ? Number(displayValue) : displayValue;
    }
    return coerceBooleanSelectSubmissionValue(field, value);
  }

  return type === 'decimal' ? Number(displayValue) : displayValue;
}

/**
 * Computes the `dn_absent_*` CRM flags for signature fields the user marked as unavailable via
 * the "not available" toggle, or where only the email confirmation was skipped.
 * `signature_executor`/`signature_tower` (the driver's own signature) have no absent-flag
 * equivalent — the driver is always present.
 */
export function resolveSignatureAbsentFlags(
  hideSignature: Record<string, true>,
  noEmailConfirmation: Record<string, true>,
): Record<string, number> {
  const flags: Record<string, number> = {};

  if (hideSignature[SENDER_SIGNATURE_KEY]) {
    flags.dn_absent_sender = 1;
    flags.dn_absent_senderemailaddress = 1;
  } else if (noEmailConfirmation[SENDER_SIGNATURE_KEY]) {
    flags.dn_absent_senderemailaddress = 1;
  }

  const receiverHidden = RECEIVER_SIGNATURE_KEYS.some((key) => hideSignature[key]);
  const receiverEmailSkipped = RECEIVER_SIGNATURE_KEYS.some((key) => noEmailConfirmation[key]);
  if (receiverHidden) {
    flags.dn_absent_receiver = 1;
    flags.dn_absent_receiveremailaddress = 1;
  } else if (receiverEmailSkipped) {
    flags.dn_absent_receiveremailaddress = 1;
  }

  return flags;
}

/**
 * Maps the current form phase to the CRM `statuscode`/`statecode` pair.
 * The last phase in the definition → "Hulpverlening afgerond".
 * Any earlier phase → "Hulpverlening akkoord" (still open, a later phase may follow).
 */
export function resolveStatusFields(
  phase: number,
  phaseNumbers: readonly number[],
): { statuscode: number; statecode: number } {
  return {
    statuscode: isLastServiceFormPhase(phase, phaseNumbers)
      ? SERVICE_STATUS.HULPVERLENING_AFGEROND
      : SERVICE_STATUS.HULPVERLENING_AKKOORD,
    statecode: 0,
  };
}

/**
 * Locatie-afgifte submit flags from legacy `ProcessingService` when `isReleaseItem`:
 * mark the vehicle taken, set pickup time, and close into NACONTROLE.
 */
export function applyReleaseSubmitFields(
  body: Record<string, unknown>,
  input: { pickedUpAtIso: string },
): Record<string, unknown> {
  return {
    ...body,
    dn_vehicle_taken_code: true,
    dn_pickedupdate: input.pickedUpAtIso,
    statecode: 0,
    statuscode: SERVICE_STATUS.NACONTROLE,
  };
}

export type ServiceFormSubmissionOptions = {
  /** Localized "please select" placeholder, used to detect unanswered select fields. */
  pleaseSelectLabel: string;
  /** Field keys of signature fields marked "not available" by the user. */
  hideSignature: Record<string, true>;
  /** Field keys of signature fields where the email confirmation was skipped. */
  noEmailConfirmation: Record<string, true>;
  /**
   * Phase numbers from the synced service definition. The last number marks the submit as
   * complete; missing list treats the current phase as last so a one-phase definition still ends.
   */
  phaseNumbers: readonly number[];
};

/**
 * Builds the CRM request body for `PUT /api/services/{id}`. Iterates only VISIBLE, non-readonly,
 * non-signature fields, skips empty answers, coerces each remaining value, and folds in the
 * phase-derived `statuscode`/`statecode` plus any signature absent-flags.
 */
export function buildServicePostBody(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  phase: number,
  options: ServiceFormSubmissionOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ...resolveStatusFields(phase, options.phaseNumbers),
    ...resolveSignatureAbsentFlags(options.hideSignature, options.noEmailConfirmation),
  };

  fields.forEach((field) => {
    if (field.readOnly || !visibleFieldIds.has(field.id)) {
      return;
    }
    if (isSignatureKey(field.key)) {
      return; // Routed into buildSignaturePostData instead.
    }

    const answer = answers[field.key];
    if (isAnswerEmpty(answer, options.pleaseSelectLabel)) {
      return;
    }

    body[field.key] = coerceFieldValue(field, answer as ServiceFormAnswer);
  });

  return body;
}

/**
 * Builds the `SignatureDataInput` payload for the signature upload endpoint. Iterates only
 * VISIBLE, non-readonly signature fields. A field hidden via "not available" is skipped entirely
 * (its absent-flags already went into `servicePostBody`). Otherwise the captured image, signer
 * name, and signer email are included — unless the email confirmation was skipped for that field,
 * in which case only the email is omitted.
 */
export function buildSignaturePostData(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  hideSignature: Record<string, true>,
  noEmailConfirmation: Record<string, true>,
  phase: number,
): SignatureDataInput {
  const signatureData: Record<string, unknown> = { phase };

  fields.forEach((field) => {
    if (field.readOnly || !visibleFieldIds.has(field.id)) {
      return;
    }
    if (!isSignatureKey(field.key) || hideSignature[field.key]) {
      return;
    }

    const answer = answers[field.key];
    if (!answer?.value) {
      return; // No signature captured yet for this field.
    }

    signatureData[field.key] = answer.value;
    signatureData[`${field.key}_name`] = answer.signatureName ?? '';
    if (!noEmailConfirmation[field.key]) {
      signatureData[`${field.key}_email`] = answer.email ?? '';
    }
  });

  return signatureData as SignatureDataInput;
}
