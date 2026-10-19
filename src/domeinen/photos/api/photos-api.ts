import { z } from 'zod';
import type { Coordinate } from '@/domeinen/location';
import type { HttpClient } from '@/shared/api/http-client';
import type { MultipartUploadFiles } from '@/shared/platform/ports';
import { commentForPhase } from '../domain/phase';
import { isExteriorAngle, isTyrePosition } from '../domain/photo-type';
import {
  EXTERIOR_ANGLES,
  PHOTO_PHASE,
  TYRE_POSITIONS,
  type ExteriorAngle,
  type PhotoPhase,
  type PhotoPosition,
  type TyrePosition,
} from '../domain/types';

export type UploadPhotoInput = {
  incidentId: string;
  serviceId: string;
  coordinate: Coordinate;
  imagePosition: { name: string; position?: string };
  fileName: string;
  fileBytes: Uint8Array;
  comment: string;
  createdDateTime: string;
  isExtra: boolean;
  overrideExisting?: boolean;
};

export type ListServerPhotosInput = {
  allocationId?: string;
  incidentId: string;
  serviceId: string;
  phase: PhotoPhase;
};

export type ServerPhotoSummary = {
  url: string;
  phase: PhotoPhase;
  position: PhotoPosition;
  isExtra: boolean;
};

export type PhotosApi = {
  upload(input: UploadPhotoInput): Promise<void>;
  list(input: ListServerPhotosInput): Promise<ServerPhotoSummary[]>;
  /** Bytes of a server photo, or null when the url is not on our API and gets no session. */
  download(url: string): Promise<Uint8Array | null>;
};

/** Request path for a photo url on our own API; null for any other host. */
export function photoApiPath(url: string, apiBaseUrl: string): string | null {
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  const base = apiBaseUrl.replace(/\/+$/, '');
  return base !== '' && url.startsWith(`${base}/`) ? url.slice(base.length) : null;
}

const serverPhotoSummaryDtoSchema = z.looseObject({
  url: z.string().min(1),
  phase: z.string(),
  position: z.string().nullish(),
  photoType: z.string(),
  isExtra: z.boolean(),
});

const serverPhotoSummaryRowsSchema = z.array(serverPhotoSummaryDtoSchema);

const SERVER_TYPE_TO_CATEGORY: Readonly<Record<string, PhotoPosition['category']>> = {
  overzicht: 'OVERVIEW',
  overview: 'OVERVIEW',
  buitenkant: 'EXTERIOR',
  exterieur: 'EXTERIOR',
  exterior: 'EXTERIOR',
  dak: 'ROOF',
  roof: 'ROOF',
  interieur: 'INTERIOR',
  interior: 'INTERIOR',
  dashboard: 'DASHBOARD',
  motor: 'ENGINE',
  engine: 'ENGINE',
  banden: 'TYRES',
  tyres: 'TYRES',
  tires: 'TYRES',
  aanhangwagen: 'TRAILER',
  trailer: 'TRAILER',
  lading: 'CARGO',
  cargo: 'CARGO',
};

const LOAD_PHASE_LABELS: ReadonlySet<string> = new Set([
  'aanvang',
  'start',
  'load',
  'loading',
  'fase1',
  'phase1',
]);

const DELIVERY_PHASE_LABELS: ReadonlySet<string> = new Set([
  'aflevering',
  'delivery',
  'fase2',
  'phase2',
]);

type ServerPhotoSummaryDto = z.infer<typeof serverPhotoSummaryDtoSchema>;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
}

/** Longer markers first so "links-voor" wins over "voor" inside "links-voor-1". */
const SERVER_TYPE_MARKERS = Object.keys(SERVER_TYPE_TO_CATEGORY).sort(
  (left, right) => right.length - left.length,
);
const EXTERIOR_ANGLE_MARKERS = [...EXTERIOR_ANGLES].sort(
  (left, right) => right.length - left.length,
);
const TYRE_POSITION_MARKERS = [...TYRE_POSITIONS].sort((left, right) => right.length - left.length);

/**
 * Match like the old app: a server label may carry a suffix (`Dak_1`). Unknown labels stay null
 * (we do not fall back to OVERVIEW).
 */
