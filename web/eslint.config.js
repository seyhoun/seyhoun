import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript + React
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020 },
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // TypeScript compiler already handles undefined-variable checking; disable the
      // JS-only no-undef rule for .ts/.tsx files to avoid false positives (e.g. React types).
      'no-undef': 'off',

      // TypeScript
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // React hooks — spread recommended rules then tune two that are too strict for this codebase.
      ...reactHooks.configs['recommended-latest'].rules,
      // set-state-in-effect is a new rule in hooks v7. Calling setState synchronously at the
      // top of an effect (e.g. setLoading(true)) is a widely-used pattern; downgrade to warn.
      'react-hooks/set-state-in-effect': 'warn',

      // Fast-refresh — only export components from files that export components
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
