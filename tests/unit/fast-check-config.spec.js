// Test to verify fast-check is properly configured
// This test validates that property-based testing is working correctly

describe('fast-check configuration', () => {
	test('fast-check is available globally', () => {
		expect(fc).toBeDefined();
		expect(typeof fc.assert).toBe('function');
		expect(typeof fc.property).toBe('function');
	});

	test('fast-check runs with minimum 100 iterations', () => {
		let executionCount = 0;

		fc.assert(
			fc.property(fc.integer(), (number) => {
				executionCount++;
				return typeof number === 'number';
			}),
		);

		// Verify that at least 100 iterations were executed
		expect(executionCount).toBeGreaterThanOrEqual(100);
	});

	test('fast-check can generate various data types', () => {
		// Test integer generation
		fc.assert(
			fc.property(fc.integer(), (number) => {
				return Number.isInteger(number);
			}),
		);

		// Test string generation
		fc.assert(
			fc.property(fc.string(), (text) => {
				return typeof text === 'string';
			}),
		);

		// Test boolean generation
		fc.assert(
			fc.property(fc.boolean(), (value) => {
				return typeof value === 'boolean';
			}),
		);

		// Test array generation
		fc.assert(
			fc.property(fc.array(fc.integer()), (array) => {
				return Array.isArray(array);
			}),
		);
	});

	test('fast-check can generate complex objects', () => {
		const componentArbitrary = fc.record({
			id: fc.uuid(),
			type: fc.constantFrom('resistor', 'capacitor', 'inductor'),
			x: fc.integer({ min: 0, max: 1000 }),
			y: fc.integer({ min: 0, max: 1000 }),
			rotation: fc.constantFrom(0, 90, 180, 270),
		});

		fc.assert(
			fc.property(componentArbitrary, (component) => {
				return (
					typeof component.id === 'string' &&
					['resistor', 'capacitor', 'inductor'].includes(component.type) &&
					component.x >= 0 && component.x <= 1000 &&
					component.y >= 0 && component.y <= 1000 &&
					[0, 90, 180, 270].includes(component.rotation)
				);
			}),
		);
	});
});
