import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PinchGestureHandler,
  State,
  type PinchGestureHandlerGestureEvent,
  type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/ui/button';
import { FlashIcon, FlashOffIcon } from '@/shared/ui/icons/flash';
import { colors, spacing } from '@/shared/ui/theme';
import {
  androidZoomPresets,
  clampCameraZoom,
  iosZoomPresetsFromLenses,
  type CameraZoomPreset,
} from '../domain/camera-zoom';
import { usePhotoLogger } from '../hooks/photos-context';
import { createPhotoCapture, photoCaptureErrorType, type PhotoCaptureStage } from './photo-capture';
import { PhotoZoomControls } from './photo-zoom-controls';

type PhotoCameraProps = {
  onCapture: (sourceUri: string) => Promise<void>;
  overlay?: ReactNode;
};

/** Full-screen capture surface with a slot for flow-specific camera guidance. */
export function PhotoCamera({ onCapture, overlay }: PhotoCameraProps) {
  const { t } = useTranslation();
  const logger = usePhotoLogger();
  const useLibrary = !Device.isDevice;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [captureSession] = useState(() => createPhotoCapture(useLibrary));
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFocused, setCameraFocused] = useState(false);
  const [cameraGeneration, setCameraGeneration] = useState(0);
  const [appActive, setAppActive] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState(0);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const [presets, setPresets] = useState<CameraZoomPreset[]>(() =>
    Platform.OS === 'android' ? androidZoomPresets() : [],
  );
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(
    Platform.OS === 'android' ? '1' : null,
  );
  const zoomRef = useRef(0);
  const pinchStartRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setCameraFocused(true);
      setCameraGeneration((current) => current + 1);
      captureSession.setReady(useLibrary);
      return () => {
        captureSession.setReady(false);
        setCameraReady(false);
        setCameraFocused(false);
      };
    }, [captureSession, useLibrary]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      captureSession.setReady(state === 'active' && useLibrary);
      setCameraReady(false);
      setAppActive(state === 'active');
      if (state === 'active') {
        setCameraGeneration((current) => current + 1);
      }
    });
    return () => subscription.remove();
  }, [captureSession, useLibrary]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const applyLenses = useCallback((lenses: readonly string[]) => {
    if (Platform.OS !== 'ios') return;
    const next = iosZoomPresetsFromLenses(lenses);
    setPresets(next);
    setActivePresetLabel((current) => {
      if (current && next.some((preset) => preset.label === current)) {
        return current;
      }
      return next.find((preset) => preset.label === '1')?.label ?? next[0]?.label ?? null;
    });
    setSelectedLens((current) => {
      if (current && next.some((preset) => preset.lens === current)) {
        return current;
      }
      return next.find((preset) => preset.label === '1')?.lens ?? next[0]?.lens ?? undefined;
    });
  }, []);

  const showCaptureError = (error: unknown, stage: PhotoCaptureStage | 'initialize'): void => {
    const errorType = photoCaptureErrorType(error);
    logger?.warn('photos', 'Photo operation failed', { stage, errorType });
    if (stage === 'capture' && errorType === 'CameraNotReadyException') {
      captureSession.setReady(false);
      setCameraReady(false);
      setCameraGeneration((current) => current + 1);
    }
    const errorKeys = {
      initialize: 'photos.cameraStartFailed',
      capture: 'photos.captureFailed',
      save: 'photos.saveFailed',
    } as const;
    Alert.alert(t(errorKeys[stage]), t('photos.errorType', { type: errorType }));
  };

  const pickFromLibrary = async (): Promise<string | null> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('photos.libraryPermissionDenied'));
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) {
      return null;
    }
    const uri = result.assets[0]?.uri;
    if (!uri) {
      throw new Error('Library returned no photo URI');
    }
    return uri;
  };

  const takePicture = async (): Promise<void> => {
    await captureSession.run({
      capture: async () => {
        if (useLibrary) return pickFromLibrary();
        const picture = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
        if (!picture?.uri) {
          throw new Error('Camera returned no photo URI');
        }
        return picture.uri;
      },
      onCapture,
      onBusyChange: setCapturing,
      onError: showCaptureError,
    });
  };

  const selectPreset = (preset: CameraZoomPreset): void => {
    if (capturing || !cameraReady) return;
    setActivePresetLabel(preset.label);
    setZoom(preset.zoom);
    if (preset.lens) {
      setSelectedLens(preset.lens);
    }
  };

  const onPinchGestureEvent = (event: PinchGestureHandlerGestureEvent): void => {
    setZoom(clampCameraZoom(pinchStartRef.current + (event.nativeEvent.scale - 1) * 0.4));
    setActivePresetLabel(null);
  };

  const onPinchHandlerStateChange = (event: PinchGestureHandlerStateChangeEvent): void => {
    if (event.nativeEvent.state === State.BEGAN || event.nativeEvent.oldState === State.BEGAN) {
      pinchStartRef.current = zoomRef.current;
    }
  };

  if (!useLibrary && permission === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.background} />
      </View>
    );
  }

  if (!useLibrary && permission !== null && !permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionText}>
            {permission.canAskAgain ? t('photos.permissionNeeded') : t('photos.permissionDenied')}
          </Text>
          <Button
            label={
              permission.canAskAgain
                ? t('photos.grantPermission')
                : t('settings.openSystemSettings')
            }
            onPress={() =>
              void (permission.canAskAgain ? requestPermission() : Linking.openSettings())
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  const flashOn = flash === 'on';
  const captureDisabled =
    capturing || !cameraFocused || !appActive || (!useLibrary && !cameraReady);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PinchGestureHandler
        enabled={!useLibrary && !captureDisabled}
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <View style={styles.previewWrap}>
          {useLibrary ? (
            <View style={styles.simulatorPreview}>
              <Text style={styles.simulatorHint}>{t('photos.simulatorLibraryHint')}</Text>
            </View>
          ) : cameraFocused && appActive ? (
            <CameraView
              key={cameraGeneration}
              ref={cameraRef}
              style={styles.preview}
              facing="back"
              flash={flash}
              zoom={zoom}
              selectedLens={selectedLens}
              onCameraReady={() => {
                if (
                  AppState.currentState === 'background' ||
                  AppState.currentState === 'inactive'
                ) {
                  return;
                }
                captureSession.setReady(true);
                setCameraReady(true);
                if (Platform.OS === 'ios') {
                  void cameraRef.current
                    ?.getAvailableLensesAsync()
                    .then(applyLenses)
                    .catch((error: unknown) => {
                      logger?.warn('photos', 'Could not discover camera lenses', {
                        stage: 'lenses',
                        errorType: photoCaptureErrorType(error),
                      });
                    });
                }
              }}
              onMountError={({ message }) => {
                captureSession.setReady(false);
                setCameraReady(false);
                showCaptureError(new Error(message), 'initialize');
              }}
              onAvailableLensesChanged={({ lenses }) => {
                applyLenses(lenses);
              }}
            />
          ) : null}
          {overlay ? (
            <View pointerEvents="none" style={styles.overlay}>
              {overlay}
            </View>
          ) : null}
        </View>
      </PinchGestureHandler>

      <View style={styles.captureFooter}>
        {!useLibrary ? (
          <PhotoZoomControls
            presets={presets}
            activeLabel={activePresetLabel}
            onSelect={selectPreset}
          />
        ) : null}
        <View style={styles.controlsRow}>
          {!useLibrary ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={flashOn ? t('photos.flashOn') : t('photos.flashOff')}
              accessibilityState={{ selected: flashOn, disabled: captureDisabled }}
              disabled={captureDisabled}
              onPress={() => setFlash((current) => (current === 'on' ? 'off' : 'on'))}
              style={[styles.sideButton, flashOn && styles.sideButtonActive]}
            >
              {flashOn ? (
                <FlashIcon size={22} color={colors.text} />
              ) : (
                <FlashOffIcon size={22} color={colors.background} />
              )}
            </Pressable>
          ) : (
            <View style={styles.sideButtonPlaceholder} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={useLibrary ? t('photos.pickFromLibrary') : t('photos.take')}
            accessibilityState={{ busy: capturing, disabled: captureDisabled }}
            disabled={captureDisabled}
            onPress={() => void takePicture()}
            style={[styles.captureButton, Platform.OS === 'android' && styles.captureButtonAndroid]}
          >
            {capturing ? (
              <ActivityIndicator color={colors.brandDark} />
            ) : (
              <View
                style={[
                  styles.captureInner,
                  Platform.OS === 'android' && styles.captureInnerAndroid,
                ]}
              />
            )}
          </Pressable>
          <View style={styles.sideButtonPlaceholder} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  permissionText: { color: colors.background, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  previewWrap: { flex: 1, backgroundColor: '#000000' },
  preview: { flex: 1 },
  simulatorPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: '#111315',
  },
  simulatorHint: {
    color: colors.background,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },
  overlay: { position: 'absolute', left: 16, bottom: 18 },
  captureFooter: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    height: 96,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sideButtonActive: {
    backgroundColor: colors.brand,
  },
  sideButtonPlaceholder: { width: 44, height: 44 },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonAndroid: {
    borderWidth: 5,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.background,
  },
  captureInnerAndroid: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
});
