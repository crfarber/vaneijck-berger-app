import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/shared/ui/theme';
import { clampPhotoPan, clampPhotoZoom, nextDoubleTapZoom } from '../domain/photo-zoom';

/** Full-screen photo with pinch-to-zoom, drag and double-tap. Mount only while open. */
export function PhotoZoomViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = window.width - insets.left - insets.right;
  const height = window.height - insets.top - insets.bottom;
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.set(scale.get());
    })
    .onUpdate((event) => {
      const next = clampPhotoZoom(startScale.get() * event.scale);
      scale.set(next);
      offsetX.set(clampPhotoPan(offsetX.get(), next, width));
      offsetY.set(clampPhotoPan(offsetY.get(), next, height));
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.set(offsetX.get());
      startY.set(offsetY.get());
    })
    .onUpdate((event) => {
      offsetX.set(clampPhotoPan(startX.get() + event.translationX, scale.get(), width));
      offsetY.set(clampPhotoPan(startY.get() + event.translationY, scale.get(), height));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.set(withTiming(nextDoubleTapZoom(scale.get())));
      offsetX.set(withTiming(0));
      offsetY.set(withTiming(0));
    });

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView
        style={[
          styles.root,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.safeArea}>
          <GestureDetector gesture={Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan))}>
            <Animated.View style={[styles.stage, photoStyle]}>
              <Image source={{ uri }} style={styles.photo} resizeMode="contain" />
            </Animated.View>
          </GestureDetector>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={8}
            onPress={onClose}
            style={styles.close}
          >
            <Ionicons name="close" size={28} color={colors.background} />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)' },
  safeArea: { flex: 1, overflow: 'hidden' },
  stage: { flex: 1 },
  photo: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
