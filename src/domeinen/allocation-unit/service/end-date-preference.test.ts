import { describe, expect, it } from 'vitest';
import { createInMemoryStore } from '@/test/fakes';
import { createEndDatePreference, REMEMBERED_END_DATE_KEY } from './end-date-preference';

const NOW = new Date(2026, 8, 21, 12, 0, 0, 0);
const plusHours = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

describe('createEndDatePreference', () => {
  it('proposes now plus 9 hours when nothing is remembered', async () => {
    const preference = createEndDatePreference(createInMemoryStore());

    expect(await preference.getProposedEndDate({ isOnboarding: false, now: NOW })).toEqual(
      plusHours(9),
    );
  });

  it('proposes the remembered end date when it is still valid', async () => {
    const store = createInMemoryStore();
    const preference = createEndDatePreference(store);
    await preference.remember(plusHours(5));

    expect(await preference.getProposedEndDate({ isOnboarding: false, now: NOW })).toEqual(
      plusHours(5),
    );
  });

  it('ignores the remembered end date during onboarding', async () => {
    const preference = createEndDatePreference(createInMemoryStore());
    await preference.remember(plusHours(5));

    expect(await preference.getProposedEndDate({ isOnboarding: true, now: NOW })).toEqual(
      plusHours(9),
    );
  });

  it.each([
    ['in the past', () => plusHours(-1).toISOString()],
    ['beyond 24 hours', () => plusHours(30).toISOString()],
    ['not a date', () => 'garbage'],
    ['empty', () => ''],
  ])('falls back to the default when the remembered value is %s', async (_case, value) => {
    const preference = createEndDatePreference(
      createInMemoryStore({ [REMEMBERED_END_DATE_KEY]: value() }),
    );

    expect(await preference.getProposedEndDate({ isOnboarding: false, now: NOW })).toEqual(
      plusHours(9),
    );
  });

  it('stores the end date as an ISO string', async () => {
    const store = createInMemoryStore();

    await createEndDatePreference(store).remember(plusHours(3));

    expect(store.dump()[REMEMBERED_END_DATE_KEY]).toBe(plusHours(3).toISOString());
  });

  it('exposes the remembered ISO string for shift-end checks', async () => {
    const preference = createEndDatePreference(createInMemoryStore());
    expect(await preference.getRememberedEndDateIso()).toBeNull();
    await preference.remember(plusHours(3));
    expect(await preference.getRememberedEndDateIso()).toBe(plusHours(3).toISOString());
  });

  it('clears the remembered end date on sign-out', async () => {
    const store = createInMemoryStore();
    const preference = createEndDatePreference(store);
    await preference.remember(plusHours(3));

    await preference.clear();

    expect(store.dump()[REMEMBERED_END_DATE_KEY]).toBeUndefined();
    expect(await preference.getProposedEndDate({ isOnboarding: false, now: NOW })).toEqual(
      plusHours(9),
    );
  });
});
