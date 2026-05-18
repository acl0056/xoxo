const schemaResources = require('../../../server/mcp/resources/schemas');

describe('server/mcp/resources/schemas', () => {
	it('should export an array of three schema resource definitions', () => {
		expect(Array.isArray(schemaResources)).toBe(true);
		expect(schemaResources).toHaveLength(3);
	});

	it('should include the circuit schema resource with correct URI', () => {
		const circuit = schemaResources.find((resource) => resource.uri === 'resource://schema/circuit.schema.json');
		expect(circuit).toBeDefined();
		expect(circuit.name).toBe('circuit.schema.json');
		expect(circuit.mimeType).toBe('application/json');
		expect(circuit.description.length).toBeGreaterThanOrEqual(20);
		expect(circuit.description.toLowerCase()).toMatch(/crossover|circuit|loudspeaker/);
	});

	it('should include the simulation-results schema resource with correct URI', () => {
		const simulation = schemaResources.find((resource) => resource.uri === 'resource://schema/simulation-results.schema.json');
		expect(simulation).toBeDefined();
		expect(simulation.name).toBe('simulation-results.schema.json');
		expect(simulation.mimeType).toBe('application/json');
		expect(simulation.description.length).toBeGreaterThanOrEqual(20);
		expect(simulation.description.toLowerCase()).toMatch(/crossover|simulation|frequency|impedance/);
	});

	it('should include the frd-data schema resource with correct URI', () => {
		const frd = schemaResources.find((resource) => resource.uri === 'resource://schema/frd-data.schema.json');
		expect(frd).toBeDefined();
		expect(frd.name).toBe('frd-data.schema.json');
		expect(frd.mimeType).toBe('application/json');
		expect(frd.description.length).toBeGreaterThanOrEqual(20);
		expect(frd.description.toLowerCase()).toMatch(/crossover|frequency|measurement|response/);
	});

	it('should return valid JSON content from getContent for each resource', () => {
		for (const resource of schemaResources) {
			const content = resource.getContent();
			expect(typeof content).toBe('string');
			const parsed = JSON.parse(content);
			expect(parsed).toBeDefined();
			expect(typeof parsed).toBe('object');
		}
	});

	it('should return circuit schema content that includes expected schema properties', () => {
		const circuit = schemaResources.find((resource) => resource.uri === 'resource://schema/circuit.schema.json');
		const content = JSON.parse(circuit.getContent());
		expect(content).toHaveProperty('type');
	});

	it('should return simulation-results schema content that includes expected schema properties', () => {
		const simulation = schemaResources.find((resource) => resource.uri === 'resource://schema/simulation-results.schema.json');
		const content = JSON.parse(simulation.getContent());
		expect(content).toHaveProperty('type');
	});

	it('should return frd-data schema content that includes expected schema properties', () => {
		const frd = schemaResources.find((resource) => resource.uri === 'resource://schema/frd-data.schema.json');
		const content = JSON.parse(frd.getContent());
		expect(content).toHaveProperty('type');
	});

	it('should have each resource with a getContent function', () => {
		for (const resource of schemaResources) {
			expect(typeof resource.getContent).toBe('function');
		}
	});
});
