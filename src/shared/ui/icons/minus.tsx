import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';
import type { IconProps } from './icon.types';

const MinusIcon = ({ size = 24, color = colors.text }: IconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 640 640" fill="none">
      <Path
        d="M96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320z"
        fill={color}
      />
    </Svg>
  );
};

export default MinusIcon;
