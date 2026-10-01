import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { pendingIdsFromOutbox, type PendingMutationIds } from '../domain/pending';
import type { MutationOutbox } from '../service/outbox-service';

const OutboxContext = createContext<MutationOutbox | null>(null);

export function OutboxProvider({
  value,
  children,
}: {
  value: MutationOutbox;
  children: ReactNode;
}) {
  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): MutationOutbox {
  const outbox = useContext(OutboxContext);
  if (outbox === null) {
    throw new Error('useOutbox must be used within an OutboxProvider');
  }
  return outbox;
}

const EMPTY: PendingMutationIds = {
  allocationIds: new Set(),
  serviceIds: new Set(),
};

/** Live set of allocation/service ids that still have a queued outbox mutation. */
export function usePendingMutations(): PendingMutationIds {
  const outbox = useOutbox();
  const [pending, setPending] = useState<PendingMutationIds>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const refresh = (): void => {
      void outbox.list().then((items) => {
        if (!cancelled) {
          setPending(pendingIdsFromOutbox(items));
        }
      });
    };
    refresh();
    const unsubscribe = outbox.subscribe(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [outbox]);

  return pending;
}
