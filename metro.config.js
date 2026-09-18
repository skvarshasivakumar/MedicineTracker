const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Enable require.context so voiceClips.ts can auto-discover assets/audio/*.
config.transformer = config.transformer || {};
config.transformer.unstable_allowRequireContext = true;

// Only MaterialCommunityIcons is used in this app. Alias every other
// @expo/vector-icons font to an empty stub to shrink the web bundle.
const EMPTY_FONT = path.resolve(__dirname, 'src/empty-font.ttf');
const KEEP_FONT = /MaterialCommunityIcons\.ttf$/;
const VENDOR_FONT_DIR = path.join(
  '@expo', 'vector-icons', 'build', 'vendor',
  'react-native-vector-icons', 'Fonts'
);
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.endsWith('.ttf') &&
    moduleName.includes(VENDOR_FONT_DIR) &&
    !KEEP_FONT.test(moduleName)
  ) {
    return { type: 'sourceFile', filePath: EMPTY_FONT };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
