import { hasFilledOptionCode, toOptionCode } from './option-code';
import {
  EARLY_COMPLETE_FIELDS,
  PECHHULP_SETTLEMENTS_CONTINUING_TO_PHASE_2,
  SERVICE_TYPE,
} from './service-types';

/**
 * Some service types are finished in the CRM after phase 1 and never get a phase 2. These
 * rules say when. Add a rule here (not in a screen) when a new service type behaves this way.
 */
type EarlyCompleteRule = {
  readonly key: EarlyCompleteKey;
  readonly serviceTypeCode: number;
  readonly matches: (body: Readonly<Record<string, unknown>>) => boolean;
};

export type EarlyCompleteKey =
  'assistanceEarlyComplete' | 'pechhulpEarlyComplete' | 'bergingEkvEarlyComplete';

export type EarlyCompleteFlags = Readonly<Record<EarlyCompleteKey, boolean>>;

const RULES: readonly EarlyCompleteRule[] = [
  {
    key: 'assistanceEarlyComplete',
    serviceTypeCode: SERVICE_TYPE.ASSISTANCE,
    // Any breakdown type filled in ends the service.
    matches: (body) => hasFilledOptionCode(body[EARLY_COMPLETE_FIELDS.assistanceBreakdown]),
  },
  {
    key: 'pechhulpEarlyComplete',
    serviceTypeCode: SERVICE_TYPE.PECHHULP,
    // A settlement that does not continue to phase 2 ends the service.
    matches: (body) => {
      const code = toOptionCode(body[EARLY_COMPLETE_FIELDS.pechhulpSettlement]);
      return code !== null && !PECHHULP_SETTLEMENTS_CONTINUING_TO_PHASE_2.includes(code);
    },
  },
  {
    key: 'bergingEkvEarlyComplete',
    serviceTypeCode: SERVICE_TYPE.BERGING,
    // EKV (total loss) ends the service. Arrives as boolean true or option code 1.
    matches: (body) => {
      const value = body[EARLY_COMPLETE_FIELDS.bergingEkv];
      return value === true || toOptionCode(value) === 1;
    },
  },
];

export function getEarlyCompleteFlags(
  serviceTypeCode: number | undefined,
  body: Readonly<Record<string, unknown>>,
): EarlyCompleteFlags {
  const flags: Record<EarlyCompleteKey, boolean> = {
    assistanceEarlyComplete: false,
    pechhulpEarlyComplete: false,
    bergingEkvEarlyComplete: false,
  };
  for (const rule of RULES) {
    if (rule.serviceTypeCode === serviceTypeCode && rule.matches(body)) {
      flags[rule.key] = true;
    }
  }
  return flags;
}

export function hasEarlyCompleteTerminal(flags: EarlyCompleteFlags): boolean {
  return Object.values(flags).some(Boolean);
}
