const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const {
  ENDPOINT_PATH,
  readExperimentServiceDefinitions,
} = require('./src/bootstrap/dev/read-experiment-definitions.cjs');

const config = getDefaultConfig(__dirname);
const experimentDirectory = path.join(__dirname, 'docs', 'diensten', 'experiment');

// Vitest colocated next to routes must never enter the Expo Router graph (node:fs, etc.).
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /[\\/]src[\\/]app[\\/].*\.test\.[tj]sx?$/,
];

config.server ??= {};
const previousEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previousEnhance ? previousEnhance(middleware, server) : middleware;
  return (request, response, continueRequest) => {
    const pathname = (request.url ?? '').split('?')[0];
    if (pathname !== ENDPOINT_PATH) {
      return next(request, response, continueRequest);
    }
    try {
      const definitions = readExperimentServiceDefinitions(experimentDirectory);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({ definitions }));
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'unreadable',
        }),
      );
    }
    return undefined;
  };
};

module.exports = config;
