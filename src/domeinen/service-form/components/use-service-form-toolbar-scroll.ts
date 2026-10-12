import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { createToolbarScrollState, reduceToolbarScroll } from '../domain/toolbar-scroll';

/** Tracks whether the service-form toolbar should be on screen for the current scroll direction. */
export function useServiceFormToolbarScroll(): {
  visible: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const state = useRef(createToolbarScrollState());
  const [visible, setVisible] = useState(true);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = reduceToolbarScroll(state.current, event.nativeEvent.contentOffset.y);
    state.current = next;
    setVisible((current) => (current === next.visible ? current : next.visible));
  }, []);

  return { visible, onScroll };
}
