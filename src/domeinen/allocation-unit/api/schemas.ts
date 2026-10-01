import { z } from 'zod';
import { type FleetVehicle } from '../domain/fleet';
import { normalizeHomebaseCoordinate, type HomebaseLocation } from '../domain/homebase';

/**
 * A tolerant reader: the backend model (`AllocationUnitInfo`) has many optional/nullable fields,
 * and this app only reads a handful of them.
 */
export const allocationUnitInfoSchema = z.looseObject({
  /** VRS id of the unit — needed for `POST .../{id}/cancel` (same field as the old app). */
  id: z.string().min(1).optional(),
  vehicleId: z.string().nullable().optional(),
  trailerId: z.string().nullable().optional(),
  alternateVehicleRegistrationNumber: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  notAvailableForIM: z.boolean().optional(),
  onlyAvailableForTransport: z.boolean().optional(),
  onlyAvailableForBreakdown: z.boolean().optional(),
  notAvailableForAllocation: z.boolean().optional(),
});

/**
 * GET /api/allocation-units: a unit, or nothing. Swagger documents 404 for "none", but the live
 * tst API answers 2xx with an empty body (HttpClient → undefined) or JSON null.
 */
export const currentAllocationUnitSchema = allocationUnitInfoSchema.nullish();

export type AllocationUnitInfo = z.infer<typeof allocationUnitInfoSchema>;

/**
 * One row of the `dn_fleets` reference-data entity (the company's trucks and trailers). A row
 * without an id or type code is useless to us (nothing to submit, nowhere to sort it) and is
 * rejected rather than let through as a broken pick.
 */
const fleetRowSchema = z.looseObject({
  dn_fleetid: z.string(),
  dn_name: z.string(),
  dn_vehiclenumber: z.string().nullable().optional(),
  dn_vehicletypecode: z.number(),
});

export type RejectedRow = { index: number; issues: string[] };

export type ParsedFleet = {
  vehicles: FleetVehicle[];
  /** Rows that did not match. Kept out of the list, reported to the log. */
  rejected: RejectedRow[];
};

function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.') || '(row)'}: ${issue.message}`);
}

function toFleetVehicle(row: z.infer<typeof fleetRowSchema>): FleetVehicle {
  return {
    id: row.dn_fleetid,
    name: row.dn_name,
    vehicleNumber: row.dn_vehiclenumber ?? null,
    typeCode: row.dn_vehicletypecode,
  };
}

/** One bad row must not blank the whole picker: rows are parsed one by one. */
export function parseFleetRows(rows: readonly unknown[]): ParsedFleet {
  const vehicles: FleetVehicle[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = fleetRowSchema.safeParse(row);
    if (parsed.success) {
      vehicles.push(toFleetVehicle(parsed.data));
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { vehicles, rejected };
}

const optionalText = z.string().nullable().optional();

/** One row of the `homebaselocations` reference-data entity. */
const homebaseLocationRowSchema = z.looseObject({
  dn_companylocationid: z.string().min(1),
  dn_name: z.string(),
  dn_street: optionalText,
  dn_housenumber: optionalText,
  dn_housenumberaddition: optionalText,
  dn_postalcode: optionalText,
  dn_city: optionalText,
  dn_latitude: z.unknown().optional(),
  dn_longitude: z.unknown().optional(),
});

export type ParsedHomebaseLocations = {
  locations: HomebaseLocation[];
  rejected: RejectedRow[];
};

export function parseHomebaseLocationRows(rows: readonly unknown[]): ParsedHomebaseLocations {
  const locations: HomebaseLocation[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = homebaseLocationRowSchema.safeParse(row);
    if (!parsed.success) {
      rejected.push({ index, issues: describeIssues(parsed.error) });
      return;
    }
    const data = parsed.data;
    locations.push({
      id: data.dn_companylocationid,
      name: data.dn_name,
      street: data.dn_street ?? null,
      houseNumber: data.dn_housenumber ?? null,
      houseNumberAddition: data.dn_housenumberaddition ?? null,
      postalCode: data.dn_postalcode ?? null,
      city: data.dn_city ?? null,
      coordinate: normalizeHomebaseCoordinate(data.dn_latitude, data.dn_longitude),
    });
  });

  return { locations, rejected };
}
