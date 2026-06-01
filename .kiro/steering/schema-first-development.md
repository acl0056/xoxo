# Schema-First Development Approach

## Overview

This project follows a **schema-first development methodology** where JSON Schema definitions serve as the single source of truth for all data structures. Any changes to data models must be applied to the schema first, then propagated to the rest of the codebase.

## Core Principle

**Schema → Code → Tests**

1. Define or modify the JSON Schema
2. Update code to match the schema
3. Update tests to validate against the schema

## When to Create a Schema

You MUST create a JSON Schema when data crosses code boundaries (between different JavaScript files/modules) AND meets ANY of these criteria:

1. **More than 3 properties** in the data structure
2. **Nested properties** (objects within objects, arrays of objects)
3. **Data is serialized** (saved to files, sent over network)

### Examples of Code Boundaries Requiring Schemas:

- **Function returns** from one module consumed by another module
- **Class method parameters** when called from a different file
- **Module exports** that are imported elsewhere
- **Event payloads** passed between components
- **File I/O** (always requires schema)

### Example: CircuitSolver Return Type

```javascript
// src/simulation/CircuitSolver.js
class CircuitSolver {
	/**
	 * Solve circuit at a single frequency
	 * Returns data matching solver-result.schema.json
	 */
	solve(frequency) {
		return {
			frequency,
			nodeVoltages,    // Map<string, Complex>
			sourceCurrents   // Map<string, Complex>
		};
	}
	
	/**
	 * Solve circuit across all frequencies
	 * Returns array of solver-result.schema.json objects
	 */
	solveAllFrequencies() {
		// This crosses a boundary - consumed by FrequencyAnalyzer, ImpedanceCalculator
		// Has nested properties (Maps with complex values)
		// REQUIRES: solver-results-array.schema.json
		return results;
	}
}
```

### When Schema is NOT Required:

- Simple primitives (single string, number, boolean)
- Data that stays within a single file/class
- Temporary variables in a function
- Data with ≤3 properties AND no nesting

## Schema Location

All JSON Schema files are stored in `server/schemas/`:

```
server/schemas/
├── circuit.schema.json              # Main circuit document schema
├── frd-data.schema.json             # Frequency response data schema
├── zma-data.schema.json             # Impedance data schema
├── simulation-results.schema.json   # Simulation output schema
├── solver-result.schema.json        # Single frequency solve result
└── solver-results-array.schema.json # Array of solve results
```

## When Making Changes

### Adding a New Field

1. **Update the schema first**
   - Add the new property to the appropriate schema file
   - Define its type, constraints, and description
   - Mark as required or optional
   - Add default value if applicable

2. **Update the code**
   - Modify class constructors to include the new field
   - Update `toJSON()` methods to serialize the field
   - Update `fromJSON()` methods to deserialize the field
   - Add getter/setter methods if needed

3. **Update validation**
   - Ensure runtime validation uses the updated schema
   - Add specific validation logic if schema constraints aren't sufficient

4. **Update tests**
   - Add unit tests for the new field
   - Update property-based test generators to include the field
   - Verify serialization round-trip tests pass

### Modifying an Existing Field

1. **Update the schema first**
   - Change type, constraints, or validation rules
   - Update description to reflect changes
   - Consider backward compatibility

2. **Update the code**
   - Modify all code that reads or writes the field
   - Update default values if changed
   - Add migration logic if needed for existing files

3. **Update validation**
   - Ensure new constraints are enforced
   - Add custom validation if needed

4. **Update tests**
   - Modify tests to match new constraints
   - Add tests for edge cases introduced by changes
   - Update test data generators

### Removing a Field

1. **Update the schema first**
   - Remove the property definition
   - Remove from required array if applicable
   - Document the removal in schema version notes

2. **Update the code**
   - Remove field from class constructors
   - Remove from `toJSON()` and `fromJSON()` methods
   - Remove getter/setter methods
   - Add migration logic to handle old files

3. **Update validation**
   - Remove validation logic for the field

4. **Update tests**
   - Remove tests specific to the field
   - Update test data generators to exclude the field

## Schema Validation in Code

All data structures should be validated against their schemas at critical points:

### On File Load

```javascript
import Ajv from 'ajv';
import circuitSchema from '/circuit.schema.json';

const ajv = new Ajv();
const validateCircuit = ajv.compile(circuitSchema);

function loadCircuit(filePath) {
	const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	
	if (!validateCircuit(data)) {
		throw new Error(`Invalid circuit file: ${JSON.stringify(validateCircuit.errors)}`);
	}
	
	return Circuit.fromJSON(data);
}
```

