import { TextAnnotation } from '@/models/TextAnnotation';

describe('TextAnnotation', () => {
	describe('constructor', () => {
		it('should create an annotation with position and text', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			expect(annotation.id).toBeDefined();
			expect(annotation.x).toBe(10);
			expect(annotation.y).toBe(20);
			expect(annotation.text).toBe('Test annotation');
			expect(annotation.fontSize).toBe(12);
		});

		it('should generate a unique id', () => {
			const annotation1 = new TextAnnotation(10, 20, 'Text 1');
			const annotation2 = new TextAnnotation(10, 20, 'Text 2');

			expect(annotation1.id).toBeDefined();
			expect(annotation2.id).toBeDefined();
			expect(annotation1.id).not.toBe(annotation2.id);
		});

		it('should default fontSize to 12', () => {
			const annotation = new TextAnnotation(0, 0, 'Test');

			expect(annotation.fontSize).toBe(12);
		});

		it('should handle empty text', () => {
			const annotation = new TextAnnotation(10, 20, '');

			expect(annotation.text).toBe('');
		});

		it('should handle multi-line text', () => {
			const annotation = new TextAnnotation(10, 20, 'Line 1\nLine 2\nLine 3');

			expect(annotation.text).toBe('Line 1\nLine 2\nLine 3');
		});
	});

	describe('validate', () => {
		it('should validate a valid annotation', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should detect missing id', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.id = null;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation must have an id');
		});

		it('should detect invalid x position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.x = NaN;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation x position must be a finite number');
		});

		it('should detect infinite x position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.x = Infinity;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation x position must be a finite number');
		});

		it('should detect invalid y position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.y = NaN;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation y position must be a finite number');
		});

		it('should detect infinite y position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.y = Infinity;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation y position must be a finite number');
		});

		it('should detect non-string text', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.text = 123;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation text must be a string');
		});

		it('should detect invalid fontSize', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = NaN;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be a finite number');
		});

		it('should detect fontSize below minimum', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 7;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be between 8 and 72');
		});

		it('should detect fontSize above maximum', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 73;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Annotation fontSize must be between 8 and 72');
		});

		it('should accept fontSize at minimum boundary', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 8;

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should accept fontSize at maximum boundary', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.fontSize = 72;

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should detect multiple validation errors', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.id = null;
			annotation.x = NaN;
			annotation.text = 123;
			annotation.fontSize = 100;

			const result = annotation.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(4);
			expect(result.errors).toContain('Annotation must have an id');
			expect(result.errors).toContain('Annotation x position must be a finite number');
			expect(result.errors).toContain('Annotation text must be a string');
			expect(result.errors).toContain('Annotation fontSize must be between 8 and 72');
		});

		it('should accept negative coordinates', () => {
			const annotation = new TextAnnotation(-10, -20, 'Test');

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should accept zero coordinates', () => {
			const annotation = new TextAnnotation(0, 0, 'Test');

			const result = annotation.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('toJSON', () => {
		it('should serialize an annotation', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');
			annotation.id = 'anno-123';
			annotation.fontSize = 14;

			const json = annotation.toJSON();

			expect(json).toEqual({
				id: 'anno-123',
				x: 10,
				y: 20,
				text: 'Test annotation',
				fontSize: 14,
			});
		});

		it('should serialize with default fontSize', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			annotation.id = 'anno-123';

			const json = annotation.toJSON();

			expect(json.fontSize).toBe(12);
		});

		it('should serialize empty text', () => {
			const annotation = new TextAnnotation(10, 20, '');
			annotation.id = 'anno-123';

			const json = annotation.toJSON();

			expect(json.text).toBe('');
		});

		it('should serialize multi-line text', () => {
			const annotation = new TextAnnotation(10, 20, 'Line 1\nLine 2');
			annotation.id = 'anno-123';

			const json = annotation.toJSON();

			expect(json.text).toBe('Line 1\nLine 2');
		});
	});

	describe('fromJSON', () => {
		it('should deserialize an annotation', () => {
			const json = {
				id: 'anno-123',
				x: 10,
				y: 20,
				text: 'Test annotation',
				fontSize: 14,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.id).toBe('anno-123');
			expect(annotation.x).toBe(10);
			expect(annotation.y).toBe(20);
			expect(annotation.text).toBe('Test annotation');
			expect(annotation.fontSize).toBe(14);
		});

		it('should use default fontSize when not provided', () => {
			const json = {
				id: 'anno-123',
				x: 10,
				y: 20,
				text: 'Test annotation',
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.fontSize).toBe(12);
		});

		it('should handle fontSize of 0', () => {
			const json = {
				id: 'anno-123',
				x: 10,
				y: 20,
				text: 'Test',
				fontSize: 0,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.fontSize).toBe(0);
		});

		it('should deserialize empty text', () => {
			const json = {
				id: 'anno-123',
				x: 10,
				y: 20,
				text: '',
				fontSize: 12,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.text).toBe('');
		});

		it('should deserialize negative coordinates', () => {
			const json = {
				id: 'anno-123',
				x: -10,
				y: -20,
				text: 'Test',
				fontSize: 12,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.x).toBe(-10);
			expect(annotation.y).toBe(-20);
		});
	});

	describe('serialization round-trip', () => {
		it('should preserve all data through serialization and deserialization', () => {
			const originalAnnotation = new TextAnnotation(10, 20, 'Test annotation');
			originalAnnotation.fontSize = 16;

			const json = originalAnnotation.toJSON();
			const restoredAnnotation = TextAnnotation.fromJSON(json);

			expect(restoredAnnotation.id).toBe(originalAnnotation.id);
			expect(restoredAnnotation.x).toBe(originalAnnotation.x);
			expect(restoredAnnotation.y).toBe(originalAnnotation.y);
			expect(restoredAnnotation.text).toBe(originalAnnotation.text);
			expect(restoredAnnotation.fontSize).toBe(originalAnnotation.fontSize);
		});

		it('should preserve multi-line text', () => {
			const originalAnnotation = new TextAnnotation(10, 20, 'Line 1\nLine 2\nLine 3');

			const json = originalAnnotation.toJSON();
			const restoredAnnotation = TextAnnotation.fromJSON(json);

			expect(restoredAnnotation.text).toBe(originalAnnotation.text);
		});

		it('should preserve special characters in text', () => {
			const originalAnnotation = new TextAnnotation(10, 20, 'Test: 4.7kΩ @ 100Hz');

			const json = originalAnnotation.toJSON();
			const restoredAnnotation = TextAnnotation.fromJSON(json);

			expect(restoredAnnotation.text).toBe(originalAnnotation.text);
		});
	});
});
