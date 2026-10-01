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
  placeholder,
  onPress,
  editable = false,
  onChangeText,
  onBlur,
  accessibilityLabel,
  style,
}: {
  plateNumber: string;
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
    <Text
      style={[styles.plateText, isEmpty && styles.placeholderText]}
      numberOfLines={1}
      accessibilityLabel={accessibilityLabel}
    >
      {shown}
    </Text>
  );

  const content = showDutchChrome ? (
    <View style={[styles.container, style]}>
      <View style={styles.flagContainer}>
        <Image source={qrflag} resizeMode="cover" style={styles.flagImage} />
      </View>
      <View style={styles.plateBody}>{body}</View>
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
  flagContainer: {
    paddingVertical: 2,
    width: 36,
    backgroundColor: '#0B38A3',
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
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  pressable: { width: '100%' },
  pressed: { opacity: 0.85 },
});
