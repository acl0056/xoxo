const circuitSchema = require('../../schemas/circuit.schema.json');
const simulationResultsSchema = require('../../schemas/simulation-results.schema.json');
const frdDataSchema = require('../../schemas/frd-data.schema.json');

const schemaResources = [
	{
		uri: 'resource://schema/circuit.schema.json',
		name: 'circuit.schema.json',
		description: 'JSON Schema defining the structure of loudspeaker crossover circuit layouts including components, wires, and metadata',
		mimeType: 'application/json',
		getContent() {
			return JSON.stringify(circuitSchema, null, 2);
		},
	},
	{
		uri: 'resource://schema/simulation-results.schema.json',
		name: 'simulation-results.schema.json',
		description: 'JSON Schema defining the structure of crossover simulation output including frequency response and impedance data',
		mimeType: 'application/json',
		getContent() {
			return JSON.stringify(simulationResultsSchema, null, 2);
		},
	},
	{
		uri: 'resource://schema/frd-data.schema.json',
		name: 'frd-data.schema.json',
		description: 'JSON Schema defining the structure of frequency response measurement data used for crossover design verification',
		mimeType: 'application/json',
		getContent() {
			return JSON.stringify(frdDataSchema, null, 2);
		},
	},
];

module.exports = schemaResources;
