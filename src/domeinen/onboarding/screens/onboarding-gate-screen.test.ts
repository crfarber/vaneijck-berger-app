import { readFileSync } from 'node:fs';
import type * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred } from '@/test/fakes';
import { clearRegisterUnitNotice } from '../domain/register-unit-notice';
import { OnboardingGateScreen } from './onboarding-gate-screen';

const fakes = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  load: vi.fn<() => Promise<null>>(),
  push: vi.fn(),
  alert: vi.fn(),
  refetch: vi.fn(),
  showPrompt: vi.fn(),
  setSnapshot: vi.fn(),
  notice: 'register-unit',
  sections: [{ type: 'active', count: 0, data: [] }],
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useEffect: (effect: () => void | (() => void)) => fakes.effects.push(effect),
  useState: () => [null, fakes.setSnapshot],
  useCallback: <Callback extends (...args: never[]) => unknown>(callback: Callback) => callback,
}));
vi.mock('expo-router', () => ({
  Redirect: () => null,
  router: { push: fakes.push },
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: vi.fn() }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  View: () => null,
  Alert: { alert: fakes.alert },
  StyleSheet: { create: <Styles>(styles: Styles) => styles },
}));
vi.mock('@/shared/ui/theme', () => ({ colors: {} }));
vi.mock('@/domeinen/auth/ui', () => ({ useSession: () => 'external' }));
vi.mock('@/domeinen/settings/ui', () => ({ usePermissionDisclosureGate: () => 'done' }));
vi.mock('@/domeinen/worker/ui', () => ({ useWorker: () => ({ data: null }) }));
vi.mock('@/domeinen/allocation-unit/ui', () => ({
  ExtendShiftScreen: () => null,
  useAllocationUnitService: () => ({}),
  useLastUnitPreference: () => ({ load: fakes.load }),
}));
vi.mock('@/domeinen/allocations/ui', () => ({
  AllocationsScreen: () => null,
  useAllocations: () => ({ sections: fakes.sections, refetch: fakes.refetch }),
}));
vi.mock('../components/allocations-toolbar', () => ({ AllocationsToolbar: () => null }));
vi.mock('../components/register-unit-prompt-sheet', () => ({
  RegisterUnitPromptSheet: () => null,
}));
vi.mock('../hooks/use-onboarding-gate', () => ({
  useOnboardingGate: () => ({ status: 'ready', step: 'allocations', notice: fakes.notice }),
}));
vi.mock('../hooks/show-register-unit-alert', () => ({
  registerUnitAlertTexts: () => ({}),
  showRegisterUnitAlert: fakes.showPrompt,
}));
vi.mock('../hooks/show-no-valid-unit-continue-alert', () => ({
  noValidUnitContinueAlertTexts: () => ({}),
  showNoValidUnitContinueAlert: vi.fn(),
}));

function runNoticeEffect() {
  OnboardingGateScreen();
  return fakes.effects[1]?.();
}

describe('registration prompt safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegisterUnitNotice();
    fakes.effects.length = 0;
    fakes.notice = 'register-unit';
    fakes.sections = [{ type: 'active', count: 0, data: [] }];
    fakes.load.mockResolvedValue(null);
  });

  it('discards a delayed registration prompt when active work arrives', async () => {
    const pending = deferred<null>();
    fakes.load.mockReturnValue(pending.promise);
    const cleanup = runNoticeEffect();
    fakes.sections = [{ type: 'active', count: 1, data: [] }];
    cleanup?.();
    pending.resolve(null);
    await pending.promise;
    expect(fakes.showPrompt).not.toHaveBeenCalled();
    expect(fakes.setSnapshot).not.toHaveBeenCalled();
  });

  it('does not show a registration prompt while active work exists', async () => {
    fakes.sections = [{ type: 'active', count: 1, data: [] }];
    runNoticeEffect();
    await Promise.resolve();
    expect(fakes.load).not.toHaveBeenCalled();
    expect(fakes.showPrompt).not.toHaveBeenCalled();
  });

  it('still opens registration when JA is tapped after the notice effect re-ran', async () => {
    fakes.refetch.mockResolvedValue([{ isSuccess: true, data: [] }]);
    const cleanup = runNoticeEffect();
    await Promise.resolve();
    expect(fakes.showPrompt).toHaveBeenCalledOnce();
    // Effect cleanup used to set cancelled=true and make JA a no-op.
    cleanup?.();
    fakes.notice = 'none';
    const confirm: () => void = fakes.showPrompt.mock.calls[0]?.[1];
    confirm();
    await Promise.resolve();
    expect(fakes.refetch).toHaveBeenCalledOnce();
    expect(fakes.push).toHaveBeenCalledWith('/unit?mode=onboarding');
  });

  it.each(['active', 'failed', 'empty'] as const)(
    'checks current assignments before confirming registration: %s',
    async (result) => {
      fakes.refetch.mockResolvedValue([
        {
          isSuccess: result !== 'failed',
          data:
            result === 'active'
              ? [{ statuscode: 875920000, statecode: 0 }]
              : result === 'empty'
                ? []
                : undefined,
        },
      ]);
      runNoticeEffect();
      await Promise.resolve();
      const confirm: () => void = fakes.showPrompt.mock.calls[0]?.[1];
      confirm();
      await Promise.resolve();
      expect(fakes.refetch).toHaveBeenCalledOnce();
      if (result === 'empty') {
        expect(fakes.push).toHaveBeenCalledWith('/unit?mode=onboarding');
      } else {
        expect(fakes.push).not.toHaveBeenCalled();
      }
      if (result === 'failed') {
        expect(fakes.alert).toHaveBeenCalledWith('common.somethingWrong');
      }
    },
  );

  it('guards direct registration routes with fresh and successful assignment data', () => {
    const source = readFileSync(
      new URL('../../../app/(app)/unit/index.tsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain("refetchOnMount: 'always'");
    expect(source).toContain('if (hasActiveWork)');
    expect(source).toContain('if (!allocationsReady || allocationsFetching)');
  });
});
