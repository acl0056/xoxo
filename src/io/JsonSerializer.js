import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Circuit } from '../models/Circuit';
import circuitSchema from '../schemas/circuit.schema.json';

/**
 * JsonSerializer class handles serialization and deserialization of Circuit objects
 * with JSON Schema validation
 */
export class JsonSerializer {
	/**
	 * Initialize the JSON Schema validator
	 * @private
	 */
	static #initializeValidator() {
		const ajv = new Ajv({
			allErrors: true,
			verbose: true,
			strict: false,
		});
		addFormats(ajv);
		return ajv.compile(circuitSchema);
	}

	static #validator = JsonSerializer.#initializeValidator();

	/**
	 * Serialize a Circuit instance to JSON string
	 * Validates the output against the circuit schema before returning
	 * @param {Circuit} circuit - The circuit to serialize
	 * @returns {string} JSON string representation of the circuit
	 * @throws {Error} If circuit is invalid or validation fails
	 */
	static serialize(circuit) {
		if (!(circuit instanceof Circuit)) {
			throw new Error('Input must be a Circuit instance');
		}

		// Convert circuit to JSON object
		const jsonObject = circuit.toJSON();

		// Validate against schema
		const isValid = JsonSerializer.#validator(jsonObject);
		if (!isValid) {
			const errors = JsonSerializer.#validator.errors || [];
			const errorMessages = errors.map((error) => {
				const path = error.instancePath || 'root';
				return `${path}: ${error.message}`;
			}).join('; ');
			throw new Error(`Circuit validation failed: ${errorMessages}`);
		}

		// Return formatted JSON string
		return JSON.stringify(jsonObject, null, 2);
	}

	/**
	 * Deserialize a JSON string to a Circuit instance
	 * Validates the input against the circuit schema before deserializing
	 * @param {string} jsonString - JSON string representation of a circuit
	 * @returns {Circuit} A new Circuit instance
	 * @throws {Error} If JSON is invalid or validation fails
	 */
	static deserialize(jsonString) {
		if (typeof jsonString !== 'string') {
			throw new Error('Input must be a string');
		}

		// Parse JSON string
		let jsonObject;
		try {
			jsonObject = JSON.parse(jsonString);
		} catch (error) {
			throw new Error(`Invalid JSON: ${error.message}`);
		}

		// Validate against schema
		const isValid = JsonSerializer.#validator(jsonObject);
		if (!isValid) {
			const errors = JsonSerializer.#validator.errors || [];
			const errorMessages = errors.map((error) => {
				const path = error.instancePath || 'root';
				return `${path}: ${error.message}`;
			}).join('; ');
			throw new Error(`Circuit validation failed: ${errorMessages}`);
		}

		// Deserialize to Circuit instance
		try {
			return Circuit.fromJSON(jsonObject);
		} catch (error) {
			throw new Error(`Deserialization failed: ${error.message}`);
		}
	}

	/**
	 * Validate a JSON string or object against the circuit schema
	 * Does not throw errors, returns validation result
	 * @param {string|Object} input - JSON string or object to validate
	 * @returns {Object} Validation result with {valid: boolean, errors: Array}
	 */
	static validate(input) {
		let jsonObject;

		// Parse if string, use directly if object
		if (typeof input === 'string') {
			try {
				jsonObject = JSON.parse(input);
			} catch (error) {
				return {
					valid: false,
					errors: [`Invalid JSON: ${error.message}`],
				};
			}
		} else if (typeof input === 'object' && input !== null) {
			jsonObject = input;
		} else {
			return {
				valid: false,
				errors: ['Input must be a string or object'],
			};
		}

		// Validate against schema
		const isValid = JsonSerializer.#validator(jsonObject);

		if (isValid) {
			return {
				valid: true,
				errors: [],
			};
		}

		// Format errors for return
		const errors = (JsonSerializer.#validator.errors || []).map((error) => {
			const path = error.instancePath || 'root';
			return `${path}: ${error.message}`;
		});

		return {
			valid: false,
			errors,
		};
	}

	/**
	 * Get the circuit schema
	 * @returns {Object} The circuit JSON schema
	 */
	static getSchema() {
		return circuitSchema;
	}
}
