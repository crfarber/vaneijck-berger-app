import { z } from 'zod';

/** `GET /api/check/rdw/registrationnumber/{plate}` — only the fields the app uses. */
export const rdwInfoSchema = z.looseObject({
  licensePlate: z.string().nullish(),
  model: z.string().nullish(),
  tradeName: z.string().nullish(),
  primaryColor: z.string().nullish(),
});

export type RdwInfo = {
  licensePlate?: string | null;
  model?: string | null;
  tradeName?: string | null;
  primaryColor?: string | null;
};
