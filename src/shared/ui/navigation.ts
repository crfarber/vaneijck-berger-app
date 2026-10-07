import { colors } from './theme';

export const defaultStackHeaderOptions = {
  headerStyle: { backgroundColor: colors.brand },
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: colors.brandText,
  headerTitleAlign: 'center',
} as const;
