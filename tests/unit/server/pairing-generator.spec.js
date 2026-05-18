const { generatePairingCode } = require('../../../server/pairing/generator');

describe('pairing code generator', () => {
	it('returns a code with the XOXO- prefix', () => {
		const code = generatePairingCode();
		expect(code.startsWith('XOXO-')).toBe(true);
	});

	it('returns a code of length 14 (XOXO-XXXX-XXXX)', () => {
		const code = generatePairingCode();
		expect(code.length).toBe(14);
	});

	it('uses only characters from the restricted set', () => {
		const validPattern = /^XOXO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
		for (let i = 0; i < 50; i++) {
			const code = generatePairingCode();
			expect(code).toMatch(validPattern);
		}
	});

	it('does not contain ambiguous characters (0, O, 1, I, L)', () => {
		for (let i = 0; i < 50; i++) {
			const suffix = generatePairingCode().replace(/^XOXO-/, '').replace(/-/g, '');
			expect(suffix).not.toMatch(/[01OIL]/);
		}
	});

	it('generates different codes on successive calls', () => {
		const codes = new Set();
		for (let i = 0; i < 20; i++) {
			codes.add(generatePairingCode());
		}
		// With 31^8 ≈ 852 billion possible codes, 20 calls should be unique
		expect(codes.size).toBe(20);
	});
});
