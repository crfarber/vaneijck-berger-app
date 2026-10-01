/** What the device reported about the notification permission. */
export type PushPermissionState = 'granted' | 'denied';

export type RegistrationPlan =
  { action: 'register'; token: string } | { action: 'skip'; reason: 'denied' | 'no-token' };

/**
 * Whether to send the device token to the backend. A refusal is a finished state: the app keeps
 * working, it just receives nothing. The live hook in the old app posted on every signed-in start
 * and again when the token changed; the 24-hour gate only existed in its documentation.
 */
export function planRegistration(input: {
  permission: PushPermissionState;
  token: string | null;
}): RegistrationPlan {
  if (input.permission === 'denied') {
    return { action: 'skip', reason: 'denied' };
  }
  const token = input.token?.trim() ?? '';
  if (token === '') {
    return { action: 'skip', reason: 'no-token' };
  }
  return { action: 'register', token };
}
