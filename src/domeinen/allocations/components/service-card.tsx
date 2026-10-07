import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { externalMapLinks } from '@/domeinen/services';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { ServiceCardModel } from '../domain/service-card';
import { CardActionButton } from './card-blocks';

/**
 * Dark service face from the old `IncidentServiceCard`: number, party, vehicle, driver, and
 * navigate / call. Accept and photos stay in the footer below this surface.
 */
export function ServiceCard({
  model,
  onPress,
  footer,
  showNavigate = false,
  pendingConnection = false,
}: {
  model: ServiceCardModel;
  onPress?: () => void;
  footer?: ReactNode;
  /** Active (non-preview) services may offer maps when a coordinate is known. */
  showNavigate?: boolean;
  /** Queued mutation for this service — show "waiting for connection". */
  pendingConnection?: boolean;
}) {
  const { t } = useTranslation();
  const type = t(`allocationType.${model.typeKey}`);
  const heading = model.number ?? type;
  const canNavigate = showNavigate && Boolean(model.coordinate);
  const canCall = Boolean(model.phone);

  const openMaps = (): void => {
    if (!model.coordinate) {
      return;
    }
    const links = externalMapLinks(model.coordinate);
    const open = (url: string): void => {
      void Linking.openURL(url).catch(() => {
        Alert.alert(t('common.somethingWrong'));
      });
    };
    Alert.alert(t('pltr.navigate'), undefined, [
      { text: t('pltr.maps.apple'), onPress: () => open(links.apple) },
      { text: t('pltr.maps.google'), onPress: () => open(links.google) },
      { text: t('pltr.maps.waze'), onPress: () => open(links.waze) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const callClient = (): void => {
    if (!model.phone) {
      return;
    }
    void Linking.openURL(`tel:${model.phone}`).catch(() => {
      Alert.alert(t('common.somethingWrong'));
    });
  };

  const body = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Ionicons name="car" size={20} color={colors.brand} />
            <Text style={styles.number} numberOfLines={1}>
              {heading}
            </Text>
          </View>
          {model.party ? <Text style={styles.party}>{model.party}</Text> : null}
        </View>
        <View style={styles.vehicle}>
          {model.vehicle.plate ? (
            <Text style={styles.vehicleLine}>{model.vehicle.plate}</Text>
          ) : null}
          {model.vehicle.brand ? (
            <Text style={styles.vehicleLine}>{model.vehicle.brand}</Text>
          ) : null}
          {model.vehicle.tradeName ? (
            <Text style={styles.vehicleLine}>{model.vehicle.tradeName}</Text>
          ) : null}
          {model.vehicle.color ? (
            <Text style={styles.vehicleLine}>{model.vehicle.color}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.driver}>
          {model.driverName ? <Text style={styles.driverLine}>{model.driverName}</Text> : null}
          <Text style={styles.driverLine}>{type}</Text>
          {pendingConnection ? (
            <Text style={styles.pending}>{t('feedback.pendingConnection')}</Text>
          ) : null}
        </View>
        {canNavigate || canCall ? (
          <View style={styles.actions}>
            {canNavigate ? (
              <CardActionButton label={t('pltr.navigate')} icon="navigate" onPress={openMaps} />
            ) : null}
            {canCall ? (
              <CardActionButton
                label={t('allocations.card.callClient')}
                icon="call"
                onPress={callClient}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.wrap}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={heading}
          onPress={onPress}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.card}>{body}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.xl,
    padding: spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pressed: { opacity: 0.78 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  left: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  number: { flex: 1, color: colors.brand, fontSize: 16, fontWeight: '700' },
  party: { color: colors.background, fontSize: 13 },
  vehicle: { alignItems: 'flex-end', gap: 2 },
  vehicleLine: { color: colors.background, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  driver: { flex: 1, gap: 2 },
  driverLine: { color: colors.background, fontSize: 14, fontWeight: '700' },
  pending: { color: colors.brand, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  footer: { gap: spacing.sm },
});
