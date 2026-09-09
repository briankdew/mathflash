const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['archive/**', '.expo/**', '.expo-shared/**', 'node_modules/**', 'dist/**', 'web-build/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
