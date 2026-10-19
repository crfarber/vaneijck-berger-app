import { z } from 'zod';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Clock, KeyValueStore } from '@/shared/platform/ports';
import type { Logger } from '@/shared/logging/logger';
import { applyAdvice, clearAdvice, emptyStandbyState, expireAdvice } from '../domain/state';
import type {
  StandbyAdviceStatus,
  StandbyLocationAdvice,
  StandbyLocationAdviceFields,
  StandbyLocationState,
} from '../domain/types';

export const STANDBY_LOCATION_STORAGE_KEY = 'standbyLocation.pending';

const adviceSchema = z.object({
  standbyLocationId: z.string(),
  name: z.string().optional(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  street: z.string().optional(),
  houseNo: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  receivedAt: z.string().min(1),
});

const persistedSchema = z.object({
  pendingAdvice: adviceSchema.nullable(),
  status: z.enum(['active', 'expired']).nullable(),
});

export type StandbyLocationService = {
  getState(): StandbyLocationState;
  subscribe(listener: (state: StandbyLocationState) => void): () => void;
  hydrate(): Promise<void>;
  /** Stamps `receivedAt` from the clock and stores the advice. */
  apply(fields: StandbyLocationAdviceFields, options: { hasBlockingItems: boolean }): void;
  expire(): void;
  clear(): Promise<void>;
};

export type StandbyLocationServiceDeps = {
  store: KeyValueStore;
  clock: Clock;
  logger?: Logger;
};

function toAdvice(raw: z.infer<typeof adviceSchema>): StandbyLocationAdvice {
  return {
    standbyLocationId: raw.standbyLocationId,
    name: raw.name,
    latitude: raw.latitude,
    longitude: raw.longitude,
    street: raw.street,
    houseNo: raw.houseNo,
    city: raw.city,
    postalCode: raw.postalCode,
    receivedAt: raw.receivedAt,
  };
}

/**
 * Client-side standby advice: vanilla Zustand plus KeyValueStore, cleared on sign-out.
 */
export function createStandbyLocationService(
  deps: StandbyLocationServiceDeps,
): StandbyLocationService {
  const { store, clock, logger } = deps;
  const api: StoreApi<StandbyLocationState> = createStore<StandbyLocationState>()(() =>
    emptyStandbyState(),
  );

  let persistGeneration = 0;

  function persist(state: StandbyLocationState): void {
    const generation = ++persistGeneration;
    const payload = JSON.stringify({
      pendingAdvice: state.pendingAdvice,
      status: state.status,
    });
    void store.setItem(STANDBY_LOCATION_STORAGE_KEY, payload).catch((error: unknown) => {
      if (generation === persistGeneration) {
        logger?.warn('standby-location', 'Could not save standby advice', { error });
      }
    });
  }

  function setAdviceState(next: Pick<StandbyLocationState, 'pendingAdvice' | 'status'>): void {
    const state: StandbyLocationState = { ...next, hydrated: true };
    api.setState(state);
    persist(state);
  }

  return {
    getState: () => api.getState(),
    subscribe(listener) {
      return api.subscribe((state) => listener(state));
    },

    async hydrate() {
      try {
        const raw = await store.getItem(STANDBY_LOCATION_STORAGE_KEY);
        if (raw === null || raw === '') {
          api.setState({ ...emptyStandbyState(), hydrated: true });
          return;
        }
        const parsed = persistedSchema.safeParse(JSON.parse(raw) as unknown);
        if (!parsed.success) {
          api.setState({ ...emptyStandbyState(), hydrated: true });
          return;
        }
        const status: StandbyAdviceStatus | null = parsed.data.status;
        api.setState({
          pendingAdvice:
            parsed.data.pendingAdvice === null ? null : toAdvice(parsed.data.pendingAdvice),
          status,
          hydrated: true,
        });
      } catch (error) {
        logger?.warn('standby-location', 'Could not load standby advice', { error });
        api.setState({ ...emptyStandbyState(), hydrated: true });
      }
    },

    apply(fields, options) {
      const advice: StandbyLocationAdvice = {
        ...fields,
        receivedAt: new Date(clock.now()).toISOString(),
      };
      setAdviceState(applyAdvice(api.getState(), advice, options.hasBlockingItems));
    },

    expire() {
      const next = expireAdvice(api.getState());
      if (next === null) {
        return;
      }
      setAdviceState(next);
    },

    async clear() {
      persistGeneration += 1;
      api.setState({ ...clearAdvice(), hydrated: true });
      try {
        await store.removeItem(STANDBY_LOCATION_STORAGE_KEY);
      } catch (error) {
        logger?.warn('standby-location', 'Could not clear standby advice', { error });
      }
    },
  };
}
