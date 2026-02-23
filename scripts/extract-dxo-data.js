#!/usr/bin/env node

/**
 * Extract FRD and ZMA data from DXO files
 * 
 * This script reads DXO files from research/dxo-files/ and extracts
 * the embedded FRD and ZMA measurement data into separate files in
 * tests/fixtures/projects/
 */

const fs = require('fs');
const path = require('path');

// Project mappings
const projects = [
	{
		dxoFile: 'research/dxo-files/vivace 1_0_3.dxo',
		outputDir: 'tests/fixtures/projects/vivace',
		name: 'vivace',
	},
	{
		dxoFile: 'research/dxo-files/tonic xo 0_1_1.dxo',
		outputDir: 'tests/fixtures/projects/tonic',
		name: 'tonic',
	},
	{
		dxoFile: 'research/dxo-files/center 1_0_2.dxo',
		outputDir: 'tests/fixtures/projects/center',
		name: 'center',
	},
];

/**
 * Extract FRD data from DXO file content
 */
function extractFrdData(content) {
	const frdSections = [];
	const lines = content.split('\n');
	
	let inFrdSection = false;
	let currentFrd = null;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		
		// Start of FRD section
		if (line.startsWith('**FRD')) {
			inFrdSection = true;
			currentFrd = {
				header: line,
				filename: '',
				data: [],
			};
			
			// Next line should be the filename
			if (i + 1 < lines.length) {
				const filenameLine = lines[i + 1].trim();
				// Extract filename from comment
				const match = filenameLine.match(/^(.+\.frd)/i);
				if (match) {
					currentFrd.filename = match[1];
				}
			}
			continue;
		}
		
		// End of FRD section
		if (line.startsWith('**END FRD') || line.startsWith('**ZMA')) {
			if (currentFrd && currentFrd.filename) {
				frdSections.push(currentFrd);
			}
			inFrdSection = false;
			currentFrd = null;
			continue;
		}
		
		// Collect FRD data lines
		if (inFrdSection && currentFrd && line && !line.startsWith('//')) {
			// Skip lines that look like filenames
			if (line.includes('.frd') || line.includes('.zma')) {
				continue;
			}
			
			// Check if line looks like FRD data (frequency magnitude phase)
			const parts = line.split(/\s+/);
			if (parts.length >= 3 && !isNaN(parseFloat(parts[0]))) {
				currentFrd.data.push(line);
			}
		}
	}
	
	return frdSections;
}

/**
 * Extract ZMA data from DXO file content
 */
function extractZmaData(content) {
	const zmaSections = [];
	const lines = content.split('\n');
	
	let inZmaSection = false;
	let currentZma = null;
	let currentDriverIndex = 0;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		
		// Start of ZMA section
		if (line.startsWith('**ZMA Data for driver')) {
			inZmaSection = true;
			
			// Extract driver index from header
			const match = line.match(/driver (\d+)/);
			if (match) {
				currentDriverIndex = parseInt(match[1], 10);
			}
			
			// Look backwards to find the ZMA filename (search up to 1000 lines back)
			let filename = '';
			for (let j = i - 1; j >= Math.max(0, i - 1000); j--) {
				const prevLine = lines[j].trim();
				const zmaMatch = prevLine.match(/^(.+\.zma)/i);
				if (zmaMatch) {
					filename = zmaMatch[1];
					break;
				}
			}
			
			currentZma = {
				header: line,
				filename,
				driverIndex: currentDriverIndex,
				data: [],
			};
			continue;
		}
		
		// End of ZMA section
		if (line.startsWith('**END ZMA Data')) {
			if (currentZma && currentZma.filename && currentZma.data.length > 0) {
				zmaSections.push(currentZma);
			}
			inZmaSection = false;
			currentZma = null;
			continue;
		}
		
		// Collect ZMA data lines
		if (inZmaSection && currentZma && line && !line.startsWith('//')) {
			// Check if line looks like ZMA data (frequency impedance phase)
			const parts = line.split(/\s+/);
			if (parts.length >= 3 && !isNaN(parseFloat(parts[0]))) {
				currentZma.data.push(line);
			}
		}
	}
	
	// Handle case where ZMA section is at the end of file without END marker
	if (inZmaSection && currentZma && currentZma.filename && currentZma.data.length > 0) {
		zmaSections.push(currentZma);
	}
	
	return zmaSections;
}

/**
 * Write FRD file
 */
function writeFrdFile(outputPath, filename, data) {
	const content = [
		'# Frequency Response Data',
		'# Extracted from DXO file',
		'# Frequency(Hz) Magnitude(dB) Phase(degrees)',
		...data,
	].join('\n');
	
	const filePath = path.join(outputPath, filename);
	fs.writeFileSync(filePath, content, 'utf8');
	console.log(`  ✓ Created ${filename} (${data.length} data points)`);
}

/**
 * Write ZMA file
 */
function writeZmaFile(outputPath, filename, data) {
	const content = [
		'# Impedance Data',
		'# Extracted from DXO file',
		'# Frequency(Hz) Impedance(Ohms) Phase(degrees)',
		...data,
	].join('\n');
	
	const filePath = path.join(outputPath, filename);
	fs.writeFileSync(filePath, content, 'utf8');
	console.log(`  ✓ Created ${filename} (${data.length} data points)`);
}

/**
 * Copy DXO file to output directory
 */
function copyDxoFile(sourcePath, outputPath) {
	const filename = path.basename(sourcePath);
	const destPath = path.join(outputPath, filename);
	fs.copyFileSync(sourcePath, destPath);
	console.log(`  ✓ Copied ${filename}`);
}

/**
 * Process a single project
 */
function processProject(project) {
	console.log(`\nProcessing ${project.name}...`);
	
	// Read DXO file
	if (!fs.existsSync(project.dxoFile)) {
		console.error(`  ✗ DXO file not found: ${project.dxoFile}`);
		return;
	}
	
	const content = fs.readFileSync(project.dxoFile, 'utf8');
	
	// Ensure output directory exists
	if (!fs.existsSync(project.outputDir)) {
		fs.mkdirSync(project.outputDir, { recursive: true });
	}
	
	// Copy DXO file
	copyDxoFile(project.dxoFile, project.outputDir);
	
	// Extract and write FRD files
	const frdSections = extractFrdData(content);
	console.log(`  Found ${frdSections.length} FRD section(s)`);
	
	const writtenFrdFiles = new Set();
	for (const frd of frdSections) {
		if (frd.filename && frd.data.length > 0 && !writtenFrdFiles.has(frd.filename)) {
			writeFrdFile(project.outputDir, frd.filename, frd.data);
			writtenFrdFiles.add(frd.filename);
		}
	}
	
	// Extract and write ZMA files
	const zmaSections = extractZmaData(content);
	console.log(`  Found ${zmaSections.length} ZMA section(s)`);
	
	const writtenZmaFiles = new Set();
	for (const zma of zmaSections) {
		if (zma.filename && zma.data.length > 0 && !writtenZmaFiles.has(zma.filename)) {
			writeZmaFile(project.outputDir, zma.filename, zma.data);
			writtenZmaFiles.add(zma.filename);
		}
	}
}

/**
 * Main execution
 */
function main() {
	console.log('=== DXO Data Extraction ===');
	console.log('Extracting FRD and ZMA data from DXO files...\n');
	
	for (const project of projects) {
		processProject(project);
	}
	
	console.log('\n=== Extraction Complete ===');
	console.log('FRD and ZMA files have been extracted to tests/fixtures/projects/');
	console.log('You can now use these files for testing tasks 7 and 8.');
}

// Run the script
main();
