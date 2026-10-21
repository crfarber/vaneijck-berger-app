import { useEffect, useRef } from 'react';
import { useAllocationActions } from '../hooks/use-allocation-actions';
import type { Allocation } from '../domain/types';

/**
 * Runs the normal accept flow once for a map marker choice, then calls `onDone`.
 * Mounted only while an accept from the map alert is in flight.
 */
export function MapAcceptRunner({
  allocation,
  hasActiveAllocations,
  onDone,
}: {
  allocation: Allocation;
  hasActiveAllocations: boolean;
  onDone: () => void;
}) {
  const { accept } = useAllocationActions(allocation, hasActiveAllocations);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void accept().finally(onDone);
  }, [accept, onDone]);

  return null;
}
