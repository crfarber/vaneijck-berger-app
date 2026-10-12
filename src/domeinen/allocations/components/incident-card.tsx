import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { externalMapLinks } from '@/domeinen/services';
import { SwipeIcon } from '@/shared/ui/icons/swipe-icon';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { formatIncidentClock, type IncidentCardModel } from '../domain/incident-card';
import { useIncidentAge } from '../hooks/use-incident-age';
import { CardActionButton } from './card-blocks';
import { ClockSVG } from '@/shared/ui/icons/clock';

export function IncidentCard({
  model,
  onPress,
  showForward = false,
  onForward,
  preview = false,
  pendingConnection = false,
  swipeable = false,
  showVehicle = false,
}: {
  model: IncidentCardModel;
  onPress?: () => void;
  /** Pending allocation the berger may hand to a colleague (legacy `ForwardButton` on the card). */
  showForward?: boolean;
  onForward?: () => void;
  /** Read-only look from the list: hide navigate, same as the old `previewMode`. */
  preview?: boolean;
  /** Queued mutation for this allocation — show "waiting for connection". */
  pendingConnection?: boolean;
  /** The card sits in a swipeable row with actions behind it — show the swipe hint. */
  swipeable?: boolean;
  /** PLTR screen only: show the vehicle instead of the incident address. */
  showVehicle?: boolean;
}) {
  if (model.kind === 'standard') {
    return (
      <StandardIncidentCard
        model={model}
        onPress={onPress}
        showForward={showForward}
        onForward={onForward}
        preview={preview}
        pendingConnection={pendingConnection}
        swipeable={swipeable}
      />
    );
  }
  return (
    <PltrIncidentCard
      model={model}
      onPress={onPress}
      showForward={showForward}
      onForward={onForward}
      pendingConnection={pendingConnection}
      showVehicle={showVehicle}
      preview={preview}
    />
  );
}

