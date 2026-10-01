import type { ReferenceDataService } from '@/domeinen/reference-data';
import { HttpError } from '@/shared/api/errors';
import type { Logger } from '@/shared/logging/logger';
import type { Clock } from '@/shared/platform/ports';
import { err, ok, type Result } from '@/shared/result';
import type { AllocationUnitApi, AllocationUnitInfo } from '../api/allocation-unit-api';
import { parseFleetRows, parseHomebaseLocationRows } from '../api/schemas';
import { DEFAULT_AVAILABILITY, type UnitAvailability } from '../domain/availability';
import type { FleetVehicle } from '../domain/fleet';
import type { HomebaseLocation } from '../domain/homebase';
import { decideReregister, type ReregisterOutcome } from '../domain/reregister';

/** The `dn_fleets` reference-data entity: trucks and trailers, not a dedicated fleet endpoint. */
const FLEET_ENTITY_NAME = 'dn_fleets';

export const HOMEBASE_ENTITY_NAME = 'homebaselocations';

/** Backend ProblemDetails.detail when the worker already has an open incident/allocation. */
const ACTIVE_INCIDENT_DETAIL = 'ACTIVE_INCIDENT';

export type RegisterExternalInput = {
  plateNumber: string;
  endDate: Date;
  availability: UnitAvailability;
};

export type RegisterInternalInput = {
  vehicleId: string;
  trailerId: string | null;
  endDate: Date;
  availability: UnitAvailability;
  homebaseLocationId: string;
};

/** Expected failures when creating or updating a unit. */
export type RegisterUnitFailure = 'request-failed' | 'active-incident';

/** Expected failures when only refreshing the shift end time on an existing unit. */
export type ExtendShiftFailure = RegisterUnitFailure | 'no-unit';

/** Expected failures when ending the current unit before sign-out. */
export type CancelUnitFailure = 'cancel-failed' | 'missing-id';

export type AllocationUnitService = {
  getCurrent(): Promise<AllocationUnitInfo | null>;
  /** Registers a new unit, or updates the existing one — whichever applies right now. */
  registerExternal(input: RegisterExternalInput): Promise<Result<void, RegisterUnitFailure>>;
  /** Registers a new unit, or updates the existing one — whichever applies right now. */
  registerInternal(input: RegisterInternalInput): Promise<Result<void, RegisterUnitFailure>>;
  /**
   * Keeps the existing vehicle and availability; only patches `validUntil`.
   * Used when the shift expired but the unit is otherwise fine (old SetWorkingHours).
   * `homebaseLocationId` is only sent for an internal (fleet vehicle) unit.
   */
  extendShift(
    endDate: Date,
    options?: { homebaseLocationId?: string },
  ): Promise<Result<void, ExtendShiftFailure>>;
  /**
   * Cancels the current unit on the server. No unit is success; a unit without `id` or a
   * backend failure is an error (sign-out must not continue).
   */
  cancelCurrentUnit(): Promise<Result<void, CancelUnitFailure>>;
  checkReregister(hasActiveAllocations: boolean): Promise<ReregisterOutcome>;
  /** The company's trucks and trailers for an internal berger to pick from. Empty when the
   * reference-data sync has not brought them in yet, not an error. */
  getFleet(): Promise<FleetVehicle[]>;
  /** Synced company locations for the homebase picker; empty before the first sync. */
  getHomebaseLocations(): Promise<HomebaseLocation[]>;
};

/** Maps a thrown registration error to a Result error the UI can act on. */
export function classifyRegistrationError(error: unknown): RegisterUnitFailure {
  if (error instanceof HttpError && error.problem?.detail === ACTIVE_INCIDENT_DETAIL) {
    return 'active-incident';
  }
  return 'request-failed';
}

export type AllocationUnitServiceDeps = {
  api: AllocationUnitApi;
  referenceDataService: ReferenceDataService;
  clock: Clock;
  logger?: Logger;
};

function toCurrentUnit(unit: AllocationUnitInfo | null) {
  if (unit === null) {
    return null;
  }
  return {
    // External: a plate is set. Internal: a vehicle id is set. A unit has at most one of the two.
    hasVehicle: Boolean(unit.vehicleId) || Boolean(unit.alternateVehicleRegistrationNumber),
    validUntil: unit.validUntil ? Date.parse(unit.validUntil) : null,
  };
}

