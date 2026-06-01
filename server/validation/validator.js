const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const circuitSchema = require('../schemas/circuit.schema.json');
const simulationResultsSchema = require('../schemas/simulation-results.schema.json');
const frdDataSchema = require('../schemas/frd-data.schema.json');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateCircuitLayoutCompiled = ajv.compile(circuitSchema);
const validateSimulationResultsCompiled = ajv.compile(simulationResultsSchema);
const validateFrdDataCompiled = ajv.compile(frdDataSchema);

const componentSchema = {
	$ref: 'circuit.schema.json#/definitions/component',
};
const validateComponentCompiled = ajv.compile(componentSchema);

const wireSchema = {
	$ref: 'circuit.schema.json#/definitions/wire',
};
const validateWireCompiled = ajv.compile(wireSchema);

function formatErrors(errors) {
	return errors.map((error) => {
		const path = error.instancePath || '';
		const message = error.message || 'unknown error';
		if (error.params && error.params.allowedValues) {
			return `${path} ${message}: ${error.params.allowedValues.join(', ')}`;
		}
		return `${path} ${message}`;
	});
}

function validate(compiledValidator, data) {
	const valid = compiledValidator(data);
	if (valid) {
		return { valid: true };
	}
	return { valid: false, errors: formatErrors(compiledValidator.errors) };
}

function validateCircuitLayout(data) {
	return validate(validateCircuitLayoutCompiled, data);
}

function validateSimulationResults(data) {
	return validate(validateSimulationResultsCompiled, data);
}

function validateFrdData(data) {
	return validate(validateFrdDataCompiled, data);
}

function validateComponent(data) {
	return validate(validateComponentCompiled, data);
}

function validateWire(data) {
	return validate(validateWireCompiled, data);
}

module.exports = {
	validateCircuitLayout,
	validateSimulationResults,
	validateFrdData,
	validateComponent,
	validateWire,
};
