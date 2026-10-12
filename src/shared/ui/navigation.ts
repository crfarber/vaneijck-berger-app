import { colors } from './theme';

export function goBackOrReplace<Route>(
  navigation: {
    canGoBack: () => boolean;
    back: () => void;
    replace: (route: Route) => void;
  },
  fallbackRoute: Route,
): void {
  if (navigation.canGoBack()) {
    navigation.back();
    return;
  }
  navigation.replace(fallbackRoute);
}

export const defaultStackHeaderOptions = {
  headerStyle: { backgroundColor: colors.brand },
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: colors.brandText,
  headerTitleAlign: 'center',
} as const;
