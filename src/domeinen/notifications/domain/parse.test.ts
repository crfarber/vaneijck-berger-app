import { describe, expect, it } from 'vitest';
import {
  extractPayload,
  getNotificationId,
  getNotificationType,
  parseNotification,
  resolveToken,
} from './parse';

describe('extractPayload', () => {
  it('uses the data of the message', () => {
    expect(extractPayload({ data: { type: 'NewIncident', allocationId: 'a1' } })).toEqual({
      type: 'NewIncident',
      allocationId: 'a1',
    });
  });

  it('returns an empty payload for a message without data', () => {
    expect(extractPayload({})).toEqual({});
    expect(extractPayload({ data: null })).toEqual({});
  });

  it('merges a body object over the top level data', () => {
    const payload = extractPayload({
      data: { type: 'Old', allocationId: 'a1', body: { type: 'ChangedIncident' } },
    });
    expect(payload).toMatchObject({ type: 'ChangedIncident', allocationId: 'a1' });
  });

  it('reads a body sent as JSON text', () => {
    const payload = extractPayload({
      data: { body: JSON.stringify({ Type: 'NewIncident', incidentId: 'i1' }) },
    });
    expect(payload).toMatchObject({ Type: 'NewIncident', incidentId: 'i1' });
  });

  it('lets the innermost Data win, as object or as JSON text', () => {
    const asObject = extractPayload({
      data: {
        allocationId: 'outer',
        body: { allocationId: 'middle', Data: { allocationId: 'inner' } },
      },
    });
    const asText = extractPayload({
      data: {
        allocationId: 'outer',
        body: JSON.stringify({ Data: JSON.stringify({ allocationId: 'inner' }) }),
      },
    });
    expect(asObject.allocationId).toBe('inner');
    expect(asText.allocationId).toBe('inner');
  });

  it.each([['not json'], ['[1,2]'], ['"text"'], ['']])('ignores a body that is %j', (body) => {
    expect(extractPayload({ data: { type: 'NewIncident', body } })).toMatchObject({
      type: 'NewIncident',
    });
  });

  it('does not change the message', () => {
    const data = { body: { Data: { a: 1 } } };
    extractPayload({ data });
    expect(data).toEqual({ body: { Data: { a: 1 } } });
  });
});

describe('getNotificationType', () => {
  it.each([
    ['Type', 'A'],
    ['type', 'A'],
    ['Event', 'A'],
    ['event', 'A'],
    ['EventType', 'A'],
    ['eventType', 'A'],
    ['action', 'A'],
    ['Action', 'A'],
  ])('reads the %s field', (key, value) => {
    expect(getNotificationType({ [key]: value })).toBe(value);
  });

  it('prefers Type over the other fields', () => {
    expect(
      getNotificationType({ action: 'Assigned', event: 'x', Type: 'VehicleDeliverance' }),
    ).toBe('VehicleDeliverance');
  });

  it('trims the value and skips empty ones', () => {
    expect(getNotificationType({ Type: '   ', type: '  NewIncident ' })).toBe('NewIncident');
  });

  it('takes a number as text', () => {
    expect(getNotificationType({ type: 3 })).toBe('3');
  });

  it('returns null when nothing usable is there', () => {
    expect(getNotificationType({})).toBeNull();
    expect(getNotificationType({ type: null, Type: {}, event: Number.NaN })).toBeNull();
  });
});

describe('resolveToken', () => {
  it.each([
    ['NewIncident', 'NewIncident'],
    ['newincident', 'NewIncident'],
    ['NEWINCIDENT', 'NewIncident'],
    ['ChangedIncident', 'ChangedIncident'],
    ['changed', 'ChangedIncident'],
    ['AcceptService', 'AcceptService'],
    ['DissolvedIncident', 'DissolvedIncident'],
    ['AllocationDissolved', 'AllocationDissolved'],
    ['WorkerStatus', 'WorkerStatus'],
    ['VehicleDeliverance', 'VehicleDeliverance'],
    ['NewTms', 'NewTms'],
    ['tms', 'NewTms'],
    ['StandbyLocationAdvice', 'StandbyLocationAdvice'],
  ])('maps %s to %s', (type, token) => {
    expect(resolveToken(type)).toBe(token);
  });

  it('returns null for an unknown or missing type', () => {
    expect(resolveToken('Assigned')).toBeNull();
    expect(resolveToken('3')).toBeNull();
    expect(resolveToken(null)).toBeNull();
  });
});

describe('getNotificationId', () => {
  it('prefers the message id', () => {
    expect(getNotificationId({ messageId: 'm1', data: { messageId: 'm2' } })).toBe('m1');
  });

  it('falls back to the id in the data, then to the Google id', () => {
    expect(getNotificationId({ data: { messageId: 'm2', 'google.message_id': 'g' } })).toBe('m2');
    expect(getNotificationId({ data: { 'google.message_id': 'g' } })).toBe('g');
  });

  it('is null without any id', () => {
    expect(getNotificationId({})).toBeNull();
    expect(getNotificationId({ messageId: '  ' })).toBeNull();
  });
});

describe('parseNotification', () => {
  it('gathers everything the handler needs', () => {
    const parsed = parseNotification({
      messageId: 'm1',
      notification: { title: 'Nieuw incident', body: 'A2 Utrecht' },
      data: { type: 'AcceptService', allocationId: ' a1 ', incidentId: 'i1', serviceid: 's1' },
    });

    expect(parsed).toEqual({
      id: 'm1',
      token: 'AcceptService',
      hasExplicitType: true,
      allocationId: 'a1',
      incidentId: 'i1',
      serviceId: 's1',
      title: 'Nieuw incident',
      body: 'A2 Utrecht',
    });
  });

  it('accepts the service id under either spelling', () => {
    expect(parseNotification({ data: { serviceId: 's2' } }).serviceId).toBe('s2');
  });

  it('marks a message with an unknown type as explicit but unresolved', () => {
    const parsed = parseNotification({ data: { type: 'SomethingNew' } });
    expect(parsed.token).toBeNull();
    expect(parsed.hasExplicitType).toBe(true);
  });

  it('marks a message without a type as not explicit', () => {
    const parsed = parseNotification({ data: {} });
    expect(parsed.token).toBeNull();
    expect(parsed.hasExplicitType).toBe(false);
  });

  it('ignores ids that are not text or are empty', () => {
    const parsed = parseNotification({
      data: { type: 'NewIncident', allocationId: 5, incidentId: '  ' },
    });
    expect(parsed.allocationId).toBeUndefined();
    expect(parsed.incidentId).toBeUndefined();
  });

  it('gives empty title and body when there is no visible notification', () => {
    expect(parseNotification({ data: {} })).toMatchObject({ title: '', body: '' });
  });
});