function categoryFromPhotoType(photoType: string): PhotoPosition['category'] | null {
  const normalized = normalizeToken(photoType);
  const exact = SERVER_TYPE_TO_CATEGORY[normalized];
  if (exact !== undefined) {
    return exact;
  }
  for (const marker of SERVER_TYPE_MARKERS) {
    if (normalized.includes(marker)) {
      return SERVER_TYPE_TO_CATEGORY[marker] ?? null;
    }
  }
  return null;
}

function phaseFromServerLabel(value: string): PhotoPhase | null {
  const normalized = normalizeToken(value).replace(/-/g, '');
  if (LOAD_PHASE_LABELS.has(normalized)) {
    return PHOTO_PHASE.load;
  }
  if (DELIVERY_PHASE_LABELS.has(normalized)) {
    return PHOTO_PHASE.delivery;
  }
  return null;
}

function findExteriorAngle(value: string): ExteriorAngle | null {
  if (isExteriorAngle(value)) {
    return value;
  }
  for (const angle of EXTERIOR_ANGLE_MARKERS) {
    if (value.includes(angle)) {
      return angle;
    }
  }
  return null;
}

function findTyrePosition(value: string): TyrePosition | null {
  if (isTyrePosition(value)) {
    return value;
  }
  for (const tyre of TYRE_POSITION_MARKERS) {
    if (value.includes(tyre)) {
      return tyre;
    }
  }
  return null;
}

function positionFromServer(
  category: PhotoPosition['category'],
  position: string | null | undefined,
): PhotoPosition | null {
  if (category === 'EXTERIOR') {
    const normalized = position ? normalizeToken(position) : '';
    const angle = findExteriorAngle(normalized);
    return angle !== null ? { category, angle } : null;
  }
  if (category === 'TYRES') {
    const normalized = position ? normalizeToken(position) : '';
    const tyre = findTyrePosition(normalized);
    return tyre !== null ? { category, tyre } : null;
  }
  return { category };
}

function mapServerPhotoSummary(
  row: ServerPhotoSummaryDto,
  fallbackPhase: PhotoPhase,
): ServerPhotoSummary | null {
  const category = categoryFromPhotoType(row.photoType);
  if (category === null) {
    return null;
  }
  const position = positionFromServer(category, row.position);
  if (position === null) {
    return null;
  }
  return {
    url: row.url,
    phase: phaseFromServerLabel(row.phase) ?? fallbackPhase,
    position,
    isExtra: row.isExtra,
  };
}

/**
 * `POST /api/binary/upload?content=photo` as multipart. Field names match the old
 * `UploadPhotoAndPosition` form (`IncidentId`, `ServiceId`, `ImagePosition`, `isExtra`, …).
 */
export function createPhotosApi(
  http: HttpClient,
  files: MultipartUploadFiles,
  apiBaseUrl: string,
): PhotosApi {
  return {
    async upload(input) {
      const body = new FormData();
      body.append('IncidentId', input.incidentId);
      body.append('ServiceId', input.serviceId);
      body.append('Latitude', String(input.coordinate.latitude));
      body.append('Longitude', String(input.coordinate.longitude));
      body.append('Comment', input.comment);
      body.append('CreatedDateTime', input.createdDateTime);
      body.append('ImagePosition', JSON.stringify(input.imagePosition));
      body.append('isExtra', input.isExtra ? 'true' : 'false');
      const file = await files.prepare(input.fileBytes, {
        name: input.fileName,
        type: 'image/jpeg',
      });
      try {
        file.appendTo(body, 'file');
        await http.request('/api/binary/upload', {
          method: 'POST',
          query: {
            content: 'photo',
            ...(input.overrideExisting === true ? { overrideExisting: true } : {}),
          },
          body,
          responseType: 'none',
          timeoutMs: 120_000,
        });
      } finally {
        await file.remove();
      }
    },

    async list(input) {
      const segment = encodeURIComponent;
      const rows = await http.requestJson(
        `/api/binary/photos/${segment(input.incidentId)}/${segment(input.serviceId)}/${segment(commentForPhase(input.phase))}`,
        serverPhotoSummaryRowsSchema,
      );
      return rows.flatMap((row) => {
        const mapped = mapServerPhotoSummary(row, input.phase);
        return mapped === null ? [] : [mapped];
      });
    },

    async download(url) {
      const path = photoApiPath(url, apiBaseUrl);
      if (path === null) {
        return null;
      }
      return http.requestBytes(path, { headers: { Accept: 'image/*' }, timeoutMs: 60_000 });
    },
  };
}
