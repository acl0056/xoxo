import SimulationProfiler from '@/simulation/SimulationProfiler';

describe('SimulationProfiler', () => {
	let profiler;

	beforeEach(() => {
		profiler = new SimulationProfiler();
	});

	describe('stage timing', () => {
		test('should record duration for a single stage', () => {
			profiler.startStage('buildNodeMap');

			// Simulate some work with a busy wait
			const start = performance.now();
			while (performance.now() - start < 5) {
				// busy wait ~5ms
			}

			profiler.endStage('buildNodeMap');

			const report = profiler.report();
			expect(report.stages.buildNodeMap).toBeDefined();
			expect(report.stages.buildNodeMap.totalDuration).toBeGreaterThan(0);
			expect(report.stages.buildNodeMap.callCount).toBe(1);
			expect(report.stages.buildNodeMap.averageDuration).toBe(
				report.stages.buildNodeMap.totalDuration,
			);
		});

		test('should record multiple different stages independently', () => {
			profiler.startStage('buildNodeMap');
			profiler.endStage('buildNodeMap');

			profiler.startStage('calculateSystemResponse');
			profiler.endStage('calculateSystemResponse');

			const report = profiler.report();
			expect(Object.keys(report.stages)).toHaveLength(2);
			expect(report.stages.buildNodeMap).toBeDefined();
			expect(report.stages.calculateSystemResponse).toBeDefined();
		});

		test('should throw when endStage is called with no active stages', () => {
			expect(() => profiler.endStage('buildNodeMap')).toThrow(
				"endStage('buildNodeMap') called with no active stages",
			);
		});

		test('should throw when endStage name does not match current active stage', () => {
			profiler.startStage('buildMNAMatrix');
			expect(() => profiler.endStage('lusolve')).toThrow(
				"endStage('lusolve') called but the current active stage is 'buildMNAMatrix'",
			);
			// Clean up
			profiler.endStage('buildMNAMatrix');
		});
	});

	describe('accumulation', () => {
		test('should accumulate total duration and call count for repeated stages', () => {
			const iterations = 10;

			for (let i = 0; i < iterations; i++) {
				profiler.startStage('buildMNAMatrix');
				// Minimal work to ensure non-zero duration
				const start = performance.now();
				while (performance.now() - start < 0.1) {
					// busy wait ~0.1ms
				}
				profiler.endStage('buildMNAMatrix');
			}

			const report = profiler.report();
			expect(report.stages.buildMNAMatrix.callCount).toBe(iterations);
			expect(report.stages.buildMNAMatrix.totalDuration).toBeGreaterThan(0);
			expect(report.stages.buildMNAMatrix.averageDuration).toBeCloseTo(
				report.stages.buildMNAMatrix.totalDuration / iterations,
				5,
			);
		});

		test('should accumulate separately for different stage names', () => {
			for (let i = 0; i < 5; i++) {
				profiler.startStage('buildMNAMatrix');
				profiler.endStage('buildMNAMatrix');

				profiler.startStage('lusolve');
				profiler.endStage('lusolve');
			}

			const report = profiler.report();
			expect(report.stages.buildMNAMatrix.callCount).toBe(5);
			expect(report.stages.lusolve.callCount).toBe(5);
		});
	});

	describe('nested stages', () => {
		test('should support child stages within a parent stage', () => {
			profiler.startStage('buildMNAMatrix');

			profiler.startStage('getComponentTerminals');
			profiler.endStage('getComponentTerminals');

			profiler.startStage('calculateAdmittance');
			profiler.endStage('calculateAdmittance');

			profiler.endStage('buildMNAMatrix');

			const report = profiler.report();
			expect(report.stages.buildMNAMatrix).toBeDefined();
			expect(report.stages.buildMNAMatrix.children).toBeDefined();
			expect(report.stages.buildMNAMatrix.children.getComponentTerminals).toBeDefined();
			expect(report.stages.buildMNAMatrix.children.calculateAdmittance).toBeDefined();
		});

		test('should accumulate child stages across multiple parent calls', () => {
			for (let i = 0; i < 3; i++) {
				profiler.startStage('buildMNAMatrix');

				profiler.startStage('calculateAdmittance');
				profiler.endStage('calculateAdmittance');

				profiler.endStage('buildMNAMatrix');
			}

			const report = profiler.report();
			expect(report.stages.buildMNAMatrix.callCount).toBe(3);
			expect(report.stages.buildMNAMatrix.children.calculateAdmittance.callCount).toBe(3);
		});

		test('should not include children key when stage has no children', () => {
			profiler.startStage('buildNodeMap');
			profiler.endStage('buildNodeMap');

			const report = profiler.report();
			expect(report.stages.buildNodeMap.children).toBeUndefined();
		});
	});

	describe('report()', () => {
		test('should return correct structure with stages object', () => {
			profiler.startStage('buildNodeMap');
			profiler.endStage('buildNodeMap');

			const report = profiler.report();
			expect(report).toHaveProperty('stages');
			expect(typeof report.stages).toBe('object');
		});

		test('should return correct per-stage stats', () => {
			profiler.startStage('extractResults');
			profiler.endStage('extractResults');

			const report = profiler.report();
			const stats = report.stages.extractResults;

			expect(stats).toHaveProperty('totalDuration');
			expect(stats).toHaveProperty('callCount');
			expect(stats).toHaveProperty('averageDuration');
			expect(typeof stats.totalDuration).toBe('number');
			expect(typeof stats.callCount).toBe('number');
			expect(typeof stats.averageDuration).toBe('number');
			expect(stats.totalDuration).toBeGreaterThanOrEqual(0);
			expect(stats.callCount).toBe(1);
		});

		test('should return empty stages object when nothing has been recorded', () => {
			const report = profiler.report();
			expect(report.stages).toEqual({});
		});
	});

	describe('printReport()', () => {
		test('should log formatted output to console', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

			profiler.startStage('buildNodeMap');
			profiler.endStage('buildNodeMap');

			profiler.printReport();

			expect(consoleSpy).toHaveBeenCalledWith('--- Simulation Profiler Report ---');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('buildNodeMap:'),
			);
			expect(consoleSpy).toHaveBeenCalledWith('--- End Report ---');

			consoleSpy.mockRestore();
		});

		test('should indent child stages in output', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

			profiler.startStage('buildMNAMatrix');
			profiler.startStage('calculateAdmittance');
			profiler.endStage('calculateAdmittance');
			profiler.endStage('buildMNAMatrix');

			profiler.printReport();

			// Find the call that logs the child stage — it should be indented
			const childCall = consoleSpy.mock.calls.find(
				(call) => call[0].includes('calculateAdmittance'),
			);
			expect(childCall).toBeDefined();
			expect(childCall[0]).toMatch(/^\s{2}calculateAdmittance:/);

			consoleSpy.mockRestore();
		});
	});

	describe('reset()', () => {
		test('should clear all recorded stages', () => {
			profiler.startStage('buildNodeMap');
			profiler.endStage('buildNodeMap');

			profiler.reset();

			const report = profiler.report();
			expect(report.stages).toEqual({});
		});
	});

	describe('optional profiler pattern', () => {
		test('profiler should be usable with conditional checks', () => {
			// This tests the pattern used in pipeline code: if (profiler) profiler.startStage(...)
			let optionalProfiler = null;

			// When profiler is null, no error should occur
			if (optionalProfiler) {
				optionalProfiler.startStage('buildNodeMap');
			}

			// When profiler is provided, it should work normally
			optionalProfiler = new SimulationProfiler();
			if (optionalProfiler) {
				optionalProfiler.startStage('buildNodeMap');
				optionalProfiler.endStage('buildNodeMap');
			}

			const report = optionalProfiler.report();
			expect(report.stages.buildNodeMap).toBeDefined();
			expect(report.stages.buildNodeMap.callCount).toBe(1);
		});
	});
});
