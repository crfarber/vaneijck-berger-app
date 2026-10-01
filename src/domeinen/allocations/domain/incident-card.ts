import { addressLines, toCoordinate, type Coordinate } from '@/domeinen/location';
import {
  getServiceParty,
  getServiceVehicle,
  isPltrType,
  type VehicleSummary,
} from '@/domeinen/services';
import { classifyAllocation } from './status';
import { getAllocationTypeKey, type AllocationTypeKey } from './type';
import type { Allocation } from './types';

export type IncidentCardModel =
  | {
      kind: 'standard';
      title?: string;
      typeKey: AllocationTypeKey | 'unknown';
      reference?: string;
      location: string[];
      createdOn?: string;
      coordinate?: Coordinate;
      showNavigate: boolean;
    }
  | {
      kind: 'pltr';
      title?: string;
      typeKey: AllocationTypeKey | 'unknown';
      party?: string;
      /** Incident address, shown on the list. The PLTR screen swaps this for the vehicle. */
      location: string[];
      vehicle: VehicleSummary;
      createdOn?: string;
    };

function presentDate(value: string | undefined): string | undefined {
  return value && Number.isFinite(Date.parse(value)) ? value : undefined;
}

/**
 * Selects the presentation profile in one place. The list currently defines an allocation's
 * type from its first service; a future backend incident discriminator only changes this resolver.
 */
export function resolveIncidentCardModel(allocation: Allocation): IncidentCardModel {
  const typeKey = getAllocationTypeKey(allocation.type);
  const createdOn = presentDate(allocation.incident.createdon);
  const service = allocation.services?.[0];

  if (isPltrType(allocation.type)) {
    return {
      kind: 'pltr',
      title: allocation.incident.dn_name,
      typeKey,
      party: getServiceParty(service),
      location: addressLines(allocation.incident),
      vehicle: getServiceVehicle(service),
      createdOn,
    };
  }

  const reference = allocation.incident.dn_lcmnumber_vhd?.trim();
  const coordinate = toCoordinate(
    allocation.incident.dn_latitude,
    allocation.incident.dn_longtitude,
  );
  const showNavigate = classifyAllocation(allocation) === 'active' && coordinate !== null;
  return {
    kind: 'standard',
    title: allocation.incident.dn_name,
    typeKey,
    ...(reference ? { reference } : {}),
    location: addressLines(allocation.incident),
    createdOn,
    ...(coordinate ? { coordinate } : {}),
    showNavigate,
  };
}

/** Presentation-only date formatter; invalid values are hidden by the caller. */
export function formatIncidentCreatedAt(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/**
 * Date and clock as on the old standard card (`dd/MM/yyyy`, hour without a leading zero).
 * Invalid values are hidden by the caller.
 */
export function formatIncidentClock(value: string): { date: string; time: string } | undefined {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${day}/${month}/${year}`,
    time: `${hour}:${minute}`,
  };
}

/** A short, locale-neutral duration used in the operational cards. */
export function formatIncidentAge(value: string, now: number): string | undefined {
  const startedAt = Date.parse(value);
  if (!Number.isFinite(startedAt)) {
    return undefined;
  }
  const totalMinutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m`;
}
