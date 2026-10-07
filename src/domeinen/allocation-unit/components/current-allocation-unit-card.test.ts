import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CurrentAllocationUnitCard,
  type CurrentAllocationUnitCardProps,
} from './current-allocation-unit-card';

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/ui/glass-card', () => ({ GlassCard: 'GlassCard' }));
vi.mock('@/shared/ui/pill', () => ({ Pill: 'Pill' }));
vi.mock('@/shared/ui/button', () => ({ Button: 'Button' }));
vi.mock('./number-plate', () => ({ NumberPlate: 'NumberPlate' }));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  const result: ReactElement<Record<string, unknown>>[] = [];
  Children.forEach(node, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child)) {
      result.push(child, ...elements(child.props.children));
    }
  });
  return result;
}

const props = {
  vehicle: { vehicleName: 'AB-12-CD', vehicleNumber: '101' },
  trailer: { vehicleName: 'WX-34-YZ', vehicleNumber: '202' },
  isActive: true,
  endTime: '18:00',
  remainingTime: '2 hours',
  elapsedProgress: 0.75,
  onUseLastVehicle: vi.fn(),
};

describe('current allocation unit card', () => {
  it('shows the active unit title, active pill and remaining shift time', () => {
    const rendered = elements(CurrentAllocationUnitCard(props));
    expect(
      rendered.some((element) => element.props.children === 'unit.overview.vehicleCardTitle'),
    ).toBe(true);
    expect(
      rendered.find((element) => element.props.label === 'unit.overview.active')?.props.tone,
    ).toBe('success');
    expect(rendered.some((element) => element.props.children === props.remainingTime)).toBe(true);
    expect(rendered.some((element) => element.props.label === 'unit.overview.useLastVehicle')).toBe(
      false,
    );
  });

  it.each(['18:00', null])(
    'offers the last vehicle and trailer without expired shift details (%s)',
    (endTime) => {
      const rendered = elements(CurrentAllocationUnitCard({ ...props, isActive: false, endTime }));
      expect(
        rendered.some((element) => element.props.children === 'unit.overview.lastVehicleTitle'),
      ).toBe(true);
      expect(
        rendered.filter((element) => element.props.plateNumber).map((element) => element.props),
      ).toEqual([
        { plateNumber: 'AB-12-CD', vehicleNumber: '101' },
        { plateNumber: 'WX-34-YZ', vehicleNumber: '202' },
      ]);
      expect(rendered.some((element) => element.props.tone)).toBe(false);
      expect(rendered.some((element) => element.props.children === props.remainingTime)).toBe(
        false,
      );
      expect(rendered.some((element) => Array.isArray(element.props.style))).toBe(false);
      const button = rendered.find(
        (element) => element.props.label === 'unit.overview.useLastVehicle',
      );
      expect(button?.props.onPress).toBe(props.onUseLastVehicle);
    },
  );

  it('offers reuse even without a trailer or an end time', () => {
    const input: CurrentAllocationUnitCardProps = { ...props, isActive: false, endTime: null };
    const rendered = elements(CurrentAllocationUnitCard({ ...input, trailer: undefined }));
    expect(rendered.filter((element) => element.props.plateNumber)).toHaveLength(1);
    expect(rendered.some((element) => element.props.label === 'unit.overview.useLastVehicle')).toBe(
      true,
    );
  });
});
