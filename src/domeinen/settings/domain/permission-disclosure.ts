import {
  PERMISSION_KIND,
  PERMISSION_STATUS,
  type PermissionKind,
  type PermissionSnapshot,
} from './permission-step';

/** Order matches the old onboarding disclosures: notifications, then location, then camera. */
export const DISCLOSURE_ORDER = [
  PERMISSION_KIND.notifications,
  PERMISSION_KIND.location,
  PERMISSION_KIND.camera,
] as const;

export type DisclosureKind = (typeof DISCLOSURE_ORDER)[number];

/**
 * First kind the berger has not yet dismissed and that is not already granted. Already-granted
 * kinds are skipped without requiring a seen flag (the OS dialog would not appear anyway).
 */
export function nextDisclosureStep(input: {
  seen: ReadonlySet<PermissionKind>;
  snapshots: Partial<Record<PermissionKind, PermissionSnapshot>>;
}): DisclosureKind | null {
  for (const kind of DISCLOSURE_ORDER) {
    if (input.seen.has(kind)) {
      continue;
    }
    const snapshot = input.snapshots[kind];
    if (snapshot?.status === PERMISSION_STATUS.granted) {
      continue;
    }
    return kind;
  }
  return null;
}

/** Returns a new set with `kind` marked as seen. Does not mutate the input. */
export function markDisclosureSeen(
  seen: ReadonlySet<PermissionKind>,
  kind: PermissionKind,
): ReadonlySet<PermissionKind> {
  if (seen.has(kind)) {
    return seen;
  }
  const next = new Set(seen);
  next.add(kind);
  return next;
}

/** Which stored strings are known disclosure kinds. Unknown entries are dropped. */
export function parseDisclosureSeenList(values: readonly string[]): ReadonlySet<PermissionKind> {
  const next = new Set<PermissionKind>();
  for (const value of values) {
    if (
      value === PERMISSION_KIND.notifications ||
      value === PERMISSION_KIND.location ||
      value === PERMISSION_KIND.camera
    ) {
      next.add(value);
    }
  }
  return next;
}

/**
 * After the OS dialog or a return from system settings, complete the disclosure step only when
 * granted. A refusal stays on the step until the berger taps "Later" — so opening settings and
 * coming back without changing rights does not silently dismiss the wizard.
 */
export function shouldCompleteDisclosureStep(snapshot: PermissionSnapshot): boolean {
  return snapshot.status === PERMISSION_STATUS.granted;
}
