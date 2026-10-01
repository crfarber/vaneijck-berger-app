import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import CogIcon from '@/shared/ui/icons/cog';
import EyeIcon from '@/shared/ui/icons/eye';
import { FilesIcon } from '@/shared/ui/icons/files';
import Preview from '@/shared/ui/icons/preview';
import { CarSVG, TowTruckSVG, TruckSVG } from '@/shared/ui/icons/vehicles';
import { colors, spacing } from '@/shared/ui/theme';
import {
  EXTERIOR_ANGLES,
  EXTRA_PHOTO_CATEGORIES,
  PHOTO_CATEGORY,
  TYRE_POSITIONS,
  requiresPhotoPositionDetail,
  type ExteriorAngle,
  type PhotoCategory,
  type PhotoPosition,
  type TyrePosition,
} from '../index';
import { PhotoAngleGrid } from './photo-angle-grid';
import { PhotoPositionButton } from './photo-position-button';

type PhotoPositionPickerProps = {
  value: PhotoPosition | null;
  onChange: (position: PhotoPosition | null) => void;
};

type PhotoCategoryLabelKey =
  | 'photos.positionCategories.overview'
  | 'photos.positionCategories.exterior'
  | 'photos.positionCategories.roof'
  | 'photos.positionCategories.interior'
  | 'photos.positionCategories.dashboard'
  | 'photos.positionCategories.engine'
  | 'photos.positionCategories.tyres'
  | 'photos.positionCategories.trailer'
  | 'photos.positionCategories.cargo';

type ExteriorAngleLabelKey =
  | 'photos.positionAngles.front'
  | 'photos.positionAngles.frontLeft'
  | 'photos.positionAngles.frontRight'
  | 'photos.positionAngles.left'
  | 'photos.positionAngles.right'
  | 'photos.positionAngles.rear'
  | 'photos.positionAngles.rearLeft'
  | 'photos.positionAngles.rearRight';

type TyrePositionLabelKey =
  | 'photos.positionTyres.frontLeft'
  | 'photos.positionTyres.frontRight'
  | 'photos.positionTyres.rearLeft'
  | 'photos.positionTyres.rearRight';

const PHOTO_CATEGORY_OPTIONS: Readonly<
  Record<PhotoCategory, { labelKey: PhotoCategoryLabelKey; icon: ReactNode }>
> = {
  OVERVIEW: { labelKey: 'photos.positionCategories.overview', icon: <Preview size={24} /> },
  EXTERIOR: { labelKey: 'photos.positionCategories.exterior', icon: <CarSVG size={24} /> },
  ROOF: { labelKey: 'photos.positionCategories.roof', icon: <Preview size={24} /> },
  INTERIOR: { labelKey: 'photos.positionCategories.interior', icon: <EyeIcon size={24} /> },
  DASHBOARD: { labelKey: 'photos.positionCategories.dashboard', icon: <CogIcon size={24} /> },
  ENGINE: { labelKey: 'photos.positionCategories.engine', icon: <TowTruckSVG size={24} /> },
  TYRES: { labelKey: 'photos.positionCategories.tyres', icon: <CarSVG size={24} /> },
  TRAILER: { labelKey: 'photos.positionCategories.trailer', icon: <TruckSVG size={24} /> },
  CARGO: { labelKey: 'photos.positionCategories.cargo', icon: <FilesIcon size={24} /> },
};

const EXTERIOR_ANGLE_LABEL_KEYS: Readonly<Record<ExteriorAngle, ExteriorAngleLabelKey>> = {
  voor: 'photos.positionAngles.front',
  'links-voor': 'photos.positionAngles.frontLeft',
  'rechts-voor': 'photos.positionAngles.frontRight',
  links: 'photos.positionAngles.left',
  rechts: 'photos.positionAngles.right',
  achter: 'photos.positionAngles.rear',
  'links-achter': 'photos.positionAngles.rearLeft',
  'rechts-achter': 'photos.positionAngles.rearRight',
};

const TYRE_POSITION_LABEL_KEYS: Readonly<Record<TyrePosition, TyrePositionLabelKey>> = {
  'links-voor': 'photos.positionTyres.frontLeft',
  'rechts-voor': 'photos.positionTyres.frontRight',
  'links-achter': 'photos.positionTyres.rearLeft',
  'rechts-achter': 'photos.positionTyres.rearRight',
};

export function PhotoPositionPicker({ value, onChange }: PhotoPositionPickerProps) {
  const { t } = useTranslation();
  const [detailCategory, setDetailCategory] = useState<PhotoCategory | null>(
    value && requiresPhotoPositionDetail(value.category) ? value.category : null,
  );
  const selectedCategory = detailCategory ?? value?.category;

  const selectCategory = (category: PhotoCategory): void => {
    if (requiresPhotoPositionDetail(category)) {
      setDetailCategory(category);
      if (value?.category !== category) {
        onChange(null);
      }
      return;
    }

    setDetailCategory(null);
    onChange({ category });
  };

  return (
    <View style={styles.content}>
      <Text style={styles.heading}>{t('photos.positionCategory')}</Text>
      <View style={styles.categoryGrid}>
        {EXTRA_PHOTO_CATEGORIES.map((category) => {
          const option = PHOTO_CATEGORY_OPTIONS[category];
          return (
            <View key={category} style={styles.categoryItem}>
              <PhotoPositionButton
                label={t(option.labelKey)}
                selected={selectedCategory === category}
                onPress={() => selectCategory(category)}
                icon={option.icon}
              />
            </View>
          );
        })}
      </View>

      {detailCategory === PHOTO_CATEGORY.EXTERIOR ? (
        <View style={styles.detailSection}>
          <Text style={styles.heading}>{t('photos.positionAngle')}</Text>
          <PhotoAngleGrid
            options={EXTERIOR_ANGLES.map((angle) => ({
              value: angle,
              label: t(EXTERIOR_ANGLE_LABEL_KEYS[angle]),
            }))}
            selectedValue={value?.category === PHOTO_CATEGORY.EXTERIOR ? value.angle : undefined}
            onSelect={(angle) => onChange({ category: PHOTO_CATEGORY.EXTERIOR, angle })}
          />
        </View>
      ) : null}

      {detailCategory === PHOTO_CATEGORY.TYRES ? (
        <View style={styles.detailSection}>
          <Text style={styles.heading}>{t('photos.positionTyre')}</Text>
          <PhotoAngleGrid
            options={TYRE_POSITIONS.map((tyre) => ({
              value: tyre,
              label: t(TYRE_POSITION_LABEL_KEYS[tyre]),
            }))}
            selectedValue={value?.category === PHOTO_CATEGORY.TYRES ? value.tyre : undefined}
            onSelect={(tyre) => onChange({ category: PHOTO_CATEGORY.TYRES, tyre })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  heading: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryItem: { width: '31.5%' },
  detailSection: { gap: spacing.sm, marginTop: spacing.md },
});
