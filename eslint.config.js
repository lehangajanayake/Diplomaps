import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.vercel', 'public', 'playtest']),
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // The engine is pure: seeded randomness only, no DOM, no network, no React.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng from src/engine/rng.ts.' },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'fetch', 'localStorage', 'sessionStorage', 'process'],
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'zustand', 'motion/*', 'howler', 'openai', 'node:*', '../ui/*', '../store/*', '../ai/*'] },
      ],
    },
  },
]);
