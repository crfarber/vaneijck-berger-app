import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSession } from '@/domeinen/auth/ui';
import { useRegisterInternalUnit } from './use-register-internal-unit';
import { useRegisterUnit } from './use-register-unit';

type RegistrationFlowOptions = {
  isOnboarding: boolean;
  onRegistered: () => void;
  onOpenWork?: () => void;
};

type UnitRegistrationFlow = {
  options: RegistrationFlowOptions | null;
  start(options: RegistrationFlowOptions): void;
  external: ReturnType<typeof useRegisterUnit>;
  internal: ReturnType<typeof useRegisterInternalUnit>;
};

const UnitRegistrationFlowContext = createContext<UnitRegistrationFlow | null>(null);

/** Keeps registration input alive while the native stack moves between unit registration routes. */
export function UnitRegistrationFlowProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<RegistrationFlowOptions | null>(null);
  const isOnboarding = options?.isOnboarding ?? true;
  const onOpenWork = options?.onOpenWork;
  const isInternal = useSession((state) => state.userType === 'internal');
  const external = useRegisterUnit({ isOnboarding, onOpenWork });
  const internal = useRegisterInternalUnit({ isOnboarding, onOpenWork, isInternal });

  return (
    <UnitRegistrationFlowContext.Provider
      value={{
        options,
        start: setOptions,
        external,
        internal,
      }}
    >
      {children}
    </UnitRegistrationFlowContext.Provider>
  );
}

export function useUnitRegistrationFlow(): UnitRegistrationFlow {
  const value = useContext(UnitRegistrationFlowContext);
  if (value === null) {
    throw new Error('useUnitRegistrationFlow must be used inside <UnitRegistrationFlowProvider>');
  }
  return value;
}
