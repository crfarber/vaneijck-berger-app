import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';
import type { IconProps } from './icon.types';

const CloseCircle = ({ size = 24, color = colors.text }: IconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.25} />
      <Path
        d="M8 8l8 8M16 8l-8 8"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CloseCircle;
