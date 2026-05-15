module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@store': './src/store',
            '@types': './src/types',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@config': './src/config',
            '@i18n': './src/i18n',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // react-native-reanimated v4 split the worklets plugin into a separate package.
      // Must be listed LAST. See https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x
      'react-native-worklets/plugin',
    ],
  };
};
