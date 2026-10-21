export type PhotoFlowContext = {
  allocationId: string;
  serviceId: string;
  incidentId: string;
  serviceStatuscode: number;
  /** Phase numbers from the synced service definition; empty until the definition is ready. */
  phaseNumbers?: readonly number[];
  /** Locatie-afgifte: keeps the photo stack on the release form when leaving. */
  locationId?: string;
};

export type PhotoCaptureMode = 'mandatory' | 'extra';

/** Shared route params for every screen in the photo stack. */
export function photoRouteParams(ctx: PhotoFlowContext): Record<string, string> & {
  id: string;
  serviceId: string;
} {
  const params: Record<string, string> & { id: string; serviceId: string } = {
    id: ctx.allocationId,
    serviceId: ctx.serviceId,
    incidentId: ctx.incidentId,
    statuscode: String(ctx.serviceStatuscode),
  };
  if (ctx.phaseNumbers !== undefined && ctx.phaseNumbers.length > 0) {
    params.phaseNumbers = ctx.phaseNumbers.join(',');
  }
  if (ctx.locationId !== undefined && ctx.locationId !== '') {
    params.locationId = ctx.locationId;
  }
  return params;
}
