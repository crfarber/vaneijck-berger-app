import { Image, StyleSheet, View } from 'react-native';
import { hasSignatureInk } from '@/domeinen/signatures';
import { colors, radius, spacing } from '@/shared/ui/theme';

/** Compact preview of a captured JPEG signature data URL. */
export function SignatureThumbnail({ uri }: { uri: unknown }) {
  if (!hasSignatureInk(uri)) {
    return null;
  }
  return (
    <View style={styles.box}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: uri as string }}
        style={styles.image}
        resizeMode="contain"
      />
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
  image: { width: '100%', height: '100%' },
});
