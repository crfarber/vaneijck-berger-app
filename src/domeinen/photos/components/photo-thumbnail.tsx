import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

type PhotoThumbnailProps = {
  uri: string;
  label: string;
};

export function PhotoThumbnail({ uri, label }: PhotoThumbnailProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surface },
  label: { padding: spacing.sm, color: colors.text, fontSize: 14, fontWeight: '700' },
});
