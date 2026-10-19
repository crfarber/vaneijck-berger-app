/**
 * Work that blocks showing an active standby banner. Matches the old branch: any active or
 * pending allocation, or any vehicle release.
 */
export function hasBlockingAllocationItems(counts: {
  readonly activeCount: number;
  readonly pendingCount: number;
  readonly vehicleReleaseCount: number;
}): boolean {
  return counts.activeCount > 0 || counts.pendingCount > 0 || counts.vehicleReleaseCount > 0;
}
