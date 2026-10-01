import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/shared/ui/theme';
import {
  countryForDialCode,
  LOGIN_COUNTRIES,
  type CountryId,
  type LoginCountry,
} from '../domain/country-codes';

type CountryCodePickerProps = {
  selectedDialCode: string;
  onSelect: (dialCode: string) => void;
};

function countryNameKey(id: CountryId): `login.countries.${CountryId}` {
  return `login.countries.${id}`;
}

export function CountryCodePicker({ selectedDialCode, onSelect }: CountryCodePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = countryForDialCode(selectedDialCode);
  const triggerLabel = selected ? `${selected.flag} ${selected.dialCode}` : selectedDialCode;

  const close = (): void => {
    setOpen(false);
  };

  const choose = (country: LoginCountry): void => {
    onSelect(country.dialCode);
    close();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('login.countryCode')}
        accessibilityValue={{ text: selectedDialCode }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>{triggerLabel}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('login.chooseCountryCode')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={close}
                hitSlop={spacing.md}
              >
                <Text style={styles.closeLabel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {LOGIN_COUNTRIES.map((item) => {
                const isSelected = item.dialCode === selectedDialCode;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => choose(item)}
                    style={({ pressed }) => [
                      styles.item,
                      isSelected && styles.itemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item.flag} {t(countryNameKey(item.id))} {item.dialCode}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 50,
    width: 90,
    borderBottomLeftRadius: radius.md,
    borderTopLeftRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    flexShrink: 0,
  },
  triggerText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  closeLabel: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  item: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.brand, borderRadius: radius.sm },
  itemText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemTextSelected: { color: colors.brandText },
});
