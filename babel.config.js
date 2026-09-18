module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 moved the Babel plugin into react-native-worklets.
    // Using the old 'react-native-reanimated/plugin' name silently breaks
    // worklet compilation on Android, which crashes expo-router / react-native-screens
    // at mount time ("opens glitched, then closes").
    // This plugin MUST be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
