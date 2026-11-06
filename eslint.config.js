import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'fixtures', 'playwright-report', 'test-results', 'dev-dist', 'dist-e2e', '.claude', '.lighthouseci'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['scripts/**/*.{mjs,js}', '*.config.js'], languageOptions: { globals: { ...globals.node } } },
  { files: ['**/*.{ts,tsx}'], languageOptions: { globals: { ...globals.browser } }, plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules } },
);
