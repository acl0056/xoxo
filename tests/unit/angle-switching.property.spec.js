import fc from 'fast-check';
import { createStore } from 'vuex';
import simulation from '@/renderer/store/simulation';
import { Speaker } from '@/models/Speaker';

/**
 * Property 23: Off-Axis Angle Switching
 *
 * For any circuit with loudspeakers that have off-axis measurement data,
 * switching to a different angle should update all loudspeakers simultaneously
 * to use their corresponding off-axis FRD data for that angle.
 *
 * **Validates: Requirements 13.6, 13.7**
 */

describe('Feature: crossover-network-simulator, Property 23: Off-axis angle switching', () => {
	// Increase timeout for property tests
	jest.setTimeout(30000);

	// Generator for angles (0-180 degrees)
	const angleGenerator = () => fc.integer({ min: 0, max: 180 });

	// Generator for a set of common angles
	const commonAnglesGenerator = () => fc.constantFrom(0, 15, 30, 45, 60, 75, 90);

	// Generator for off-axis data at a specific angle
	const offAxisDataGenerator = (angle) => fc.record({
		angle: fc.constant(angle),
		frequencies: fc.array(fc.double({ min: 20, max: 20000 }), { minLength: 10, maxLength: 100 }),
		magnitudes: fc.array(fc.double({ min: 60, max: 110 }), { minLength: 10, maxLength: 100 }),
		phases: fc.array(fc.double({ min: -180, max: 180 }), { minLength: 10, maxLength: 100 }),
	});

	// Generator for a speaker with off-axis data at specific angles
	const speakerWithOffAxisGenerator = (availableAngles) => fc.record({
		id: fc.uuid(),
		label: fc.string({ minLength: 2, maxLength: 5 }),
		x: fc.integer({ min: 0, max: 100 }),
		y: fc.integer({ min: 0, max: 100 }),
		angles: fc.constant(availableAngles),
	}).map((config) => {
		const speaker = new Speaker(config.x, config.y);
		speaker.id = config.id;
		speaker.label = config.label;

		// Add off-axis data for each available angle
		speaker.offAxisData = config.angles.map((angle) => ({
			angle,
			frequencies: Array.from({ length: 50 }, (_, i) => 20 * (1.1 ** i)),
			magnitudes: Array.from({ length: 50 }, () => 85 + Math.random() * 10),
			phases: Array.from({ length: 50 }, () => -Math.random() * 45),
		}));

		return speaker;
	});

	test('Property 23: Switching angles updates all speakers simultaneously', () => {
		fc.assert(
			fc.asyncProperty(
				fc.array(commonAnglesGenerator(), { minLength: 1, maxLength: 5 }).chain((angles) => fc.tuple(
					fc.constant(angles),
					fc.array(speakerWithOffAxisGenerator(angles), { minLength: 1, maxLength: 5 }),
					fc.constantFrom(...angles),
				)),
				async ([availableAngles, speakers, targetAngle]) => {
					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: speakers,
							},
						},
						modules: {
							simulation,
						},
					});

					// Switch to target angle
					await store.dispatch('simulation/switchAngle', targetAngle);

					// Verify angle was updated
					expect(store.state.simulation.currentAngle).toBe(targetAngle);

					// Verify all speakers are processed
					const speakerIds = speakers.map((s) => s.id);

					if (targetAngle === 0) {
						// At angle 0 (on-axis), no speakers should be excluded
						expect(store.state.simulation.excludedSpeakers).toEqual([]);
					} else {
						// At off-axis angles, verify exclusion logic
						speakers.forEach((speaker) => {
							const hasData = speaker.offAxisData.some((data) => data.angle === targetAngle);
							const isExcluded = store.state.simulation.excludedSpeakers.includes(speaker.id);

							if (hasData) {
								// Speaker has data for this angle, should not be excluded
								expect(isExcluded).toBe(false);
							} else {
								// Speaker lacks data for this angle, should be excluded
								expect(isExcluded).toBe(true);
							}
						});
					}

					// Verify excluded speakers list only contains valid speaker IDs
					store.state.simulation.excludedSpeakers.forEach((excludedId) => {
						expect(speakerIds).toContain(excludedId);
					});
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 23: Switching between angles maintains consistency', () => {
		fc.assert(
			fc.asyncProperty(
				fc.array(commonAnglesGenerator(), { minLength: 2, maxLength: 5 }).chain((angles) => fc.tuple(
					fc.constant(angles),
					fc.array(speakerWithOffAxisGenerator(angles), { minLength: 2, maxLength: 4 }),
					fc.array(fc.constantFrom(...angles), { minLength: 2, maxLength: 5 }),
				)),
				async ([availableAngles, speakers, angleSequence]) => {
					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: speakers,
							},
						},
						modules: {
							simulation,
						},
					});

					// Switch through sequence of angles sequentially
					for (const angle of angleSequence) {
						await store.dispatch('simulation/switchAngle', angle);

						// After each switch, verify consistency
						expect(store.state.simulation.currentAngle).toBe(angle);

						// Count expected exclusions
						const expectedExclusions = angle === 0
							? 0
							: speakers.filter((s) => !s.offAxisData.some((d) => d.angle === angle)).length;

						expect(store.state.simulation.excludedSpeakers.length).toBe(expectedExclusions);
					}
				},
			),
			{ numRuns: 50 },
		);
	});

	test('Property 23: Speakers with partial off-axis coverage are correctly excluded', () => {
		fc.assert(
			fc.asyncProperty(
				fc.tuple(
					fc.array(commonAnglesGenerator(), { minLength: 3, maxLength: 5 }),
					fc.integer({ min: 2, max: 5 }),
				).chain(([allAngles, numSpeakers]) => {
					// Generate speakers with different subsets of available angles
					const speakerGenerators = Array.from({ length: numSpeakers }, (_, i) => {
						// Each speaker gets a random subset of angles
						const speakerAngles = allAngles.filter(() => Math.random() > 0.3);
						return speakerWithOffAxisGenerator(speakerAngles.length > 0 ? speakerAngles : [allAngles[0]]);
					});

					return fc.tuple(
						fc.constant(allAngles),
						fc.tuple(...speakerGenerators),
						fc.constantFrom(...allAngles),
					);
				}),
				async ([allAngles, speakers, targetAngle]) => {
					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: Array.from(speakers),
							},
						},
						modules: {
							simulation,
						},
					});

					// Switch to target angle
					await store.dispatch('simulation/switchAngle', targetAngle);

					// Verify each speaker's exclusion status matches its data availability
					Array.from(speakers).forEach((speaker) => {
						const hasData = targetAngle === 0 || speaker.offAxisData.some((d) => d.angle === targetAngle);
						const isExcluded = store.state.simulation.excludedSpeakers.includes(speaker.id);

						expect(isExcluded).toBe(!hasData);
					});
				},
			),
			{ numRuns: 50 },
		);
	});

	test('Property 23: Switching to angle 0 never excludes speakers', () => {
		fc.assert(
			fc.asyncProperty(
				fc.array(commonAnglesGenerator(), { minLength: 1, maxLength: 5 }).chain((angles) => fc.array(speakerWithOffAxisGenerator(angles), { minLength: 1, maxLength: 5 })),
				async (speakers) => {
					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: speakers,
							},
						},
						modules: {
							simulation,
						},
					});

					// Switch to angle 0 (on-axis)
					await store.dispatch('simulation/switchAngle', 0);

					// Verify no speakers are excluded at angle 0
					expect(store.state.simulation.currentAngle).toBe(0);
					expect(store.state.simulation.excludedSpeakers).toEqual([]);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 23: Excluded speakers list is always a subset of speaker IDs', () => {
		fc.assert(
			fc.asyncProperty(
				fc.array(commonAnglesGenerator(), { minLength: 1, maxLength: 5 }).chain((angles) => fc.tuple(
					fc.array(speakerWithOffAxisGenerator(angles), { minLength: 1, maxLength: 5 }),
					fc.constantFrom(...angles),
				)),
				async ([speakers, targetAngle]) => {
					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: speakers,
							},
						},
						modules: {
							simulation,
						},
					});

					const speakerIds = speakers.map((s) => s.id);

					// Switch to target angle
					await store.dispatch('simulation/switchAngle', targetAngle);

					// Verify all excluded IDs are valid speaker IDs
					store.state.simulation.excludedSpeakers.forEach((excludedId) => {
						expect(speakerIds).toContain(excludedId);
					});

					// Verify no duplicates in excluded list
					const uniqueExcluded = [...new Set(store.state.simulation.excludedSpeakers)];
					expect(store.state.simulation.excludedSpeakers.length).toBe(uniqueExcluded.length);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 23: Custom angles work correctly', () => {
		fc.assert(
			fc.asyncProperty(
				angleGenerator().chain((customAngle) => fc.tuple(
					fc.constant(customAngle),
					fc.array(
						fc.record({
							id: fc.uuid(),
							hasData: fc.boolean(),
						}).map((config) => {
							const speaker = new Speaker(10, 10);
							speaker.id = config.id;
							speaker.label = `S${config.id.substring(0, 2)}`;

							if (config.hasData) {
								speaker.offAxisData = [{
									angle: customAngle,
									frequencies: Array.from({ length: 50 }, (_, i) => 20 * (1.1 ** i)),
									magnitudes: Array.from({ length: 50 }, () => 85 + Math.random() * 10),
									phases: Array.from({ length: 50 }, () => -Math.random() * 45),
								}];
							}

							return { speaker, hasData: config.hasData };
						}),
						{ minLength: 1, maxLength: 5 },
					),
				)),
				async ([customAngle, speakerConfigs]) => {
					const speakers = speakerConfigs.map((c) => c.speaker);

					// Create store with speakers
					const store = createStore({
						state: {
							circuit: {
								components: speakers,
							},
						},
						modules: {
							simulation,
						},
					});

					// Switch to custom angle
					await store.dispatch('simulation/switchAngle', customAngle);

					expect(store.state.simulation.currentAngle).toBe(customAngle);

					// Verify exclusions match data availability
					speakerConfigs.forEach(({ speaker, hasData }) => {
						const isExcluded = store.state.simulation.excludedSpeakers.includes(speaker.id);
						if (customAngle === 0) {
							expect(isExcluded).toBe(false);
						} else {
							expect(isExcluded).toBe(!hasData);
						}
					});
				},
			),
			{ numRuns: 50 },
		);
	});
});
