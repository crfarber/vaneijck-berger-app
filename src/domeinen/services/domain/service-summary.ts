export type VehicleSummary = {
  plate?: string;
  description?: string;
  color?: string;
};

export type ServiceContact = { name?: string; phone?: string };

export type ServiceSummarySource = { readonly [field: string]: unknown } | null | undefined;

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function formatted(source: ServiceSummarySource, field: string): string | undefined {
  return source ? text(source[`${field}@OData.Community.Display.V1.FormattedValue`]) : undefined;
}

/** Vehicle details are useful to both ordinary incident services and PLTR. */
export function getServiceVehicle(source: ServiceSummarySource): VehicleSummary {
  const plate = source ? text(source.dn_concatlicenseplate)?.toUpperCase() : undefined;
  const brand = source ? text(source.dn_vehiclebrand) : undefined;
  const trade = source ? text(source.dn_vehicletradename) : undefined;
  const vehicleInfo = source?.dn_vwe_vehicleinformationid;
  const color =
    vehicleInfo && typeof vehicleInfo === 'object'
      ? text((vehicleInfo as { vwe_rdw_kleur1?: unknown }).vwe_rdw_kleur1)?.toUpperCase()
      : undefined;
  const description = brand && trade ? `${brand} ${trade}`.toUpperCase() : undefined;
  return {
    ...(plate ? { plate } : {}),
    ...(description ? { description } : {}),
    ...(color ? { color } : {}),
  };
}

/** Human labels from Dynamics lookups; raw GUID values are deliberately never shown. */
export function getServiceParty(source: ServiceSummarySource): string | undefined {
  const client = formatted(source, '_dn_clientid_value');
  const insurer = formatted(source, '_dn_insurancecompanyid_value');
  return client && insurer ? `${client} / ${insurer}` : (client ?? insurer);
}

export function getServiceContact(source: ServiceSummarySource): ServiceContact | undefined {
  const name = source ? text(source.dn_driverfullname) : undefined;
  const phone = source ? text(source.dn_registrationownertelephonenumber1) : undefined;
  return name || phone ? { ...(name ? { name } : {}), ...(phone ? { phone } : {}) } : undefined;
}
