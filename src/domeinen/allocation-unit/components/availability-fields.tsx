import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { RadioButton } from '@/shared/ui/radio-button';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { AVAILABILITY_OPTIONS, type UnitAvailability } from '../domain/availability';

/** The four restriction toggles, shared by the external and internal registration screens. */
export function AvailabilityFields({
  availability,
  onToggle,
  onFullyAvailable,
}: {
  availability: UnitAvailability;
  onToggle: (key: keyof UnitAvailability, value: boolean) => void;
  onFullyAvailable: () => void;
}) {
  const { t } = useTranslation();
  const fullyAvailable = AVAILABILITY_OPTIONS.every((key) => !availability[key]);
  const hasRestrictions = AVAILABILITY_OPTIONS.some((key) => availability[key]);

  return (
    <>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: fullyAvailable }}
        accessibilityLabel={t('unit.fullyAvailable')}
        onPress={onFullyAvailable}
        style={({ pressed }) => [
          styles.choice,
          fullyAvailable && styles.choiceSelected,
          pressed && styles.pressed,
        ]}
      >
        <RadioButton selected={fullyAvailable} accessibilityLabel={t('unit.fullyAvailable')} />
        <Text style={styles.choiceLabel}>{t('unit.fullyAvailable')}</Text>
      </Pressable>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: hasRestrictions }}
          onPress={() => {
            if (!hasRestrictions) {
              onToggle('notAvailableForIM', true);
            }
          }}
          style={({ pressed }) => [
            styles.cardHeader,
            hasRestrictions && styles.cardHeaderSelected,
            pressed && styles.pressed,
          ]}
        >
          <RadioButton selected={hasRestrictions} accessibilityLabel={t('unit.withRestrictions')} />
          <Text style={styles.choiceLabel}>{t('unit.withRestrictions')}</Text>
        </Pressable>
        {AVAILABILITY_OPTIONS.map((key, index) => {
          const on = availability[key];
          return (
            <View key={key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(`unit.${key}`)}
                onPress={() => onToggle(key, !on)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.toggleLabel}>{t(`unit.${key}`)}</Text>
                <Switch
                  value={on}
                  onValueChange={(value) => onToggle(key, value)}
                  pointerEvents="none"
                  trackColor={{
                    false: Platform.OS === 'ios' ? colors.border : colors.textMuted,
                    true: colors.brand,
                  }}
                  thumbColor={colors.background}
                  ios_backgroundColor={colors.border}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  choice: {
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  choiceSelected: { borderColor: colors.text, borderWidth: 2 },
  choiceLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardHeaderSelected: { backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    minHeight: 56,
  },
  pressed: { backgroundColor: colors.surface },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
