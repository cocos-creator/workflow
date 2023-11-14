module.exports = {
    extends: [
        'eslint:recommended',
        'airbnb-base',
    ],
    parser: '@typescript-eslint/parser',
    rules: {
        indent: ['error', 4],
        'no-unused-vars': 'off',
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'class-methods-use-this': 'off',
    },
};
