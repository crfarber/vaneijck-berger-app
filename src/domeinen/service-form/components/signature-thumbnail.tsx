import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { hasSignatureInk } from '@/domeinen/signatures';
import { colors, radius, spacing } from '@/shared/ui/theme';

/** Compact preview of a captured JPEG signature data URL; empty sheet when no ink. */
export function SignatureThumbnail({
  uri,
  invalid = false,
  style,
}: {
  uri: unknown;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ink = hasSignatureInk(uri);
  return (
    <View style={[styles.box, invalid && styles.boxError, style]}>
      {ink ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: uri as string }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 114,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  boxError: {
    borderColor: colors.danger,
  },
  image: { width: '100%', height: '100%' },
});
