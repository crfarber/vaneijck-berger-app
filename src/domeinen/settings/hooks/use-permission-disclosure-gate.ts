import { useEffect, useState } from 'react';
import {
  DISCLOSURE_ORDER,
  nextDisclosureStep,
  type PermissionKind,
  type PermissionSnapshot,
} from '../index';
import { useDevicePermissions, usePermissionDisclosurePreference } from './settings-context';

export type PermissionDisclosureGateStatus = 'checking' | 'needed' | 'done';

/**
 * Whether the signed-in berger still needs the post-login permission wizard before onboarding.
 */
export function usePermissionDisclosureGate(): PermissionDisclosureGateStatus {
  const preference = usePermissionDisclosurePreference();
  const permissions = useDevicePermissions();
  const [status, setStatus] = useState<PermissionDisclosureGateStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const seen = await preference.readSeen();
      const snapshots: Partial<Record<PermissionKind, PermissionSnapshot>> = {};
      for (const kind of DISCLOSURE_ORDER) {
        snapshots[kind] = await permissions.read(kind);
      }
      if (cancelled) {
        return;
      }
      setStatus(nextDisclosureStep({ seen, snapshots }) === null ? 'done' : 'needed');
    })();
    return () => {
      cancelled = true;
    };
  }, [preference, permissions]);

  return status;
}
