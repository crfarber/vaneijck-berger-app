import type { LocationReader } from '@/domeinen/location';
import { LOCATION_ACCURACY, resolveCurrentPosition } from '@/domeinen/location';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import { isSubmitAllowed } from '@/domeinen/services';
import { HttpError, isRetryable } from '@/shared/api/errors';
import type { Logger } from '@/shared/logging/logger';
import type { ServiceFormApi } from '../api/service-form-api';
import { unwrapServiceFormDefinitions } from '../domain/schema';
import {
  buildSelectOptions,
  type OptionRow,
  type SelectOptionsResult,
} from '../domain/select-options';
import type { RawServiceFormDefinition, ServiceFormSortOptions } from '../domain/types';

export type SelectOptionsRequest = {
  table?: string;
  sortOptions?: ServiceFormSortOptions;
  /** The current answer of `dependencies.required` (the brand, for vehicle types). */
  dependencyValue?: unknown;
};

export type SubmitServiceFormInput = {
  serviceId: string;
  /** The service's status when the form was submitted. */
  statuscode: number | undefined;
  body: Record<string, unknown>;
  /** Locatie-afgifte may submit from OPSLAG (legacy release flow). */
  isReleaseItem?: boolean;
  serviceTypeCode?: number | null;
};

export type SubmitServiceFormResult =
  | { kind: 'submitted' }
  /** The service has moved on to a status that no longer takes a form (e.g. already invoiced). */
  | { kind: 'blocked' };

export type ServiceFormSubmitStage =
  | 'photo-check'
  | 'signature-data'
  | 'signature-validation'
  | 'signature-upload'
  | 'service-update'
  | 'draft-clear';

export function logServiceFormSubmitFailure(
  logger: Logger,
  stage: ServiceFormSubmitStage,
  error: unknown,
): void {
  logger.error('serviceForm', 'Service form submission step failed', {
    stage,
    errorType: error instanceof Error ? error.name : 'UnknownError',
    retryable: isRetryable(error),
    ...(error instanceof HttpError
      ? { status: error.status, traceId: error.problem?.traceId }
      : {}),
  });
}

export type ServiceFormService = {
  /**
   * The `dataDefinition` for a service type, or null when none is available. Scans synced reference
   * data by content (like the old app), never by a hardcoded entity name — new CRM sync entities
   * must work without an app update (docs/functioneel/open-vragen.md, besluit 25). Remembers which
   * entity held which service type after a successful find. A bundled catalog, when injected,
   * replaces that scan and leaves stored reference data unread.
   */
  findDefinition(serviceCode: number): Promise<RawServiceFormDefinition | null>;
  /**
   * Searches again after a missing definition. With synced reference data that means a full
   * resync. A bundled catalog is read again as-is and does not touch stored reference data.
   */
  refreshDefinition(serviceCode: number): Promise<RawServiceFormDefinition | null>;
  /**
   * Re-reads a bundled catalog from its loader (the dev server, in `__DEV__`) and returns the
   * definition for this service type. Null when there is no bundled catalog or it has no match.
   * Does not touch synced reference data. A failed load leaves the previous catalog in place.
   */
  reloadBundledDefinition(serviceCode: number): Promise<RawServiceFormDefinition | null>;
  /** The rows of a synced reference table, e.g. for a yes/no toggle. Empty when never synced. */
  loadTable(table: string): Promise<OptionRow[]>;
  /** The choices of a select field, in the order and with the values of the old app. */
  loadSelectOptions(request: SelectOptionsRequest): Promise<SelectOptionsResult>;
  submit(input: SubmitServiceFormInput): Promise<SubmitServiceFormResult>;
};

export type ServiceFormServiceDeps = {
  api: ServiceFormApi;
  referenceData: Pick<ReferenceDataService, 'getEntity' | 'listEntities' | 'reset' | 'sync'>;
  locationReader: LocationReader;
  logger?: Logger;
  /**
   * When set, form definitions come from this catalog instead of synced reference data.
   * Select tables still come from reference data. The native container sets this in `__DEV__`
   * and in the internal build from `docs/diensten/experiment`.
   */
  bundledDefinitions?: readonly unknown[];
  /** Re-reads the bundled catalog. Only set in `__DEV__`, against the Metro dev server. */
  bundledDefinitionLoader?: () => Promise<readonly unknown[]>;
};

