import { TextAnnotation } from '@/models/TextAnnotation';

describe('TextAnnotation', () => {
	describe('constructor', () => {
		it('should create annotation with provided values', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			expect(annotation.x).toBe(10);
			expect(annotation.y).toBe(20);
			expect(annotation.text).toBe('Test annotation');
			expect(annotation.fontSize).toBe(12);
			expect(annotation.id).toBeDefined();
		});

		it('should generate unique IDs for different annotations', () => {
			const annotation1 = new TextAnnotation(0, 0, 'First');
			const annotation2 = new TextAnnotation(0, 0, 'Second');

			expect(annotation1.id).not.toBe(annotation2.id);
		});
	});

	describe('validate', () => {
		it('should validate a valid annotation', () => {
			const annotation = new TextAnnotation(10, 20, 'Valid annotation');

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject annotation without id', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.id = null;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation must have an id');
		});

		it('should reject annotation with invalid x position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.x = NaN;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation x position must be a finite number');
		});

		it('should reject annotation with invalid y position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.y = Infinity;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation y position must be a finite number');
		});

		it('should reject annotation with non-string text', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.text = 123;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation text must be a string');
		});

		it('should reject annotation with invalid fontSize', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = NaN;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be a finite number');
		});

		it('should reject annotation with fontSize below minimum', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 5;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be between 8 and 72');
		});

		it('should reject annotation with fontSize above maximum', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 100;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be between 8 and 72');
		});

		it('should accept annotation with fontSize at minimum boundary', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 8;

			const result = annotation.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept annotation with fontSize at maximum boundary', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 72;

			const result = annotation.validate();

			expect(result.valid).toBe(true);
		});
	});

	describe('toJSON', () => {
		it('should serialize annotation to JSON', () => {
			const annotation = new TextAnnotation(15, 25, 'Test annotation');
			annotation.fontSize = 16;

			const json = annotation.toJSON();

			expect(json).toEqual({
				id: annotation.id,
				x: 15,
				y: 25,
				text: 'Test annotation',
				fontSize: 16,
				bold: false,
				textAlign: 'left',
			});
		});
	});

	describe('fromJSON', () => {
		it('should deserialize annotation from JSON', () => {
			const json = {
				id: 'test-id-123',
				x: 30,
				y: 40,
				text: 'Deserialized annotation',
				fontSize: 18,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.id).toBe('test-id-123');
			expect(annotation.x).toBe(30);
			expect(annotation.y).toBe(40);
			expect(annotation.text).toBe('Deserialized annotation');
			expect(annotation.fontSize).toBe(18);
		});

		it('should use default fontSize if not provided', () => {
			const json = {
				id: 'test-id-456',
				x: 10,
				y: 20,
				text: 'No font size',
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.fontSize).toBe(12);
		});
	});

	describe('serialization round-trip', () => {
		it('should preserve all data through serialization and deserialization', () => {
			const original = new TextAnnotation(50, 60, 'Round-trip test');
			original.fontSize = 24;

			const json = original.toJSON();
			const restored = TextAnnotation.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.x).toBe(original.x);
			expect(restored.y).toBe(original.y);
			expect(restored.text).toBe(original.text);
			expect(restored.fontSize).toBe(original.fontSize);
		});
	});
});
