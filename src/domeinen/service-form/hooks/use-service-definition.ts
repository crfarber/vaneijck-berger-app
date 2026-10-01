import { useEffect, useState } from 'react';
import type { RawServiceFormDefinition } from '../domain/types';
import { useServiceFormService } from './service-form-context';

export type ServiceDefinitionState =
  | { status: 'loading' }
  | { status: 'ready'; definition: RawServiceFormDefinition }
  | { status: 'missing' }
  | { status: 'failed' };

/**
 * The form definition of a service type, read from the synced reference data. Not a query on
 * purpose: the persisted query cache would store a copy of data that is already on the device.
 */
export function useServiceDefinition(serviceCode: number | undefined) {
  const service = useServiceFormService();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; state: ServiceDefinitionState } | null>(null);
  const key = `${serviceCode ?? ''}:${attempt}`;

  useEffect(() => {
    if (serviceCode === undefined) {
      return;
    }
    let active = true;
    const load =
      attempt === 0 ? service.findDefinition(serviceCode) : service.refreshDefinition(serviceCode);
    load
      .then((definition) => {
        if (active) {
          setLoaded({
            key,
            state: definition ? { status: 'ready', definition } : { status: 'missing' },
          });
        }
      })
      .catch(() => {
        if (active) {
          setLoaded({ key, state: { status: 'failed' } });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, key, service, serviceCode]);

  const state: ServiceDefinitionState =
    serviceCode === undefined
      ? { status: 'missing' }
      : loaded !== null && loaded.key === key
        ? loaded.state
        : { status: 'loading' };

  return { state, retry: () => setAttempt((current) => current + 1) };
}
