/**
 * Parser for .xsc (xsim circuit block) files.
 * Reads the line-based .xsc format and produces a structured CircuitBlock object.
 *
 * @module XscParser
 */

/**
 * Parse a .xsc file content string into a CircuitBlock object.
 * @param {string} content - Raw .xsc file content
 * @returns {{ success: boolean, block?: object, error?: string }}
 */
export function parseXsc(content) {
	if (!content || typeof content !== 'string') {
		return { success: false, error: 'Content must be a non-empty string' };
	}

	const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	let cursor = 0;

	/**
	 * Read the next line, advancing the cursor.
	 * Returns undefined if past end of file.
	 */
	function nextLine() {
		if (cursor >= lines.length) {
			return undefined;
		}
		return lines[cursor++];
	}

	/**
	 * Parse an integer from a line, extracting the numeric value before any // comment.
	 * Returns { value, error } where error is set if parsing fails.
	 */
	function parseIntFromLine(line, fieldName) {
		if (line === undefined) {
			return { value: null, error: `Unexpected end of file while reading ${fieldName}` };
		}
		const numericPart = line.split('//')[0].trim();
		const value = parseInt(numericPart, 10);
		if (Number.isNaN(value)) {
			return { value: null, error: `Non-numeric value for ${fieldName} at line ${cursor}: "${line.trim()}"` };
		}
		return { value, error: null };
	}

	/**
	 * Parse a float from a line, extracting the numeric value before any // comment.
	 * Returns { value, error } where error is set if parsing fails.
	 */
	function parseFloatFromLine(line, fieldName) {
		if (line === undefined) {
			return { value: null, error: `Unexpected end of file while reading ${fieldName}` };
		}
		const numericPart = line.split('//')[0].trim();
		const value = parseFloat(numericPart);
		if (Number.isNaN(value)) {
			return { value: null, error: `Non-numeric value for ${fieldName} at line ${cursor}: "${line.trim()}"` };
		}
		return { value, error: null };
	}

	// --- Parse title (line 1) ---
	const title = nextLine();
	if (title === undefined) {
		return { success: false, error: 'File is empty: missing title on line 1' };
	}

	// --- Skip two empty lines after title ---
	nextLine(); // line 2 (empty)
	nextLine(); // line 3 (empty)

	// --- Parse 6 variable slots ---
	const variables = [];
	for (let i = 0; i < 6; i++) {
		const nameLine = nextLine();
		if (nameLine === undefined) {
			return { success: false, error: `Truncated file: missing Variable #${i} name line at line ${cursor + 1}` };
		}

		const descriptionLine = nextLine();
		if (descriptionLine === undefined) {
			return { success: false, error: `Truncated file: missing Variable #${i} description line at line ${cursor + 1}` };
		}

		const valueLine = nextLine();
		if (valueLine === undefined) {
			return { success: false, error: `Truncated file: missing VarValue #${i} line at line ${cursor + 1}` };
		}

		// Extract variable name: text before "//Variable #N"
		const variableCommentIndex = nameLine.indexOf('//Variable');
		let name = '';
		if (variableCommentIndex >= 0) {
			name = nameLine.substring(0, variableCommentIndex).trim();
		}

		// Description is the full line trimmed
		const description = descriptionLine.trim();

		// Extract default value: numeric part before "//VarValue #N"
		const valueCommentIndex = valueLine.indexOf('//VarValue');
		let defaultValueStr = '';
		if (valueCommentIndex >= 0) {
			defaultValueStr = valueLine.substring(0, valueCommentIndex).trim();
		} else {
			defaultValueStr = valueLine.trim();
		}

		const defaultValue = parseFloat(defaultValueStr);
		if (Number.isNaN(defaultValue)) {
			return { success: false, error: `Non-numeric default value for Variable #${i} at line ${cursor}: "${defaultValueStr}"` };
		}

		variables.push({ name, description, defaultValue });
	}

	// --- Parse Passives section ---
	const passivesCountLine = nextLine();
	if (passivesCountLine === undefined) {
		return { success: false, error: `Truncated file: missing Passives count header at line ${cursor + 1}` };
	}
	if (!passivesCountLine.includes('//Passives')) {
		return { success: false, error: `Missing Passives section header at line ${cursor}: "${passivesCountLine.trim()}"` };
	}
	const passivesCountResult = parseIntFromLine(passivesCountLine, 'Passives count');
	if (passivesCountResult.error) {
		return { success: false, error: passivesCountResult.error };
	}
	const passivesCount = passivesCountResult.value;

	const linesPerPassiveLine = nextLine();
	if (linesPerPassiveLine === undefined) {
		return { success: false, error: `Truncated file: missing Lines Per Passive header at line ${cursor + 1}` };
	}
	const linesPerPassiveResult = parseIntFromLine(linesPerPassiveLine, 'Lines Per Passive');
	if (linesPerPassiveResult.error) {
		return { success: false, error: linesPerPassiveResult.error };
	}
	const linesPerPassive = linesPerPassiveResult.value;

	const components = [];
	for (let i = 0; i < passivesCount; i++) {
		// Each passive has 12 lines (or whatever linesPerPassive says)
		const componentStartLine = cursor + 1;

		const partTypeLine = nextLine();
		if (partTypeLine === undefined) {
			return { success: false, error: `Truncated file: missing PartType for component ${i} at line ${componentStartLine}` };
		}
		const partTypeResult = parseIntFromLine(partTypeLine, `component ${i} PartType`);
		if (partTypeResult.error) {
			return { success: false, error: partTypeResult.error };
		}

		const partNumberLine = nextLine(); // Part# line (unused, skip)
		if (partNumberLine === undefined) {
			return { success: false, error: `Truncated file: missing Part# for component ${i} at line ${cursor + 1}` };
		}

		const valueLine = nextLine();
		if (valueLine === undefined) {
			return { success: false, error: `Truncated file: missing Value for component ${i} at line ${cursor + 1}` };
		}
		const valueResult = parseFloatFromLine(valueLine, `component ${i} Value`);
		if (valueResult.error) {
			return { success: false, error: valueResult.error };
		}

		const esrLine = nextLine();
		if (esrLine === undefined) {
			return { success: false, error: `Truncated file: missing ESR for component ${i} at line ${cursor + 1}` };
		}
		const esrResult = parseFloatFromLine(esrLine, `component ${i} ESR`);
		if (esrResult.error) {
			return { success: false, error: esrResult.error };
		}

		const ratingLine = nextLine();
		if (ratingLine === undefined) {
			return { success: false, error: `Truncated file: missing Rating for component ${i} at line ${cursor + 1}` };
		}
		const ratingResult = parseFloatFromLine(ratingLine, `component ${i} Rating`);
		if (ratingResult.error) {
			return { success: false, error: ratingResult.error };
		}

		const posXLine = nextLine();
		if (posXLine === undefined) {
			return { success: false, error: `Truncated file: missing position X for component ${i} at line ${cursor + 1}` };
		}
		const posXResult = parseIntFromLine(posXLine, `component ${i} position X`);
		if (posXResult.error) {
			return { success: false, error: posXResult.error };
		}

		const posYLine = nextLine();
		if (posYLine === undefined) {
			return { success: false, error: `Truncated file: missing position Y for component ${i} at line ${cursor + 1}` };
		}
		const posYResult = parseIntFromLine(posYLine, `component ${i} position Y`);
		if (posYResult.error) {
			return { success: false, error: posYResult.error };
		}

		const horizontalLine = nextLine();
		if (horizontalLine === undefined) {
			return { success: false, error: `Truncated file: missing Is Horizontal for component ${i} at line ${cursor + 1}` };
		}
		const horizontalStr = horizontalLine.split('//')[0].trim();
		const isHorizontal = horizontalStr === 'T';

		const stepModeLine = nextLine();
		if (stepModeLine === undefined) {
			return { success: false, error: `Truncated file: missing StepMode for component ${i} at line ${cursor + 1}` };
		}
		const stepModeResult = parseIntFromLine(stepModeLine, `component ${i} StepMode`);
		if (stepModeResult.error) {
			return { success: false, error: stepModeResult.error };
		}

		const bypassModeLine = nextLine();
		if (bypassModeLine === undefined) {
			return { success: false, error: `Truncated file: missing bypass mode for component ${i} at line ${cursor + 1}` };
		}
		const bypassModeResult = parseIntFromLine(bypassModeLine, `component ${i} bypass mode`);
		if (bypassModeResult.error) {
			return { success: false, error: bypassModeResult.error };
		}

		const formulaLine = nextLine();
		if (formulaLine === undefined) {
			return { success: false, error: `Truncated file: missing formula for component ${i} at line ${cursor + 1}` };
		}
		const formula = formulaLine.trimEnd();

		const formulaScaleLine = nextLine();
		if (formulaScaleLine === undefined) {
			return { success: false, error: `Truncated file: missing formula scale for component ${i} at line ${cursor + 1}` };
		}
		const formulaScale = formulaScaleLine.trimEnd();

		// Skip any remaining lines for this passive if linesPerPassive > 12
		const linesRead = 12;
		for (let extra = linesRead; extra < linesPerPassive; extra++) {
			nextLine();
		}

		components.push({
			partType: partTypeResult.value,
			defaultValue: valueResult.value,
			esr: esrResult.value,
			rating: ratingResult.value,
			position: { x: posXResult.value, y: posYResult.value },
			isHorizontal,
			stepMode: stepModeResult.value,
			bypassMode: bypassModeResult.value,
			formula,
			formulaScale,
		});
	}

	// --- Parse Grounds section ---
	const groundsCountLine = nextLine();
	if (groundsCountLine === undefined) {
		return { success: false, error: `Truncated file: missing Grounds count header at line ${cursor + 1}` };
	}
	if (!groundsCountLine.includes('//Grounds')) {
		return { success: false, error: `Missing Grounds section header at line ${cursor}: "${groundsCountLine.trim()}"` };
	}
	const groundsCountResult = parseIntFromLine(groundsCountLine, 'Grounds count');
	if (groundsCountResult.error) {
		return { success: false, error: groundsCountResult.error };
	}
	const groundsCount = groundsCountResult.value;

	const linesPerGroundLine = nextLine();
	if (linesPerGroundLine === undefined) {
		return { success: false, error: `Truncated file: missing Lines Per Ground header at line ${cursor + 1}` };
	}
	const linesPerGroundResult = parseIntFromLine(linesPerGroundLine, 'Lines Per Ground');
	if (linesPerGroundResult.error) {
		return { success: false, error: linesPerGroundResult.error };
	}
	const linesPerGround = linesPerGroundResult.value;

	const grounds = [];
	for (let i = 0; i < groundsCount; i++) {
		const groundXLine = nextLine();
		if (groundXLine === undefined) {
			return { success: false, error: `Truncated file: missing ground ${i} X position at line ${cursor + 1}` };
		}
		const groundXResult = parseIntFromLine(groundXLine, `ground ${i} X`);
		if (groundXResult.error) {
			return { success: false, error: groundXResult.error };
		}

		const groundYLine = nextLine();
		if (groundYLine === undefined) {
			return { success: false, error: `Truncated file: missing ground ${i} Y position at line ${cursor + 1}` };
		}
		const groundYResult = parseIntFromLine(groundYLine, `ground ${i} Y`);
		if (groundYResult.error) {
			return { success: false, error: groundYResult.error };
		}

		// Skip any remaining lines for this ground if linesPerGround > 2
		for (let extra = 2; extra < linesPerGround; extra++) {
			nextLine();
		}

		grounds.push({ x: groundXResult.value, y: groundYResult.value });
	}

	// --- Parse Wires section ---
	const wiresCountLine = nextLine();
	if (wiresCountLine === undefined) {
		return { success: false, error: `Truncated file: missing Wires count header at line ${cursor + 1}` };
	}
	if (!wiresCountLine.includes('//Wires')) {
		return { success: false, error: `Missing Wires section header at line ${cursor}: "${wiresCountLine.trim()}"` };
	}
	const wiresCountResult = parseIntFromLine(wiresCountLine, 'Wires count');
	if (wiresCountResult.error) {
		return { success: false, error: wiresCountResult.error };
	}
	const wiresCount = wiresCountResult.value;

	const linesPerWireLine = nextLine();
	if (linesPerWireLine === undefined) {
		return { success: false, error: `Truncated file: missing Lines Per Wire header at line ${cursor + 1}` };
	}
	const linesPerWireResult = parseIntFromLine(linesPerWireLine, 'Lines Per Wire');
	if (linesPerWireResult.error) {
		return { success: false, error: linesPerWireResult.error };
	}
	const linesPerWire = linesPerWireResult.value;

	const wires = [];
	for (let i = 0; i < wiresCount; i++) {
		const x1Line = nextLine();
		if (x1Line === undefined) {
			return { success: false, error: `Truncated file: missing wire ${i} End1 X at line ${cursor + 1}` };
		}
		const x1Result = parseIntFromLine(x1Line, `wire ${i} End1 X`);
		if (x1Result.error) {
			return { success: false, error: x1Result.error };
		}

		const y1Line = nextLine();
		if (y1Line === undefined) {
			return { success: false, error: `Truncated file: missing wire ${i} End1 Y at line ${cursor + 1}` };
		}
		const y1Result = parseIntFromLine(y1Line, `wire ${i} End1 Y`);
		if (y1Result.error) {
			return { success: false, error: y1Result.error };
		}

		const x2Line = nextLine();
		if (x2Line === undefined) {
			return { success: false, error: `Truncated file: missing wire ${i} End2 X at line ${cursor + 1}` };
		}
		const x2Result = parseIntFromLine(x2Line, `wire ${i} End2 X`);
		if (x2Result.error) {
			return { success: false, error: x2Result.error };
		}

		const y2Line = nextLine();
		if (y2Line === undefined) {
			return { success: false, error: `Truncated file: missing wire ${i} End2 Y at line ${cursor + 1}` };
		}
		const y2Result = parseIntFromLine(y2Line, `wire ${i} End2 Y`);
		if (y2Result.error) {
			return { success: false, error: y2Result.error };
		}

		// Skip any remaining lines for this wire if linesPerWire > 4
		for (let extra = 4; extra < linesPerWire; extra++) {
			nextLine();
		}

		wires.push({
			start: { x: x1Result.value, y: y1Result.value },
			end: { x: x2Result.value, y: y2Result.value },
		});
	}

	// --- Parse Texts section ---
	const textsCountLine = nextLine();
	if (textsCountLine === undefined) {
		return { success: false, error: `Truncated file: missing Texts count header at line ${cursor + 1}` };
	}
	if (!textsCountLine.includes('//Texts')) {
		return { success: false, error: `Missing Texts section header at line ${cursor}: "${textsCountLine.trim()}"` };
	}
	const textsCountResult = parseIntFromLine(textsCountLine, 'Texts count');
	if (textsCountResult.error) {
		return { success: false, error: textsCountResult.error };
	}
	const textsCount = textsCountResult.value;

	const linesPerTextLine = nextLine();
	if (linesPerTextLine === undefined) {
		return { success: false, error: `Truncated file: missing Lines Per Text header at line ${cursor + 1}` };
	}
	const linesPerTextResult = parseIntFromLine(linesPerTextLine, 'Lines Per Text');
	if (linesPerTextResult.error) {
		return { success: false, error: linesPerTextResult.error };
	}
	const linesPerText = linesPerTextResult.value;

	const texts = [];
	for (let i = 0; i < textsCount; i++) {
		const labelLine = nextLine();
		if (labelLine === undefined) {
			return { success: false, error: `Truncated file: missing text ${i} label at line ${cursor + 1}` };
		}
		const label = labelLine.trimEnd();

		const textXLine = nextLine();
		if (textXLine === undefined) {
			return { success: false, error: `Truncated file: missing text ${i} position X at line ${cursor + 1}` };
		}
		const textXResult = parseIntFromLine(textXLine, `text ${i} position X`);
		if (textXResult.error) {
			return { success: false, error: textXResult.error };
		}

		const textYLine = nextLine();
		if (textYLine === undefined) {
			return { success: false, error: `Truncated file: missing text ${i} position Y at line ${cursor + 1}` };
		}
		const textYResult = parseIntFromLine(textYLine, `text ${i} position Y`);
		if (textYResult.error) {
			return { success: false, error: textYResult.error };
		}

		const sizeLine = nextLine();
		if (sizeLine === undefined) {
			return { success: false, error: `Truncated file: missing text ${i} size at line ${cursor + 1}` };
		}
		const sizeResult = parseIntFromLine(sizeLine, `text ${i} size`);
		if (sizeResult.error) {
			return { success: false, error: sizeResult.error };
		}

		const colorLine = nextLine();
		if (colorLine === undefined) {
			return { success: false, error: `Truncated file: missing text ${i} color at line ${cursor + 1}` };
		}
		const colorResult = parseIntFromLine(colorLine, `text ${i} color`);
		if (colorResult.error) {
			return { success: false, error: colorResult.error };
		}

		// Skip any remaining lines for this text if linesPerText > 5
		for (let extra = 5; extra < linesPerText; extra++) {
			nextLine();
		}

		texts.push({
			label,
			position: { x: textXResult.value, y: textYResult.value },
			size: sizeResult.value,
			color: colorResult.value,
		});
	}

	return {
		success: true,
		block: {
			title,
			variables,
			components,
			grounds,
			wires,
			texts,
		},
	};
}
