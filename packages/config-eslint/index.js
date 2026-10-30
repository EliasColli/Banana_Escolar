import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Configuración base para paquetes Node/TypeScript. */
export function nodeConfig({ tsconfigRootDir } = {}) {
  return tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'prisma/migrations/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
    prettier,
  );
}

/** Configuración base para React + Vite. */
export function reactConfig({ tsconfigRootDir } = {}) {
  return tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        globals: { ...globals.browser },
        parserOptions: { tsconfigRootDir },
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
    prettier,
  );
}

export default { nodeConfig, reactConfig };
