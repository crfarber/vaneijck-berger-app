import { createStore, type StoreApi } from 'zustand/vanilla';
import type { SessionEvent, SessionStatus, TokenProvider } from '../service/token-provider';
import type { UserType } from '../domain/session';

/**
 * What the UI needs to know about the session: is anyone signed in, and if the session ended by
 * itself, why. NEVER the tokens; those stay inside the token provider.
 */
export type SessionState = {
  status: SessionStatus;
  userType: UserType | null;
  /** Set when the session ended without the user asking for it, so the login screen can explain. */
  signedOutReason: 'user' | 'expired' | null;
};

export type SessionStore = StoreApi<SessionState>;

export function createSessionStore(): SessionStore {
  return createStore<SessionState>()(() => ({
    status: 'unknown',
    userType: null,
    signedOutReason: null,
  }));
}

/** Copies the events of the token provider into the store. Returns the unsubscribe function. */
export function bindSessionStore(provider: TokenProvider, store: SessionStore): () => void {
  const apply = (event: SessionEvent): void => {
    switch (event.type) {
      case 'restored':
        store.setState({
          status: event.userType === null ? 'signed-out' : 'signed-in',
          userType: event.userType,
          signedOutReason: null,
        });
        break;
      case 'signed-in':
        store.setState({ status: 'signed-in', userType: event.userType, signedOutReason: null });
        break;
      case 'signed-out':
        store.setState({ status: 'signed-out', userType: null, signedOutReason: event.reason });
        break;
      case 'refreshed':
        break;
    }
  };

  // The provider may have restored before we subscribed.
  store.setState({ status: provider.getStatus(), userType: provider.getUserType() });
  return provider.subscribe(apply);
}
