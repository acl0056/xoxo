# Property-Based Testing with fast-check

## Overview

This project uses [fast-check](https://github.com/dubzzz/fast-check) for property-based testing (PBT). Property-based testing validates that code satisfies universal properties across a wide range of automatically generated inputs.

## Configuration

fast-check is configured in `tests/setup.js` with the following settings:

- **numRuns**: 100 (minimum iterations per property test as per design requirements)
- **verbose**: true (detailed output for debugging)
- **seed**: Date.now() (timestamp-based seed for reproducibility)
- **endOnFailure**: false (continue testing to find all issues)

The `fc` object is available globally in all test files.

## Basic Usage

### Simple Property Test

```javascript
test('addition is commutative', () => {
	fc.assert(
		fc.property(fc.integer(), fc.integer(), (a, b) => {
			return a + b === b + a;
		}),
	);
});
```

### Testing with Custom Generators

```javascript
test('component rotation preserves connections', () => {
	const componentArbitrary = fc.record({
		id: fc.uuid(),
		type: fc.constantFrom('resistor', 'capacitor', 'inductor'),
		rotation: fc.constantFrom(0, 90, 180, 270),
	});

	fc.assert(
		fc.property(componentArbitrary, (component) => {
			// Test property here
			return true;
		}),
	);
});
```

## Common Arbitraries (Generators)

### Primitive Types
- `fc.integer()` - Generate integers
- `fc.integer({ min: 0, max: 100 })` - Generate integers in range
- `fc.float()` - Generate floating-point numbers
- `fc.string()` - Generate strings
- `fc.boolean()` - Generate booleans
- `fc.uuid()` - Generate UUIDs

### Collections
- `fc.array(arbitrary)` - Generate arrays
- `fc.array(arbitrary, { minLength: 1, maxLength: 10 })` - Generate arrays with size constraints
- `fc.set(arbitrary)` - Generate sets (unique values)
- `fc.dictionary(keyArbitrary, valueArbitrary)` - Generate objects

### Complex Types
- `fc.record({ field1: arbitrary1, field2: arbitrary2 })` - Generate objects with specific structure
- `fc.tuple(arbitrary1, arbitrary2)` - Generate tuples
- `fc.oneof(arbitrary1, arbitrary2)` - Generate one of several types
- `fc.constantFrom(value1, value2, value3)` - Generate one of specific values

### Custom Arbitraries
```javascript
const engineeringNotationArbitrary = fc.tuple(
	fc.float({ min: 1.0, max: 9.99 }),
	fc.constantFrom('', 'k', 'M', 'u', 'n', 'p'),
).map(([value, suffix]) => `${value}${suffix}`);
```

## Project-Specific Generators

### Component Generator
```javascript
function componentGenerator() {
	return fc.record({
		id: fc.uuid(),
		type: fc.constantFrom('resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source'),
		label: fc.string(),
		x: fc.integer({ min: 0, max: 1000 }),
		y: fc.integer({ min: 0, max: 1000 }),
		rotation: fc.constantFrom(0, 90, 180, 270),
	});
}
```

### Circuit Generator
```javascript
function circuitGenerator() {
	return fc.record({
		components: fc.array(componentGenerator(), { minLength: 1, maxLength: 20 }),
		wires: fc.array(wireGenerator(), { minLength: 0, maxLength: 50 }),
		annotations: fc.array(annotationGenerator(), { minLength: 0, maxLength: 10 }),
	});
}
```

## Property Test Naming Convention

All property tests should be tagged with the feature name and property number from the design document:

```javascript
test('Property 1: Circuit modification preserves validity', () => {
	// Validates: Requirements 1.5
	fc.assert(
		fc.property(circuitGenerator(), (circuit) => {
			// Test implementation
			return true;
		}),
	);
});
```

## Running Property Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPatterns=component.spec.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Debugging Failed Properties

When a property test fails, fast-check provides a counterexample:

```
Property failed after 42 tests
{ seed: 1234567890, path: "42:0:1:0", endOnFailure: true }
Counterexample: [{"id":"abc-123","type":"resistor","x":500,"y":300}]
```

To reproduce the failure:

```javascript
test('debug failing property', () => {
	fc.assert(
		fc.property(componentGenerator(), (component) => {
			// Test implementation
			return true;
		}),
		{ seed: 1234567890 }, // Use seed from failure
	);
});
```

## Best Practices

1. **Write properties, not examples**: Focus on universal truths that should hold for all inputs
2. **Use appropriate generators**: Match generators to your domain constraints
3. **Keep properties simple**: Each property should test one invariant
4. **Use descriptive names**: Property test names should clearly state what invariant is being tested
5. **Tag with requirement numbers**: Link properties to acceptance criteria
6. **Run enough iterations**: Minimum 100 runs per property (already configured)
7. **Test round-trip properties**: Serialization/deserialization, encoding/decoding
8. **Test invariants**: Properties that should never change (e.g., array length after sorting)
9. **Test relationships**: Properties that relate inputs to outputs (e.g., commutativity)

## Example Properties from Design Document

### Property 1: Circuit Modification Preserves Validity
```javascript
fc.assert(
	fc.property(circuitGenerator(), (circuit) => {
		// Any modification to a valid circuit should result in a valid circuit
		const modified = modifyCircuit(circuit);
		return validateCircuit(modified);
	}),
);
```

### Property 9: Engineering Notation Round-Trip
```javascript
fc.assert(
	fc.property(fc.float({ min: 1e-12, max: 1e9 }), (value) => {
		const formatted = formatEngineering(value);
		const parsed = parseEngineering(formatted);
		return Math.abs(parsed - value) < 1e-10; // Allow small floating-point error
	}),
);
```

### Property 11: Serialization Round-Trip
```javascript
fc.assert(
	fc.property(circuitGenerator(), (circuit) => {
		const json = circuit.toJSON();
		const restored = Circuit.fromJSON(json);
		return deepEqual(circuit, restored);
	}),
);
```

## Resources

- [fast-check Documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Arbitraries Reference](https://github.com/dubzzz/fast-check/blob/main/documentation/Arbitraries.md)
