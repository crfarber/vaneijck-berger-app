import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { PersonIcon } from '@/shared/ui/icons/person';
import { CarSVG } from '@/shared/ui/icons/vehicles';
import { colors, radius, spacing } from '@/shared/ui/theme';
import {
  MANDATORY_PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABEL,
  isMandatoryPhotoCategory,
  isOnVehicleSubject,
  standGridIndex,
  type PhotoPosition,
} from '../index';

type MandatoryPhotoHelpPopupProps = {
  position: PhotoPosition;
  onContinue: () => void;
};

/** Floating stand-position help over the live camera preview. */
export function MandatoryPhotoHelpPopup({ position, onContinue }: MandatoryPhotoHelpPopupProps) {
  const { t } = useTranslation();
  const highlightedIndex = standGridIndex(position);
  const onVehicle = isOnVehicleSubject(position);
  const progressCurrent = mandatoryProgress(position);
  const title = helpTitle(position);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.dim} />
      <View style={styles.column}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {progressCurrent !== null ? (
            <Text style={styles.progress} numberOfLines={1}>
              {t('photos.mandatoryPhotoProgress', { current: progressCurrent })}
            </Text>
          ) : null}
          <Text style={styles.description}>
            {t(onVehicle ? 'photos.subjectHelpDescription' : 'photos.angleHelpDescription', {
              area: title.toLocaleLowerCase(),
            })}
          </Text>

          <View style={styles.board}>
            <Text style={styles.boardLabel}>{t('photos.front')}</Text>
            {Array.from({ length: 9 }).map((_, index) => {
              const active = highlightedIndex === index;
              const vehicle = index === 4;
              return (
                <View
                  key={index}
                  style={[styles.cell, vehicle && styles.vehicleCell, active && styles.activeCell]}
                >
                  {vehicle ? <CarSVG size={40} color={colors.brandDarker} /> : null}
                  {active ? (
                    <View style={styles.target}>
                      <PersonIcon size={28} color={colors.text} />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Text style={styles.boardLabel}>{t('photos.rear')}</Text>
          </View>
        </View>
        <Button label={t('photos.continue')} onPress={onContinue} />
      </View>
    </View>
  );
}

function helpTitle(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') return position.angle;
  if (position.category === 'TYRES') return position.tyre;
  return PHOTO_CATEGORY_LABEL[position.category];
}

function mandatoryProgress(position: PhotoPosition): number | null {
  if (!isMandatoryPhotoCategory(position.category)) return null;
  const index = MANDATORY_PHOTO_CATEGORIES.indexOf(
    position.category as (typeof MANDATORY_PHOTO_CATEGORIES)[number],
  );
  return index < 0 ? null : index + 1;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    zIndex: 20,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  column: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  progress: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: spacing.xs },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  board: {
    alignSelf: 'center',
    width: 228,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  boardLabel: {
    width: '100%',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.12,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  cell: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DADDE1',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCell: {
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.text,
  },
  vehicleCell: { backgroundColor: colors.surface, borderStyle: 'solid' },
  target: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
