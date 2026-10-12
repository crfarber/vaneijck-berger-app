import { NativeModules } from 'react-native';
import { fetchExperimentServiceDefinitions } from './experiment-definition-request';

/** Reads the experiment JSON from the Metro dev server that served this bundle. */
export function loadExperimentServiceDefinitionsFromDevServer(): Promise<readonly unknown[]> {
  const scriptUrl = NativeModules.SourceCode?.scriptURL;
  if (typeof scriptUrl !== 'string' || scriptUrl.length === 0) {
    return Promise.reject(new Error('Experiment definition reload failed'));
  }
  return fetchExperimentServiceDefinitions(fetch, scriptUrl);
}
