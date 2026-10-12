import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { colors } from '@/shared/ui/theme';
import { useSession } from '@/domeinen/auth/ui';
import { EndDateField } from '../components/end-date-field';
import { HomebaseField } from '../components/homebase-field';
import { useExtendShift } from '../hooks/use-extend-shift';

/**
 * The shift ended but the unit (plate or fleet vehicle) is still there — only pick a new end time.
 * Ported from the old `SetWorkingHours` screen.
 */
export function ExtendShiftScreen({
  onExtended,
  isOnboarding = true,
  onOpenWork,
}: {
  onExtended: () => void;
  isOnboarding?: boolean;
  onOpenWork?: () => void;
}) {
  const { t } = useTranslation();
  const isInternal = useSession((state) => state.userType === 'internal');
  const { endDate, changeEndDate, homebase, busy, message, done, submit } = useExtendShift({
    isOnboarding,
    onOpenWork,
    isInternal,
  });

  useEffect(() => {
    if (done) {
      onExtended();
    }
  }, [done, onExtended]);

  return (
    <Screen
      footer={
        <Button label={t('unit.extendShiftSubmit')} onPress={() => void submit()} loading={busy} />
      }
    >
      <Text style={styles.title}>{t('unit.extendShiftTitle')}</Text>
      <Text style={styles.hint}>{t('unit.extendShiftHint')}</Text>
      <HomebaseField picker={homebase} />
      <EndDateField endDate={endDate} onChange={changeEndDate} />
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  hint: { fontSize: 15, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 16 },
});
