/**
 * Android's blur only covers the BlurTargetView (the map), never the scroll content above it, so
 * a light glass footer would show the form straight through its actions.
 */
export const ANDROID_GLASS_BACKGROUND = 'rgba(255, 255, 255, 0.94)';

export function screenFooterBackground(
  backgroundColor: string,
  platform: 'android' | 'ios' | (string & {}),
): string {
  if (platform === 'android' && backgroundColor !== 'transparent') {
    return ANDROID_GLASS_BACKGROUND;
  }
  return backgroundColor;
}
