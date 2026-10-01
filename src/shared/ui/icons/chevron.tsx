import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme';
import type { IconProps } from './icon.types';

type ChevronIconProps = IconProps & {
  direction?: 'up' | 'down' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
};

export const ChevronIcon = ({
  size = 24,
  color = colors.text,
  direction = 'right',
  style,
}: ChevronIconProps) => {
  const getRotation = () => {
    switch (direction) {
      case 'up':
        return '270';
      case 'down':
        return '90';
      case 'left':
        return '180';
      default:
        return '0';
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={[
        {
          transform: [{ rotate: `${getRotation()}deg` }],
        },
        style,
      ]}
    >
      <Path
        d="M9.29 6.71a.996.996 0 000 1.41L13.17 12l-3.88 3.88a.996.996 0 101.41 1.41l4.59-4.59a.996.996 0 000-1.41L10.7 6.7c-.38-.38-1.02-.38-1.41.01z"
        fill={color}
      />
    </Svg>
  );
};
