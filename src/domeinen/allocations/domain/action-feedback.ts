/**
 * How a mutation result should be shown to the berger. Pure — the hook translates the
 * messageKey and feeds it to the status overlay. Dialogs (reregister, blocked) stay outside
 * this map: those need a decision, not a status screen.
 */
export type ActionFeedback =
  | {
      kind: 'status';
      tone: 'success' | 'queued' | 'error';
      messageKey: ActionFeedbackMessageKey;
    }
  | { kind: 'none' };

export const ACTION_FEEDBACK_MESSAGE = {
  allocationAccepted: 'feedback.allocationAccepted',
  allocationFinished: 'feedback.allocationFinished',
  allocationDeclined: 'feedback.allocationDeclined',
  serviceAccepted: 'feedback.serviceAccepted',
  serviceDeclined: 'feedback.serviceDeclined',
  serviceSubmitted: 'feedback.serviceSubmitted',
  reassigned: 'feedback.reassigned',
  willRetry: 'common.willRetry',
  somethingWrong: 'common.somethingWrong',
  takingLonger: 'feedback.takingLonger',
} as const;

export type ActionFeedbackMessageKey =
  (typeof ACTION_FEEDBACK_MESSAGE)[keyof typeof ACTION_FEEDBACK_MESSAGE];

type AcceptAllocationKind = 'accepted' | 'queued' | 'failed' | 'reregister-required' | 'blocked';

export function feedbackForAcceptAllocation(result: {
  kind: AcceptAllocationKind;
}): ActionFeedback {
  switch (result.kind) {
    case 'accepted':
      return {
        kind: 'status',
        tone: 'success',
        messageKey: ACTION_FEEDBACK_MESSAGE.allocationAccepted,
      };
    case 'queued':
      return { kind: 'status', tone: 'queued', messageKey: ACTION_FEEDBACK_MESSAGE.willRetry };
    case 'failed':
      return { kind: 'status', tone: 'error', messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong };
    case 'reregister-required':
    case 'blocked':
      return { kind: 'none' };
  }
}

export function feedbackForFinishAllocation(
  result: { ok: true } | { ok: false; error: 'queued' | 'request-failed' },
): ActionFeedback {
  if (result.ok) {
    return {
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.allocationFinished,
    };
  }
  if (result.error === 'queued') {
    return { kind: 'status', tone: 'queued', messageKey: ACTION_FEEDBACK_MESSAGE.willRetry };
  }
  return { kind: 'status', tone: 'error', messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong };
}

export function feedbackForDeclineAllocation(
  result: { ok: true } | { ok: false; error: 'queued' | 'request-failed' },
): ActionFeedback {
  if (result.ok) {
    return {
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.allocationDeclined,
    };
  }
  if (result.error === 'queued') {
    return { kind: 'status', tone: 'queued', messageKey: ACTION_FEEDBACK_MESSAGE.willRetry };
  }
  return { kind: 'status', tone: 'error', messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong };
}

export function feedbackForAcceptService(
  result: { ok: true } | { ok: false; error: 'queued' | 'request-failed' },
): ActionFeedback {
  if (result.ok) {
    return {
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.serviceAccepted,
    };
  }
  if (result.error === 'queued') {
    return { kind: 'status', tone: 'queued', messageKey: ACTION_FEEDBACK_MESSAGE.willRetry };
  }
  return { kind: 'status', tone: 'error', messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong };
}

export function feedbackForDeclineService(
  result: { ok: true } | { ok: false; error: 'queued' | 'request-failed' },
): ActionFeedback {
  if (result.ok) {
    return {
      kind: 'status',
      tone: 'success',
      messageKey: ACTION_FEEDBACK_MESSAGE.serviceDeclined,
    };
  }
  if (result.error === 'queued') {
    return { kind: 'status', tone: 'queued', messageKey: ACTION_FEEDBACK_MESSAGE.willRetry };
  }
  return { kind: 'status', tone: 'error', messageKey: ACTION_FEEDBACK_MESSAGE.somethingWrong };
}
