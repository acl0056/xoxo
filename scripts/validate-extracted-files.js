#!/usr/bin/env node

/**
 * Validate extracted FRD and ZMA files
 * 
 * Checks:
 * - File format (3 columns: frequency, value, phase)
 * - Numeric values
 * - Monotonically increasing frequencies
 * - Reasonable value ranges
 */

const fs = require('fs');
const path = require('path');

const projects = ['vivace', 'tonic', 'center'];

function validateFile(filePath, fileType) {
	const errors = [];
	const warnings = [];
	
	if (!fs.existsSync(filePath)) {
		errors.push('File does not exist');
		return { valid: false, errors, warnings };
	}
	
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split('\n').filter((line) => {
		const trimmed = line.trim();
		return trimmed && !trimmed.startsWith('#');
	});
	
	if (lines.length === 0) {
		errors.push('No data lines found');
		return { valid: false, errors, warnings };
	}
	
	let previousFrequency = -1;
	let lineNumber = 0;
	
	for (const line of lines) {
		lineNumber++;
		const parts = line.trim().split(/\s+/);
		
		if (parts.length < 3) {
			errors.push(`Line ${lineNumber}: Expected 3 columns, got ${parts.length}`);
			continue;
		}
		
		const frequency = parseFloat(parts[0]);
		const value = parseFloat(parts[1]);
		const phase = parseFloat(parts[2]);
		
		// Check numeric values
		if (isNaN(frequency)) {
			errors.push(`Line ${lineNumber}: Invalid frequency "${parts[0]}"`);
		}
		if (isNaN(value)) {
			errors.push(`Line ${lineNumber}: Invalid value "${parts[1]}"`);
		}
		if (isNaN(phase)) {
			errors.push(`Line ${lineNumber}: Invalid phase "${parts[2]}"`);
		}
		
		// Check monotonic frequency
		if (frequency <= previousFrequency) {
			errors.push(`Line ${lineNumber}: Non-monotonic frequency ${frequency} (previous: ${previousFrequency})`);
		}
		previousFrequency = frequency;
		
		// Check reasonable ranges
		if (frequency < 0) {
			errors.push(`Line ${lineNumber}: Negative frequency ${frequency}`);
		}
		
		if (fileType === 'frd') {
			// FRD: magnitude in dB, phase in degrees
			if (value < -50 || value > 150) {
				warnings.push(`Line ${lineNumber}: Unusual magnitude ${value} dB`);
			}
		} else if (fileType === 'zma') {
			// ZMA: impedance in ohms, phase in degrees
			if (value <= 0) {
				errors.push(`Line ${lineNumber}: Non-positive impedance ${value}`);
			}
			if (value > 1000) {
				warnings.push(`Line ${lineNumber}: Very high impedance ${value} ohms`);
			}
		}
		
		if (phase < -180 || phase > 180) {
			warnings.push(`Line ${lineNumber}: Phase ${phase} outside ±180°`);
		}
	}
	
	return {
		valid: errors.length === 0,
		errors,
		warnings,
		dataPoints: lines.length,
		frequencyRange: lines.length > 0 ? {
			min: parseFloat(lines[0].split(/\s+/)[0]),
			max: parseFloat(lines[lines.length - 1].split(/\s+/)[0]),
		} : null,
	};
}

function validateProject(projectName) {
	console.log(`\n=== Validating ${projectName} ===`);
	
	const projectDir = path.join('tests/fixtures/projects', projectName);
	
	if (!fs.existsSync(projectDir)) {
		console.log(`  ✗ Project directory not found`);
		return false;
	}
	
	const files = fs.readdirSync(projectDir);
	const frdFiles = files.filter((f) => f.endsWith('.frd'));
	const zmaFiles = files.filter((f) => f.endsWith('.zma'));
	
	console.log(`  Found ${frdFiles.length} FRD file(s), ${zmaFiles.length} ZMA file(s)`);
	
	let allValid = true;
	
	// Validate FRD files
	for (const frdFile of frdFiles) {
		const filePath = path.join(projectDir, frdFile);
		const result = validateFile(filePath, 'frd');
		
		if (result.valid) {
			console.log(`  ✓ ${frdFile}: ${result.dataPoints} points, ${result.frequencyRange.min.toFixed(2)} - ${result.frequencyRange.max.toFixed(2)} Hz`);
		} else {
			console.log(`  ✗ ${frdFile}: INVALID`);
			result.errors.forEach((err) => console.log(`      ERROR: ${err}`));
			allValid = false;
		}
		
		if (result.warnings.length > 0) {
			result.warnings.forEach((warn) => console.log(`      WARNING: ${warn}`));
		}
	}
	
	// Validate ZMA files
	for (const zmaFile of zmaFiles) {
		const filePath = path.join(projectDir, zmaFile);
		const result = validateFile(filePath, 'zma');
		
		if (result.valid) {
			console.log(`  ✓ ${zmaFile}: ${result.dataPoints} points, ${result.frequencyRange.min.toFixed(2)} - ${result.frequencyRange.max.toFixed(2)} Hz`);
		} else {
			console.log(`  ✗ ${zmaFile}: INVALID`);
			result.errors.forEach((err) => console.log(`      ERROR: ${err}`));
			allValid = false;
		}
		
		if (result.warnings.length > 0) {
			result.warnings.forEach((warn) => console.log(`      WARNING: ${warn}`));
		}
	}
	
	return allValid;
}

function main() {
	console.log('=== Validating Extracted FRD and ZMA Files ===');
	
	let allProjectsValid = true;
	
	for (const project of projects) {
		const valid = validateProject(project);
		if (!valid) {
			allProjectsValid = false;
		}
	}
	
	console.log('\n=== Validation Summary ===');
	if (allProjectsValid) {
		console.log('✓ All files are valid and ready for testing!');
	} else {
		console.log('✗ Some files have errors. Please review the output above.');
		process.exit(1);
	}
}

main();
