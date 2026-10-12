const fs = require('node:fs');
const path = require('node:path');

/** Metro route that serves `docs/diensten/experiment` from disk. */
const ENDPOINT_PATH = '/experiment-service-definitions';

/**
 * @param {string} directory
 * @returns {unknown[]}
 */
function readExperimentServiceDefinitions(directory) {
  const names = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort();
  return names.map((name) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unreadable';
      throw new Error(`${name}: ${message}`);
    }
  });
}

module.exports = { ENDPOINT_PATH, readExperimentServiceDefinitions };
