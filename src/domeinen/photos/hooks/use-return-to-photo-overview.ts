import { router, useNavigation } from 'expo-router';

type OverviewParams = { id: string; serviceId: string } & Record<string, string>;

/**
 * Pops the photo stack back to its root (the overview) instead of navigating to the overview
 * again: a second overview on top of the camera would get a back button that reopens the camera.
 * `router.canDismiss()` cannot guard this — it also counts the app stack, which is always deeper
 * than one screen. When the overview is not underneath (e.g. a deep link), it replaces this
 * screen with the overview.
 */
export function useReturnToPhotoOverview(overviewParams: OverviewParams): () => void {
  const navigation = useNavigation();

  return () => {
    const state = navigation.getState();
    if (state !== undefined && state.routes.length > 1 && state.routes[0]?.name === 'index') {
      navigation.dispatch({ type: 'POP_TO_TOP', target: state.key });
      return;
    }
    router.replace({
      pathname: '/allocations/[id]/services/[serviceId]/photos',
      params: overviewParams,
    });
  };
}
