// These run on the UI thread inside pinch/pan gestures, hence the 'worklet' directives.

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 4;
export const PHOTO_ZOOM_DOUBLE_TAP = 2.5;

export function clampPhotoZoom(scale: number): number {
  'worklet';
  if (!Number.isFinite(scale)) return PHOTO_ZOOM_MIN;
  return Math.min(PHOTO_ZOOM_MAX, Math.max(PHOTO_ZOOM_MIN, scale));
}

/** Offset of a photo scaled around its center, limited so its edge never passes the viewport edge. */
export function clampPhotoPan(offset: number, scale: number, size: number): number {
  'worklet';
  const limit = (size * (scale - 1)) / 2;
  if (limit <= 0 || !Number.isFinite(offset)) return 0;
  return Math.min(limit, Math.max(-limit, offset));
}

export function nextDoubleTapZoom(scale: number): number {
  'worklet';
  return scale > PHOTO_ZOOM_MIN ? PHOTO_ZOOM_MIN : PHOTO_ZOOM_DOUBLE_TAP;
}
