import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/ui/button';
import { CollapsibleSectionHeader } from '@/shared/ui/collapsible-section-header';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { AllocationRow } from '../components/allocation-row';
import { VehicleReleaseRow } from '../components/vehicle-release-row';
import { hasActiveAllocations } from '../domain/sections';
import type { AllocationListBucket } from '../domain/status';
import type { Allocation, VehicleReleaseLocation } from '../domain/types';
import { useAllocations } from '../hooks/use-allocations';

type Row = Allocation | VehicleReleaseLocation;
type SectionKey = AllocationListBucket | 'vehicle_releases';
type ListSection = {
  key: SectionKey;
  title: string;
  collapsed: boolean;
  count: number;
  data: readonly Row[];
};

function isVehicleRelease(item: Row): item is VehicleReleaseLocation {
  return 'dn_locationId' in item;
}

export function AllocationsScreen({ toolbar }: { toolbar?: ReactNode } = {}) {
  const { t } = useTranslation();
  const { sections, isPending, isError, isRefetching, refetch } = useAllocations();
  const [active, pending, vehicleReleases] = sections;
  const activeWork = hasActiveAllocations(sections);
  const [collapsed, setCollapsed] = useState<ReadonlySet<SectionKey>>(() => new Set());

  const toggleSection = (key: SectionKey): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const listSections: ListSection[] = [active, pending, vehicleReleases].map((section) => {
    const isCollapsed = collapsed.has(section.type);
    return {
      key: section.type,
      title: `${t(`allocations.sections.${section.type}`)}`,
      count: section.data.length,
      collapsed: isCollapsed,
      data: isCollapsed ? [] : section.data,
    };
  });

  const toolbarHeader =
    toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {isPending ? (
        <ActivityIndicator style={styles.center} color={colors.text} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t('allocations.loadFailed')}</Text>
          <Button label={t('common.retry')} onPress={() => void refetch()} />
        </View>
      ) : (
        <SectionList<Row, ListSection>
          sections={listSections}
          style={styles.listViewport}
          keyExtractor={(item) =>
            isVehicleRelease(item) ? item.dn_locationId : item.dn_allocationid
          }
          ListHeaderComponent={toolbarHeader}
          renderItem={({ item, section }) =>
            isVehicleRelease(item) ? (
              <VehicleReleaseRow location={item} />
            ) : (
              <AllocationRow
                allocation={item}
                bucket={section.key as AllocationListBucket}
                hasActiveAllocations={activeWork}
              />
            )
          }
          renderSectionHeader={({ section }) => (
            <CollapsibleSectionHeader
              title={section.title}
              count={section.count}
              collapsed={section.collapsed}
              onPress={() => toggleSection(section.key)}
            />
          )}
          renderSectionFooter={({ section }) =>
            !section.collapsed && section.data.length === 0 ? (
              <Text style={styles.sectionEmpty}>{t('allocations.sectionEmpty')}</Text>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          directionalLockEnabled
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  toolbar: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listViewport: { backgroundColor: 'transparent' },
  list: { paddingHorizontal: spacing.md, backgroundColor: 'transparent' },
  sectionEmpty: {
    ...type.label,
    color: colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: radius.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  separator: { height: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  message: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  title: {
    ...type.large,
    color: colors.text,
    margin: spacing.md,
    marginBottom: 0,
  },
});
