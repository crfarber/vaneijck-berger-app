import { createContext, useContext, type ReactNode } from 'react';
import type { Haptics } from '@/shared/platform/ports';

const HapticsContext = createContext<Haptics | null>(null);

export function HapticsProvider({ value, children }: { value: Haptics; children: ReactNode }) {
  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

export function useHaptics(): Haptics {
  const haptics = useContext(HapticsContext);
  if (haptics === null) {
    throw new Error('useHaptics must be used within a HapticsProvider');
  }
  return haptics;
}
