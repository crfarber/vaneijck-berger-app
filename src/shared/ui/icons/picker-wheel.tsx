import { Svg, Rect } from 'react-native-svg';
import { colors } from '../theme';
import type { IconProps } from './icon.types';

export const PickerWheelIcon = ({ size = 24, color = colors.text }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="5" width="16" height="2" rx="1" fill={color} opacity={0.45} />
    <Rect x="3" y="11" width="18" height="2.5" rx="1" fill={color} />
    <Rect x="4" y="17" width="16" height="2" rx="1" fill={color} opacity={0.45} />
  </Svg>
);
