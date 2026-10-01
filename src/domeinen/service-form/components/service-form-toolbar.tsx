import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';

export type ServiceFormToolbarActions = {
  onToggleQuickView?: () => void;
  onOpenPhotos?: () => void;
  onToggleOverview?: () => void;
  onOpenTerms?: () => void;
  onOpenDecline?: () => void;
  quickViewActive?: boolean;
  photosComplete?: boolean;
  overviewActive?: boolean;
};

type ToolbarAction = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
};

/** Row of service-form action buttons; a separate component so it can be placed anywhere on screen. */
export function ServiceFormToolbar({ actions }: { actions?: ServiceFormToolbarActions }) {
  const { t } = useTranslation();
  const actionItems: ToolbarAction[] = [];
  if (actions?.onToggleQuickView) {
    actionItems.push({
      key: 'quickView',
      label: t('serviceForm.actions.quickView'),
      icon: 'flash',
      onPress: actions.onToggleQuickView,
      active: actions.quickViewActive,
    });
  }
  if (actions?.onOpenPhotos) {
    actionItems.push({
      key: 'photos',
      label: t('serviceForm.actions.photos'),
      icon: 'camera-outline',
      onPress: actions.onOpenPhotos,
      active: actions.photosComplete,
      danger: actions.photosComplete === false,
    });
  }
  if (actions?.onToggleOverview) {
    actionItems.push({
      key: 'overview',
      label: t('serviceForm.actions.overview'),
      icon: 'binoculars-outline',
      onPress: actions.onToggleOverview,
      active: actions.overviewActive,
    });
  }
  if (actions?.onOpenTerms) {
    actionItems.push({
      key: 'terms',
      label: t('serviceForm.actions.terms'),
      icon: 'document-text-outline',
      onPress: actions.onOpenTerms,
    });
  }
  if (actions?.onOpenDecline) {
    actionItems.push({
      key: 'decline',
      label: t('serviceForm.actions.decline'),
      icon: 'warning-outline',
      onPress: actions.onOpenDecline,
    });
  }

  if (actionItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.toolbar}>
      {actionItems.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ selected: action.active }}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            action.active && styles.actionActive,
            action.danger && styles.actionDanger,
            pressed && styles.actionPressed,
          ]}
        >
          <Ionicons name={action.icon} size={26} color={colors.brandLight} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
  },
  action: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: colors.brandDarker,
    borderRadius: 6,
  },
  actionActive: { backgroundColor: colors.brandAction },
  actionDanger: { backgroundColor: colors.danger },
  actionPressed: { opacity: 0.7 },
});
