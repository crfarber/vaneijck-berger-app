import type { Ref } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from './theme';

type TextFieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'keyboardType'
  | 'autoComplete'
  | 'textContentType'
  | 'maxLength'
  | 'editable'
  | 'placeholder'
  | 'accessibilityLabel'
  | 'multiline'
  | 'onFocus'
  | 'onBlur'
  | 'autoCapitalize'
> & {
  label?: string;
  /** When true, appends a red asterisk to the visible label. */
  required?: boolean;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  inputRef?: Ref<TextInput>;
};

export function TextField({
  label,
  required = false,
  error,
  containerStyle,
  accessibilityLabel,
  inputRef,
  ...input
}: TextFieldProps) {
  /** `null`/`undefined` = ok; any string (including `''`) = invalid visuals; non-empty = message. */
  const invalid = error !== null && error !== undefined;
  const errorMessage = invalid && error.length > 0 ? error : null;
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, invalid && styles.labelError]}>
          {label}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel ?? label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          input.multiline ? styles.multiline : null,
          invalid ? styles.inputError : null,
        ]}
        {...input}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  labelError: { color: colors.danger },
  requiredMark: { color: colors.danger, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 96, paddingTop: spacing.sm, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 14 },
});
