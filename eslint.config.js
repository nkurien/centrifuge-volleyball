import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
        },
    },
    eslintConfigPrettier,
];
