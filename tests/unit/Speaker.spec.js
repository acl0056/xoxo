import { Speaker } from '@/models/Speaker';

describe('Speaker', () => {
	describe('constructor', () => {
		it('should create a speaker with default parameters', () => {
			const speaker = new Speaker(10, 20);

			expect(speaker.type).toBe('speaker');
			expect(speaker.x).toBe(10);
			expect(speaker.y).toBe(20);
			expect(speaker.rotation).toBe(0);
			expect(speaker.id).toBeDefined();
			expect(speaker.label).toBe('');
		});

		it('should initialize parameters with correct default values', () => {
			const speaker = new Speaker(0, 0);

			expect(speaker.parameters.name).toBe('');
			expect(speaker.parameters.sensitivity).toBe(0.0);
			expect(speaker.parameters.delay).toBe(0.0);
			expect(speaker.parameters.inverted).toBe(false);
			expect(speaker.parameters.muted).toBe(false);
			expect(speaker.parameters.frdFile).toBeNull();
			expect(speaker.parameters.zmaFile).toBeNull();
			expect(speaker.parameters.phaseSource).toBe('derived');
			expect(speaker.parameters.offAxisFiles).toEqual([]);
		});

		it('should initialize data properties as null or empty', () => {
			const speaker = new Speaker(0, 0);

			expect(speaker.frdData).toBeNull();
			expect(speaker.zmaData).toBeNull();
			expect(speaker.offAxisData).toEqual([]);
		});

		it('should have two terminals', () => {
			const speaker = new Speaker(0, 0);

			expect(speaker.terminals).toHaveLength(2);
			expect(speaker.terminals[0]).toEqual({ x: -3, y: 0 });
			expect(speaker.terminals[1]).toEqual({ x: 3, y: 0 });
		});
	});

	describe('loadFrdFile', () => {
		it('should store the FRD file path', async () => {
			const speaker = new Speaker(0, 0);
			const filePath = '/path/to/speaker.frd';

			await speaker.loadFrdFile(filePath);

			expect(speaker.parameters.frdFile).toBe(filePath);
		});
	});

	describe('loadZmaFile', () => {
		it('should store the ZMA file path', async () => {
			const speaker = new Speaker(0, 0);
			const filePath = '/path/to/speaker.zma';

			await speaker.loadZmaFile(filePath);

			expect(speaker.parameters.zmaFile).toBe(filePath);
		});
	});

	describe('addOffAxisFile', () => {
		it('should add a new off-axis file', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(30, '/path/to/30deg.frd');

			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0]).toEqual({
				angle: 30,
				frdPath: '/path/to/30deg.frd',
			});
		});

		it('should add multiple off-axis files', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(15, '/path/to/15deg.frd');
			await speaker.addOffAxisFile(30, '/path/to/30deg.frd');
			await speaker.addOffAxisFile(45, '/path/to/45deg.frd');

			expect(speaker.parameters.offAxisFiles).toHaveLength(3);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(15);
			expect(speaker.parameters.offAxisFiles[1].angle).toBe(30);
			expect(speaker.parameters.offAxisFiles[2].angle).toBe(45);
		});

		it('should update existing angle if already present', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(30, '/path/to/30deg-v1.frd');
			await speaker.addOffAxisFile(30, '/path/to/30deg-v2.frd');

			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0].frdPath).toBe('/path/to/30deg-v2.frd');
		});

		it('should reject angles less than 0', async () => {
			const speaker = new Speaker(0, 0);

			await expect(speaker.addOffAxisFile(-10, '/path/to/file.frd'))
				.rejects.toThrow('Angle must be a number between 0 and 180 degrees');
		});

		it('should reject angles greater than 180', async () => {
			const speaker = new Speaker(0, 0);

			await expect(speaker.addOffAxisFile(200, '/path/to/file.frd'))
				.rejects.toThrow('Angle must be a number between 0 and 180 degrees');
		});

		it('should reject non-numeric angles', async () => {
			const speaker = new Speaker(0, 0);

			await expect(speaker.addOffAxisFile('30', '/path/to/file.frd'))
				.rejects.toThrow('Angle must be a number between 0 and 180 degrees');
		});

		it('should accept angle 0', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(0, '/path/to/0deg.frd');

			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(0);
		});

		it('should accept angle 180', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(180, '/path/to/180deg.frd');

			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(180);
		});
	});

	describe('removeOffAxisFile', () => {
		it('should remove an off-axis file by angle', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(15, '/path/to/15deg.frd');
			await speaker.addOffAxisFile(30, '/path/to/30deg.frd');
			await speaker.addOffAxisFile(45, '/path/to/45deg.frd');

			speaker.removeOffAxisFile(30);

			expect(speaker.parameters.offAxisFiles).toHaveLength(2);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(15);
			expect(speaker.parameters.offAxisFiles[1].angle).toBe(45);
		});

		it('should do nothing if angle does not exist', async () => {
			const speaker = new Speaker(0, 0);

			await speaker.addOffAxisFile(30, '/path/to/30deg.frd');

			speaker.removeOffAxisFile(45);

			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(30);
		});

		it('should handle removing from empty array', () => {
			const speaker = new Speaker(0, 0);

			speaker.removeOffAxisFile(30);

			expect(speaker.parameters.offAxisFiles).toHaveLength(0);
		});
	});

	describe('validate', () => {
		it('should validate a speaker with default parameters', () => {
			const speaker = new Speaker(10, 20);

			const result = speaker.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate a speaker with all parameters set', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.name = 'Tweeter';
			speaker.parameters.sensitivity = 3.5;
			speaker.parameters.delay = 0.5;
			speaker.parameters.inverted = true;
			speaker.parameters.muted = false;
			speaker.parameters.frdFile = '/path/to/tweeter.frd';
			speaker.parameters.zmaFile = '/path/to/tweeter.zma';
			speaker.parameters.phaseSource = 'measured';
			speaker.parameters.offAxisFiles = [
				{ angle: 30, frdPath: '/path/to/30deg.frd' },
			];

			const result = speaker.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject non-string name', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.name = 123;

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Name must be a string');
		});

		it('should reject non-numeric sensitivity', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.sensitivity = '3.5';

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Sensitivity must be a number');
		});

		it('should reject negative delay', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.delay = -1.0;

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Delay must be a non-negative number');
		});

		it('should reject non-boolean inverted flag', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.inverted = 'true';

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Inverted must be a boolean');
		});

		it('should reject non-boolean muted flag', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.muted = 1;

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Muted must be a boolean');
		});

		it('should reject invalid frdFile type', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.frdFile = 123;

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('FRD file must be null or a string');
		});

		it('should accept null frdFile', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.frdFile = null;

			const result = speaker.validate();

			expect(result.valid).toBe(true);
		});

		it('should reject invalid zmaFile type', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.zmaFile = 456;

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('ZMA file must be null or a string');
		});

		it('should accept null zmaFile', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.zmaFile = null;

			const result = speaker.validate();

			expect(result.valid).toBe(true);
		});

		it('should reject invalid phaseSource', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.phaseSource = 'invalid';

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Phase source must be one of: measured, derived');
		});

		it('should accept measured phaseSource', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.phaseSource = 'measured';

			const result = speaker.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept derived phaseSource', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.phaseSource = 'derived';

			const result = speaker.validate();

			expect(result.valid).toBe(true);
		});

		it('should reject non-array offAxisFiles', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.offAxisFiles = 'not an array';

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Off-axis files must be an array');
		});

		it('should reject off-axis file with invalid angle', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.offAxisFiles = [
				{ angle: -10, frdPath: '/path/to/file.frd' },
			];

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Off-axis file 0: angle must be a number between 0 and 180');
		});

		it('should reject off-axis file with angle > 180', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.offAxisFiles = [
				{ angle: 200, frdPath: '/path/to/file.frd' },
			];

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Off-axis file 0: angle must be a number between 0 and 180');
		});

		it('should reject off-axis file with non-string frdPath', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.offAxisFiles = [
				{ angle: 30, frdPath: 123 },
			];

			const result = speaker.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Off-axis file 0: frdPath must be a string');
		});

		it('should validate multiple off-axis files', () => {
			const speaker = new Speaker(10, 20);
			speaker.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/15deg.frd' },
				{ angle: 30, frdPath: '/path/to/30deg.frd' },
				{ angle: 45, frdPath: '/path/to/45deg.frd' },
			];

			const result = speaker.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('toJSON', () => {
		it('should serialize speaker to JSON', () => {
			const speaker = new Speaker(10, 20);
			speaker.label = 'S1';
			speaker.rotation = 90;
			speaker.parameters.name = 'Tweeter';
			speaker.parameters.sensitivity = 3.5;
			speaker.parameters.delay = 0.5;
			speaker.parameters.inverted = true;
			speaker.parameters.muted = false;
			speaker.parameters.frdFile = '/path/to/tweeter.frd';
			speaker.parameters.zmaFile = '/path/to/tweeter.zma';
			speaker.parameters.phaseSource = 'measured';
			speaker.parameters.offAxisFiles = [
				{ angle: 30, frdPath: '/path/to/30deg.frd' },
			];

			const json = speaker.toJSON();

			expect(json.id).toBe(speaker.id);
			expect(json.type).toBe('speaker');
			expect(json.label).toBe('S1');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.rotation).toBe(90);
			expect(json.parameters.name).toBe('Tweeter');
			expect(json.parameters.sensitivity).toBe(3.5);
			expect(json.parameters.delay).toBe(0.5);
			expect(json.parameters.inverted).toBe(true);
			expect(json.parameters.muted).toBe(false);
			expect(json.parameters.frdFile).toBe('/path/to/tweeter.frd');
			expect(json.parameters.zmaFile).toBe('/path/to/tweeter.zma');
			expect(json.parameters.phaseSource).toBe('measured');
			expect(json.parameters.offAxisFiles).toHaveLength(1);
			expect(json.parameters.offAxisFiles[0]).toEqual({
				angle: 30,
				frdPath: '/path/to/30deg.frd',
			});
		});

		it('should not serialize parsed data properties', () => {
			const speaker = new Speaker(10, 20);
			speaker.frdData = { frequencies: [100, 200], magnitudes: [80, 85] };
			speaker.zmaData = { frequencies: [100, 200], impedances: [8, 9] };
			speaker.offAxisData = [{ angle: 30, data: {} }];

			const json = speaker.toJSON();

			expect(json.frdData).toBeUndefined();
			expect(json.zmaData).toBeUndefined();
			expect(json.offAxisData).toBeUndefined();
		});
	});

	describe('fromJSON', () => {
		it('should deserialize speaker from JSON', () => {
			const json = {
				id: 'test-id-123',
				type: 'speaker',
				label: 'S1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					name: 'Tweeter',
					sensitivity: 3.5,
					delay: 0.5,
					inverted: true,
					muted: false,
					frdFile: '/path/to/tweeter.frd',
					zmaFile: '/path/to/tweeter.zma',
					phaseSource: 'measured',
					offAxisFiles: [
						{ angle: 30, frdPath: '/path/to/30deg.frd' },
					],
				},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.id).toBe('test-id-123');
			expect(speaker.type).toBe('speaker');
			expect(speaker.label).toBe('S1');
			expect(speaker.x).toBe(10);
			expect(speaker.y).toBe(20);
			expect(speaker.rotation).toBe(90);
			expect(speaker.parameters.name).toBe('Tweeter');
			expect(speaker.parameters.sensitivity).toBe(3.5);
			expect(speaker.parameters.delay).toBe(0.5);
			expect(speaker.parameters.inverted).toBe(true);
			expect(speaker.parameters.muted).toBe(false);
			expect(speaker.parameters.frdFile).toBe('/path/to/tweeter.frd');
			expect(speaker.parameters.zmaFile).toBe('/path/to/tweeter.zma');
			expect(speaker.parameters.phaseSource).toBe('measured');
			expect(speaker.parameters.offAxisFiles).toHaveLength(1);
			expect(speaker.parameters.offAxisFiles[0]).toEqual({
				angle: 30,
				frdPath: '/path/to/30deg.frd',
			});
		});

		it('should use default values for missing parameters', () => {
			const json = {
				id: 'test-id-123',
				type: 'speaker',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.parameters.name).toBe('');
			expect(speaker.parameters.sensitivity).toBe(0.0);
			expect(speaker.parameters.delay).toBe(0.0);
			expect(speaker.parameters.inverted).toBe(false);
			expect(speaker.parameters.muted).toBe(false);
			expect(speaker.parameters.frdFile).toBeNull();
			expect(speaker.parameters.zmaFile).toBeNull();
			expect(speaker.parameters.phaseSource).toBe('derived');
			expect(speaker.parameters.offAxisFiles).toEqual([]);
		});

		it('should initialize parsed data properties as null or empty', () => {
			const json = {
				id: 'test-id-123',
				type: 'speaker',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					name: 'Test',
					sensitivity: 0,
					delay: 0,
					inverted: false,
					muted: false,
					phaseSource: 'derived',
				},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.frdData).toBeNull();
			expect(speaker.zmaData).toBeNull();
			expect(speaker.offAxisData).toEqual([]);
		});
	});

	describe('serialization round-trip', () => {
		it('should preserve all data through serialization and deserialization', () => {
			const original = new Speaker(15, 25);
			original.label = 'S2';
			original.rotation = 180;
			original.parameters.name = 'Woofer';
			original.parameters.sensitivity = -2.5;
			original.parameters.delay = 1.2;
			original.parameters.inverted = true;
			original.parameters.muted = true;
			original.parameters.frdFile = '/path/to/woofer.frd';
			original.parameters.zmaFile = '/path/to/woofer.zma';
			original.parameters.phaseSource = 'measured';
			original.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/15deg.frd' },
				{ angle: 30, frdPath: '/path/to/30deg.frd' },
			];

			const json = original.toJSON();
			const restored = Speaker.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.type).toBe(original.type);
			expect(restored.label).toBe(original.label);
			expect(restored.x).toBe(original.x);
			expect(restored.y).toBe(original.y);
			expect(restored.rotation).toBe(original.rotation);
			expect(restored.parameters).toEqual(original.parameters);
		});
	});
});
