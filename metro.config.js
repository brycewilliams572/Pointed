const { getDefaultConfig } = require('expo/metro-config');

// SDK 57's lazy web graph omits SQLite's worker when generating static HTML.
process.env.EXPO_NO_METRO_LAZY = '1';

const config = getDefaultConfig(__dirname);

// Expo SQLite's web worker loads its database engine from a WASM asset.
config.resolver.assetExts.push('wasm');

// Keep worker bundle URLs available even with the complete development graph.
const serialize = config.serializer.customSerializer;
config.serializer.customSerializer = (entryPoint, preModules, graph, options) =>
  serialize(entryPoint, preModules, graph, {
    ...options,
    includeAsyncPaths: options.dev && graph.transformOptions.platform === 'web'
      ? true
      : options.includeAsyncPaths,
  });

// SharedArrayBuffer requires cross-origin isolation in the local web preview.
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhancedMiddleware = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

module.exports = config;
