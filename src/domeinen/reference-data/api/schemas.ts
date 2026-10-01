import { z } from 'zod';

/** Entity names changed since the given date (or every entity, without one). */
export const schemaListSchema = z.array(z.string());

/**
 * An entity's rows. The item shape is defined by the CRM/Dataverse schema and differs per entity
 * (status sets, option sets, form definitions, ...); this domain treats it as opaque data for
 * whichever later feature reads a specific entity.
 */
export const entityDataSchema = z.array(z.unknown());
