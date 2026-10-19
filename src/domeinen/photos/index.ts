export { createPhotosApi } from './api/photos-api';
export type {
  ListServerPhotosInput,
  PhotosApi,
  ServerPhotoSummary,
  UploadPhotoInput,
} from './api/photos-api';
export { isExtraForUpload } from './domain/extra';
export { commentForPhase, photoPhaseFromServiceStatus } from './domain/phase';
export { parsePhaseNumbersParam } from './domain/phase-numbers-param';
export {
  deliveryPhotoRequirements,
  EXTRA_PHOTO_CATEGORIES,
  missingPhotoPositions,
  photoPositionForRequirement,
  reconcileHistoryPositions,
  requiresPhotoPositionDetail,
  unmatchedLoadPhotos,
} from './domain/photo-position-options';
export {
  photoPositionFromRouteParam,
  photoPositionToRouteParam,
} from './domain/photo-position-route';
export {
  isExteriorAngle,
  isMandatoryPhotoCategory,
  isPhotoCategory,
  isTyrePosition,
  MANDATORY_PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABEL,
  photoRequirementName,
  photoTypeKey,
  simplePhotoPosition,
  toImagePosition,
} from './domain/photo-type';
export { standGridIndex, isOnVehicleSubject } from './domain/stand-grid-index';
export { matchLocalCopies } from './domain/local-copies';
export {
  ANDROID_ZOOM_2X,
  androidZoomPresets,
  clampCameraZoom,
  iosZoomPresetsFromLenses,
} from './domain/camera-zoom';
export type { CameraZoomPreset } from './domain/camera-zoom';
export type { ImagePositionPayload } from './domain/photo-type';
export {
  EXTERIOR_ANGLES,
  PHOTO_CATEGORY,
  PHOTO_PHASE,
  PHOTO_ROLE,
  PHOTO_STATUS,
  TYRE_POSITIONS,
} from './domain/types';
export type {
  ExteriorAngle,
  Photo,
  PhotoCategory,
  PhotoPhase,
  PhotoPosition,
  PhotoRole,
  PhotoStatus,
  TyrePosition,
} from './domain/types';
export { utcStringFromEpoch } from './domain/utc';
export { createInMemoryPhotoFiles } from './service/photo-files';
export type { PhotoFiles } from './service/photo-files';
export { createPhotoLocationReader } from './service/photo-location-reader';
export { createPhotoRepository } from './service/photo-repository';
export type { PhotoRepository } from './service/photo-repository';
export { createPhotoService, migrateLegacyPhotos } from './service/photo-service';
export type {
  CapturePhotoInput,
  PhotoScheduler,
  PhotoService,
  PhotoServiceDeps,
} from './service/photo-service';
