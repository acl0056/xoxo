module.exports = {
	root: true,
	env: {
		node: true,
	},
	settings: {
		'import/resolver': {
			alias: {
				map: [
					['@', './src'],
				],
				extensions: ['.js', '.vue'],
			},
		},
	},
	extends: [
		'plugin:vue/vue3-recommended',
		'airbnb-base',
	],
	parser: 'vue-eslint-parser',
	parserOptions: {
		requireConfigFile: false,
		parser: '@babel/eslint-parser',
		sourceType: 'module',
		allowImportExportEverywhere: true,
	},
	globals: {
		defineProps: 'readonly',
		defineEmits: 'readonly',
	},
	rules: {
		'no-console': 'off',
		'no-debugger': 'warn',
		'no-alert': 'error',
		'no-iterator': 'off',
		'no-restricted-syntax': 'off',
		'no-plusplus': 'off',
		'no-tabs': 'off',
		'no-underscore-dangle': 'off',
		'no-use-before-define': 'off',
		'no-trailing-spaces': 2,
		'no-continue': 'off',
		'class-methods-use-this': 'off',
		'global-require': 'off',
		'vue/html-indent': ['error', 'tab'],
		'vue/custom-event-name-casing': 'off',
		'vue/valid-template-root': 'off',
		'vue/no-unused-components': 2,
		'vue/no-multiple-template-root': 'off',
		'import/prefer-default-export': 'off',
		'max-len': 'off',
		'no-param-reassign': 'off',
		indent: ['error', 'tab', { SwitchCase: 1 }],
		// 'import/extensions': ['error', 'never', { js: 'always', ignorePackages: true }],
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never',
				jsx: 'never',
				ts: 'never',
				tsx: 'never',
			},
		],
		'import/no-cycle': 'off',
		'import/no-extraneous-dependencies': ['error', {
			devDependencies: true,
		}],
	},
	overrides: [
		{
			files: [
				'**/__tests__/*.{j,t}s?(x)',
				'**/tests/unit/**/*.spec.{j,t}s?(x)',
			],
			env: {
				jest: true,
			},
		},
	],
};
