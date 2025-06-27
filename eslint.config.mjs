import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        name: 'Global ignore',
        ignores: [
            'node_modules/*',
            '.react-router/*',
            'build/*',
            'playwright*',
            'app/lib/api.d.ts',
        ],
    },
    {
        name: 'React',
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            react,
            'react-hooks': reactHooks,
            'jsx-a11y': jsxA11y,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
        },
        languageOptions: {
            ...react.configs.recommended.languageOptions,
            globals: {
                ...globals.browser,
                ...globals.node,
            }
        },
        settings: {
            react: {
                version: "detect",
            },
            formComponents: ["Form"],
            linkComponents: [
                { name: "Link", linkAttribute: "to" },
                { name: "NavLink", linkAttribute: "to" },
            ],
            "import/resolver": {
                typescript: {},
            },
        },
    },
    {
        name: 'Typescript',
        files: ["**/*.{ts,tsx}"],
        plugins: {
            'import': importPlugin,
        },
        rules: {
            quotes: ["error", "single"],
            indent: ["error", 4],
            "@typescript-eslint/no-explicit-any": 0,
            "sort-imports": [
                "error",
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
                    allowSeparatedGroups: true,
                },
            ],
            "import/order": [
                "error",
                {
                    "newlines-between": "always",
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        "parent",
                        "sibling",
                        "index",
                        "object",
                        "type",
                    ],
                },
            ],
        },
    },
];
