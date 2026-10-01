import { z } from 'zod';
import type {
  Allocation,
  Colleague,
  Incident,
  Service,
  VehicleReleaseAssignment,
  VehicleReleaseLocation,
} from '../domain/types';
import type { DeclineReason } from '../domain/decline';

/**
 * Tolerant reader: only what the app relies on is required; every other CRM field is passed
 * through untouched (`looseObject`). A field the backend adds does not break the app; a field
 * the app needs that goes missing fails loudly, at the boundary, with a clear message.
 *
 * Nested list-summary services often omit `statecode`; that must not drop the whole allocation.
 * Missing statecode becomes 0 (active at the CRM). A nested service without `statuscode` is
 * skipped; the allocation still shows.
 */

export const serviceSchema = z
  .looseObject({
    statuscode: z.number(),
    statecode: z.number().nullish(),
    dn_serviceid: z.string().optional(),
    dn_servicetypecode: z.number().nullish(),
    dn_servicenumber: z.string().nullish(),
    dn_vehiclecategorycode: z.number().nullish(),
    dn_concatlicenseplate: z.string().nullish(),
    dn_vehiclebrand: z.string().nullish(),
    dn_vehicletradename: z.string().nullish(),
    dn_driverfullname: z.string().nullish(),
    dn_registrationownertelephonenumber1: z.string().nullish(),
    dn_vwe_vehicleinformationid: z.looseObject({ vwe_rdw_kleur1: z.string().nullish() }).nullish(),
    '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': z.string().nullish(),
    '_dn_insurancecompanyid_value@OData.Community.Display.V1.FormattedValue': z.string().nullish(),
  })
  .transform((service) => ({
    ...service,
    statecode: service.statecode ?? 0,
  }));

const incidentRowSchema = z.looseObject({
  dn_incidentid: z.string(),
  statuscode: z.number(),
  dn_name: z.string().nullish(),
  createdon: z.string().nullish(),
  dn_street: z.string().nullish(),
  dn_housenumber: z.string().nullish(),
  dn_housenumberadditions: z.string().nullish(),
  dn_postalcodeid: z.string().nullish(),
  dn_city: z.string().nullish(),
  dn_country: z.string().nullish(),
  dn_concatlocation: z.string().nullish(),
  dn_lcmnumber_vhd: z.string().nullish(),
  /** Parsed per item in `toAllocation` — one broken nested service must not reject the row. */
  dn_dn_incident_dn_service_IncidentId: z.array(z.unknown()).nullish(),
});

export const allocationRowSchema = z.looseObject({
  dn_allocationid: z.string(),
  statuscode: z.number(),
  statecode: z.number(),
  dn_IncidentId: incidentRowSchema,
});

export const servicesSchema = z.array(serviceSchema);

export type RejectedRow = { index: number; issues: string[] };

export type ParsedAllocations = {
  allocations: Allocation[];
  /** Rows that did not match. Kept out of the list, reported to the log. */
  rejected: RejectedRow[];
};

function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.') || '(row)'}: ${issue.message}`);
}

function parseNestedServices(raw: readonly unknown[] | null | undefined): Service[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const services: Service[] = [];
  for (const item of raw) {
    const parsed = serviceSchema.safeParse(item);
    if (parsed.success) {
      services.push(parsed.data);
    }
  }
  return services;
}

/**
 * Maps one CRM row to an Allocation. The services are taken out of the incident so they exist in
 * one place only; the type of the allocation is the type code of its first service.
 */
export function toAllocation(row: z.infer<typeof allocationRowSchema>): Allocation {
  const { dn_dn_incident_dn_service_IncidentId: nestedServices, ...incident } = row.dn_IncidentId;
  const services = parseNestedServices(nestedServices);

  return {
    dn_allocationid: row.dn_allocationid,
    statuscode: row.statuscode,
    statecode: row.statecode,
    incident: incident as Incident,
    services,
    type: services?.[0]?.dn_servicetypecode ?? undefined,
  };
}

