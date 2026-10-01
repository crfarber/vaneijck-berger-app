/**
 * Zoom presets for the in-app camera. expo-camera only exposes a 0–1 digital zoom
 * ratio and (on iOS) localized lens names — not true optical 0.5×/1×/2×/3× factors.
 */

export type CameraZoomPreset = {
  /** Display label without the × suffix, e.g. `0.5`, `1`, `2`. */
  readonly label: string;
  /** Digital zoom 0–1 for Android presets; iOS lens switches reset this to 0. */
  readonly zoom: number;
  /** iOS `selectedLens` value; null on Android digital presets. */
  readonly lens: string | null;
};

/** Same exponential curve expo-camera uses on iOS: factor = maxZoom^zoom with max≈16. */
export const ANDROID_ZOOM_2X = Math.log(2) / Math.log(16);

export function clampCameraZoom(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Map iOS lens localized names to zoom buttons. Only lenses the device reports are
 * returned. Heuristic on EN/NL substrings — no fixed 0.5/1/2/3 for every phone.
 */
export function iosZoomPresetsFromLenses(lenses: readonly string[]): CameraZoomPreset[] {
  const presets: CameraZoomPreset[] = [];
  const ultraWide = lenses.find(isUltraWideLens);
  const wide = lenses.find(isWideLens);
  const tele = lenses.find(isTelephotoLens);

  if (ultraWide) {
    presets.push({ label: '0.5', zoom: 0, lens: ultraWide });
  }
  if (wide) {
    presets.push({ label: '1', zoom: 0, lens: wide });
  } else if (lenses.length > 0 && !ultraWide && !tele) {
    // Single / unnamed lens — treat the first as 1×.
    presets.push({ label: '1', zoom: 0, lens: lenses[0] ?? null });
  }
  if (tele) {
    presets.push({
      label: telephotoLabel(tele),
      zoom: 0,
      lens: tele,
    });
  }

  return presets;
}

/** Android has no lens API — fixed 1× / 2× digital presets. */
export function androidZoomPresets(): CameraZoomPreset[] {
  return [
    { label: '1', zoom: 0, lens: null },
    { label: '2', zoom: ANDROID_ZOOM_2X, lens: null },
  ];
}

function isUltraWideLens(name: string): boolean {
  const n = name.toLocaleLowerCase('en');
  return (
    n.includes('ultra') ||
    n.includes('ultrawide') ||
    n.includes('ultra-wide') ||
    n.includes('ultra wide') ||
    n.includes('ultragroothoek') ||
    n.includes('ultra-groothoek')
  );
}

function isTelephotoLens(name: string): boolean {
  const n = name.toLocaleLowerCase('en');
  return n.includes('tele') || n.includes('telefoto') || n.includes('telephoto');
}

function isWideLens(name: string): boolean {
  if (isUltraWideLens(name) || isTelephotoLens(name)) return false;
  const n = name.toLocaleLowerCase('en');
  return (
    n.includes('wide') ||
    n.includes('groothoek') ||
    n.includes('back') ||
    n.includes('rear') ||
    n.includes('achter')
  );
}

function telephotoLabel(name: string): string {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*x/i);
  if (match?.[1]) {
    return match[1].replace(',', '.');
  }
  if (/\b3\b/.test(name) || name.toLocaleLowerCase('en').includes('3x')) {
    return '3';
  }
  return '2';
}
