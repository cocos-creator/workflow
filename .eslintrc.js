module.exports = {
    extends: [
        'eslint:recommended',
        'airbnb-base',
    ],
    parser: '@typescript-eslint/parser',
    rules: {
        'import/extensions': 'off',
        'import/no-unresolved': 'off',

        indent: ['error', 4],
        'no-unused-vars': ['warn'],
        'no-restricted-syntax': [
            2,
            'WithStatement',
            'LabeledStatement',
            'SwitchCase',
        ],
        'no-await-in-loop': 'off',
        'class-methods-use-this': 'off',
        'no-continue': 'off',
        'no-shadow': 'off',
    },
};
