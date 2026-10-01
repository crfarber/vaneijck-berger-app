import { describe, expect, it } from 'vitest';
import { parseAvailabilityOptionRows, workerSchema } from './schemas';

describe('workerSchema', () => {
  it('keeps the availability status code', () => {
    expect(
      workerSchema.parse({
        dn_workerid: 'w1',
        dn_canforwardallocationcode: true,
        dn_availabilitystatuscode: 875920003,
      }).dn_availabilitystatuscode,
    ).toBe(875920003);
  });

  it('defaults a missing availability status to null', () => {
    expect(
      workerSchema.parse({ dn_workerid: 'w1', dn_canforwardallocationcode: false })
        .dn_availabilitystatuscode,
    ).toBeNull();
  });
});

describe('parseAvailabilityOptionRows', () => {
  it('maps Value/Text pairs', () => {
    const { options, rejected } = parseAvailabilityOptionRows([
      { Value: 875920000, Text: 'Beschikbaar' },
      { Value: 875920001, Text: 'Niet beschikbaar' },
    ]);
    expect(options).toEqual([
      { value: 875920000, text: 'Beschikbaar' },
      { value: 875920001, text: 'Niet beschikbaar' },
    ]);
    expect(rejected).toEqual([]);
  });

  it('rejects a row that is not a value/label pair', () => {
    const { options, rejected } = parseAvailabilityOptionRows([{ Value: 'nope' }]);
    expect(options).toEqual([]);
    expect(rejected).toHaveLength(1);
  });
});
