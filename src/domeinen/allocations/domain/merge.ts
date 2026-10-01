import type { Service } from './types';

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === '';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Merges two versions of the same record so a thinner payload (a list summary) cannot wipe
 * richer values we already have. An incoming empty value (`null`, `''`) keeps the existing
 * filled value; nested plain objects are merged the same way. Arrays are replaced as a whole.
 */
export function mergePreferFilled<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>,
): T {
  const merged: Record<string, unknown> = { ...existing };

  for (const [key, incomingValue] of Object.entries(incoming)) {
    if (incomingValue === undefined) {
      continue;
    }
    const existingValue = existing[key];

    if (isPlainObject(incomingValue) && isPlainObject(existingValue)) {
      merged[key] = mergePreferFilled(existingValue, incomingValue);
    } else if (isEmpty(incomingValue) && !isEmpty(existingValue)) {
      // keep what we have
    } else {
      merged[key] = incomingValue;
    }
  }

  return merged as T;
}

/**
 * Merges a service from any server payload into what we have. The lifecycle fields
 * (`statuscode`, `statecode`) always follow the server.
 */
export function mergeService(existing: Service | undefined, incoming: Service): Service {
  if (!existing) {
    return incoming;
  }
  return {
    ...mergePreferFilled(existing, incoming),
    statuscode: incoming.statuscode,
    statecode: incoming.statecode,
  };
}

/**
 * The incoming list is authoritative for WHICH services exist; each one is merged with its
 * earlier version so empty fields in the new payload do not erase data.
 */
export function mergeHydratedServices(
  existing: readonly Service[] | null | undefined,
  incoming: readonly Service[],
): Service[] {
  const existingById = new Map<string, Service>();
  for (const service of existing ?? []) {
    if (service.dn_serviceid) {
      existingById.set(service.dn_serviceid, service);
    }
  }

  return incoming.map((service) =>
    service.dn_serviceid ? mergeService(existingById.get(service.dn_serviceid), service) : service,
  );
}
