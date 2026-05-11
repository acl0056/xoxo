import fs from 'fs';
import { DxoImporter } from '../../../src/io/DxoImporter';
import CircuitSolver from '../../../src/simulation/CircuitSolver';
import FrequencyAnalyzer from '../../../src/simulation/FrequencyAnalyzer';
import FrdParser from '../../../src/io/FrdParser';
import BiquadCalculator from '../../../src/simulation/BiquadCalculator';

/**
 * Integration tests that compare our full circuit simulation output against
 * XSim reference FRD files exported from the same DXO projects.
 *
 * The reference FRD files in research/filters/ were exported from XSim4 and
 * represent the expected frequency response (SPL) for each circuit. Our
 * simulation should produce matching results within a reasonable tolerance.
 *
 * Pipeline: DXO import → CircuitSolver → FrequencyAnalyzer → compare vs FRD
 */
describe('DxoImporter - XSim Reference FRD Comparison', () => {
	/**
	 * Helper: run full simulation pipeline on a DXO file and return SPL results
	 */
	function simulateCircuit(dxoPath) {
		const circuit = DxoImporter.import(dxoPath);

		const solver = new CircuitSolver(circuit);
		const solverResults = solver.solveAllFrequencies(1, 100000, 50);

		const analyzer = new FrequencyAnalyzer(circuit, solverResults);

		// Find the speaker component
		const speaker = circuit.components.find((c) => c.type === 'speaker');
		if (!speaker) {
			throw new Error('No speaker found in circuit');
		}

		const splResult = analyzer.calculateSPL(speaker);
		return {
			circuit,
			solverResults,
			splResult,
			speaker,
		};
	}

	/**
	 * Helper: compare simulation SPL against reference FRD at sampled frequencies.
	 * Uses interpolation to compare at matching frequency points.
	 * Optionally removes a constant offset (to account for different SPL reference conventions).
	 * Returns { maxError, avgError, errorPoints, offset } for analysis.
	 */
	function compareAgainstReference(splResult, referenceFrd, options = {}) {
		const {
			minFrequency = 20,
			maxFrequency = 20000,
			toleranceDb = 1.0,
			removeOffset = false,
		} = options;

		const simFreqs = splResult.frequencies;
		const simSpl = splResult.spl;
		const refFreqs = referenceFrd.frequencies;
		const refMags = referenceFrd.magnitudes;

		const rawErrors = [];

		// For each simulation frequency point within range, interpolate the reference
		for (let i = 0; i < simFreqs.length; i++) {
			const freq = simFreqs[i];
			if (freq < minFrequency || freq > maxFrequency) continue;
			if (!Number.isFinite(simSpl[i]) || simSpl[i] < -100) continue;

			// Interpolate reference FRD at this frequency
			const refValue = interpolateLog(refFreqs, refMags, freq);
			if (refValue === null) continue;

			rawErrors.push({ frequency: freq, simSpl: simSpl[i], refSpl: refValue, diff: simSpl[i] - refValue });
		}

		if (rawErrors.length === 0) {
			return { maxError: 0, avgError: 0, errorPoints: [], comparedPoints: 0, offset: 0 };
		}

		// Compute median offset if removeOffset is true
		let offset = 0;
		if (removeOffset) {
			const diffs = rawErrors.map((e) => e.diff).sort((a, b) => a - b);
			offset = diffs[Math.floor(diffs.length / 2)];
		}

		const errors = rawErrors.map((e) => ({
			...e,
			error: Math.abs(e.diff - offset),
		}));

		const maxError = Math.max(...errors.map((e) => e.error));
		const avgError = errors.reduce((sum, e) => sum + e.error, 0) / errors.length;
		const errorPoints = errors.filter((e) => e.error > toleranceDb);

		return { maxError, avgError, errorPoints, comparedPoints: errors.length, offset };
	}

	/**
	 * Log-frequency interpolation for FRD data
	 */
	function interpolateLog(frequencies, values, targetFreq) {
		if (targetFreq <= frequencies[0]) return values[0];
		if (targetFreq >= frequencies[frequencies.length - 1]) return values[values.length - 1];

		// Binary search for the bracketing interval
		let low = 0;
		let high = frequencies.length - 1;
		while (high - low > 1) {
			const mid = Math.floor((low + high) / 2);
			if (frequencies[mid] <= targetFreq) {
				low = mid;
			} else {
				high = mid;
			}
		}

		// Log-linear interpolation
		const logF0 = Math.log10(frequencies[low]);
		const logF1 = Math.log10(frequencies[high]);
		const logTarget = Math.log10(targetFreq);
		const t = (logTarget - logF0) / (logF1 - logF0);

		return values[low] + t * (values[high] - values[low]);
	}

	describe('Filter (bandpass) - orbs-filter.dxo vs orbs-filter.FRD', () => {
		it('should match XSim reference shape within 1 dB across the passband', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/filter/orbs-filter.dxo');
			const referenceFrd = FrdParser.parse('research/filters/filter/orbs-filter.FRD');

			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 100,
				maxFrequency: 15000,
				toleranceDb: 1.0,
				removeOffset: true,
			});

			// Log summary for debugging
			if (comparison.errorPoints.length > 0) {
				const worstPoints = comparison.errorPoints
					.sort((a, b) => b.error - a.error)
					.slice(0, 5);
				console.log(`Filter: max error = ${comparison.maxError.toFixed(2)} dB, avg = ${comparison.avgError.toFixed(2)} dB, offset = ${comparison.offset.toFixed(2)} dB`);
				console.log('Worst points:', worstPoints.map((p) => `${p.frequency.toFixed(0)} Hz: sim=${p.simSpl.toFixed(1)}, ref=${p.refSpl.toFixed(1)}, err=${p.error.toFixed(2)}`));
			}

			expect(comparison.comparedPoints).toBeGreaterThan(50);
			expect(comparison.avgError).toBeLessThan(1.0);
		});

		it('should match XSim reference shape within 0.5 dB near the turn frequency', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/filter/orbs-filter.dxo');
			const referenceFrd = FrdParser.parse('research/filters/filter/orbs-filter.FRD');

			// Focus on the passband region around 4000 Hz (turn frequency)
			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 2000,
				maxFrequency: 8000,
				toleranceDb: 0.5,
				removeOffset: true,
			});

			expect(comparison.comparedPoints).toBeGreaterThan(10);
			expect(comparison.avgError).toBeLessThan(0.5);
		});
	});

	describe('PEQ - orbs-peq.dxo vs orbs-peq.FRD', () => {
		it('should match XSim reference shape within 1 dB across the audio band', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/peq/orbs-peq.dxo');
			const referenceFrd = FrdParser.parse('research/filters/peq/orbs-peq.FRD');

			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 100,
				maxFrequency: 20000,
				toleranceDb: 1.0,
				removeOffset: true,
			});

			if (comparison.errorPoints.length > 0) {
				const worstPoints = comparison.errorPoints
					.sort((a, b) => b.error - a.error)
					.slice(0, 5);
				console.log(`PEQ: max error = ${comparison.maxError.toFixed(2)} dB, avg = ${comparison.avgError.toFixed(2)} dB, offset = ${comparison.offset.toFixed(2)} dB`);
				console.log('Worst points:', worstPoints.map((p) => `${p.frequency.toFixed(0)} Hz: sim=${p.simSpl.toFixed(1)}, ref=${p.refSpl.toFixed(1)}, err=${p.error.toFixed(2)}`));
			}

			expect(comparison.comparedPoints).toBeGreaterThan(50);
			expect(comparison.avgError).toBeLessThan(1.0);
		});

		it('should show the peaking boost around 530 Hz matching XSim shape', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/peq/orbs-peq.dxo');
			const referenceFrd = FrdParser.parse('research/filters/peq/orbs-peq.FRD');

			// Focus on the peaking region
			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 300,
				maxFrequency: 1000,
				toleranceDb: 0.5,
				removeOffset: true,
			});

			expect(comparison.comparedPoints).toBeGreaterThan(5);
			expect(comparison.avgError).toBeLessThan(0.5);
		});
	});

	describe('OpAmp - orbs-opamp.dxo vs orbs-opamp.FRD', () => {
		it('should match XSim reference shape within 1 dB across the audio band', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/opamp/orbs-opamp.dxo');
			const referenceFrd = FrdParser.parse('research/filters/opamp/orbs-opamp.FRD');

			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 100,
				maxFrequency: 20000,
				toleranceDb: 1.0,
				removeOffset: true,
			});

			if (comparison.errorPoints.length > 0) {
				const worstPoints = comparison.errorPoints
					.sort((a, b) => b.error - a.error)
					.slice(0, 5);
				console.log(`OpAmp: max error = ${comparison.maxError.toFixed(2)} dB, avg = ${comparison.avgError.toFixed(2)} dB, offset = ${comparison.offset.toFixed(2)} dB`);
				console.log('Worst points:', worstPoints.map((p) => `${p.frequency.toFixed(0)} Hz: sim=${p.simSpl.toFixed(1)}, ref=${p.refSpl.toFixed(1)}, err=${p.error.toFixed(2)}`));
			}

			expect(comparison.comparedPoints).toBeGreaterThan(50);
			expect(comparison.avgError).toBeLessThan(1.0);
		});
	});

	describe('PEQ Biquad Coefficients - orbs-peq.dxo vs orbs-peq.txt', () => {
		/**
		 * Parse XSim biquad export txt file.
		 * Format: biquadN,\n b0=val,\n b1=val,\n b2=val,\n a1=val,\n a2=val,\n
		 * XSim uses negated a1/a2 sign convention compared to our format.
		 */
		function parseXsimBiquadExport(filePath) {
			const content = fs.readFileSync(filePath, 'utf8');
			const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

			const biquads = [];
			let current = null;

			for (const line of lines) {
				if (line.startsWith('biquad')) {
					if (current) biquads.push(current);
					current = {};
				} else if (current && line.includes('=')) {
					const [key, valStr] = line.replace(',', '').split('=');
					current[key.trim()] = parseFloat(valStr.trim());
				}
			}
			if (current) biquads.push(current);

			return biquads;
		}

		/**
		 * Check if a biquad is a unity passthrough (b0=1, all others 0)
		 */
		function isUnityBiquad(biquad) {
			return Math.abs(biquad.b0 - 1) < 1e-10
				&& Math.abs(biquad.b1) < 1e-10
				&& Math.abs(biquad.b2) < 1e-10
				&& Math.abs(biquad.a1) < 1e-10
				&& Math.abs(biquad.a2) < 1e-10;
		}

		/**
		 * Evaluate a biquad's transfer function magnitude in dB at a frequency.
		 * Accounts for XSim's negated a1/a2 sign convention.
		 */
		function evaluateXsimBiquadMagnitude(biquad, frequency, dspRate) {
			// XSim uses: H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 - a1*z^-1 - a2*z^-2)
			// Our format: H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
			// So XSim's a1/a2 are negated relative to ours
			const coeffs = {
				b0: biquad.b0,
				b1: biquad.b1,
				b2: biquad.b2,
				a1: -biquad.a1, // negate for our convention
				a2: -biquad.a2,
			};
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);
			return 20 * Math.log10(Math.sqrt(h.re * h.re + h.im * h.im));
		}

		it('should produce matching transfer function when evaluated at key frequencies', () => {
			// Import the PEQ from DXO
			const circuit = DxoImporter.import('tests/fixtures/projects/peq/orbs-peq.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq).toBeDefined();

			const dspRate = peq.parameters.dspRate;

			// Parse XSim reference biquads and filter to non-trivial ones
			const xsimBiquads = parseXsimBiquadExport('research/filters/peq/orbs-peq.txt');
			const xsimNonTrivial = xsimBiquads.filter((b) => !isUnityBiquad(b));

			expect(xsimNonTrivial.length).toBe(2); // biquad1 (peaking) and biquad5 (highShelf)

			// Evaluate the combined XSim transfer function at test frequencies
			const testFrequencies = [50, 100, 200, 400, 530, 800, 1000, 2000, 5000, 10000, 15000, 20000];

			for (const freq of testFrequencies) {
				// XSim combined magnitude: product of all non-trivial biquads
				let xsimTotalMagDb = 0;
				for (const biquad of xsimNonTrivial) {
					xsimTotalMagDb += evaluateXsimBiquadMagnitude(biquad, freq, dspRate);
				}

				// Our PEQ transfer function (evaluates all non-bypassed sections)
				const ourH = peq.evaluateTransferFunction(freq);
				const ourMagDb = 20 * Math.log10(Math.sqrt(ourH.re * ourH.re + ourH.im * ourH.im));

				// Should match within 0.1 dB
				const error = Math.abs(ourMagDb - xsimTotalMagDb);
				if (error > 0.1) {
					console.log(`Biquad mismatch at ${freq} Hz: ours=${ourMagDb.toFixed(3)} dB, xsim=${xsimTotalMagDb.toFixed(3)} dB, error=${error.toFixed(3)} dB`);
				}
				expect(error).toBeLessThan(0.1);
			}
		});

		it('should match XSim biquad1 (peaking) coefficients directly', () => {
			// Import the PEQ from DXO
			const circuit = DxoImporter.import('tests/fixtures/projects/peq/orbs-peq.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			const dspRate = peq.parameters.dspRate;

			// Compute our coefficients for the first section (peaking at 529.73 Hz)
			const section = peq.parameters.sections[0];
			expect(section.filterType).toBe('peaking');

			const ourCoeffs = BiquadCalculator.computeCoefficients(section, dspRate);

			// Parse XSim reference
			const xsimBiquads = parseXsimBiquadExport('research/filters/peq/orbs-peq.txt');
			const xsimBiquad1 = xsimBiquads[0]; // First biquad is the peaking filter

			// Compare b coefficients directly (should match)
			expect(ourCoeffs.b0).toBeCloseTo(xsimBiquad1.b0, 10);
			expect(ourCoeffs.b1).toBeCloseTo(xsimBiquad1.b1, 10);
			expect(ourCoeffs.b2).toBeCloseTo(xsimBiquad1.b2, 10);

			// a coefficients: XSim negates them
			expect(ourCoeffs.a1).toBeCloseTo(-xsimBiquad1.a1, 10);
			expect(ourCoeffs.a2).toBeCloseTo(-xsimBiquad1.a2, 10);
		});
	});

	describe('PEQ2 - All biquad filter types - orbs-peq2', () => {
		/**
		 * Parse XSim biquad export txt file (same helper as above).
		 */
		function parseXsimBiquads(filePath) {
			const content = fs.readFileSync(filePath, 'utf8');
			const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

			const biquads = [];
			let current = null;

			for (const line of lines) {
				if (line.startsWith('biquad')) {
					if (current) biquads.push(current);
					current = {};
				} else if (current && line.includes('=')) {
					const [key, valStr] = line.replace(',', '').split('=');
					current[key.trim()] = parseFloat(valStr.trim());
				}
			}
			if (current) biquads.push(current);
			return biquads;
		}

		/**
		 * Evaluate XSim biquad transfer function (negated a1/a2 convention).
		 */
		function evaluateXsimBiquad(biquad, frequency, dspRate) {
			const coeffs = {
				b0: biquad.b0,
				b1: biquad.b1,
				b2: biquad.b2,
				a1: -biquad.a1,
				a2: -biquad.a2,
			};
			return BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);
		}

		it('should match XSim reference FRD shape within 1 dB (full circuit)', () => {
			const { splResult } = simulateCircuit('tests/fixtures/projects/peq2/orbs-peq2.dxo');
			const referenceFrd = FrdParser.parse('research/filters/peq2/orbs-peq2.FRD');

			const comparison = compareAgainstReference(splResult, referenceFrd, {
				minFrequency: 100,
				maxFrequency: 15000,
				toleranceDb: 1.0,
				removeOffset: true,
			});

			if (comparison.errorPoints.length > 0) {
				const worstPoints = comparison.errorPoints
					.sort((a, b) => b.error - a.error)
					.slice(0, 5);
				console.log(`PEQ2: max error = ${comparison.maxError.toFixed(2)} dB, avg = ${comparison.avgError.toFixed(2)} dB, offset = ${comparison.offset.toFixed(2)} dB`);
				console.log('Worst points:', worstPoints.map((p) => `${p.frequency.toFixed(0)} Hz: sim=${p.simSpl.toFixed(1)}, ref=${p.refSpl.toFixed(1)}, err=${p.error.toFixed(2)}`));
			}

			expect(comparison.comparedPoints).toBeGreaterThan(50);
			expect(comparison.avgError).toBeLessThan(1.0);
		});

		it('should produce matching combined transfer function magnitude vs XSim biquads', () => {
			const circuit = DxoImporter.import('tests/fixtures/projects/peq2/orbs-peq2.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq).toBeDefined();

			const dspRate = peq.parameters.dspRate;
			const xsimBiquads = parseXsimBiquads('research/filters/peq2/orbs-peq2.txt');

			// XSim has 10 biquads, last 2 are unity
			const xsimActive = xsimBiquads.slice(0, 8);

			const testFrequencies = [30, 50, 100, 200, 500, 530, 1000, 2000, 5000, 10000, 15000, 19000, 20000];

			for (const freq of testFrequencies) {
				// XSim combined: multiply all active biquad transfer functions
				let xsimRe = 1;
				let xsimIm = 0;
				for (const biquad of xsimActive) {
					const h = evaluateXsimBiquad(biquad, freq, dspRate);
					const newRe = xsimRe * h.re - xsimIm * h.im;
					const newIm = xsimRe * h.im + xsimIm * h.re;
					xsimRe = newRe;
					xsimIm = newIm;
				}
				const xsimMagDb = 20 * Math.log10(Math.sqrt(xsimRe * xsimRe + xsimIm * xsimIm));

				// Our PEQ combined transfer function
				const ourH = peq.evaluateTransferFunction(freq);
				const ourMagDb = 20 * Math.log10(Math.sqrt(ourH.re * ourH.re + ourH.im * ourH.im));

				const error = Math.abs(ourMagDb - xsimMagDb);
				if (error > 0.1) {
					console.log(`PEQ2 magnitude mismatch at ${freq} Hz: ours=${ourMagDb.toFixed(3)} dB, xsim=${xsimMagDb.toFixed(3)} dB, error=${error.toFixed(3)} dB`);
				}
				expect(error).toBeLessThan(0.1);
			}
		});

		it('should produce matching combined transfer function phase vs XSim biquads (validates allPass)', () => {
			const circuit = DxoImporter.import('tests/fixtures/projects/peq2/orbs-peq2.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq).toBeDefined();

			const dspRate = peq.parameters.dspRate;
			const xsimBiquads = parseXsimBiquads('research/filters/peq2/orbs-peq2.txt');
			const xsimActive = xsimBiquads.slice(0, 8);

			// Test at frequencies where allPass has significant phase shift
			const testFrequencies = [100, 500, 1000, 1122, 2000, 5000, 10000];

			for (const freq of testFrequencies) {
				// XSim combined phase
				let xsimRe = 1;
				let xsimIm = 0;
				for (const biquad of xsimActive) {
					const h = evaluateXsimBiquad(biquad, freq, dspRate);
					const newRe = xsimRe * h.re - xsimIm * h.im;
					const newIm = xsimRe * h.im + xsimIm * h.re;
					xsimRe = newRe;
					xsimIm = newIm;
				}
				const xsimPhaseDeg = Math.atan2(xsimIm, xsimRe) * (180 / Math.PI);

				// Our PEQ combined phase
				const ourH = peq.evaluateTransferFunction(freq);
				const ourPhaseDeg = Math.atan2(ourH.im, ourH.re) * (180 / Math.PI);

				// Phase comparison: account for wrapping
				let phaseDiff = Math.abs(ourPhaseDeg - xsimPhaseDeg);
				if (phaseDiff > 180) phaseDiff = 360 - phaseDiff;

				if (phaseDiff > 1) {
					console.log(`PEQ2 phase mismatch at ${freq} Hz: ours=${ourPhaseDeg.toFixed(2)}°, xsim=${xsimPhaseDeg.toFixed(2)}°, diff=${phaseDiff.toFixed(2)}°`);
				}
				expect(phaseDiff).toBeLessThan(1); // Within 1 degree
			}
		});

		it('should match each individual biquad coefficient against XSim', () => {
			const circuit = DxoImporter.import('tests/fixtures/projects/peq2/orbs-peq2.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			const dspRate = peq.parameters.dspRate;

			const xsimBiquads = parseXsimBiquads('research/filters/peq2/orbs-peq2.txt');

			// Our sections map to XSim biquads 1-8 (0-indexed: 0-7)
			expect(peq.parameters.sections.length).toBe(8);

			const expectedTypes = ['peaking', 'highShelf', 'lowPass1', 'lowPass2', 'lowShelf', 'highPass1', 'highPass2', 'allPass'];

			for (let i = 0; i < 8; i++) {
				const section = peq.parameters.sections[i];
				expect(section.filterType).toBe(expectedTypes[i]);

				const ourCoeffs = BiquadCalculator.computeCoefficients(section, dspRate);
				const xsimBiquad = xsimBiquads[i];

				// b coefficients should match directly
				const b0Err = Math.abs(ourCoeffs.b0 - xsimBiquad.b0);
				const b1Err = Math.abs(ourCoeffs.b1 - xsimBiquad.b1);
				const b2Err = Math.abs(ourCoeffs.b2 - xsimBiquad.b2);

				// a coefficients: XSim negates them
				const a1Err = Math.abs(ourCoeffs.a1 - (-xsimBiquad.a1));
				const a2Err = Math.abs(ourCoeffs.a2 - (-xsimBiquad.a2));

				const maxErr = Math.max(b0Err, b1Err, b2Err, a1Err, a2Err);
				if (maxErr > 1e-8) {
					console.log(`Biquad ${i + 1} (${section.filterType}) coefficient mismatch: max error = ${maxErr.toExponential(3)}`);
					console.log(`  Ours: b0=${ourCoeffs.b0}, b1=${ourCoeffs.b1}, b2=${ourCoeffs.b2}, a1=${ourCoeffs.a1}, a2=${ourCoeffs.a2}`);
					console.log(`  XSim: b0=${xsimBiquad.b0}, b1=${xsimBiquad.b1}, b2=${xsimBiquad.b2}, a1=${-xsimBiquad.a1}, a2=${-xsimBiquad.a2}`);
				}
				expect(maxErr).toBeLessThan(1e-8);
			}
		});
	});
});
