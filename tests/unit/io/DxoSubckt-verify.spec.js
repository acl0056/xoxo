import { DxoImporter } from '../../../src/io/DxoImporter';

describe('DxoImporter Subckt parsing verification', () => {
	it('should parse shunt-notch.dxo and reconstruct BlockGroup', () => {
		const filePath = 'research/circuit-block-examples/shunt-notch.dxo';
		const circuit = DxoImporter.import(filePath);

		// Verify blockGroups were created
		expect(circuit.blockGroups).toBeDefined();
		expect(circuit.blockGroups.length).toBe(1);

		const blockGroup = circuit.blockGroups[0];

		// Verify title
		expect(blockGroup.blockTitle).toBe('Shunt Notch');

		// Verify variables (only non-empty slots: f, Q, R)
		expect(blockGroup.variables.length).toBe(3);
		expect(blockGroup.variables[0]).toEqual({ name: 'f', value: 917.00404, description: 'notch frequency' });
		expect(blockGroup.variables[1]).toEqual({ name: 'Q', value: 1, description: 'determines notch width' });
		expect(blockGroup.variables[2]).toEqual({ name: 'R', value: 0.01, description: 'determines notch depth' });

		// Verify 3 components belong to the block (Subckt#=0)
		expect(blockGroup.componentIds.length).toBe(3);

		// Verify formulas
		expect(blockGroup.formulas[0]).toBe('(Q*8)/(6.28*f)');
		expect(blockGroup.formulas[1]).toBe('1/(6.28*f*8*Q)');
		expect(blockGroup.formulas[2]).toBe('R*1');

		// Verify step modes
		expect(blockGroup.stepModes).toEqual([0, 0, 0, 0, 0, 0]);
	});

	it('should import files with 0 subckts without creating blockGroups', () => {
		const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
		const circuit = DxoImporter.import(filePath);

		// Files with 0 subckts should not have blockGroups (or have empty array)
		expect(circuit.blockGroups === undefined || circuit.blockGroups.length === 0).toBe(true);
	});

	it('should mark independent components with Subckt#=-1 as not in any block group', () => {
		const filePath = 'research/circuit-block-examples/shunt-notch.dxo';
		const circuit = DxoImporter.import(filePath);

		const blockGroup = circuit.blockGroups[0];
		const blockComponentIds = new Set(blockGroup.componentIds);

		// Total passives in the file: 8
		// Block components: 3 (Subckt#=0)
		// Independent components: 5 (Subckt#=-1)
		const passiveComponents = circuit.components.filter(
			(c) => c.type === 'resistor' || c.type === 'capacitor' || c.type === 'inductor',
		);
		expect(passiveComponents.length).toBe(8);

		const independentComponents = passiveComponents.filter((c) => !blockComponentIds.has(c.id));
		expect(independentComponents.length).toBe(5);
	});
});
