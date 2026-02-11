const eslintPluginImport = require('eslint-plugin-import');
const eslintPluginNode = require('eslint-plugin-n');

module.exports = [
  {
    files: ['src/**/*.{js,mjs,cjs}'],
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      import: eslintPluginImport,
      n: eslintPluginNode
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ]
    }
  }
];

