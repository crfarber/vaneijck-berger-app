/**
 * The berger's own worker record (`GET /api/workers`). Only the fields this app has a rule for are
 * typed; the rest is kept in the index signature like the other CRM-backed shapes.
 */
export type Worker = {
  readonly dn_workerid: string;
  readonly dn_name?: string | null;
  readonly dn_canforwardallocationcode: boolean;
  /** Current availability; drives the header pill. Missing means "unknown" (warning tone). */
  readonly dn_availabilitystatuscode?: number | null;
} & { readonly [field: string]: unknown };