/** One bad row must not blank the whole overview: rows are parsed one by one. */
export function parseAllocationRows(rows: readonly unknown[]): ParsedAllocations {
  const allocations: Allocation[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = allocationRowSchema.safeParse(row);
    if (parsed.success) {
      allocations.push(toAllocation(parsed.data));
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { allocations, rejected };
}

/**
 * One row of the `dn_allocation_statuscode` reference-data entity: the CRM's own list of every
 * allocation status, PascalCase like the CRM option-set it mirrors (unlike the `dn_`-prefixed
 * entity rows elsewhere) — this is a plain value/label pair, not a full entity.
 */
const declineReasonRowSchema = z.looseObject({
  Value: z.number(),
  Text: z.string(),
});

export type ParsedDeclineReasons = { reasons: DeclineReason[]; rejected: RejectedRow[] };

export function parseDeclineReasonRows(rows: readonly unknown[]): ParsedDeclineReasons {
  const reasons: DeclineReason[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = declineReasonRowSchema.safeParse(row);
    if (parsed.success) {
      reasons.push({ value: parsed.data.Value, text: parsed.data.Text });
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { reasons, rejected };
}

/** A vehicle waiting at a release location. Every field is optional: the app only ever displays it. */
const vehicleReleaseAssignmentSchema = z.looseObject({
  dn_serviceid: z.string().optional(),
  _dn_locationid_value: z.string().optional(),
  dn_vehiclebrand: z.string().nullish(),
  dn_vehicletradename: z.string().nullish(),
  dn_concatlicenseplate: z.string().nullish(),
  dn_vwe_vehicleinformationid: z.looseObject({ vwe_rdw_kleur1: z.string().nullish() }).nullish(),
});

/** A release location without an id cannot be matched to its assignments; reject it, not the rest. */
const vehicleReleaseLocationRowSchema = z.looseObject({
  dn_locationId: z.string(),
  dn_name: z.string().nullish(),
});

export type ParsedVehicleReleaseLocations = {
  locations: Array<{ dn_locationId: string; dn_name: string | null }>;
  rejected: RejectedRow[];
};

export function parseVehicleReleaseLocationRows(
  rows: readonly unknown[],
): ParsedVehicleReleaseLocations {
  const locations: Array<{ dn_locationId: string; dn_name: string | null }> = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = vehicleReleaseLocationRowSchema.safeParse(row);
    if (parsed.success) {
      locations.push({
        dn_locationId: parsed.data.dn_locationId,
        dn_name: parsed.data.dn_name ?? null,
      });
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { locations, rejected };
}

export function toVehicleReleaseAssignments(rows: readonly unknown[]): VehicleReleaseAssignment[] {
  return rows.flatMap((row) => {
    const parsed = vehicleReleaseAssignmentSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export function toVehicleReleaseLocation(
  location: { dn_locationId: string; dn_name: string | null },
  assignments: readonly VehicleReleaseAssignment[],
): VehicleReleaseLocation {
  return {
    dn_locationId: location.dn_locationId,
    dn_name: location.dn_name,
    releases: assignments,
  };
}

/**
 * One row of the `dn_collegues` reference-data entity: a worker this berger can forward an
 * incident to. The live rows have no separate `id`; `dn_workerid` is the guid the reassign call
 * needs, and `dn_name` is the label. Extra CRM fields (`@odata.etag`, `modifiedon`) stay ignored.
 */
const colleagueRowSchema = z.looseObject({
  dn_workerid: z.string(),
  dn_name: z.string(),
});

export type ParsedColleagues = { colleagues: Colleague[]; rejected: RejectedRow[] };

export function parseColleagueRows(rows: readonly unknown[]): ParsedColleagues {
  const colleagues: Colleague[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = colleagueRowSchema.safeParse(row);
    if (parsed.success) {
      colleagues.push({
        id: parsed.data.dn_workerid,
        workerId: parsed.data.dn_workerid,
        name: parsed.data.dn_name,
      });
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { colleagues, rejected };
}

/** The zipcode-check response is a single formatted-address string; the endpoint has no richer
 * model (confirmed against the live swagger — the generated client itself only typed it `unknown`). */
export const zipCodeCheckSchema = z.string();
