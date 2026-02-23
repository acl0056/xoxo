module.exports = {
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'json', 'vue'],
	transform: {
		'^.+\\.vue$': '@vue/vue3-jest',
		'^.+\\.js$': 'babel-jest',
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	testMatch: [
		'**/tests/unit/**/*.spec.js',
		'**/__tests__/**/*.js',
	],
	collectCoverageFrom: [
		'src/**/*.{js,vue}',
		'!src/main/index.js',
		'!**/node_modules/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['html', 'text', 'lcov'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
