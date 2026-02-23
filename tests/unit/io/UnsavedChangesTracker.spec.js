import { UnsavedChangesTracker } from '../../../src/io/UnsavedChangesTracker';
import { Circuit } from '../../../src/models/Circuit';
import { Resistor } from '../../../src/models/Resistor';

describe('UnsavedChangesTracker', () => {
	let tracker;

	beforeEach(() => {
		tracker = new UnsavedChangesTracker();
	});

	describe('initialization', () => {
		test('should initialize with clean state', () => {
			expect(tracker.hasUnsavedChanges()).toBe(false);
			expect(tracker.getCurrentFilePath()).toBeNull();
		});
	});

	describe('markDirty', () => {
		test('should mark tracker as dirty', () => {
			tracker.markDirty();

			expect(tracker.hasUnsavedChanges()).toBe(true);
		});

		test('should remain dirty after multiple calls', () => {
			tracker.markDirty();
			tracker.markDirty();
			tracker.markDirty();

			expect(tracker.hasUnsavedChanges()).toBe(true);
		});
	});

	describe('markClean', () => {
		test('should mark tracker as clean', () => {
			tracker.markDirty();
			tracker.markClean();

			expect(tracker.hasUnsavedChanges()).toBe(false);
		});

		test('should set file path when provided', () => {
			const filePath = '/path/to/circuit.json';
			tracker.markClean(filePath);

			expect(tracker.getCurrentFilePath()).toBe(filePath);
		});

		test('should not change file path if not provided', () => {
			const filePath = '/path/to/circuit.json';
			tracker.setCurrentFilePath(filePath);
			tracker.markClean();

			expect(tracker.getCurrentFilePath()).toBe(filePath);
		});
	});

	describe('getCurrentFilePath', () => {
		test('should return null initially', () => {
			expect(tracker.getCurrentFilePath()).toBeNull();
		});

		test('should return the set file path', () => {
			const filePath = '/path/to/circuit.json';
			tracker.setCurrentFilePath(filePath);

			expect(tracker.getCurrentFilePath()).toBe(filePath);
		});
	});

	describe('setCurrentFilePath', () => {
		test('should set the current file path', () => {
			const filePath = '/path/to/circuit.json';
			tracker.setCurrentFilePath(filePath);

			expect(tracker.getCurrentFilePath()).toBe(filePath);
		});

		test('should update the file path', () => {
			tracker.setCurrentFilePath('/path/to/old.json');
			tracker.setCurrentFilePath('/path/to/new.json');

			expect(tracker.getCurrentFilePath()).toBe('/path/to/new.json');
		});
	});

	describe('reset', () => {
		test('should reset all state', () => {
			tracker.markDirty();
			tracker.setCurrentFilePath('/path/to/circuit.json');

			tracker.reset();

			expect(tracker.hasUnsavedChanges()).toBe(false);
			expect(tracker.getCurrentFilePath()).toBeNull();
		});
	});

	describe('saveSnapshot', () => {
		test('should save a snapshot of the circuit', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Test Circuit';

			tracker.saveSnapshot(circuit);

			expect(tracker.lastSavedState).not.toBeNull();
		});

		test('should handle null circuit', () => {
			tracker.saveSnapshot(null);

			expect(tracker.lastSavedState).toBeNull();
		});
	});

	describe('hasChangedSinceSnapshot', () => {
		test('should return true if no snapshot exists', () => {
			const circuit = new Circuit();

			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
		});

		test('should return false if circuit has not changed', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Test Circuit';

			tracker.saveSnapshot(circuit);

			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(false);
		});

		test('should return true if circuit has changed', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Test Circuit';

			tracker.saveSnapshot(circuit);

			// Modify the circuit
			circuit.metadata.name = 'Modified Circuit';

			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
		});

		test('should detect component additions', () => {
			const circuit = new Circuit();

			tracker.saveSnapshot(circuit);

			// Add a component
			const resistor = new Resistor(10, 20);
			circuit.addComponent(resistor);

			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
		});

		test('should detect component removals', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(10, 20);
			circuit.addComponent(resistor);

			tracker.saveSnapshot(circuit);

			// Remove the component
			circuit.removeComponent(resistor.id);

			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
		});

		test('should return true if circuit is null', () => {
			const circuit = new Circuit();
			tracker.saveSnapshot(circuit);

			expect(tracker.hasChangedSinceSnapshot(null)).toBe(true);
		});
	});

	describe('workflow integration', () => {
		test('should track typical save workflow', () => {
			const circuit = new Circuit();
			const filePath = '/path/to/circuit.json';

			// Initial state
			expect(tracker.hasUnsavedChanges()).toBe(false);

			// Make changes
			circuit.addComponent(new Resistor(10, 20));
			tracker.markDirty();
			expect(tracker.hasUnsavedChanges()).toBe(true);

			// Save
			tracker.saveSnapshot(circuit);
			tracker.markClean(filePath);
			expect(tracker.hasUnsavedChanges()).toBe(false);
			expect(tracker.getCurrentFilePath()).toBe(filePath);

			// Make more changes
			circuit.addComponent(new Resistor(20, 20));
			tracker.markDirty();
			expect(tracker.hasUnsavedChanges()).toBe(true);
			expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
		});

		test('should track new file workflow', () => {
			// Create new circuit
			tracker.reset();
			expect(tracker.hasUnsavedChanges()).toBe(false);
			expect(tracker.getCurrentFilePath()).toBeNull();

			// Make changes
			tracker.markDirty();
			expect(tracker.hasUnsavedChanges()).toBe(true);

			// Save as new file
			const filePath = '/path/to/new-circuit.json';
			tracker.markClean(filePath);
			expect(tracker.hasUnsavedChanges()).toBe(false);
			expect(tracker.getCurrentFilePath()).toBe(filePath);
		});
	});
});

