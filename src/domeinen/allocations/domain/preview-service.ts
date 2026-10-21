import type { Service } from './types';

/**
 * Whether two thin list-summary rows are "the same" service when `dn_serviceid` is still missing.
 * Used to map a tapped preview row onto the hydrated list after `hydrateServices`.
 */
function looselyMatches(left: Service, right: Service): boolean {
  return (
    left.statuscode === right.statuscode &&
    (left.dn_servicetypecode ?? null) === (right.dn_servicetypecode ?? null) &&
    (left.dn_concatlicenseplate ?? null) === (right.dn_concatlicenseplate ?? null)
  );
}

/**
 * Picks the service (with id) to open for a read-only preview.
 * Prefer the requested id; otherwise map by list index / loose identity; finally a sole hydrated row.
 */
export function resolvePreviewService(
  requested: Service,
  hydrated: readonly Service[],
  listed: readonly Service[],
): Service | null {
  if (requested.dn_serviceid) {
    return hydrated.find((item) => item.dn_serviceid === requested.dn_serviceid) ?? requested;
  }

  if (hydrated.length === 0) {
    return null;
  }

  let index = listed.indexOf(requested);
  if (index < 0) {
    index = listed.findIndex((item) => looselyMatches(item, requested));
  }
  const byIndex = index >= 0 ? hydrated[index] : undefined;
  if (byIndex?.dn_serviceid) {
    return byIndex;
  }

  if (hydrated.length === 1) {
    const only = hydrated[0];
    return only?.dn_serviceid ? only : null;
  }

  const matched = hydrated.find((item) => looselyMatches(item, requested));
  return matched?.dn_serviceid ? matched : null;
}

/** Preview screens must not block on the hydrate overlay; list summary is enough to look. */
export function shouldBlockServicesRefresh(preview: boolean, manualRefreshing: boolean): boolean {
  return !preview && !manualRefreshing;
}
