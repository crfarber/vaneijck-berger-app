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
    expect(source).toContain('matchLocalCopies(visibleServerPhotos, localCurrentPhotos)');
    expect(source).toContain('...(copy ? { uri: copy.uri } : remoteImage(photo.url))');
  });

  it('hides server photos of a type that has a pending mandatory override', () => {
    expect(source).toContain('pendingOverrideTypeKeys(phasePhotos)');
    expect(source).toContain('visibleServerPhotos');
    expect(source).toContain('photo.isExtra === true');
    expect(source).toContain("isExtraOverride: '0'");
    expect(source).toContain('asOverrideDraft');
    expect(source).toContain('overrideExisting: photo.overrideExisting === true');
    expect(source).toContain('localsForOverview(phasePhotos)');
    expect(source).toContain('pickMandatoryAndExtra(requirements, usablePhotos)');
    expect(source).toContain('replacementDrafts');
    expect(source).toContain('regularDrafts');
    expect(source).toContain("t('photos.sendQueued')");
    expect(source).toContain("t('photos.queuedBadge')");
    expect(source).toContain('canRetake');
    expect(source).toContain('extraTileLabel');
  });

  it('shows stand-position help only on the first mandatory take, not on retake', () => {
    expect(source).toContain("...(photo === null ? { help: '1' } : {})");
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

  it('goes back to the service form underneath instead of pushing it forward', () => {
    const formPath = '/allocations/[id]/services/[serviceId]/form';
    const releaseFormPath = '/vehicle-releases/[locationId]/services/[serviceId]/form';
    expect(source).toContain('photoRouteParams({');
    expect(source).toContain('goBackOrReplace(router, {');
    expect(source).toContain(`pathname: '${formPath}'`);
    expect(source).toContain(`pathname: '${releaseFormPath}'`);
    expect(source).toContain('if (succeeded) {\n      leaveToServiceForm();');
    expect(source).toContain('onPress={leaveToServiceForm}');
    expect(source).not.toContain('router.navigate(');
    expect(source).not.toContain('router.dismissTo(');
  });
});
