import { addressLines, toCoordinate, type Coordinate } from '@/domeinen/location';
import {
  getServiceContact,
  getServiceParty,
  getServiceVehicle,
  isPltrType,
  type VehicleSummary,
} from '@/domeinen/services';
import { getDeviceTimeZone } from '@/shared/utils/time';
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
      phone?: string;
      showCall: boolean;
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
      phone?: string;
      coordinate?: Coordinate;
      showNavigate: boolean;
      showCall: boolean;
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
  const active = classifyAllocation(allocation) === 'active';
  const coordinate = toCoordinate(
    allocation.incident.dn_latitude,
    allocation.incident.dn_longtitude,
  );
  const showNavigate = active && coordinate !== null;
  const phone = getServiceContact(service)?.phone;
  const showCall = active && phone !== undefined;

  if (isPltrType(allocation.type)) {
    return {
      kind: 'pltr',
      title: allocation.incident.dn_name,
      typeKey,
      party: getServiceParty(service),
      location: addressLines(allocation.incident),
      vehicle: getServiceVehicle(service),
      createdOn,
      ...(phone ? { phone } : {}),
      ...(coordinate ? { coordinate } : {}),
      showNavigate,
      showCall,
    };
  }

  const reference = allocation.incident.dn_lcmnumber_vhd?.trim();
  return {
    kind: 'standard',
    title: allocation.incident.dn_name,
    typeKey,
    ...(reference ? { reference } : {}),
    location: addressLines(allocation.incident),
    createdOn,
    ...(coordinate ? { coordinate } : {}),
    ...(phone ? { phone } : {}),
    showNavigate,
    showCall,
  };
}

/** Presentation-only date formatter; invalid values are hidden by the caller. */
export function formatIncidentCreatedAt(
  value: string,
  locale: string,
  timeZone: string = getDeviceTimeZone(),
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

/**
 * Date and clock as on the old standard card (`dd/MM/yyyy`, hour without a leading zero).
 * CMS/API timestamps are UTC; display uses the device (or given) timezone.
 * Invalid values are hidden by the caller.
 */
export function formatIncidentClock(
  value: string,
  timeZone: string = getDeviceTimeZone(),
): { date: string; time: string } | undefined {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(parsed));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  const hour = String(Number(part('hour')));
  const minute = part('minute').padStart(2, '0');
  return {
    date: `${part('day')}/${part('month')}/${part('year')}`,
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
