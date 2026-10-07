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
 * Dutch yellow plate with blue EU strip, or a plain foreign box. Tap opens a picker (internal)
 * or focuses an inline TextInput (external).
 */
export function NumberPlate({
  plateNumber,
  vehicleNumber,
  placeholder,
  onPress,
  editable = false,
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
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { text, variant } = displayVehicleRegistration(plateNumber);
  const isEmpty = text === '';
  const showDutchChrome = variant === 'dutch' || isEmpty || (editable && plateNumber.trim() !== '');
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

  const content = showDutchChrome ? (
    <View style={[styles.container, style]}>
      <View style={styles.flagContainer}>
        <Image source={qrflag} resizeMode="cover" style={styles.flagImage} />
      </View>
      <View style={styles.plateBody}>
        {body}
        {vehicleNumber ? (
          <Text style={styles.vehicleNumber} numberOfLines={1}>
            {vehicleNumber}
          </Text>
        ) : null}
      </View>
    </View>
  ) : (
    <View style={[styles.foreignContainer, style]}>{body}</View>
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
  },
  flagImage: {
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
  foreignContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  pressable: { width: '100%' },
  pressed: { opacity: 0.85 },
});