function StandardIncidentCard({
  model,
  onPress,
  showForward,
  onForward,
  preview,
  pendingConnection,
  swipeable,
}: {
  model: Extract<IncidentCardModel, { kind: 'standard' }>;
  onPress?: () => void;
  showForward: boolean;
  onForward?: () => void;
  preview: boolean;
  pendingConnection: boolean;
  swipeable: boolean;
}) {
  const { t } = useTranslation();
  const title = model.title ?? t('allocations.unnamed');
  const clock = model.createdOn ? formatIncidentClock(model.createdOn) : undefined;
  const age = useIncidentAge(model.createdOn);

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

  const call = (): void => {
    if (!model.phone) {
      return;
    }
    void Linking.openURL(`tel:${model.phone}`).catch(() => {
      Alert.alert(t('common.somethingWrong'));
    });
  };

  const main = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Ionicons name="car" size={20} color={colors.text} />
            <Text style={styles.standardTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={styles.lcm}>
            {t('allocations.card.lcm', { reference: model.reference ?? '' })}
          </Text>
        </View>
        {clock ? (
          <View style={styles.clockBlock}>
            <Text style={styles.clockDate}>{clock.date}</Text>
            <View style={styles.clockTimeRow}>
              <ClockSVG size={15} color={colors.text} />
              <Text style={styles.clockTime}>{clock.time}</Text>
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.locationRow}>
        <View style={styles.locationColumn}>
          {model.location.length > 0 ? (
            <Text style={styles.address} numberOfLines={2}>
              {model.location[0]}
            </Text>
          ) : null}
          {model.location[1] ? (
            <Text style={styles.address} numberOfLines={1}>
              {model.location[1]}
            </Text>
          ) : null}
          {model.showCall ? <Text style={styles.address}>{model.phone}</Text> : null}
          {pendingConnection ? (
            <Text style={styles.pending}>{t('feedback.pendingConnection')}</Text>
          ) : null}
        </View>
        <View accessible accessibilityLabel={t('allocations.card.swipeHint')}>
          {swipeable ? (
            <SwipeIcon size={28} color={colors.brandDark} />
          ) : (
            <View style={styles.swipeHint} />
          )}
        </View>
      </View>
    </>
  );

  const showFooter =
    (!preview && model.showNavigate) || model.showCall || showForward || Boolean(age);
  const footer = showFooter ? (
    <View style={styles.footerRow}>
      <View style={styles.pltrActions}>
        {!preview && model.showNavigate ? (
          <CardActionButton label={t('pltr.navigate')} icon="navigate" onPress={openMaps} />
        ) : showForward && onForward ? (
          <CardActionButton
            label={t('allocations.card.forward')}
            icon="arrow-forward"
            onPress={onForward}
          />
        ) : null}
        {model.showCall ? (
          <CardActionButton label={t('allocations.card.callClient')} icon="call" onPress={call} />
        ) : null}
      </View>
      {age ? (
        <View style={styles.agePill}>
          <ClockSVG size={14} color={colors.background} />
          <Text style={styles.ageText}>{age}</Text>
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={styles.standardCard}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          style={({ pressed }) => [styles.mainPressable, pressed && styles.pressed]}
        >
          {main}
        </Pressable>
      ) : (
        <View style={styles.mainPressable}>{main}</View>
      )}
      {footer}
    </View>
  );
}

function PltrIncidentCard({
  model,
  onPress,
  showForward,
  onForward,
  pendingConnection,
  showVehicle,
  preview,
}: {
  model: Extract<IncidentCardModel, { kind: 'pltr' }>;
  onPress?: () => void;
  showForward: boolean;
  onForward?: () => void;
  pendingConnection: boolean;
  showVehicle: boolean;
  preview: boolean;
}) {
  const { t } = useTranslation();
  const title = model.title ?? t('allocations.unnamed');
  const clock = model.createdOn ? formatIncidentClock(model.createdOn) : undefined;
  const age = useIncidentAge(model.createdOn);
  const vehicleLine =
    `${model.vehicle.plate ?? ''}\n${model.vehicle.description ?? ''}\n${model.vehicle.color ?? ''}`
      .split('\n')
      .filter((part): part is string => Boolean(part))
      .join('\n');
  const detailLine = showVehicle ? vehicleLine : model.location[0];
  const localityLine = showVehicle ? undefined : model.location[1];
  const showNavigate = !showVehicle && !preview && model.showNavigate;
  const showCall = !showVehicle && model.showCall;

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

  const call = (): void => {
    if (!model.phone) {
      return;
    }
    void Linking.openURL(`tel:${model.phone}`).catch(() => {
      Alert.alert(t('common.somethingWrong'));
    });
  };

  const main = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <View style={styles.pltrBadge}>
              <Text style={styles.pltrBadgeText}>{t('pltr.badge')}</Text>
            </View>
            <Text style={styles.standardTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {model.party ? <Text style={styles.lcm}>{model.party}</Text> : null}
        </View>
        {clock ? (
          <View style={styles.clockBlock}>
            <Text style={styles.clockDate}>{clock.date}</Text>
            <View style={styles.clockTimeRow}>
              <ClockSVG size={15} color={colors.text} />
              <Text style={styles.clockTime}>{clock.time}</Text>
            </View>
          </View>
        ) : null}
      </View>
      {detailLine || localityLine || showCall || pendingConnection ? (
        <View style={styles.locationColumn}>
          {detailLine ? (
            <Text style={styles.address} numberOfLines={showVehicle ? 3 : 2}>
              {detailLine}
            </Text>
          ) : null}
          {localityLine ? (
            <Text style={styles.address} numberOfLines={1}>
              {localityLine}
            </Text>
          ) : null}
          {showCall ? <Text style={styles.address}>{model.phone}</Text> : null}
          {pendingConnection ? (
            <Text style={styles.pending}>{t('feedback.pendingConnection')}</Text>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const footer =
    showNavigate || showCall || (showForward && onForward) || age ? (
      <View style={styles.footerRow}>
        <View style={styles.pltrActions}>
          {showNavigate ? (
            <CardActionButton label={t('pltr.navigate')} icon="navigate" onPress={openMaps} />
          ) : null}
          {showCall ? (
            <CardActionButton label={t('allocations.card.callClient')} icon="call" onPress={call} />
          ) : null}
          {showForward && onForward ? (
            <CardActionButton
              label={t('allocations.card.forward')}
              icon="arrow-forward"
              onPress={onForward}
            />
          ) : null}
        </View>
        {age ? (
          <View style={styles.agePill}>
            <ClockSVG size={14} color={colors.background} />
            <Text style={styles.ageText}>{age}</Text>
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={styles.standardCard}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          style={({ pressed }) => [styles.mainPressable, pressed && styles.pressed]}
        >
          {main}
        </Pressable>
      ) : (
        <View style={styles.mainPressable}>{main}</View>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  pltrActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: spacing.sm,
  },
  standardCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  mainPressable: { gap: spacing.md },
  pressed: { opacity: 0.78 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleBlock: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  standardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  lcm: { color: colors.text, fontSize: 13 },
  clockBlock: { alignItems: 'flex-end', gap: spacing.xs },
  clockDate: { color: colors.text, fontSize: 14, fontWeight: '600' },
  clockTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  clockTime: { color: colors.text, fontSize: 14 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  locationColumn: { flex: 1, gap: spacing.xs },
  address: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  pending: { color: colors.brandDark, fontSize: 13, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  agePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ageText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pltrBadge: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pltrBadgeText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  swipeHint: { width: 28, height: 28 },
});
