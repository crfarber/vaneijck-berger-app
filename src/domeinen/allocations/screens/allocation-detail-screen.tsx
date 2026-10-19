import { useCallback, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useLocationReader } from '@/domeinen/location/ui';
import { isPltrType } from '@/domeinen/services';
import { colors, spacing } from '@/shared/ui/theme';
import { useAllocations } from '../hooks/use-allocations';
import { PltrScreen } from './pltr-screen';
import { ServicesScreen } from './services-screen';

/**
 * An accepted allocation opens its services. Planned transport (1012 and 1030) has its own screen.
 * The old list showed a PLTR card for both codes but only navigated 1012 to `PLTRScreen`.
 * While focused (and not previewing), warms a foreground location watch so accept can use a
 * fresh sample for the 500 m check without a cold GPS start.
 */
export function AllocationDetailScreen({
  allocationId,
  preview = false,
  toolbar,
}: {
  allocationId: string;
  /** Opened from the list swipe "Voorbeeld": look, do not accept or start work. */
  preview?: boolean;
  toolbar?: ReactNode;
}) {
  const locationReader = useLocationReader();
  const { sections, isPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );

  useFocusEffect(
    useCallback(() => {
      if (preview) {
        return undefined;
      }
      void locationReader.start();
      return () => {
        locationReader.stop();
      };
    }, [locationReader, preview]),
  );

  if (isPending || !allocation) {
    return (
      <View style={styles.screen}>
        {toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null}
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </View>
    );
  }

  if (isPltrType(allocation.type)) {
    return <PltrScreen allocationId={allocationId} preview={preview} toolbar={toolbar} />;
  }
  return <ServicesScreen allocationId={allocationId} preview={preview} toolbar={toolbar} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
