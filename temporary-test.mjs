import fs from 'fs';
import path from 'path';
import { parseXsc } from './src/io/XscParser.js';

const blocksDir = 'research/CircuitBlocks';
const files = fs.readdirSync(blocksDir).filter(f => f.endsWith('.xsc'));

console.log(`Found ${files.length} .xsc files\n`);

let passed = 0;
let failed = 0;

for (const file of files) {
	const filePath = path.join(blocksDir, file);
	const content = fs.readFileSync(filePath, 'utf8');
	const result = parseXsc(content);

	if (result.success) {
		const block = result.block;
		const nonEmptyVars = block.variables.filter(v => v.name !== '');
		console.log(`✓ ${file}`);
		console.log(`  Title: "${block.title}"`);
		console.log(`  Variables: ${nonEmptyVars.map(v => `${v.name}=${v.defaultValue}`).join(', ')}`);
		console.log(`  Components: ${block.components.length}`);
		console.log(`  Grounds: ${block.grounds.length}`);
		console.log(`  Wires: ${block.wires.length}`);
		console.log(`  Texts: ${block.texts.length}`);
		console.log('');
		passed++;
	} else {
		console.log(`✗ ${file}: ${result.error}`);
		console.log('');
		failed++;
	}
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length} files`);

// Detailed check on LowPassFirstOrder
console.log('\n--- Detailed check: LowPassFirstOrder.xsc ---');
const lpContent = fs.readFileSync(path.join(blocksDir, 'LowPassFirstOrder.xsc'), 'utf8');
const lpResult = parseXsc(lpContent);
if (lpResult.success) {
	const block = lpResult.block;
	console.log(`Title: "${block.title}"`);
	console.log(`Variables:`);
	block.variables.forEach((v, i) => {
		console.log(`  #${i}: name="${v.name}", desc="${v.description}", default=${v.defaultValue}`);
	});
	console.log(`Components:`);
	block.components.forEach((c, i) => {
		console.log(`  #${i}: type=${c.partType}, value=${c.defaultValue}, esr=${c.esr}, pos=(${c.position.x},${c.position.y}), horiz=${c.isHorizontal}, formula="${c.formula}", scale="${c.formulaScale}"`);
	});
	console.log(`Wires:`);
	block.wires.forEach((w, i) => {
		console.log(`  #${i}: (${w.start.x},${w.start.y}) -> (${w.end.x},${w.end.y})`);
	});
	console.log(`Texts:`);
	block.texts.forEach((t, i) => {
		console.log(`  #${i}: "${t.label}" at (${t.position.x},${t.position.y}), size=${t.size}, color=${t.color}`);
	});
}

// Test error cases
console.log('\n--- Error case tests ---');

// Truncated file
const truncResult = parseXsc('Some Title\n\n');
console.log(`Truncated file: ${truncResult.success ? 'FAIL (should error)' : `OK: "${truncResult.error}"`}`);

// Empty content
const emptyResult = parseXsc('');
console.log(`Empty content: ${emptyResult.success ? 'FAIL (should error)' : `OK: "${emptyResult.error}"`}`);

// Non-string input
const nullResult = parseXsc(null);
console.log(`Null input: ${nullResult.success ? 'FAIL (should error)' : `OK: "${nullResult.error}"`}`);

// Non-numeric value in variable
const badVarContent = `Title


bad //Variable #0
desc
  notanumber //VarValue #0
   //Variable #1

  0 //VarValue #1
   //Variable #2

  0 //VarValue #2
   //Variable #3

  0 //VarValue #3
   //Variable #4

  0 //VarValue #4
   //Variable #5

  0 //VarValue #5
0 //Passives
12 //Lines Per Passive
0 //Grounds
2 //Lines Per Ground
0 //Wires
4 //Lines Per Wire
0 //Texts
5 //Lines Per Text
`;
const badVarResult = parseXsc(badVarContent);
console.log(`Non-numeric variable: ${badVarResult.success ? 'FAIL (should error)' : `OK: "${badVarResult.error}"`}`);

// Missing Passives section
const missingPassivesContent = `Title


   //Variable #0

  0 //VarValue #0
   //Variable #1

  0 //VarValue #1
   //Variable #2

  0 //VarValue #2
   //Variable #3

  0 //VarValue #3
   //Variable #4

  0 //VarValue #4
   //Variable #5

  0 //VarValue #5
NOT_A_SECTION_HEADER
`;
const missingPassivesResult = parseXsc(missingPassivesContent);
console.log(`Missing Passives: ${missingPassivesResult.success ? 'FAIL (should error)' : `OK: "${missingPassivesResult.error}"`}`);
