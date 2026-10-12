import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EXPERIMENT_DEFINITIONS_PATH,
  experimentDefinitionsUrl,
  fetchExperimentServiceDefinitions,
} from './experiment-definition-request';
import { ENDPOINT_PATH, readExperimentServiceDefinitions } from './read-experiment-definitions.cjs';

const experimentDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/diensten/experiment',
);

describe('experiment definition reload', () => {
  it('points at the Metro route and drops the bundle query', () => {
    expect(
      experimentDefinitionsUrl('http://10.0.2.2:8081/index.bundle?platform=android&dev=true'),
    ).toBe(`http://10.0.2.2:8081${ENDPOINT_PATH}`);
    expect(EXPERIMENT_DEFINITIONS_PATH).toBe(ENDPOINT_PATH);
  });

  it('reads every experiment file from disk for that route', () => {
    const definitions = readExperimentServiceDefinitions(experimentDirectory);

    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions.every((entry) => Array.isArray(entry))).toBe(true);
  });

  it('returns the definition list and rejects a failed response', async () => {
    const definitions = [{ servicecode: 1004 }];
    const fetchImpl = async () =>
      new Response(JSON.stringify({ definitions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(
      fetchExperimentServiceDefinitions(fetchImpl, 'http://127.0.0.1:8081/index.bundle?dev=true'),
    ).resolves.toEqual(definitions);

    const failed = async () => new Response(null, { status: 500 });
    await expect(
      fetchExperimentServiceDefinitions(failed, 'http://127.0.0.1:8081/index.bundle'),
    ).rejects.toThrow('Experiment definition reload failed');
  });
});
