import { PHOTO_STATUS, type PhotoStatus } from '@/domeinen/photos';

export function areServicePhotosUploaded(photos: readonly { status: PhotoStatus }[]): boolean {
  return photos.every((photo) => photo.status === PHOTO_STATUS.sent);
}

/** Whether the phase still lacks one of the positions required by its service definition. */
export function needsPhotoConfirmation(
  photosMandatory: readonly string[],
  presentPositions: readonly string[],
): boolean {
  const remaining = [...presentPositions];
  return photosMandatory.some((position) => {
    const index = remaining.indexOf(position);
    if (index < 0) {
      return true;
    }
    remaining.splice(index, 1);
    return false;
  });
}
