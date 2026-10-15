import type { Coordinate } from '@/domeinen/location';

/** Load phase (fase 1) or delivery phase (fase 2). */
export const PHOTO_PHASE = {
  load: 'load',
  delivery: 'delivery',
} as const;

export type PhotoPhase = (typeof PHOTO_PHASE)[keyof typeof PHOTO_PHASE];

export const PHOTO_STATUS = {
  draft: 'draft',
  queued: 'queued',
  sent: 'sent',
  failed: 'failed',
} as const;

export type PhotoStatus = (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS];

export const PHOTO_ROLE = {
  mandatory: 'mandatory',
  additional: 'additional',
} as const;

export type PhotoRole = (typeof PHOTO_ROLE)[keyof typeof PHOTO_ROLE];

/**
 * Categories the berger can pick. Labels for `ImagePosition.name` stay Dutch: that is what the
 * backend and the old app used (`positionMapping.ts`).
 */
export const PHOTO_CATEGORY = {
  OVERVIEW: 'OVERVIEW',
  EXTERIOR: 'EXTERIOR',
  ROOF: 'ROOF',
  INTERIOR: 'INTERIOR',
  DASHBOARD: 'DASHBOARD',
  ENGINE: 'ENGINE',
  TYRES: 'TYRES',
  TRAILER: 'TRAILER',
  CARGO: 'CARGO',
} as const;

export type PhotoCategory = (typeof PHOTO_CATEGORY)[keyof typeof PHOTO_CATEGORY];

export const EXTERIOR_ANGLES = [
  'voor',
  'links-voor',
  'rechts-voor',
  'links',
  'rechts',
  'achter',
  'links-achter',
  'rechts-achter',
] as const;

export type ExteriorAngle = (typeof EXTERIOR_ANGLES)[number];

export const TYRE_POSITIONS = [
  'links-voor',
  'rechts-voor',
  'links-achter',
  'rechts-achter',
] as const;

export type TyrePosition = (typeof TYRE_POSITIONS)[number];

/**
 * What the berger chose. Exterior and tyres need a sub-position; the rest is one slot per
 * category. The stable key for "same type" is built from this (`photoTypeKey`).
 */
export type PhotoPosition =
  | { category: 'EXTERIOR'; angle: ExteriorAngle }
  | { category: 'TYRES'; tyre: TyrePosition }
  | { category: Exclude<PhotoCategory, 'EXTERIOR' | 'TYRES'> };

/**
 * One photo on a service. `isExtra` is never stored: it is decided when the upload form is built
 * (`isExtraForUpload`). Coordinates stay null at capture and are stamped at submit via
 * `attachLocation`; the upload queue still retries if a fix is missing.
 */
export type Photo = {
  readonly id: string;
  readonly serviceId: string;
  readonly incidentId: string;
  readonly allocationId: string;
  readonly phase: PhotoPhase;
  readonly role: PhotoRole;
  readonly position: PhotoPosition;
  /** Absolute path on the device (no `file://` prefix needed for the store). */
  readonly filePath: string;
  readonly coordinate: Coordinate | null;
  /** Epoch milliseconds from the `Clock` when the photo was taken. */
  readonly takenAt: number;
  readonly status: PhotoStatus;
  readonly overrideExisting?: boolean;
  readonly isExtraOverride?: boolean;
};
