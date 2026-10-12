import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unwrapServiceFormDefinitions } from '@/domeinen/service-form';
import { experimentServiceDefinitions } from './experiment-service-definitions';

const experimentDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/diensten/experiment',
);

describe('experiment service definitions', () => {
  it('loads every JSON file in docs/diensten/experiment, one service code each', () => {
    const fileNames = readdirSync(experimentDirectory)
      .filter((name) => name.endsWith('.json'))
      .sort();
    const fromDisk = fileNames.flatMap((name) =>
      unwrapServiceFormDefinitions(
        JSON.parse(readFileSync(join(experimentDirectory, name), 'utf8')) as unknown,
      ),
    );
    const fromBundle = unwrapServiceFormDefinitions(experimentServiceDefinitions);
    const diskCodes = fromDisk.map((definition) => definition.servicecode);
    const bundleCodes = fromBundle.map((definition) => definition.servicecode);

    expect(experimentServiceDefinitions).toHaveLength(fileNames.length);
    expect(bundleCodes).toEqual(diskCodes);
    expect(new Set(bundleCodes).size).toBe(bundleCodes.length);
    expect(bundleCodes.every((code) => typeof code === 'number')).toBe(true);
  });
});