function availabilityFromUnit(unit: AllocationUnitInfo): UnitAvailability {
  return {
    notAvailableForIM: unit.notAvailableForIM ?? DEFAULT_AVAILABILITY.notAvailableForIM,
    onlyAvailableForTransport:
      unit.onlyAvailableForTransport ?? DEFAULT_AVAILABILITY.onlyAvailableForTransport,
    onlyAvailableForBreakdown:
      unit.onlyAvailableForBreakdown ?? DEFAULT_AVAILABILITY.onlyAvailableForBreakdown,
    notAvailableForAllocation:
      unit.notAvailableForAllocation ?? DEFAULT_AVAILABILITY.notAvailableForAllocation,
  };
}

export function createAllocationUnitService(
  deps: AllocationUnitServiceDeps,
): AllocationUnitService {
  const { api, referenceDataService, clock, logger } = deps;

  return {
    getCurrent: () => api.getCurrent(),

    async registerExternal({ plateNumber, endDate, availability }) {
      try {
        const existing = await api.getCurrent();
        const input = { plateNumber, validUntil: endDate.toISOString(), availability };
        if (existing === null) {
          await api.registerExternal(input);
        } else {
          await api.updateExternal(input);
        }
        return ok(undefined);
      } catch (error) {
        logger?.warn('app', 'Allocation-unit registration failed', { error });
        return err(classifyRegistrationError(error));
      }
    },

    async registerInternal({ vehicleId, trailerId, endDate, availability, homebaseLocationId }) {
      try {
        const existing = await api.getCurrent();
        const input = {
          vehicleId,
          trailerId,
          validUntil: endDate.toISOString(),
          availability,
          homebaseLocationId,
        };
        if (existing === null) {
          await api.registerInternal(input);
        } else {
          await api.updateInternal(input);
        }
        return ok(undefined);
      } catch (error) {
        logger?.warn('app', 'Allocation-unit registration failed', { error });
        return err(classifyRegistrationError(error));
      }
    },

    async extendShift(endDate, options = {}) {
      try {
        const existing = await api.getCurrent();
        if (existing === null) {
          return err('no-unit');
        }
        const availability = availabilityFromUnit(existing);
        const validUntil = endDate.toISOString();
        const plate = existing.alternateVehicleRegistrationNumber?.trim();
        if (plate) {
          await api.updateExternal({ plateNumber: plate, validUntil, availability });
          return ok(undefined);
        }
        const vehicleId = existing.vehicleId?.trim();
        if (vehicleId) {
          await api.updateInternal({
            vehicleId,
            trailerId: existing.trailerId ?? null,
            validUntil,
            availability,
            homebaseLocationId: options.homebaseLocationId,
          });
          return ok(undefined);
        }
        return err('no-unit');
      } catch (error) {
        logger?.warn('app', 'Allocation-unit extend-shift failed', { error });
        return err(classifyRegistrationError(error));
      }
    },

    async cancelCurrentUnit() {
      try {
        const existing = await api.getCurrent();
        if (existing === null) {
          return ok(undefined);
        }
        const id = existing.id?.trim();
        if (!id) {
          logger?.warn('app', 'Allocation-unit cancel skipped: unit has no id');
          return err('missing-id');
        }
        await api.cancel(id);
        return ok(undefined);
      } catch (error) {
        logger?.warn('app', 'Allocation-unit cancel failed', { error });
        return err('cancel-failed');
      }
    },

    async checkReregister(hasActiveAllocations) {
      const unit = await api.getCurrent();
      return decideReregister(toCurrentUnit(unit), { hasActiveAllocations, now: clock.now() });
    },

    async getFleet() {
      const raw = await referenceDataService.getEntity(FLEET_ENTITY_NAME);
      if (raw === null) {
        return [];
      }
      const { vehicles, rejected } = parseFleetRows(raw);
      if (rejected.length > 0) {
        logger?.warn('app', 'Some fleet rows failed to parse', { count: rejected.length });
      }
      return vehicles;
    },

    async getHomebaseLocations() {
      const raw = await referenceDataService.getEntity(HOMEBASE_ENTITY_NAME);
      if (raw === null) {
        return [];
      }
      const { locations, rejected } = parseHomebaseLocationRows(raw);
      if (rejected.length > 0) {
        logger?.warn('app', 'Some homebase location rows failed to parse', {
          count: rejected.length,
        });
      }
      return locations;
    },
  };
}
