import { describe, expect, it } from 'vitest';
import {
  ACTION_FEEDBACK_MESSAGE,
  feedbackForAcceptAllocation,
  feedbackForAcceptService,
  feedbackForDeclineAllocation,
  feedbackForDeclineService,
  feedbackForFinishAllocation,
} from './action-feedback';

describe('action feedback', () => {
  it('maps a successful accept to a success status', () => {
    expect(feedbackForAcceptAllocation({ kind: 'accepted' })).toEqual({
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.allocationAccepted,
    });
  });

  it('maps queued to a queued status, never a dialog', () => {
    expect(feedbackForAcceptAllocation({ kind: 'queued' })).toEqual({
      kind: 'status',
      tone: 'queued',
      messageKey: ACTION_FEEDBACK_MESSAGE.willRetry,
    });
    expect(feedbackForAcceptService({ ok: false, error: 'queued' }).kind).toBe('status');
    expect(feedbackForFinishAllocation({ ok: false, error: 'queued' }).kind).toBe('status');
    expect(feedbackForDeclineAllocation({ ok: false, error: 'queued' }).kind).toBe('status');
  });

  it('leaves reregister and blocked to the dialog path', () => {
    expect(feedbackForAcceptAllocation({ kind: 'reregister-required' })).toEqual({
      kind: 'none',
    });
    expect(feedbackForAcceptAllocation({ kind: 'blocked' })).toEqual({ kind: 'none' });
  });

  it('maps a failed accept to an error status (old app swallowed service-accept errors)', () => {
    expect(feedbackForAcceptService({ ok: false, error: 'request-failed' })).toEqual({
      kind: 'status',
      tone: 'error',
      messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong,
    });
  });

  it('maps a successful service decline to a success status', () => {
    expect(feedbackForDeclineService({ ok: true })).toEqual({
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.serviceDeclined,
    });
  });
});
