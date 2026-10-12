import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { FleetVehicle } from '../domain/fleet';
import { findTruckByQrCode } from '../domain/qr-truck';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitQrScanScreen() {
  const { t } = useTranslation();
  const { internal } = useUnitRegistrationFlow();
  const [permission, requestPermission] = useCameraPermissions();
  const [recognizedTruck, setRecognizedTruck] = useState<FleetVehicle | null>(null);
  const [unknownCode, setUnknownCode] = useState(false);

  const handleScan = (value: string): void => {
    const truck = findTruckByQrCode(internal.trucks, value);
    if (truck === null) {
      setUnknownCode(true);
      return;
    }
    setUnknownCode(false);
    setRecognizedTruck(truck);
  };

  const rescan = (): void => {
    setUnknownCode(false);
    setRecognizedTruck(null);
  };

  const confirmTruck = (): void => {
    if (recognizedTruck === null) {
      return;
    }
    internal.selectTruck(recognizedTruck);
    router.replace('/unit/internal/trailer');
  };

  if (permission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <Screen contentStyle={styles.permissionContent}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('unit.scanTruckTitle')}
        </Text>
        <Text style={styles.hint}>{t('unit.scanTruckPermission')}</Text>
        <Button
          label={t(
            permission.canAskAgain ? 'unit.scanTruckAllowCamera' : 'unit.scanTruckOpenSettings',
          )}
          onPress={() => {
            if (permission.canAskAgain) {
              void requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
        />
        <Button
          label={t('unit.scanTruckManual')}
          onPress={() => router.back()}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('unit.scanTruckTitle')}
        </Text>
        <Text style={styles.hint}>{t('unit.scanTruckHint')}</Text>
      </View>

      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            recognizedTruck === null ? (result) => handleScan(result.data) : undefined
          }
        />
        <View pointerEvents="none" style={styles.scanArea} />
      </View>

      {recognizedTruck ? (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>{t('unit.scanTruckRecognized')}</Text>
          <Text style={styles.resultValue}>{recognizedTruck.name}</Text>
          {recognizedTruck.vehicleNumber ? (
            <Text style={styles.resultSecondary}>{recognizedTruck.vehicleNumber}</Text>
          ) : null}
          <Button label={t('unit.scanTruckConfirm')} onPress={confirmTruck} />
          <Button label={t('unit.scanTruckRescan')} onPress={rescan} variant="secondary" />
        </View>
      ) : (
        <View style={styles.actions}>
          {unknownCode ? (
            <Text accessibilityRole="alert" style={styles.unknownCode}>
              {t('unit.scanTruckUnknown')}
            </Text>
          ) : null}
          <Button
            label={t('unit.scanTruckManual')}
            onPress={() => router.back()}
            variant="secondary"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
  },
  permissionContent: {
    justifyContent: 'center',
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  cameraFrame: {
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.brandDark,
  },
  camera: {
    flex: 1,
  },
  scanArea: {
    position: 'absolute',
    top: '20%',
    right: '12%',
    bottom: '20%',
    left: '12%',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.background,
  },
  result: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  resultValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  resultSecondary: {
    color: colors.textMuted,
    fontSize: 16,
  },
  actions: {
    gap: spacing.sm,
  },
  unknownCode: {
    color: colors.danger,
    fontSize: 16,
    lineHeight: 22,
  },
});
