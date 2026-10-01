import type { PermissionKind, PermissionSnapshot } from '../domain/permission-step';

/**
 * Reads and requests the three device permissions the berger needs, and opens the system
 * settings when the dialog will not come back. Never throws for a refusal.
 */
export type DevicePermissions = {
  read(kind: PermissionKind): Promise<PermissionSnapshot>;
  request(kind: PermissionKind): Promise<PermissionSnapshot>;
  openSystemSettings(): Promise<void>;
};
