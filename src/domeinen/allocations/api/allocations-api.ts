import { z } from 'zod';
import type { HttpClient } from '@/shared/api/http-client';
import type { Logger } from '@/shared/logging/logger';
import type { Allocation, Service, VehicleReleaseLocation } from '../domain/types';
import {
  parseAllocationRows,
  parseVehicleReleaseLocationRows,
  allocationRowSchema,
  serviceSchema,
  servicesSchema,
  toAllocation,
  toVehicleReleaseAssignments,
  toVehicleReleaseLocation,
  zipCodeCheckSchema,
} from './schemas';

export type AllocationsApi = {
  /** The overview of the berger. Rows that do not match are logged and left out. */
  list(options?: { signal?: AbortSignal }): Promise<Allocation[]>;
  /** One allocation, including its incident. */
  get(allocationId: string, options?: { signal?: AbortSignal }): Promise<Allocation>;
  getServicesByIncidentId(
    incidentId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Service[]>;
  getService(serviceId: string, options?: { signal?: AbortSignal }): Promise<Service>;
  /** Accepts or declines: the endpoint is the same shape either way, only the status differs
   * (the swagger description literally calls the status "the reason"). */
  accept(allocationId: string, statuscode: number): Promise<void>;
  decline(allocationId: string, statuscode: number): Promise<void>;
  /** Same shape again, one level down: a service instead of the whole allocation. */
  acceptService(serviceId: string, statuscode: number): Promise<void>;
  /** Declines a single service (futile ride or return to dispatch), not the whole allocation. */
  declineService(serviceId: string, statuscode: number): Promise<void>;
  /** Every release location with the vehicles currently waiting there. A location whose
   * assignments fail to load is left out rather than failing the whole list. */
  listVehicleReleases(options?: { signal?: AbortSignal }): Promise<VehicleReleaseLocation[]>;
  /** Hands the whole incident to a colleague, instead of the berger accepting or declining it. */
  reassign(incidentId: string, colleagueId: string): Promise<void>;
  /**
   * Looks up an address by postcode and house number. Used today only by the processing screen's
   * address step (the team's own rebuild, docs/legacy.md) — kept here because the endpoint has no
   * screen-specific concern of its own, same as the other plain HTTP calls in this file.
   */
  checkZipcode(zipcode: string, housenumber: number): Promise<string>;
};

const rowsSchema = z.array(z.unknown());

export function createAllocationsApi(http: HttpClient, logger?: Logger): AllocationsApi {
  const segment = encodeURIComponent;

  return {
    async list({ signal } = {}) {
      const rows = await http.requestJson('/api/allocations', rowsSchema, { signal });
      const { allocations, rejected } = parseAllocationRows(rows);
      if (rejected.length > 0) {
        logger?.warn('sync', 'Allocation rows skipped', { count: rejected.length, rejected });
      }
      return allocations;
    },

    async get(allocationId, { signal } = {}) {
      const row = await http.requestJson(
        `/api/allocations/${segment(allocationId)}/worker`,
        allocationRowSchema,
        {
          signal,
        },
      );
      return toAllocation(row);
    },

    getServicesByIncidentId(incidentId, { signal } = {}) {
      return http.requestJson(
        `/api/services/by-incident-id/${segment(incidentId)}`,
        servicesSchema,
        { signal },
      );
    },

    getService(serviceId, { signal } = {}) {
      return http.requestJson(`/api/services/${segment(serviceId)}`, serviceSchema, { signal });
    },

    async accept(allocationId, statuscode) {
      await http.request(`/api/allocations/${segment(allocationId)}/accept`, {
        method: 'PUT',
        json: statuscode,
        responseType: 'none',
      });
    },

    async decline(allocationId, statuscode) {
      await http.request(`/api/allocations/${segment(allocationId)}/decline`, {
        method: 'PUT',
        json: statuscode,
        responseType: 'none',
      });
    },

    async acceptService(serviceId, statuscode) {
      await http.request(`/api/services/${segment(serviceId)}/accept`, {
        method: 'PUT',
        json: statuscode,
        responseType: 'none',
      });
    },

    async declineService(serviceId, statuscode) {
      await http.request(`/api/services/${segment(serviceId)}/decline`, {
        method: 'PUT',
        json: statuscode,
        responseType: 'none',
      });
    },

    async listVehicleReleases({ signal } = {}) {
      const rawLocations = await http.requestJson('/api/vehicle-releases/locations', rowsSchema, {
        signal,
      });
      const { locations, rejected } = parseVehicleReleaseLocationRows(rawLocations);
      if (rejected.length > 0) {
        logger?.warn('sync', 'Vehicle-release locations skipped', {
          count: rejected.length,
          rejected,
        });
      }

      const results = await Promise.allSettled(
        locations.map(async (location) => {
          const rawAssignments = await http.requestJson(
            `/api/vehicle-releases/${segment(location.dn_locationId)}/assignments`,
            rowsSchema,
            { signal },
          );
          return toVehicleReleaseLocation(location, toVehicleReleaseAssignments(rawAssignments));
        }),
      );

      const releases: VehicleReleaseLocation[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          releases.push(result.value);
        } else {
          logger?.warn('sync', 'Vehicle-release assignments could not be loaded', {
            locationId: locations[index]?.dn_locationId,
            error: result.reason,
          });
        }
      });
      return releases;
    },

    async reassign(incidentId, colleagueId) {
      await http.request(`/api/incidents/${segment(incidentId)}/reassign/${segment(colleagueId)}`, {
        method: 'POST',
        responseType: 'none',
      });
    },

    checkZipcode(zipcode, housenumber) {
      return http.requestJson('/api/check/zipcode', zipCodeCheckSchema, {
        method: 'POST',
        json: { zipcode, housenumber },
      });
    },
  };
}
