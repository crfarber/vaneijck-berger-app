import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import qrflag from '@/assets/images/qrblueflag.png';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { displayVehicleRegistration } from '../domain/license-plate';

/**
 * License-plate chrome: yellow NL plate with flag image, or a neutral plate (same shape, blue
 * strip without flag, non-yellow body) for foreign / RDW-unknown plates.
 */
export function NumberPlate({
  plateNumber,
  vehicleNumber,
  placeholder,
  onPress,
  editable = false,
  chrome = 'auto',
  onChangeText,
  onBlur,
  accessibilityLabel,
  style,
}: {
  plateNumber: string;
  vehicleNumber?: string;
  placeholder?: string;
  onPress?: () => void;
  /** When true, a TextInput is shown instead of static text (external typing). */
  editable?: boolean;
  /**
   * `auto` follows NL sidecode rules (and keeps yellow chrome while typing).
   * `foreign` keeps plate shape with a blue strip (no flag image) and a non-yellow body.
   * `dutch` forces the yellow NL plate regardless of pattern.
   */
  chrome?: 'auto' | 'dutch' | 'foreign';
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { text, variant } = displayVehicleRegistration(plateNumber);
  const isEmpty = text === '';
  const showDutchChrome =
    chrome === 'foreign'
      ? false
      : chrome === 'dutch'
        ? true
        : variant === 'dutch' || isEmpty || (editable && plateNumber.trim() !== '');
  const shown = text !== '' ? text : (placeholder ?? '');

  const body = editable ? (
    <TextInput
      value={plateNumber}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={8}
      style={[styles.plateText, isEmpty && styles.placeholderText, styles.input]}
      accessibilityLabel={accessibilityLabel}
    />
  ) : (
    <View style={styles.platecontainer} accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.plateText, isEmpty && styles.placeholderText]} numberOfLines={1}>
        {shown}
      </Text>
    </View>
  );

  const content = (
    <View style={[styles.container, !showDutchChrome && styles.foreignStretch, style]}>
      <View style={styles.flagContainer}>
        {showDutchChrome ? (
          <Image source={qrflag} resizeMode="cover" style={styles.flagImage} />
        ) : (
          <View style={styles.flagSpacer} />
        )}
      </View>
      <View style={[styles.plateBody, !showDutchChrome && styles.foreignPlateBody]}>
        {body}
        {showDutchChrome && vehicleNumber ? (
          <Text style={styles.vehicleNumber} numberOfLines={1}>
            {vehicleNumber}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (editable || onPress === undefined) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  foreignStretch: {
    alignSelf: 'stretch',
    width: '100%',
  },
  platecontainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
  },
  flagContainer: {
    paddingVertical: 2,
    width: 36,
    backgroundColor: '#0B38A3',
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagImage: {
    width: 36,
    height: 56,
  },
  /** Keeps the blue strip the same height as the NL flag image when no image is shown. */
  flagSpacer: {
    width: 36,
    height: 56,
  },
  plateBody: {
    backgroundColor: colors.brand,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  foreignPlateBody: {
    backgroundColor: colors.background,
  },
  plateText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  input: {
    padding: 0,
    margin: 0,
  },
  pressable: { width: '100%' },
  pressed: { opacity: 0.85 },
});
