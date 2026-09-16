// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // The existing web hydration gate intentionally renders once after mounting.
    files: ['src/hooks/use-color-scheme.web.ts'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    ignores: ["dist/*"],
  }
]);
