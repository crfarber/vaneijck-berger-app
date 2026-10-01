import { describe, expect, it } from 'vitest';
import { getEarlyCompleteFlags, hasEarlyCompleteTerminal } from './early-complete';
import { SERVICE_TYPE } from './service-types';

const ASSISTANCE = SERVICE_TYPE.ASSISTANCE;
const PECHHULP = SERVICE_TYPE.PECHHULP;
const BERGING = SERVICE_TYPE.BERGING;

describe('assistance', () => {
  it('completes early once a breakdown type is filled in', () => {
    const flags = getEarlyCompleteFlags(ASSISTANCE, { dn_assisistancetypeofbreakdowncode: 1001 });
    expect(flags.assistanceEarlyComplete).toBe(true);
    expect(hasEarlyCompleteTerminal(flags)).toBe(true);
  });

  it('accepts a breakdown type sent as a string', () => {
    const flags = getEarlyCompleteFlags(ASSISTANCE, { dn_assisistancetypeofbreakdowncode: '1001' });
    expect(flags.assistanceEarlyComplete).toBe(true);
  });

  it.each([[null], [undefined], ['']])('does not complete early for %j', (value) => {
    const flags = getEarlyCompleteFlags(ASSISTANCE, { dn_assisistancetypeofbreakdowncode: value });
    expect(hasEarlyCompleteTerminal(flags)).toBe(false);
  });

  it('does not complete early when the field is missing', () => {
    expect(hasEarlyCompleteTerminal(getEarlyCompleteFlags(ASSISTANCE, {}))).toBe(false);
  });
});

describe('pechhulp', () => {
  it.each([[1004], [1005], ['1004'], ['1005']])(
    'continues to phase 2 for settlement %j',
    (settlement) => {
      const flags = getEarlyCompleteFlags(PECHHULP, { dn_breakdownsettlementcode: settlement });
      expect(flags.pechhulpEarlyComplete).toBe(false);
    },
  );

  it.each([[1001], [1002], [1003], ['1001']])(
    'completes early for settlement %j (repaired on the spot)',
    (settlement) => {
      const flags = getEarlyCompleteFlags(PECHHULP, { dn_breakdownsettlementcode: settlement });
      expect(flags.pechhulpEarlyComplete).toBe(true);
    },
  );

  it.each([[null], [undefined], [''], ['abc']])('ignores an empty settlement %j', (settlement) => {
    const flags = getEarlyCompleteFlags(PECHHULP, { dn_breakdownsettlementcode: settlement });
    expect(hasEarlyCompleteTerminal(flags)).toBe(false);
  });
});

describe('berging', () => {
  it('completes early for EKV as boolean true', () => {
    expect(getEarlyCompleteFlags(BERGING, { dn_ekv: true }).bergingEkvEarlyComplete).toBe(true);
  });

  it('completes early for EKV as option code 1', () => {
    expect(getEarlyCompleteFlags(BERGING, { dn_ekv: 1 }).bergingEkvEarlyComplete).toBe(true);
    expect(getEarlyCompleteFlags(BERGING, { dn_ekv: '1' }).bergingEkvEarlyComplete).toBe(true);
  });

  it.each([[false], [0], ['0'], [2], [null], [undefined]])(
    'does not complete early for %j',
    (ekv) => {
      expect(getEarlyCompleteFlags(BERGING, { dn_ekv: ekv }).bergingEkvEarlyComplete).toBe(false);
    },
  );
});

describe('rules are bound to their service type', () => {
  it('does not apply the assistance rule to another type', () => {
    const flags = getEarlyCompleteFlags(BERGING, { dn_assisistancetypeofbreakdowncode: 1001 });
    expect(hasEarlyCompleteTerminal(flags)).toBe(false);
  });

  it('does not apply any rule to an unknown type', () => {
    const flags = getEarlyCompleteFlags(undefined, {
      dn_assisistancetypeofbreakdowncode: 1001,
      dn_breakdownsettlementcode: 1001,
      dn_ekv: true,
    });
    expect(hasEarlyCompleteTerminal(flags)).toBe(false);
  });
});
