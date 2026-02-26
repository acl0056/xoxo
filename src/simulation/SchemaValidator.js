import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import solverResultSchema from '../schemas/solver-result.schema.json';
import frequencyResponseDataSchema from '../schemas/frequency-response-data.schema.json';
import impedanceResponseDataSchema from '../schemas/impedance-response-data.schema.json';

/**
 * SchemaValidator provides validation for simulation module outputs
 * Validates data at module boundaries to ensure correctness
 */
class SchemaValidator {
	/**
	 * Initialize validators for all simulation schemas
	 * @private
	 */
	static #initializeValidators() {
		const ajv = new Ajv({
			allErrors: true,
			verbose: true,
			strict: false,
		});
		addFormats(ajv);

		return {
			solverResult: ajv.compile(solverResultSchema),
			frequencyResponseData: ajv.compile(frequencyResponseDataSchema),
			impedanceResponseData: ajv.compile(impedanceResponseDataSchema),
		};
	}

	static #validators = SchemaValidator.#initializeValidators();

	/**
	 * Validate solver result data
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result with {valid: boolean, errors: Array}
	 */
	static validateSolverResult(data) {
		return SchemaValidator.#validate(SchemaValidator.#validators.solverResult, data, 'Solver Result');
	}

	/**
	 * Validate frequency response data
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result with {valid: boolean, errors: Array}
	 */
	static validateFrequencyResponseData(data) {
		return SchemaValidator.#validate(SchemaValidator.#validators.frequencyResponseData, data, 'Frequency Response Data');
	}

	/**
	 * Validate impedance response data
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result with {valid: boolean, errors: Array}
	 */
	static validateImpedanceResponseData(data) {
		return SchemaValidator.#validate(SchemaValidator.#validators.impedanceResponseData, data, 'Impedance Response Data');
	}

	/**
	 * Internal validation helper
	 * @private
	 */
	static #validate(validator, data, dataType) {
		// Convert Maps to objects for validation
		const validationData = SchemaValidator.#prepareDataForValidation(data);

		const isValid = validator(validationData);

		if (isValid) {
			return {
				valid: true,
				errors: [],
			};
		}

		// Format errors for return
		const errors = (validator.errors || []).map((error) => {
			const path = error.instancePath || 'root';
			return `${path}: ${error.message}`;
		});

		return {
			valid: false,
			errors,
			dataType,
		};
	}

	/**
	 * Prepare data for validation by converting Maps to objects
	 * @private
	 */
	static #prepareDataForValidation(data) {
		if (data === null || data === undefined) {
			return data;
		}

		// Handle arrays
		if (Array.isArray(data)) {
			return data.map((item) => SchemaValidator.#prepareDataForValidation(item));
		}

		// Handle objects
		if (typeof data === 'object') {
			// Convert Map to plain object
			if (data instanceof Map) {
				const obj = {};
				for (const [key, value] of data.entries()) {
					obj[key] = SchemaValidator.#prepareDataForValidation(value);
				}
				return obj;
			}

			// Handle mathjs complex numbers (convert to {re, im} format)
			if (data.re !== undefined && data.im !== undefined) {
				return {
					re: data.re,
					im: data.im,
				};
			}

			// Recursively process object properties
			const result = {};
			for (const [key, value] of Object.entries(data)) {
				result[key] = SchemaValidator.#prepareDataForValidation(value);
			}
			return result;
		}

		// Return primitives as-is
		return data;
	}

	/**
	 * Assert that data is valid, throw error if not
	 * @param {Object} validationResult - Result from validate* method
	 * @throws {Error} If validation failed
	 */
	static assertValid(validationResult) {
		if (!validationResult.valid) {
			const errorMessages = validationResult.errors.join('; ');
			const dataType = validationResult.dataType || 'Data';
			throw new Error(`${dataType} validation failed: ${errorMessages}`);
		}
	}
}

export default SchemaValidator;
