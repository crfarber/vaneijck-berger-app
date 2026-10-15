import { useEffect, useLayoutEffect, useRef } from 'react';
import { createGuardedPress, DEFAULT_PRESS_LOCK_MS } from './guarded-press';
import { useHaptics } from './haptics-context';
import { useScheduler } from './scheduler-context';

type UseGuardedPressInput = {
  onPress: () => void;
  disabled?: boolean;
  haptic?: boolean;
  lockMs?: number;
};

/** Wraps `onPress` with a short leading-edge lock and optional tap haptic. */
export function useGuardedPress({
  onPress,
  disabled = false,
  haptic = true,
  lockMs = DEFAULT_PRESS_LOCK_MS,
}: UseGuardedPressInput): () => void {
  const scheduler = useScheduler();
  const haptics = useHaptics();
  const guardRef = useRef(createGuardedPress({ scheduler, haptics, lockMs }));
  const onPressRef = useRef(onPress);
  useLayoutEffect(() => {
    onPressRef.current = onPress;
  });

  useEffect(() => {
    guardRef.current.dispose();
    guardRef.current = createGuardedPress({ scheduler, haptics, lockMs });
    return () => {
      guardRef.current.dispose();
    };
  }, [scheduler, haptics, lockMs]);

  return () => {
    guardRef.current.handle({
      onPress: () => {
        onPressRef.current();
      },
      disabled,
      haptic,
    });
  };
}
