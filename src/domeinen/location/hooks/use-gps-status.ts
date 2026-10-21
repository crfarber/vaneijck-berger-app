import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { PERMISSION_KIND, type PermissionSnapshot } from '@/domeinen/settings';
import { useDevicePermissions } from '@/domeinen/settings/ui';
import { GPS_STATUS, resolveGpsStatus, type GpsStatus } from '../domain/gps-status';
import { resolveCurrentPosition, type CurrentLocation } from '../domain/proximity';
import type { Coordinate } from '../domain/geo';
import { useLocationClock, useLocationReader } from './location-context';

const EMPTY_PERMISSION: PermissionSnapshot = {
  status: 'undetermined',
  canAskAgain: true,
};

export type GpsStatusState = {
  status: GpsStatus;
  permission: PermissionSnapshot;
  position: CurrentLocation;
  coordinate: Coordinate | null;
  lastUpdatedAt: number | null;
  /** True while any location read is in flight; previous coordinate stays until the read finishes. */
  refreshing: boolean;
  /** True only for explicit user-driven refresh (sheet reload / allow access). */
  busy: boolean;
  refresh: (options?: { showBusy?: boolean }) => Promise<void>;
  askOrOpenSettings: () => Promise<void>;
};

/**
 * Shared GPS permission + fix state for the toolbar sheet and the allocations-map banner.
 * Refresh on focus; callers that need live updates while focused schedule extra `refresh` calls.
 */
export function useGpsStatus(): GpsStatusState {
  const reader = useLocationReader();
  const clock = useLocationClock();
  const permissions = useDevicePermissions();
  const [permission, setPermission] = useState<PermissionSnapshot>(EMPTY_PERMISSION);
  const [position, setPosition] = useState<CurrentLocation>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const inflightRef = useRef(0);
  const busyCountRef = useRef(0);

  const refresh = useCallback(
    async (options?: { showBusy?: boolean }): Promise<void> => {
      const showBusy = options?.showBusy === true;
      inflightRef.current += 1;
      setRefreshing(true);
      if (showBusy) {
        busyCountRef.current += 1;
        setBusy(true);
      }
      try {
        const nextPermission = await permissions.read(PERMISSION_KIND.location);
        setPermission(nextPermission);
        const nextPosition = await reader.getCurrent();
        setPosition(nextPosition);
        if (resolveCurrentPosition(nextPosition) !== null) {
          setLastUpdatedAt(clock.now());
        }
      } finally {
        inflightRef.current -= 1;
        if (inflightRef.current === 0) {
          setRefreshing(false);
        }
        if (showBusy) {
          busyCountRef.current -= 1;
          if (busyCountRef.current === 0) {
            setBusy(false);
          }
        }
      }
    },
    [permissions, reader, clock],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const status = resolveGpsStatus(permission, position);
  const coordinate = resolveCurrentPosition(position);

  const askOrOpenSettings = useCallback(async (): Promise<void> => {
    if (status === GPS_STATUS.ask) {
      const next = await permissions.request(PERMISSION_KIND.location);
      setPermission(next);
      await refresh({ showBusy: true });
      return;
    }
    if (status === GPS_STATUS.openSettings) {
      await permissions.openSystemSettings();
    }
  }, [status, permissions, refresh]);

  return {
    status,
    permission,
    position,
    coordinate,
    lastUpdatedAt,
    refreshing,
    busy,
    refresh,
    askOrOpenSettings,
  };
}
