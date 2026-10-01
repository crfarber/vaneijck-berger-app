import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import CheckIcon from '@/shared/ui/icons/check';
import { Screen } from '@/shared/ui/screen';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { PHOTO_STATUS, type PhotoStatus } from '../index';
import { PhotoThumbnail } from '../components/photo-thumbnail';
import { useServicePhotos } from '../hooks/use-service-photos';
import type { PhotoFlowContext } from './photo-flow';

type PhotoSentConfirmationScreenProps = PhotoFlowContext & {
  photoId: string;
};

const CONFIRMATION_COPY: Readonly<
  Record<
    PhotoStatus,
    {
      title: 'sentTitle' | 'queuedTitle' | 'failedTitle';
      description: 'sentDescription' | 'queuedDescription' | 'failedDescription';
    }
  >
> = {
  queued: { title: 'queuedTitle', description: 'queuedDescription' },
  sent: { title: 'sentTitle', description: 'sentDescription' },
  failed: { title: 'failedTitle', description: 'failedDescription' },
};

export function PhotoSentConfirmationScreen({
  allocationId,
  serviceId,
  incidentId,
  serviceStatuscode,
  photoId,
}: PhotoSentConfirmationScreenProps) {
  const { t } = useTranslation();
  const { photos, refresh } = useServicePhotos(serviceId);
  const photo = photos.find((item) => item.id === photoId);
  const status = photo?.status ?? PHOTO_STATUS.queued;
  const copy = CONFIRMATION_COPY[status];
  const routeParams = {
    id: allocationId,
    serviceId,
    incidentId,
    statuscode: String(serviceStatuscode),
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Screen
      backgroundColor={colors.background}
      contentStyle={styles.content}
      footer={
        <Button
          label={t('photos.sentConfirmation.done')}
          onPress={() =>
            router.navigate({
              pathname: '/allocations/[id]/services/[serviceId]/photos',
              params: routeParams,
            })
          }
        />
      }
    >
      <View style={styles.message}>
        <View style={[styles.icon, status === PHOTO_STATUS.failed && styles.iconFailed]}>
          <CheckIcon size={32} color={colors.background} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t(`photos.sentConfirmation.${copy.title}`)}
        </Text>
        <Text style={styles.description}>{t(`photos.sentConfirmation.${copy.description}`)}</Text>
      </View>
      {photo ? <PhotoThumbnail uri={photo.displayUri} label={t('photos.extraPhoto')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xl },
  message: { alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colors.success,
  },
  iconFailed: { backgroundColor: colors.danger },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  thumbnail: { borderRadius: radius.md },
});
