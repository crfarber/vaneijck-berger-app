import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
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
  selected?: boolean;
  variant?: 'default' | 'alert' | 'success';
};

function photoVariant(complete: boolean | undefined): 'default' | 'alert' | 'success' {
  if (complete === false) {
    return 'alert';
  }
  if (complete === true) {
    return 'success';
  }
  return 'default';
}

const COLLAPSE_MS = 180;

/** Row of service-form action buttons; a separate component so it can be placed anywhere on screen. */
export function ServiceFormToolbar({
  actions,
  visible = true,
}: {
  actions?: ServiceFormToolbarActions;
  /** False while the form scrolls down; true again after a short upward scroll. */
  visible?: boolean;
}) {
  const { t } = useTranslation();
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: COLLAPSE_MS,
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [progress, visible]);

  const actionItems: ToolbarAction[] = [];
  if (actions?.onToggleQuickView) {
    actionItems.push({
      key: 'quickView',
      label: t('serviceForm.actions.quickView'),
      icon: 'flash',
      onPress: actions.onToggleQuickView,
      selected: actions.quickViewActive === true,
    });
  }
  if (actions?.onOpenPhotos) {
    actionItems.push({
      key: 'photos',
      label: t('serviceForm.actions.photos'),
      icon: 'camera-outline',
      onPress: actions.onOpenPhotos,
      variant: photoVariant(actions.photosComplete),
    });
  }
  if (actions?.onToggleOverview) {
    actionItems.push({
      key: 'overview',
      label: t('serviceForm.actions.overview'),
      icon: 'binoculars-outline',
      onPress: actions.onToggleOverview,
      selected: actions.overviewActive === true,
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

  const clipHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[styles.clip, contentHeight > 0 ? { height: clipHeight, opacity: progress } : null]}
    >
      <View
        style={styles.inset}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          if (next > contentHeight) {
            setContentHeight(next);
          }
        }}
      >
        <Toolbar>
          {actionItems.map((action) => (
            <ToolbarSlot key={action.key}>
              <ToolbarButton
                accessibilityLabel={action.label}
                onPress={action.onPress}
                selected={action.selected}
                variant={action.variant}
              >
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={action.selected === true ? colors.brandText : colors.background}
                />
              </ToolbarButton>
            </ToolbarSlot>
          ))}
        </Toolbar>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  inset: {
    paddingHorizontal: spacing.md,
  },
});
