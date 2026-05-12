/**
 * Block Registry — discovers and loads all .xsc circuit block definitions
 * from a given directory, providing lookup by identifier and category grouping.
 *
 * @module BlockRegistry
 */

import fs from 'fs';
import path from 'path';
import { parseXsc } from '@/io/XscParser';

/**
 * Static mapping from category name to block identifiers (filename without extension).
 */
const CATEGORY_MAP = {
	Filters: ['LowPassFirstOrder', 'HighPassFirstOrder', 'LowPass2ndOrderQ', 'HighPass2ndOrderQ'],
	Phase: ['AllPass1stOrder', 'AllPass2ndOrder'],
	Attenuators: ['L-Pad'],
	'Notch Filters': ['Series Notch', 'Shunt Notch'],
};

/**
 * Load all .xsc files from the blocks directory.
 * @param {string} blocksDirectory - Path to directory containing .xsc files
 * @returns {{ blocks: Map<string, object>, errors: Array<{file: string, error: string}>, getBlock: function, getBlocksByCategory: function }}
 */
export function loadBlockRegistry(blocksDirectory) {
	const blocks = new Map();
	const errors = [];

	let files;
	try {
		files = fs.readdirSync(blocksDirectory);
	} catch (readDirError) {
		console.warn(`BlockRegistry: Unable to read blocks directory "${blocksDirectory}": ${readDirError.message}`);
		return buildRegistry(blocks, errors);
	}

	const xscFiles = files.filter((file) => path.extname(file).toLowerCase() === '.xsc');

	for (const file of xscFiles) {
		const filePath = path.join(blocksDirectory, file);
		const identifier = path.basename(file, '.xsc');

		let content;
		try {
			content = fs.readFileSync(filePath, 'utf8');
		} catch (readError) {
			const errorMessage = `Failed to read file: ${readError.message}`;
			console.warn(`BlockRegistry: ${file} — ${errorMessage}`);
			errors.push({ file, error: errorMessage });
			continue;
		}

		const result = parseXsc(content);
		if (!result.success) {
			const errorMessage = `Parse error: ${result.error}`;
			console.warn(`BlockRegistry: ${file} — ${errorMessage}`);
			errors.push({ file, error: errorMessage });
			continue;
		}

		result.block.identifier = identifier;
		blocks.set(identifier, result.block);
	}

	return buildRegistry(blocks, errors);
}

/**
 * Build the registry object with blocks, errors, and lookup methods.
 * @param {Map<string, object>} blocks
 * @param {Array<{file: string, error: string}>} errors
 * @returns {{ blocks: Map<string, object>, errors: Array<{file: string, error: string}>, getBlock: function, getBlocksByCategory: function }}
 */
function buildRegistry(blocks, errors) {
	return {
		blocks,
		errors,

		/**
		 * Get a block by its identifier (filename without extension).
		 * @param {string} identifier
		 * @returns {object|undefined}
		 */
		getBlock(identifier) {
			return blocks.get(identifier);
		},

		/**
		 * Get all blocks grouped by category.
		 * @returns {Object<string, object[]>}
		 */
		getBlocksByCategory() {
			const categories = {};
			for (const [categoryName, identifiers] of Object.entries(CATEGORY_MAP)) {
				categories[categoryName] = identifiers
					.map((id) => blocks.get(id))
					.filter((block) => block !== undefined);
			}
			return categories;
		},
	};
}