### On File Save

```javascript
function saveCircuit(circuit, filePath) {
	const data = circuit.toJSON();
	
	if (!validateCircuit(data)) {
		throw new Error(`Circuit validation failed: ${JSON.stringify(validateCircuit.errors)}`);
	}
	
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

### On Data Import

```javascript
import frdDataSchema from '/frd-data.schema.json';

const validateFrdData = ajv.compile(frdDataSchema);

function parseFrdFile(filePath) {
	const data = parseFrdFileContent(filePath);
	
	if (!validateFrdData(data)) {
		throw new Error(`Invalid FRD data: ${JSON.stringify(validateFrdData.errors)}`);
	}
	
	return data;
}
```

## Schema Versioning

When making breaking changes to schemas:

1. **Increment the schema version** in the `version` field
2. **Document the change** in a schema changelog
3. **Implement migration logic** to upgrade old files
4. **Test migration** with real-world files

Example migration:

```javascript
function migrateCircuit(data) {
	const version = data.version || '1.0';
	
	if (version === '1.0') {
		// Migrate from 1.0 to 1.1
		data.components.forEach(component => {
			if (component.type === 'speaker' && !component.parameters.phaseSource) {
				component.parameters.phaseSource = 'derived'; // Add new required field
			}
		});
		data.version = '1.1';
	}
	
	return data;
}
```

## Benefits of Schema-First

1. **Single Source of Truth**: Schema defines the contract for all data structures
2. **Validation**: Runtime validation catches errors early
3. **Documentation**: Schema serves as machine-readable documentation
4. **AI-Friendly**: AI tools can understand data structures from schemas
5. **Type Safety**: Without TypeScript overhead, schemas provide validation
6. **Testing**: Schemas guide test data generation
7. **Consistency**: All code follows the same data structure

## Common Pitfalls to Avoid

### ❌ Don't: Update code before schema

```javascript
// BAD: Adding a field to code first
class Speaker extends Component {
	constructor(x, y) {
		super('speaker', x, y);
		this.parameters = {
			// ... existing fields ...
			newField: 'value'  // Added without updating schema
		};
	}
}
```

### ✅ Do: Update schema first, then code

```javascript
// GOOD: Schema updated first, then code follows
// 1. Updated speaker parameters in circuit.schema.json
// 2. Now update the code to match
class Speaker extends Component {
	constructor(x, y) {
		super('speaker', x, y);
		this.parameters = {
			// ... existing fields ...
			newField: 'value'  // Matches schema definition
		};
	}
}
```

### ❌ Don't: Skip validation

```javascript
// BAD: Saving without validation
function saveCircuit(circuit, filePath) {
	const data = circuit.toJSON();
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

### ✅ Do: Always validate

```javascript
// GOOD: Validate before saving
function saveCircuit(circuit, filePath) {
	const data = circuit.toJSON();
	
	if (!validateCircuit(data)) {
		throw new Error(`Validation failed: ${JSON.stringify(validateCircuit.errors)}`);
	}
	
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

## Integration with Property-Based Testing

Schemas should guide property-based test generators:

```javascript
import fc from 'fast-check';

// Generator based on schema constraints
function componentGenerator() {
	return fc.record({
		id: fc.uuid(),
		type: fc.constantFrom('resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source'),
		label: fc.string(),
		x: fc.integer(),
		y: fc.integer(),
		rotation: fc.constantFrom(0, 90, 180, 270),
		parameters: fc.oneof(
			resistorParametersGenerator(),
			capacitorParametersGenerator(),
			// ... other parameter generators
		)
	});
}

// Validate generated data against schema
fc.assert(
	fc.property(componentGenerator(), (component) => {
		expect(validateComponent(component)).toBe(true);
	})
);
```

## Workflow Summary

When implementing a new feature or fixing a bug:

1. **Identify required data structure changes**
2. **Update JSON Schema files** in `server/schemas/`
3. **Run schema validation** to ensure schemas are valid
4. **Update model classes** to match schema
5. **Update serialization/deserialization** methods
6. **Add/update validation calls** at I/O boundaries
7. **Update test generators** to match schema constraints
8. **Run tests** to verify everything works
9. **Update documentation** if schema changes are significant

## Questions to Ask Before Changing Schema

- Is this change backward compatible?
- Do existing files need migration?
- Are all constraints properly defined?
- Is the description clear and complete?
- Are default values appropriate?
- Will this affect property-based test generators?
- Are there any dependent schemas that need updating?

## Remember

**The schema is the contract. Code is the implementation.**

Always start with the schema, and let it guide your implementation.
