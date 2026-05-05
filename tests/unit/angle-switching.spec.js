import { createStore } from 'vuex';
import simulation from '@/renderer/store/simulation';
import { Speaker } from '@/models/Speaker';

jest.mock('electron', () => ({
	ipcRenderer: {
		on: jest.fn(),
		send: jest.fn(),
		invoke: jest.fn(),
	},
}), { virtual: true });

describe('Angle Switching', () => {
	let store;

	beforeEach(() => {
		// Create a fresh store for each test
		store = createStore({
			state: {
				circuit: {
					circuit: {
						components: [],
					},
				},
			},
			modules: {
				simulation,
			},
		});
	});

	describe('Simulation Store', () => {
		test('should initialize with angle 0', () => {
			expect(store.state.simulation.currentAngle).toBe(0);
		});

		test('should initialize with empty excluded speakers list', () => {
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should update current angle via mutation', () => {
			store.commit('simulation/SET_CURRENT_ANGLE', 30);
			expect(store.state.simulation.currentAngle).toBe(30);
		});

		test('should update excluded speakers via mutation', () => {
			const speakerIds = ['speaker-1', 'speaker-2'];
			store.commit('simulation/SET_EXCLUDED_SPEAKERS', speakerIds);
			expect(store.state.simulation.excludedSpeakers).toEqual(speakerIds);
		});

		test('should check if speaker is excluded via getter', () => {
			store.commit('simulation/SET_EXCLUDED_SPEAKERS', ['speaker-1', 'speaker-2']);
			expect(store.getters['simulation/isSpeakerExcluded']('speaker-1')).toBe(true);
			expect(store.getters['simulation/isSpeakerExcluded']('speaker-3')).toBe(false);
		});

		test('should get excluded speakers list via getter', () => {
			const speakerIds = ['speaker-1', 'speaker-2'];
			store.commit('simulation/SET_EXCLUDED_SPEAKERS', speakerIds);
			expect(store.getters['simulation/getExcludedSpeakers']).toEqual(speakerIds);
		});
	});

	describe('switchAngle Action', () => {
		test('should switch to angle 0 with no exclusions', async () => {
			const speaker1 = new Speaker(10, 10);
			speaker1.id = 'speaker-1';
			speaker1.label = 'S1';

			const speaker2 = new Speaker(20, 20);
			speaker2.id = 'speaker-2';
			speaker2.label = 'S2';

			store.state.circuit.circuit.components = [speaker1, speaker2];

			await store.dispatch('simulation/switchAngle', 0);

			expect(store.state.simulation.currentAngle).toBe(0);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should exclude speakers without off-axis data for selected angle', async () => {
			const speaker1 = new Speaker(10, 10);
			speaker1.id = 'speaker-1';
			speaker1.label = 'S1';
			// Speaker1 has off-axis data at 30 degrees
			speaker1.parameters.offAxisFiles = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
			];

			const speaker2 = new Speaker(20, 20);
			speaker2.id = 'speaker-2';
			speaker2.label = 'S2';
			// Speaker2 has no off-axis data

			store.state.circuit.circuit.components = [speaker1, speaker2];

			await store.dispatch('simulation/switchAngle', 30);

			expect(store.state.simulation.currentAngle).toBe(30);
			expect(store.state.simulation.excludedSpeakers).toContain('speaker-2');
			expect(store.state.simulation.excludedSpeakers).not.toContain('speaker-1');
		});

		test('should exclude all speakers if none have data for selected angle', async () => {
			const speaker1 = new Speaker(10, 10);
			speaker1.id = 'speaker-1';
			speaker1.label = 'S1';

			const speaker2 = new Speaker(20, 20);
			speaker2.id = 'speaker-2';
			speaker2.label = 'S2';

			store.state.circuit.circuit.components = [speaker1, speaker2];

			await store.dispatch('simulation/switchAngle', 45);

			expect(store.state.simulation.currentAngle).toBe(45);
			expect(store.state.simulation.excludedSpeakers).toEqual(['speaker-1', 'speaker-2']);
		});

		test('should not exclude speakers when all have data for selected angle', async () => {
			const speaker1 = new Speaker(10, 10);
			speaker1.id = 'speaker-1';
			speaker1.label = 'S1';
			speaker1.parameters.offAxisFiles = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
			];

			const speaker2 = new Speaker(20, 20);
			speaker2.id = 'speaker-2';
			speaker2.label = 'S2';
			speaker2.parameters.offAxisFiles = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [87, 88], phases: [0, -3] },
			];

			store.state.circuit.circuit.components = [speaker1, speaker2];

			await store.dispatch('simulation/switchAngle', 30);

			expect(store.state.simulation.currentAngle).toBe(30);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should handle circuit with no components', async () => {
			store.state.circuit.circuit.components = [];

			await store.dispatch('simulation/switchAngle', 30);

			expect(store.state.simulation.currentAngle).toBe(30);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should handle circuit with only non-speaker components', async () => {
			store.state.circuit.circuit.components = [
				{ id: 'r1', type: 'resistor', x: 10, y: 10 },
				{ id: 'c1', type: 'capacitor', x: 20, y: 20 },
			];

			await store.dispatch('simulation/switchAngle', 30);

			expect(store.state.simulation.currentAngle).toBe(30);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should handle null circuit', async () => {
			store.state.circuit.circuit = null;

			await store.dispatch('simulation/switchAngle', 30);

			expect(store.state.simulation.currentAngle).toBe(30);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should update exclusions when switching between angles', async () => {
			const speaker1 = new Speaker(10, 10);
			speaker1.id = 'speaker-1';
			speaker1.label = 'S1';
			speaker1.parameters.offAxisFiles = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
			];

			const speaker2 = new Speaker(20, 20);
			speaker2.id = 'speaker-2';
			speaker2.label = 'S2';
			speaker2.parameters.offAxisFiles = [
				{ angle: 45, frequencies: [100, 200], magnitudes: [87, 88], phases: [0, -3] },
			];

			store.state.circuit.circuit.components = [speaker1, speaker2];

			// Switch to 30 degrees - speaker2 should be excluded
			await store.dispatch('simulation/switchAngle', 30);
			expect(store.state.simulation.excludedSpeakers).toEqual(['speaker-2']);

			// Switch to 45 degrees - speaker1 should be excluded
			await store.dispatch('simulation/switchAngle', 45);
			expect(store.state.simulation.excludedSpeakers).toEqual(['speaker-1']);

			// Switch to 0 degrees - no exclusions
			await store.dispatch('simulation/switchAngle', 0);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});
	});

	describe('Speaker Off-Axis Data', () => {
		test('should return null when speaker has no off-axis data', () => {
			const speaker = new Speaker(10, 10);
			expect(speaker.getOffAxisData(30)).toBeNull();
		});

		test('should return off-axis data for matching angle', () => {
			const speaker = new Speaker(10, 10);
			speaker.offAxisData = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
				{ angle: 45, frequencies: [100, 200], magnitudes: [83, 84], phases: [0, -8] },
			];

			const data30 = speaker.getOffAxisData(30);
			expect(data30).not.toBeNull();
			expect(data30.angle).toBe(30);
			expect(data30.frequencies).toEqual([100, 200]);

			const data45 = speaker.getOffAxisData(45);
			expect(data45).not.toBeNull();
			expect(data45.angle).toBe(45);
		});

		test('should return null for non-existent angle', () => {
			const speaker = new Speaker(10, 10);
			speaker.parameters.offAxisFiles = [
				{ angle: 30, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
			];

			expect(speaker.getOffAxisData(45)).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		test('should handle custom angles', async () => {
			const speaker = new Speaker(10, 10);
			speaker.id = 'speaker-1';
			speaker.parameters.offAxisFiles = [
				{ angle: 37.5, frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -5] },
			];

			store.state.circuit.circuit.components = [speaker];

			await store.dispatch('simulation/switchAngle', 37.5);

			expect(store.state.simulation.currentAngle).toBe(37.5);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should handle angle 0 (on-axis)', async () => {
			const speaker = new Speaker(10, 10);
			speaker.id = 'speaker-1';
			// No off-axis data, only on-axis

			store.state.circuit.circuit.components = [speaker];

			await store.dispatch('simulation/switchAngle', 0);

			expect(store.state.simulation.currentAngle).toBe(0);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});

		test('should handle angle 180 (rear)', async () => {
			const speaker = new Speaker(10, 10);
			speaker.id = 'speaker-1';
			speaker.parameters.offAxisFiles = [
				{ angle: 180, frequencies: [100, 200], magnitudes: [60, 62], phases: [0, -180] },
			];

			store.state.circuit.circuit.components = [speaker];

			await store.dispatch('simulation/switchAngle', 180);

			expect(store.state.simulation.currentAngle).toBe(180);
			expect(store.state.simulation.excludedSpeakers).toEqual([]);
		});
	});
});
