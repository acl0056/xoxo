/**
 * SimulationProfiler provides reusable timing instrumentation for the simulation pipeline.
 *
 * Wraps pipeline stages with performance.now() measurements, supporting:
 * - Hierarchical/nested stages for drill-down profiling
 * - Accumulation of total time and call count for repeated stages (e.g., per-frequency calls)
 * - Structured report output with per-stage stats
 * - Formatted console table output
 *
 * Usage:
 *   const profiler = new SimulationProfiler();
 *   profiler.startStage('buildMNAMatrix');
 *   // ... do work ...
 *   profiler.endStage('buildMNAMatrix');
 *   console.log(profiler.report());
 *
 * The profiler is optional — pipeline code checks `if (profiler)` before calling methods,
 * so when absent, no timing overhead is added.
 */
class SimulationProfiler {
	constructor() {
		/**
		 * Map of stage name to accumulated stats.
		 * Each entry: { totalDuration: number, callCount: number, children: Map }
		 * @type {Map<string, { totalDuration: number, callCount: number, children: Map<string, object> }>}
		 */
		this.stages = new Map();

		/**
		 * Stack of currently active stages, used to track nesting.
		 * Each entry: { name: string, startTime: number }
		 * @type {Array<{ name: string, startTime: number }>}
		 */
		this.activeStageStack = [];
	}

	/**
	 * Begin timing a named stage. Stages can be nested — if a stage is started
	 * while another is active, it becomes a child of the current stage.
	 *
	 * @param {string} name - The stage name (e.g., 'buildMNAMatrix', 'calculateAdmittance')
	 */
	startStage(name) {
		const startTime = performance.now();
		this.activeStageStack.push({ name, startTime });
	}

	/**
	 * End timing a named stage. The stage must match the most recently started stage
	 * (i.e., stages must be ended in LIFO order).
	 *
	 * @param {string} name - The stage name that was passed to startStage()
	 * @throws {Error} If the name does not match the most recently started stage
	 */
	endStage(name) {
		const endTime = performance.now();

		if (this.activeStageStack.length === 0) {
			throw new Error(`endStage('${name}') called with no active stages`);
		}

		const currentStage = this.activeStageStack[this.activeStageStack.length - 1];
		if (currentStage.name !== name) {
			throw new Error(
				`endStage('${name}') called but the current active stage is '${currentStage.name}'. `
				+ 'Stages must be ended in LIFO order.',
			);
		}

		this.activeStageStack.pop();
		const duration = endTime - currentStage.startTime;

		// Determine where to record this stage — at the top level, or as a child of the parent stage
		const stageMap = this._getStageMapForCurrentDepth();

		if (!stageMap.has(name)) {
			stageMap.set(name, {
				totalDuration: 0,
				callCount: 0,
				children: new Map(),
			});
		}

		const stageStats = stageMap.get(name);
		stageStats.totalDuration += duration;
		stageStats.callCount += 1;
	}

	/**
	 * Get the stage map where the current stage should be recorded.
	 * If there is a parent stage on the stack, return its children map.
	 * Otherwise, return the top-level stages map.
	 *
	 * @returns {Map} The map to record the stage in
	 * @private
	 */
	_getStageMapForCurrentDepth() {
		if (this.activeStageStack.length === 0) {
			return this.stages;
		}

		// Walk down from the top-level stages through the nesting to find the parent's children map
		let currentMap = this.stages;
		for (const activeStage of this.activeStageStack) {
			if (!currentMap.has(activeStage.name)) {
				currentMap.set(activeStage.name, {
					totalDuration: 0,
					callCount: 0,
					children: new Map(),
				});
			}
			currentMap = currentMap.get(activeStage.name).children;
		}

		return currentMap;
	}

	/**
	 * Generate a structured report of all recorded stages.
	 *
	 * @returns {Object} Report object with per-stage stats:
	 *   {
	 *     stages: {
	 *       [stageName]: {
	 *         totalDuration: number,   // Total accumulated time in milliseconds
	 *         callCount: number,       // Number of times this stage was called
	 *         averageDuration: number, // Average time per call in milliseconds
	 *         children: { ... }        // Nested child stages (same structure)
	 *       }
	 *     }
	 *   }
	 */
	report() {
		const buildReport = (stageMap) => {
			const result = {};
			for (const [name, stats] of stageMap) {
				result[name] = {
					totalDuration: stats.totalDuration,
					callCount: stats.callCount,
					averageDuration: stats.callCount > 0
						? stats.totalDuration / stats.callCount
						: 0,
				};
				if (stats.children.size > 0) {
					result[name].children = buildReport(stats.children);
				}
			}
			return result;
		};

		return {
			stages: buildReport(this.stages),
		};
	}

	/**
	 * Print a formatted table of profiling results to the console.
	 * Shows stage name, total duration, call count, and average duration per call.
	 */
	printReport() {
		const report = this.report();

		const printStages = (stages, indent = 0) => {
			const prefix = '  '.repeat(indent);
			for (const [name, stats] of Object.entries(stages)) {
				const totalMs = stats.totalDuration.toFixed(2);
				const avgMs = stats.averageDuration.toFixed(2);
				console.log(
					`${prefix}${name}: ${totalMs}ms total, ${stats.callCount} calls, ${avgMs}ms avg`,
				);
				if (stats.children) {
					printStages(stats.children, indent + 1);
				}
			}
		};

		console.log('--- Simulation Profiler Report ---');
		printStages(report.stages);
		console.log('--- End Report ---');
	}

	/**
	 * Reset all recorded stages and clear the active stack.
	 */
	reset() {
		this.stages.clear();
		this.activeStageStack = [];
	}
}

export default SimulationProfiler;
