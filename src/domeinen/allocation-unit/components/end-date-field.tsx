import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { CalendarSVG } from '@/shared/ui/icons/calendar';
import { ClockSVG } from '@/shared/ui/icons/clock';
import { PickerWheelIcon } from '@/shared/ui/icons/picker-wheel';
import { colors, radius, spacing } from '@/shared/ui/theme';
import {
  applyCalendarDate,
  applyPickerValue,
  applyTimeOfDay,
  formatDateForDisplay,
  formatDateInputForDisplay,
  formatTimeForDisplay,
  formatTimeInputForDisplay,
  getDefaultEndDate,
  parseDateInput,
  parseTimeInput,
} from '../domain/working-hours';

type PickerMode = 'date' | 'time';

/**
 * End-of-shift date and time, same two-row card as the old SetWorkingHours screen:
 * typed fields plus a picker-wheel. Android uses the system dialogs; iOS a bottom sheet.
 */
export function EndDateField({
  endDate,
  onChange,
}: {
  endDate: Date | null;
  /** Mirrors the register hooks: applies a candidate, rejecting an invalid one. */
  onChange: (candidate: Date) => boolean;
}) {
  const { t } = useTranslation();
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const [iosMode, setIosMode] = useState<PickerMode | null>(null);
  const dateInput = dateDraft ?? formatDateForDisplay(endDate);
  const timeInput = timeDraft ?? formatTimeForDisplay(endDate);

  const now = (): Date => new Date();

  const applyCandidate = (candidate: Date): void => {
    if (onChange(candidate)) {
      setDateDraft(null);
      setTimeDraft(null);
    }
  };

  const commitDateInput = (): void => {
    const parsed = parseDateInput(dateInput);
    if (parsed === null) {
      setDateDraft(null);
      return;
    }
    applyCandidate(applyCalendarDate(endDate, parsed.day, parsed.month, parsed.year, now()));
  };

  const commitTimeInput = (): void => {
    const parsed = parseTimeInput(timeInput);
    if (parsed === null) {
      setTimeDraft(null);
      return;
    }
    applyCandidate(applyTimeOfDay(endDate, parsed.hours, parsed.minutes, now()));
  };

  const applyPicked = (picked: Date, mode: PickerMode): void => {
    applyCandidate(applyPickerValue(endDate, picked, mode, now()));
  };

  const openPicker = (mode: PickerMode): void => {
    const value = endDate ?? now();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        onChange: (_event, picked) => {
          if (picked) {
            applyPicked(picked, mode);
          }
        },
      });
      return;
    }
    setIosMode(mode);
  };

  const pickerValue = endDate ?? now();

  return (
    <>
      <Text style={styles.sectionTitle}>{t('unit.endDateSectionTitle')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <CalendarSVG color={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('unit.dateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={dateInput}
              onChangeText={(text) => setDateDraft(formatDateInputForDisplay(text))}
              onBlur={commitDateInput}
              placeholder={t('unit.datePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              maxLength={14}
              selectTextOnFocus
              accessibilityLabel={t('unit.dateLabel')}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unit.changeEndDate')}
            onPress={() => openPicker('date')}
            hitSlop={8}
            style={styles.pickerButton}
          >
            <PickerWheelIcon color={colors.textMuted} size={20} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.icon}>
            <ClockSVG color={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('unit.timeLabel')}</Text>
            <TextInput
              style={styles.input}
              value={timeInput}
              onChangeText={(text) => setTimeDraft(formatTimeInputForDisplay(text))}
              onBlur={commitTimeInput}
              placeholder={t('unit.timePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              maxLength={5}
              selectTextOnFocus
              accessibilityLabel={t('unit.timeLabel')}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unit.changeEndDate')}
            onPress={() => openPicker('time')}
            hitSlop={8}
            style={styles.pickerButton}
          >
            <PickerWheelIcon color={colors.textMuted} size={20} />
          </Pressable>
        </View>
      </View>

      <Button
        label={t('unit.quickSetPlus8')}
        variant="secondary"
        onPress={() => applyCandidate(getDefaultEndDate(now()))}
      />

      {Platform.OS === 'ios' ? (
        <BottomSheet
          visible={iosMode !== null}
          title={iosMode === 'time' ? t('unit.timeLabel') : t('unit.dateLabel')}
          closeLabel={t('common.cancel')}
          onClose={() => setIosMode(null)}
          footer={
            <Button
              label={t('common.ok')}
              onPress={() => {
                setIosMode(null);
              }}
            />
          }
        >
          {iosMode !== null ? (
            <DateTimePicker
              value={pickerValue}
              mode={iosMode}
              display="spinner"
              locale="nl-NL"
              onChange={(_event, picked) => {
                if (picked) {
                  applyPicked(picked, iosMode);
                }
              }}
            />
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  input: { fontSize: 18, fontWeight: '600', color: colors.text, padding: 0 },
  pickerButton: { padding: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