const isRow = (value: unknown): value is OptionRow =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function createServiceFormService(deps: ServiceFormServiceDeps): ServiceFormService {
  const {
    api,
    referenceData,
    locationReader,
    logger,
    bundledDefinitions,
    bundledDefinitionLoader,
  } = deps;
  const entityByServiceCode = new Map<number, string>();
  let catalog =
    bundledDefinitions === undefined ? null : unwrapServiceFormDefinitions(bundledDefinitions);
  let loggedBundledSource = false;

  function readBundled(
    catalog: readonly RawServiceFormDefinition[],
    serviceCode: number,
  ): RawServiceFormDefinition | null {
    if (!loggedBundledSource) {
      loggedBundledSource = true;
      logger?.info(
        'serviceForm',
        'Form definitions come from the bundled catalog, not synced reference data',
      );
    }
    const definition = catalog.find((candidate) => candidate.servicecode === serviceCode) ?? null;
    if (!definition) {
      logger?.warn('serviceForm', 'No bundled form definition for this service type', {
        serviceCode,
      });
    }
    return definition;
  }

  async function definitionsIn(entity: string): Promise<RawServiceFormDefinition[]> {
    return unwrapServiceFormDefinitions(await referenceData.getEntity(entity));
  }

  /** One pass over every synced entity, indexing every definition it comes across. */
  async function scan(serviceCode: number): Promise<RawServiceFormDefinition | null> {
    let found: RawServiceFormDefinition | null = null;
    for (const entity of await referenceData.listEntities()) {
      for (const definition of await definitionsIn(entity)) {
        if (typeof definition.servicecode !== 'number') {
          continue;
        }
        entityByServiceCode.set(definition.servicecode, entity);
        if (definition.servicecode === serviceCode && found === null) {
          found = definition;
        }
      }
    }
    return found;
  }

  async function loadTable(table: string): Promise<OptionRow[]> {
    const rows = await referenceData.getEntity(table);
    return (rows ?? []).filter(isRow);
  }

  return {
    async findDefinition(serviceCode) {
      if (catalog !== null) {
        return readBundled(catalog, serviceCode);
      }
      const known = entityByServiceCode.get(serviceCode);
      if (known !== undefined) {
        const definition = (await definitionsIn(known)).find(
          (candidate) => candidate.servicecode === serviceCode,
        );
        if (definition) {
          return definition;
        }
        entityByServiceCode.delete(serviceCode);
      }
      const definition = await scan(serviceCode);
      if (!definition) {
        logger?.warn('serviceForm', 'No synced form definition for this service type', {
          serviceCode,
        });
      }
      return definition;
    },

    async refreshDefinition(serviceCode) {
      if (catalog !== null) {
        return readBundled(catalog, serviceCode);
      }
      await referenceData.reset();
      const syncResult = await referenceData.sync();
      const definition = await scan(serviceCode);
      if (!definition) {
        logger?.warn('serviceForm', 'No form definition after a full reference-data sync', {
          serviceCode,
          syncedEntities: syncResult.synced.length,
          failedEntities: syncResult.failed,
        });
      }
      return definition;
    },

    async reloadBundledDefinition(serviceCode) {
      if (catalog === null || bundledDefinitionLoader === undefined) {
        return null;
      }
      let next: RawServiceFormDefinition[];
      try {
        next = unwrapServiceFormDefinitions(await bundledDefinitionLoader());
      } catch (error) {
        logger?.warn('serviceForm', 'Could not reload bundled form definitions', {
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
        throw error;
      }
      catalog = next;
      const definition = readBundled(catalog, serviceCode);
      if (definition) {
        logger?.info('serviceForm', 'Reloaded form definition from the dev server', {
          serviceCode,
        });
      }
      return definition;
    },

    loadTable,

    async loadSelectOptions(request) {
      const rows = request.table ? await loadTable(request.table) : [];
      const currentPosition =
        request.sortOptions?.orderby === 'distance'
          ? resolveCurrentPosition(
              await locationReader.getCurrent({ accuracy: LOCATION_ACCURACY.coarse }),
            )
          : null;
      return buildSelectOptions(rows, { ...request, currentPosition });
    },

    async submit({ serviceId, statuscode, body, isReleaseItem, serviceTypeCode }) {
      if (!isSubmitAllowed(statuscode, { isReleaseItem, serviceTypeCode })) {
        logger?.warn('serviceForm', 'Form not sent: the service no longer takes a submit', {
          statuscode,
        });
        return { kind: 'blocked' };
      }
      logger?.info('serviceForm', 'Submitting service form');
      try {
        await api.updateService(serviceId, body);
      } catch (error) {
        logger?.error('serviceForm', 'Service form submission failed', {
          errorType: error instanceof Error ? error.name : 'UnknownError',
          ...(error instanceof HttpError ? { status: error.status } : {}),
        });
        throw error;
      }
      logger?.info('serviceForm', 'Service form submitted');
      return { kind: 'submitted' };
    },
  };
}
