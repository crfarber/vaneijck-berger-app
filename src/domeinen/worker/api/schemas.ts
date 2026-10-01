import { z } from 'zod';
import type { AvailabilityOption } from '../domain/availability';

/**
 * Tolerant reader for `GET /api/workers`: only the fields this app has a rule for are required.
 * `dn_canforwardallocationcode` arrives as a CRM boolean but is read defensively (also accepts
 * 0/1) and defaults to false when missing, same spirit as `serviceSchema`'s `statecode` default.
 */
const workerRowSchema = z.looseObject({
  dn_workerid: z.string(),
  dn_name: z.string().nullish(),
  dn_canforwardallocationcode: z.union([z.boolean(), z.number()]).nullish(),
  dn_availabilitystatuscode: z.number().nullish(),
});

export const workerSchema = workerRowSchema.transform((row) => ({
  ...row,
  dn_canforwardallocationcode:
    row.dn_canforwardallocationcode === true || row.dn_canforwardallocationcode === 1,
  dn_availabilitystatuscode: row.dn_availabilitystatuscode ?? null,
}));

/** Like the allocation unit: no worker record yet answers 404, or 2xx with an empty/`null` body. */
export const currentWorkerSchema = workerSchema.nullish();

/**
 * One row of the `dn_availabilitystatuscode` reference-data entity — PascalCase Value/Text like
 * the CRM option-set it mirrors (same shape as allocation decline reasons).
 */
const availabilityOptionRowSchema = z.looseObject({
  Value: z.number(),
  Text: z.string(),
});

export type RejectedRow = { index: number; issues: string[] };

export type ParsedAvailabilityOptions = {
  options: AvailabilityOption[];
  rejected: RejectedRow[];
};

function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
}

export function parseAvailabilityOptionRows(rows: readonly unknown[]): ParsedAvailabilityOptions {
  const options: AvailabilityOption[] = [];
  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = availabilityOptionRowSchema.safeParse(row);
    if (parsed.success) {
      options.push({ value: parsed.data.Value, text: parsed.data.Text });
    } else {
      rejected.push({ index, issues: describeIssues(parsed.error) });
    }
  });

  return { options, rejected };
}
