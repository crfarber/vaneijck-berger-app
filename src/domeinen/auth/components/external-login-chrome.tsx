import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftSVG } from '@/shared/ui/icons/chevron-left';
import { ScreenFooter } from '@/shared/ui/screen-footer';
import { colors } from '@/shared/ui/theme';

type ExternalLoginChromeProps = {
  title: string;
  onBack: () => void;
  backDisabled: boolean;
  footer: ReactNode;
  children: ReactNode;
};

/** Yellow header, scrolling body and bottom action used by the external login steps. */
export function ExternalLoginChrome({
  title,
  onBack,
  backDisabled,
  footer,
  children,
}: ExternalLoginChromeProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.external}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          disabled={backDisabled}
          onPress={onBack}
          style={styles.headerSide}
        >
          <ChevronLeftSVG />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.headerSide} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        {children}
      </ScrollView>
      <ScreenFooter>{footer}</ScreenFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  external: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: 20, flexGrow: 1 },
  header: {
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSide: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
