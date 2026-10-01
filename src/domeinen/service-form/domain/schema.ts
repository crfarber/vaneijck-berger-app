import { EARLY_COMPLETE_FIELDS, SERVICE_TYPE } from '@/domeinen/services';
import { buildInitialServiceFormAnswers } from './values';
import type {
  LocalizedServiceFormValue,
  NormalizeServiceFormOptions,
  NormalizedServiceFormResult,
  RawServiceFormDefinition,
  RawServiceFormField,
  ServiceFormDiagnostic,
  ServiceFormField,
  ServiceFormSection,
} from './types';

/**
 * Normalizes the CRM `dataDefinition` JSON into a `NormalizedServiceForm`. Ported from
 * `utils/serviceFormSchema.ts`; the two service types with an early-completion field
 * (`EARLY_COMPLETE_FIELDS`, already in `services/domain/service-types.ts` since slice 0) are
 * reused rather than redeclared.
 */

const EARLY_COMPLETION_FIELDS = new Map<number, string>([
  [SERVICE_TYPE.BERGING, EARLY_COMPLETE_FIELDS.bergingEkv],
  [SERVICE_TYPE.PECHHULP, EARLY_COMPLETE_FIELDS.pechhulpSettlement],
]);

const localize = (
  values: LocalizedServiceFormValue[] | undefined,
  languageCode: number,
  fallback: string,
): string =>
  values?.find((value) => value['language-code'] === languageCode)?.value ??
  values?.find((value) => Boolean(value.value))?.value ??
  fallback;

const getDefinitions = (input: unknown): RawServiceFormDefinition[] => {
  if (Array.isArray(input)) {
    return input.flatMap((item) => getDefinitions(item));
  }

  if (!input || typeof input !== 'object') {
    return [];
  }

  const candidate = input as Record<string, unknown>;
  if (Array.isArray(candidate.dataDefinition)) {
    return getDefinitions(candidate.dataDefinition);
  }

  return 'definition' in candidate ? [candidate as RawServiceFormDefinition] : [];
};

export function unwrapServiceFormDefinitions(input: unknown): RawServiceFormDefinition[] {
  return getDefinitions(input);
}

export function findServiceFormDefinition(
  input: unknown,
  serviceCode: number,
): RawServiceFormDefinition | null {
  return getDefinitions(input).find((definition) => definition.servicecode === serviceCode) ?? null;
}

function normalizeField(
  rawField: RawServiceFormField,
  phase: number,
  sectionIndex: number,
  fieldIndex: number,
  languageCode: number,
  diagnostics: ServiceFormDiagnostic[],
): ServiceFormField | null {
  const key = rawField.name?.trim();
  if (!key || !rawField.type) {
    diagnostics.push({
      code: 'invalid-field',
      fieldId: `phase-${phase}/section-${sectionIndex}/field-${fieldIndex}`,
      message: `Field ${fieldIndex + 1} in section ${sectionIndex + 1} has no name or type.`,
    });
    return null;
  }

  return {
    id: `phase-${phase}/section-${sectionIndex}/field-${fieldIndex}/${key}`,
    key,
    label: localize(rawField.label, languageCode, key),
    type: rawField.type,
    table: rawField.table,
    readOnly: rawField.autoform?.readonly === true,
    optional: rawField.autoform?.optional === true,
    autocomplete: rawField.autoform?.autocomplete === true,
    autoformValue: rawField.autoform?.value,
    sortOptions: rawField.sortoptions,
    dependencies: rawField.dependencies,
    requiredVisibility: rawField.requiredvisibility,
    requiredWhen: rawField.autoform?.requiredwhen,
    validations: rawField.autoform?.validations ?? [],
    raw: rawField,
  };
}

export function normalizeServiceFormDefinition(
  input: unknown,
  options: NormalizeServiceFormOptions,
): NormalizedServiceFormResult {
  const diagnostics: ServiceFormDiagnostic[] = [];
  const definitions = getDefinitions(input);
  const definition = definitions[0];

  if (!definition) {
    return {
      form: {
        serviceCode: 0,
        serviceName: '',
        phase: options.phase ?? 0,
        phaseName: '',
        photosMandatory: [],
        sections: [],
        diagnostics: [{ code: 'missing-service', message: 'No service definition was found.' }],
        requiresTermsAcceptance: false,
      },
      initialAnswers: {},
    };
  }

  const phases = definition.definition ?? [];
  const selectedPhase = phases.find((phase) => phase.phase === options.phase) ?? phases[0];

  if (!selectedPhase) {
    diagnostics.push({
      code: 'missing-phase',
      message: `Service ${definition.servicecode ?? 0} has no phases.`,
    });
  }

  const phase = selectedPhase?.phase ?? options.phase ?? 0;
  const sections: ServiceFormSection[] = (selectedPhase?.tabs ?? []).map(
    (rawSection, sectionIndex) => ({
      id: `phase-${phase}/section-${sectionIndex}`,
      title: localize(rawSection.header, options.languageCode, `Section ${sectionIndex + 1}`),
      fields: (rawSection.fields ?? [])
        .map((rawField, fieldIndex) =>
          normalizeField(
            rawField,
            phase,
            sectionIndex,
            fieldIndex,
            options.languageCode,
            diagnostics,
          ),
        )
        .filter((field): field is ServiceFormField => field !== null),
      contractRights: rawSection.contractRights ?? [],
    }),
  );

  const earlyCompletionField = EARLY_COMPLETION_FIELDS.get(definition.servicecode ?? 0);
  if (
    phase === 1 &&
    earlyCompletionField &&
    !sections.some((section) => section.fields.some((field) => field.key === earlyCompletionField))
  ) {
    diagnostics.push({
      code: 'missing-early-completion-field',
      fieldKey: earlyCompletionField,
      message: `Service ${definition.servicecode} phase 1 is missing early-completion field ${earlyCompletionField}.`,
    });
  }

  const requiresTermsAcceptance = sections.some((section) =>
    section.fields.some((field) => Boolean(field.raw.subFields?.transportConditions)),
  );

  const form = {
    serviceCode: definition.servicecode ?? 0,
    serviceName: localize(
      definition.servicename,
      options.languageCode,
      String(definition.servicecode ?? ''),
    ),
    phase,
    phaseName: localize(selectedPhase?.['phase-name'], options.languageCode, String(phase)),
    photosMandatory: selectedPhase?.photosMandatory ?? [],
    sections,
    diagnostics,
    requiresTermsAcceptance,
  };

  return {
    form,
    initialAnswers: buildInitialServiceFormAnswers(
      sections.flatMap((section) => section.fields),
      options.values ?? {},
      options.pleaseSelectLabel ?? 'Selecteer',
    ),
  };
}
