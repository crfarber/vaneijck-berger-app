import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./photo-overview-screen.tsx', import.meta.url), 'utf8');

describe('photo overview screen', () => {
  it('resolves server photos locally first using the phase requirements', () => {
    expect(source).toContain('positions(loadMandatoryKey)');
    expect(source).toContain('deliveryPhotoRequirements(required, loadPositions)');
    expect(source).toContain('!copiedLocalIds.has(photo.id)');
    expect(source).toContain('remoteLoadPhotos.map((photo, index)');
  });

  it('shows the local copy of a sent photo instead of fetching it from the server', () => {
    expect(source).toContain('matchLocalCopies(serverPhotos, localCurrentPhotos)');
    expect(source).toContain('...(copy ? { uri: copy.uri } : remoteImage(photo.url))');
  });

  it('never hands a server url straight to an image without the session-aware download', () => {
    expect(source).not.toMatch(/uri: photo\.url/);
    expect(source).toContain('useServerPhotoUris(allocationId');
    expect(source).toContain('...remoteImage(photo.url)');
  });

  it('shows a loading and an unavailable state for server photos', () => {
    expect(source).toContain("t('photos.imageLoading')");
    expect(source).toContain("t('photos.imageUnavailable')");
  });

  it('opens the zoomable viewer when the photo itself is tapped', () => {
    expect(source).toContain('onPress={zoomable ? () => setZoomOpen(true) : onPress}');
    expect(source).toContain(
      '<PhotoZoomViewer uri={photo.uri} onClose={() => setZoomOpen(false)} />',
    );
    expect(source).not.toContain('<Modal');
  });

  it('keeps retaking a photo on its own button', () => {
    expect(source).toContain('<RetakeButton onPress={onPress} />');
    expect(source).toContain('<RetakeButton onPress={onRetake} />');
  });

  it('only zooms a photo that has finished loading', () => {
    expect(source).toContain("return photo.imageState === undefined && photo.uri !== '';");
  });
});
