import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./current-unit-overview-screen.tsx', import.meta.url), 'utf8');

describe('current unit overview screen', () => {
  it('alerts on edit actions while active work exists', () => {
    expect(source).toContain('hasActiveWork');
    expect(source).toContain('guardActiveWork');
    expect(source).toContain('Alert.alert(');
    expect(source).toContain('unit.changeVehicle.activeWorkTitle');
    expect(source).toContain('unit.changeVehicle.activeWorkMessage');
  });

  it('guards change unit, change end date, and use-last-vehicle', () => {
    expect(source).toContain('onPress={changeUnit}');
    expect(source).toContain('onPress={changeEndDate}');
    expect(source).toContain('onUseLastVehicle={changeEndDate}');
  });

  it('formats the end time in the device timezone', () => {
    expect(source).toContain('getDeviceTimeZone()');
    expect(source).toContain('formatActiveUntil(');
  });

  it('confirms cancellation only when opened from settings', () => {
    expect(source).toContain('onCancel?: () => void');
    expect(source).toContain('onCancel !== undefined');
    expect(source).toContain('await confirm({');
    expect(source).toContain('settings.allocationUnitManagement.cancel');
  });

  it('alerts on cancel while active work exists instead of showing inline warning text', () => {
    expect(source).toContain('settings.allocationUnitManagement.activeWorkTitle');
    expect(source).toContain('settings.allocationUnitManagement.activeWorkMessage');
    expect(source).not.toContain('disabled={hasActiveWork}');
    expect(source).not.toContain('styles.warning');
  });
});
