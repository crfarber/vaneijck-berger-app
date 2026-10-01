import type { Worker } from './types';

/**
 * Whether this berger may forward a pending allocation to a colleague instead of accepting or
 * declining it themselves. Ported from `AllocationScreen`'s `canForward` (a plain
 * `Boolean(worker?.dn_canforwardallocationcode)`) — no worker record at all means no.
 */
export function canForwardAllocations(worker: Worker | null): boolean {
  return worker?.dn_canforwardallocationcode === true;
}
