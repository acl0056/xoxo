/**
 * Jest setup verification test
 * This test ensures Jest is properly configured with Vue 3 support
 */

describe('Jest Setup', () => {
	it('should run basic tests', () => {
		expect(true).toBe(true);
	});

	it('should support ES6 syntax', () => {
		const testArray = [1, 2, 3];
		const doubled = testArray.map((number) => number * 2);
		expect(doubled).toEqual([2, 4, 6]);
	});

	it('should have access to jsdom environment', () => {
		expect(document).toBeDefined();
		expect(window).toBeDefined();
	});
});
