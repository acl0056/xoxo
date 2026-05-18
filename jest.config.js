module.exports = {
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'json', 'vue'],
	modulePaths: ['<rootDir>/server/node_modules'],
	transform: {
		'^.+\\.vue$': '@vue/vue3-jest',
		'^.+\\.js$': 'babel-jest',
	},
	moduleNameMapper: {
		'\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/tests/__mocks__/fileMock.js',
		'^@schemas/(.*)$': '<rootDir>/server/schemas/$1',
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
