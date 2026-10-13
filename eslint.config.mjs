// Estándar de código del SQAP (Sección 5): typescript-eslint recommended-type-checked + Prettier.
// Se hace cumplir con `eslint . --max-warnings=0` (métrica M16).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/reports/**',
      'api/prisma/migrations/**',
      'docs/**',
      'perf/**',
      'jenkins/**',
      '**/*.config.{js,mjs,cjs}',
      'eslint.config.mjs',
      'commitlint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettier,
);
