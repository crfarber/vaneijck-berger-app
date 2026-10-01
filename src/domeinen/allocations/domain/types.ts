/**
 * The shapes the app works with. They mirror the CRM (Dynamics) entities the backend passes on
 * (`dn_*` fields), but only the fields the app has rules for are typed. Everything else is kept
 * in the index signature: the processing screens post a lot of CRM fields the app does not read.
 */

export type Service = {
  readonly statuscode: number;
  readonly statecode: number;
  readonly dn_serviceid?: string;
  readonly dn_servicenumber?: string | null;
  readonly dn_servicetypecode?: number | null;
  readonly dn_vehiclecategorycode?: number | null;
  readonly dn_concatlicenseplate?: string | null;
  readonly dn_vehiclebrand?: string | null;
  readonly dn_vehicletradename?: string | null;
  readonly dn_vwe_vehicleinformationid?: { readonly vwe_rdw_kleur1?: string | null } | null;
  readonly dn_driverfullname?: string | null;
  readonly dn_drivertelephonenumber1?: string | null;
  readonly dn_registrationownertelephonenumber1?: string | null;
  readonly ['_dn_clientid_value@OData.Community.Display.V1.FormattedValue']?: string | null;
  readonly ['_dn_insurancecompanyid_value@OData.Community.Display.V1.FormattedValue']?:
    string | null;
  readonly dn_loadlatitude?: number | null;
  readonly dn_loadlongitude?: number | null;
  readonly dn_deliverylatitude?: number | null;
  readonly dn_deliverylongitude?: number | null;
  readonly dn_imactionstatuscode?: number | null;
  readonly _dn_allocationid_value?: string;
  readonly _dn_incidentid_value?: string;
} & { readonly [field: string]: unknown };

export type Incident = {
  readonly dn_incidentid: string;
  readonly statuscode: number;
  readonly dn_name?: string;
  readonly createdon?: string;
  readonly dn_city?: string;
  readonly dn_street?: string;
  readonly dn_housenumber?: string;
  readonly dn_housenumberadditions?: string;
  readonly dn_postalcodeid?: string;
  readonly dn_country?: string;
  readonly dn_concatlocation?: string;
  readonly dn_lcmnumber_vhd?: string;
  readonly dn_latitude?: number;
  readonly dn_longtitude?: number;
  readonly dn_momentofexecution?: string;
} & { readonly [field: string]: unknown };

export type Allocation = {
  readonly dn_allocationid: string;
  readonly statuscode: number;
  readonly statecode: number;
  readonly incident: Incident;
  /** Null while only the list summary is known (the services are fetched when the berger opens the allocation). */
  readonly services: readonly Service[] | null;
  /** The type of the allocation is the type of its first service. */
  readonly type?: number;
};

/** A vehicle waiting to be handed over at a release location. */
export type VehicleReleaseAssignment = {
  readonly dn_serviceid?: string;
  readonly _dn_locationid_value?: string;
  readonly dn_vehiclebrand?: string | null;
  readonly dn_vehicletradename?: string | null;
  readonly dn_concatlicenseplate?: string | null;
  readonly dn_vwe_vehicleinformationid?: { readonly vwe_rdw_kleur1?: string | null } | null;
} & { readonly [field: string]: unknown };

/** One release location with the vehicles currently waiting there. */
export type VehicleReleaseLocation = {
  readonly dn_locationId: string;
  readonly dn_name: string | null;
  readonly releases: readonly VehicleReleaseAssignment[];
};

/** A colleague this berger can forward a pending allocation to (reference data `dn_collegues`).
 * `id` and `workerId` are both `dn_workerid`: the entity has no separate row id. */
export type Colleague = {
  readonly id: string;
  readonly workerId: string;
  readonly name: string;
};
