import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import type { UnitAvailability } from '../domain/availability';
import { currentAllocationUnitSchema, type AllocationUnitInfo } from './schemas';

export type { AllocationUnitInfo } from './schemas';

export type ExternalUnitInput = {
  plateNumber: string;
  /** ISO date-time. */
  validUntil: string;
  availability: UnitAvailability;
};

export type InternalUnitInput = {
  vehicleId: string;
  trailerId: string | null;
  /** ISO date-time. */
  validUntil: string;
  availability: UnitAvailability;
  /** `dn_companylocationid` of the chosen homebase; left out of the body when absent. */
  homebaseLocationId?: string;
};

export type AllocationUnitApi = {
  /** The signed-in worker's current unit, or null when none exists yet. */
  getCurrent(): Promise<AllocationUnitInfo | null>;
  registerExternal(input: ExternalUnitInput): Promise<void>;
  updateExternal(input: ExternalUnitInput): Promise<void>;
  registerInternal(input: InternalUnitInput): Promise<void>;
  updateInternal(input: InternalUnitInput): Promise<void>;
  /** Ends the current unit on the server so the next login must register again. */
  cancel(id: string): Promise<void>;
};

export function createAllocationUnitApi(http: HttpClient): AllocationUnitApi {
  const segment = encodeURIComponent;

  const externalBody = (input: ExternalUnitInput) => ({
    alternateVehicleRegistrationNumber: input.plateNumber,
    validUntil: input.validUntil,
    ...input.availability,
  });

  const internalBody = (input: InternalUnitInput) => ({
    vehicleId: input.vehicleId,
    trailerId: input.trailerId,
    validUntil: input.validUntil,
    ...input.availability,
    ...(input.homebaseLocationId !== undefined
      ? { homebaseLocationId: input.homebaseLocationId }
      : {}),
  });

  return {
    async getCurrent() {
      try {
        const unit = await http.requestJson('/api/allocation-units', currentAllocationUnitSchema);
        return unit ?? null;
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    async registerExternal(input) {
      await http.request('/api/allocation-units/externalworker', {
        method: 'POST',
        json: externalBody(input),
        responseType: 'none',
      });
    },

    async updateExternal(input) {
      await http.request('/api/allocation-units', {
        method: 'PATCH',
        json: externalBody(input),
        responseType: 'none',
      });
    },

    async registerInternal(input) {
      await http.request('/api/allocation-units/internalworker', {
        method: 'POST',
        json: internalBody(input),
        responseType: 'none',
      });
    },

    async updateInternal(input) {
      await http.request('/api/allocation-units', {
        method: 'PATCH',
        json: internalBody(input),
        responseType: 'none',
      });
    },

    async cancel(id) {
      await http.request(`/api/allocation-units/${segment(id)}/cancel`, {
        method: 'POST',
        responseType: 'none',
      });
    },
  };
}
