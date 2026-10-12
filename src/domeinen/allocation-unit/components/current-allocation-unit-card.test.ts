import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CurrentAllocationUnitCard,
  type CurrentAllocationUnitCardProps,
} from './current-allocation-unit-card';

vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: unknown) => styles,
    hairlineWidth: 1,
  },
  Text: 'Text',
  View: 'View',
  Pressable: 'Pressable',
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/ui/glass-card', () => ({ GlassCard: 'GlassCard' }));
vi.mock('@/shared/ui/icons/chevron', () => ({ ChevronIcon: 'ChevronIcon' }));
vi.mock('./number-plate', () => ({ NumberPlate: 'NumberPlate' }));
vi.mock('../domain/license-plate', () => ({
  displayVehicleRegistration: (plateNumber: string) => ({ text: plateNumber, variant: 'dutch' }),
}));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  const result: ReactElement<Record<string, unknown>>[] = [];
  Children.forEach(node, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child)) {
      result.push(child, ...elements(child.props.children));
    }
  });
  return result;
}

const props: CurrentAllocationUnitCardProps = {
  vehicle: { vehicleName: 'AB-12-CD', vehicleNumber: '101' },
  trailer: { vehicleName: 'WX-34-YZ', vehicleNumber: '202' },
  isActive: true,
  activeUntil: 'Vandaag 18:00',
  restrictions: ['notAvailableForIM', 'onlyAvailableForTransport'],
  onUseLastVehicle: vi.fn(),
};

describe('current allocation unit card', () => {
  it('shows active status, plates, end time and restriction chips', () => {
    const rendered = elements(CurrentAllocationUnitCard(props));
    expect(rendered.some((element) => element.props.children === 'unit.overview.active')).toBe(
      true,
    );
    expect(
      rendered.filter((element) => element.type === 'NumberPlate').map((element) => element.props),
    ).toEqual([{ plateNumber: 'AB-12-CD', vehicleNumber: '101' }]);
    expect(
      rendered.some(
        (element) => element.type !== 'NumberPlate' && element.props.plateNumber === 'WX-34-YZ',
      ),
    ).toBe(true);
    expect(rendered.some((element) => element.props.children === 'Vandaag 18:00')).toBe(true);
    expect(
      rendered.some(
        (element) => element.props.children === 'unit.restrictionChip.notAvailableForIM',
      ),
    ).toBe(true);
    expect(
      rendered.some(
        (element) => element.props.accessibilityLabel === 'unit.overview.useLastVehicle',
      ),
    ).toBe(false);
  });

  it('offers reuse of the last vehicle when the shift is inactive', () => {
    const rendered = elements(CurrentAllocationUnitCard({ ...props, isActive: false }));
    expect(rendered.some((element) => element.props.children === 'unit.recentVehicles')).toBe(true);
    const button = rendered.find(
      (element) => element.props.accessibilityLabel === 'unit.overview.useLastVehicle',
    );
    expect(button?.props.onPress).toBe(props.onUseLastVehicle);
  });

  it('offers reuse even without a trailer', () => {
    const rendered = elements(
      CurrentAllocationUnitCard({
        ...props,
        isActive: false,
        trailer: undefined,
        restrictions: [],
      }),
    );
    expect(rendered.filter((element) => element.props.plateNumber)).toHaveLength(1);
    expect(
      rendered.some((element) => element.props.children === 'unit.overview.noRestrictions'),
    ).toBe(true);
    expect(
      rendered.some(
        (element) => element.props.accessibilityLabel === 'unit.overview.useLastVehicle',
      ),
    ).toBe(true);
  });
});
