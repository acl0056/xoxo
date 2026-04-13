import { Circuit } from '@/models/Circuit';
import { TextAnnotation } from '@/models/TextAnnotation';

describe('Circuit - Annotation Management', () => {
	let circuit;

	beforeEach(() => {
		circuit = new Circuit();
	});

	describe('addAnnotation', () => {
		it('should add annotation to circuit', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			circuit.addAnnotation(annotation);

			expect(circuit.annotations).toHaveLength(1);
			expect(circuit.annotations[0]).toBe(annotation);
		});

		it('should add multiple annotations', () => {
			const annotation1 = new TextAnnotation(10, 20, 'First');
			const annotation2 = new TextAnnotation(30, 40, 'Second');

			circuit.addAnnotation(annotation1);
			circuit.addAnnotation(annotation2);

			expect(circuit.annotations).toHaveLength(2);
			expect(circuit.annotations[0]).toBe(annotation1);
			expect(circuit.annotations[1]).toBe(annotation2);
		});

		it('should throw error if annotation is null', () => {
			expect(() => {
				circuit.addAnnotation(null);
			}).toThrow('Invalid annotation: must have an id');
		});

		it('should throw error if annotation is not a TextAnnotation', () => {
			expect(() => {
				circuit.addAnnotation({ x: 10, y: 20, text: 'Invalid' });
			}).toThrow('Invalid annotation: must have an id');
		});
	});

	describe('removeAnnotation', () => {
		it('should remove annotation by id', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			circuit.addAnnotation(annotation);

			circuit.removeAnnotation(annotation.id);

			expect(circuit.annotations).toHaveLength(0);
		});

		it('should remove correct annotation when multiple exist', () => {
			const annotation1 = new TextAnnotation(10, 20, 'First');
			const annotation2 = new TextAnnotation(30, 40, 'Second');
			const annotation3 = new TextAnnotation(50, 60, 'Third');

			circuit.addAnnotation(annotation1);
			circuit.addAnnotation(annotation2);
			circuit.addAnnotation(annotation3);

			circuit.removeAnnotation(annotation2.id);

			expect(circuit.annotations).toHaveLength(2);
			expect(circuit.annotations[0]).toBe(annotation1);
			expect(circuit.annotations[1]).toBe(annotation3);
		});

		it('should return null if annotation id not found', () => {
			const result = circuit.removeAnnotation('non-existent-id');

			expect(result).toBeNull();
		});
	});

	describe('getAnnotation', () => {
		it('should retrieve annotation by id', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			circuit.addAnnotation(annotation);

			const retrieved = circuit.getAnnotation(annotation.id);

			expect(retrieved).toBe(annotation);
		});

		it('should return undefined if annotation not found', () => {
			const retrieved = circuit.getAnnotation('non-existent-id');

			expect(retrieved).toBeUndefined();
		});
	});

	describe('updateAnnotation', () => {
		it('should update annotation text', () => {
			const annotation = new TextAnnotation(10, 20, 'Original text');
			circuit.addAnnotation(annotation);

			circuit.updateAnnotation(annotation.id, { text: 'Updated text' });

			expect(annotation.text).toBe('Updated text');
		});

		it('should update annotation fontSize', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			circuit.addAnnotation(annotation);

			circuit.updateAnnotation(annotation.id, { fontSize: 24 });

			expect(annotation.fontSize).toBe(24);
		});

		it('should update annotation position', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			circuit.addAnnotation(annotation);

			circuit.updateAnnotation(annotation.id, { x: 50, y: 60 });

			expect(annotation.x).toBe(50);
			expect(annotation.y).toBe(60);
		});

		it('should update multiple properties at once', () => {
			const annotation = new TextAnnotation(10, 20, 'Test');
			circuit.addAnnotation(annotation);

			circuit.updateAnnotation(annotation.id, {
				text: 'New text',
				fontSize: 18,
				x: 100,
				y: 200,
			});

			expect(annotation.text).toBe('New text');
			expect(annotation.fontSize).toBe(18);
			expect(annotation.x).toBe(100);
			expect(annotation.y).toBe(200);
		});

		it('should return null if annotation not found', () => {
			const result = circuit.updateAnnotation('non-existent-id', { text: 'New' });

			expect(result).toBeNull();
		});
	});

	describe('serialization with annotations', () => {
		it('should include annotations in toJSON', () => {
			const annotation1 = new TextAnnotation(10, 20, 'First');
			const annotation2 = new TextAnnotation(30, 40, 'Second');

			circuit.addAnnotation(annotation1);
			circuit.addAnnotation(annotation2);

			const json = circuit.toJSON();

			expect(json.annotations).toHaveLength(2);
			expect(json.annotations[0].text).toBe('First');
			expect(json.annotations[1].text).toBe('Second');
		});

		it('should restore annotations from JSON', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Test Circuit',
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
				},
				components: [],
				wires: [],
				annotations: [
					{
						id: 'anno-1',
						x: 10,
						y: 20,
						text: 'First annotation',
						fontSize: 14,
					},
					{
						id: 'anno-2',
						x: 30,
						y: 40,
						text: 'Second annotation',
						fontSize: 16,
					},
				],
			};

			const restoredCircuit = Circuit.fromJSON(json);

			expect(restoredCircuit.annotations).toHaveLength(2);
			expect(restoredCircuit.annotations[0].text).toBe('First annotation');
			expect(restoredCircuit.annotations[0].fontSize).toBe(14);
			expect(restoredCircuit.annotations[1].text).toBe('Second annotation');
			expect(restoredCircuit.annotations[1].fontSize).toBe(16);
		});

		it('should handle circuit with no annotations', () => {
			const json = circuit.toJSON();

			expect(json.annotations).toEqual([]);
		});
	});
});
