import { describe, expect, it } from 'vitest';
import { remoteFromBackgroundPayload } from './background-payload';

describe('remoteFromBackgroundPayload', () => {
  it('reads the data payload, including JSON sent as text', () => {
    const remote = remoteFromBackgroundPayload({
      notification: null,
      data: {
        dataString: JSON.stringify({ type: 'NewIncident', allocationId: 'a1' }),
        messageId: 'msg-9',
      },
    });

    expect(remote).toEqual({
      messageId: 'msg-9',
      data: {
        dataString: JSON.stringify({ type: 'NewIncident', allocationId: 'a1' }),
        messageId: 'msg-9',
        type: 'NewIncident',
        allocationId: 'a1',
      },
      notification: null,
    });
  });

  it('ignores a tap, which the response listener already handles', () => {
    expect(
      remoteFromBackgroundPayload({
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: { request: { identifier: 'n1' } },
      }),
    ).toBeNull();
  });

  it('keeps the payload when the nested JSON is not an object', () => {
    expect(
      remoteFromBackgroundPayload({
        data: { dataString: 'not-json', type: 'ChangedIncident' },
      }),
    ).toMatchObject({
      data: { dataString: 'not-json', type: 'ChangedIncident' },
      notification: null,
    });
  });
});
