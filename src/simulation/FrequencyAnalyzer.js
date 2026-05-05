import Complex from 'complex.js';
import HilbertTransform from './HilbertTransform';
import SchemaValidator from './SchemaValidator';

/**
 * FrequencyAnalyzer class
 * Analyzes circuit simulation results to calculate frequency response and SPL
 * Handles speaker sensitivity adjustments, delays, polarity inversion, and phase calculations
 */
class FrequencyAnalyzer {
	/**
	 * Create a new FrequencyAnalyzer
	 * @param {Circuit} circuit - The circuit being analyzed
	 * @param {Object} solverResults - Results from CircuitSolver containing node voltages
	 */
	constructor(circuit, solverResults) {
		this.circuit = circuit;
		this.solverResults = solverResults;
	}

	/**
	 * Get the phase data array for FRD data based on the phase source setting.
	 * When 'derived', computes minimum phase from magnitude data via Hilbert Transform.
	 * When 'measured' (or anything else), returns the original measured phases.
	 *
	 * @param {Object} frdData - FRD data with frequencies, magnitudes, and phases arrays
	 * @param {string} phaseSource - Phase source setting: 'derived' or 'measured'
	 * @returns {number[]} Phase array to use for interpolation
	 */
	getPhaseData(frdData, phaseSource) {
		if (phaseSource === 'derived') {
			try {
				return HilbertTransform.calculateMinimumPhase(frdData.frequencies, frdData.magnitudes);
			} catch (error) {
				console.warn(`Failed to compute derived phase via Hilbert Transform: ${error.message}. Falling back to measured phase.`);
				return frdData.phases;
			}
		}
		return frdData.phases;
	}

	/**
	 * Calculate SPL for an individual speaker at all frequencies
	 * @param {Speaker} speakerComponent - The speaker component to analyze
	 * @param {number} currentAngle - Current off-axis angle (0 for on-axis)
	 * @returns {Object} - {frequencies: number[], spl: number[], phase: number[]}
	 */
	calculateSPL(speakerComponent, currentAngle = 0) {
		// Check if speaker is muted
		if (speakerComponent.parameters.muted) {
			// Return zero SPL for all frequencies
			const frequencies = this.solverResults.frequencies || [];
			return {
				frequencies,
				spl: frequencies.map(() => -Infinity),
				phase: frequencies.map(() => 0),
			};
		}

		// Get the appropriate FRD data based on current angle
		const { frdData: onAxisData, offAxisData } = speakerComponent;
		let frdData = onAxisData;

		// If off-axis angle is requested and available, use it
		if (currentAngle > 0 && offAxisData) {
			const offAxisEntry = offAxisData.find(
				(entry) => entry.angle === currentAngle,
			);
			if (offAxisEntry) {
				frdData = {
					frequencies: offAxisEntry.frequencies,
					magnitudes: offAxisEntry.magnitudes,
					phases: offAxisEntry.phases,
				};
			}
			// If requested angle not available, fall back to on-axis data
		}

		// Check if FRD data is available
		if (!frdData || !frdData.frequencies || frdData.frequencies.length === 0) {
			throw new Error(`Speaker ${speakerComponent.label} has no FRD data loaded`);
		}

		// Resolve phase array based on per-file phase source setting (once, before the frequency loop)
		let phaseSource;
		if (currentAngle > 0 && speakerComponent.parameters.offAxisFiles) {
			const offAxisFileEntry = speakerComponent.parameters.offAxisFiles.find(
				(entry) => entry.angle === currentAngle,
			);
			phaseSource = offAxisFileEntry ? offAxisFileEntry.phaseSource : 'measured';
		} else {
			phaseSource = speakerComponent.parameters.frdPhaseSource || 'measured';
		}
		const phases = this.getPhaseData(frdData, phaseSource);

		// Find the voltage source to normalize SPL by source voltage
		const voltageSource = this.circuit.components.find(
			(component) => component.type === 'source',
		);
		let sourceVoltage;
		if (voltageSource) {
			sourceVoltage = voltageSource.getVoltage();
		} else {
			console.warn('No voltage source found in circuit — falling back to sourceVoltage = 1.0');
			sourceVoltage = 1.0;
		}

		// Get simulation frequencies
		const { frequencies = [], componentVoltages = {} } = this.solverResults;
		const spl = [];
		const phase = [];

		// Get voltage across speaker terminals from solver results
		const speakerVoltages = componentVoltages[speakerComponent.id] || [];

		for (let i = 0; i < frequencies.length; i++) {
			const frequency = frequencies[i];

			// Interpolate speaker's FRD data at this frequency
			const frdMagnitude = this.interpolate(
				frdData.frequencies,
				frdData.magnitudes,
				frequency,
			);
			const frdPhase = this.interpolate(
				frdData.frequencies,
				phases,
				frequency,
			);

			// Get voltage magnitude and phase from solver (inline scalar math)
			const voltage = speakerVoltages[i] || { re: 0, im: 0 };
			const voltageRe = voltage.re;
			const voltageIm = voltage.im;
			const voltageMagnitude = Math.sqrt(voltageRe * voltageRe + voltageIm * voltageIm);
			const voltagePhase = Math.atan2(voltageIm, voltageRe) * (180 / Math.PI);

			// Calculate SPL: speaker's SPL response + voltage contribution (normalized by source voltage)
			// SPL = FRD_magnitude + 20*log10(V_speaker / V_source)
			let calculatedSPL = frdMagnitude;
			if (voltageMagnitude > 0) {
				calculatedSPL += 20 * Math.log10(voltageMagnitude / sourceVoltage);
			} else {
				calculatedSPL = -Infinity;
			}

			// Apply sensitivity adjustment
			calculatedSPL += speakerComponent.parameters.sensitivity;

			// Calculate phase: FRD phase + voltage phase
			let calculatedPhase = frdPhase + voltagePhase;

			// Apply delay as phase shift
			// Phase shift = -360 * frequency * delay (delay is already in seconds)
			const delayPhaseShift = -360 * frequency * speakerComponent.parameters.delay;
			calculatedPhase += delayPhaseShift;

			// Apply polarity inversion (180 degree phase shift)
			if (speakerComponent.parameters.inverted) {
				calculatedPhase += 180;
			}

			// Normalize phase to -180 to +180 range
			while (calculatedPhase > 180) {
				calculatedPhase -= 360;
			}
			while (calculatedPhase < -180) {
				calculatedPhase += 360;
			}

			spl.push(Number.isFinite(calculatedSPL) ? calculatedSPL : -200);
			phase.push(calculatedPhase);
		}

		const result = {
			frequencies,
			spl,
			phase,
		};

		// Validate result against schema
		const validation = SchemaValidator.validateFrequencyResponseData(result);
		if (!validation.valid) {
			console.warn(`Frequency response data validation warning for speaker ${speakerComponent.label}:`, validation.errors);
		}

		return result;
	}

	/**
	 * Calculate combined system response from all speakers
	 * @param {number} currentAngle - Current off-axis angle (0 for on-axis)
	 * @param {SimulationProfiler} [profiler] - Optional profiler for timing instrumentation
	 * @returns {Object} - {frequencies: number[], spl: number[], phase: number[], speakerResponses: Object}
	 */
	calculateSystemResponse(currentAngle = 0, profiler) {
		if (profiler) profiler.startStage('calculateSystemResponse');
		// Get all speaker components
		const speakers = this.circuit.components.filter(
			(component) => component.type === 'speaker',
		);

		if (speakers.length === 0) {
			throw new Error('No speakers found in circuit');
		}

		// Calculate individual speaker responses
		const speakerResponses = {};
		const individualResponses = [];

		for (const speaker of speakers) {
			// Skip speakers that aren't connected to the circuit (no solver data)
			const speakerVoltages = this.solverResults.componentVoltages?.[speaker.id];
			if (!speakerVoltages || speakerVoltages.length === 0) continue;

			// Skip speakers without FRD data
			if (!speaker.frdData || !speaker.frdData.frequencies || speaker.frdData.frequencies.length === 0) continue;

			try {
				const response = this.calculateSPL(speaker, currentAngle);
				response.label = speaker.label || speaker.parameters.name || speaker.id;
				speakerResponses[speaker.id] = response;
				individualResponses.push(response);
			} catch (error) {
				console.warn(`Failed to calculate SPL for speaker ${speaker.label}: ${error.message}`);
			}
		}

		if (individualResponses.length === 0) {
			throw new Error('No valid speaker responses calculated');
		}

		// Get frequencies from first response (all should have same frequencies)
		const { frequencies } = individualResponses[0];

		// Combine responses using complex addition (scalar math, no Complex objects)
		const combinedSPL = [];
		const combinedPhase = [];

		for (let i = 0; i < frequencies.length; i++) {
			let totalRe = 0;
			let totalIm = 0;

			for (const response of individualResponses) {
				const spl = response.spl[i];
				const phaseDeg = response.phase[i];

				// Skip if SPL is -Infinity (muted or no signal)
				if (!Number.isFinite(spl)) {
					continue;
				}

				// Convert SPL to pressure magnitude (arbitrary reference)
				const pressureMagnitude = 10 ** (spl / 20);

				// Convert to real/imaginary components
				const phaseRadians = (phaseDeg * Math.PI) / 180;
				totalRe += pressureMagnitude * Math.cos(phaseRadians);
				totalIm += pressureMagnitude * Math.sin(phaseRadians);
			}

			// Convert back to SPL and phase
			const totalMagnitude = Math.sqrt(totalRe * totalRe + totalIm * totalIm);
			const totalPhase = Math.atan2(totalIm, totalRe) * (180 / Math.PI);

			let totalSPL;
			if (totalMagnitude > 0) {
				totalSPL = 20 * Math.log10(totalMagnitude);
			} else {
				totalSPL = -Infinity;
			}

			combinedSPL.push(Number.isFinite(totalSPL) ? totalSPL : -200);
			combinedPhase.push(totalPhase);
		}

		const result = {
			frequencies,
			spl: combinedSPL,
			phase: combinedPhase,
			speakerResponses,
		};

		// Validate result against schema
		const validation = SchemaValidator.validateFrequencyResponseData(result);
		if (!validation.valid) {
			console.warn('System frequency response data validation warning:', validation.errors);
		}

		if (profiler) profiler.endStage('calculateSystemResponse');
		return result;
	}

	/**
	 * Calculate input impedance at all frequencies
	 * @param {SimulationProfiler} [profiler] - Optional profiler for timing instrumentation
	 * @returns {Object} - {frequencies: number[], impedances: number[], phases: number[]}
	 */
	calculateImpedance(profiler) {
		if (profiler) profiler.startStage('calculateImpedance');
		const frequencies = this.solverResults.frequencies || [];
		const impedances = [];
		const phases = [];

		// Get voltage source component
		const voltageSource = this.circuit.components.find(
			(component) => component.type === 'source',
		);

		if (!voltageSource) {
			throw new Error('No voltage source found in circuit');
		}

		// Get source current from solver results
		const sourceCurrent = this.solverResults.sourceCurrents?.[voltageSource.id] || [];

		for (let i = 0; i < frequencies.length; i++) {
			const current = sourceCurrent[i] || new Complex(0, 0);
			const voltage = voltageSource.getVoltage();

			// Calculate impedance: Z = V / (-I) using scalar math
			// Negate current: the MNA solver defines current flowing into the source's
			// positive terminal, opposite of current flowing into the network.
			const negCurrentRe = -current.re;
			const negCurrentIm = -current.im;
			const currentMagnitudeSquared = negCurrentRe * negCurrentRe + negCurrentIm * negCurrentIm;

			let impedanceMagnitude;
			let impedancePhase;
			if (currentMagnitudeSquared > 1e-24) {
				// Z = V / (-I) where V is real: Z_re = V * (-I_re) / |I|², Z_im = V * (-(-I_im)) / |I|²
				const zRe = (voltage * negCurrentRe) / currentMagnitudeSquared;
				const zIm = -(voltage * negCurrentIm) / currentMagnitudeSquared;
				impedanceMagnitude = Math.sqrt(zRe * zRe + zIm * zIm);
				impedancePhase = Math.atan2(zIm, zRe) * (180 / Math.PI);
			} else {
				impedanceMagnitude = 1e12;
				impedancePhase = 0;
			}

			impedances.push(impedanceMagnitude);
			phases.push(impedancePhase);
		}

		if (profiler) profiler.endStage('calculateImpedance');
		return {
			frequencies,
			impedances,
			phases,
		};
	}

	/**
	 * Apply fractional octave smoothing to frequency response data
	 * @param {number[]} frequencies - Frequency array
	 * @param {number[]} magnitudes - Magnitude array (dB)
	 * @param {string} smoothingType - Type of smoothing: 'none', '1/24', '1/12', '1/6', '1/3', '1/2', '1', 'ERB'
	 * @returns {number[]} - Smoothed magnitude array
	 */
	applySmoothing(frequencies, magnitudes, smoothingType) {
		if (smoothingType === 'none' || !smoothingType) {
			return magnitudes;
		}

		// Parse smoothing type to get octave fraction
		let octaveFraction;
		switch (smoothingType) {
			case '1/24':
				octaveFraction = 1 / 24;
				break;
			case '1/12':
				octaveFraction = 1 / 12;
				break;
			case '1/6':
				octaveFraction = 1 / 6;
				break;
			case '1/3':
				octaveFraction = 1 / 3;
				break;
			case '1/2':
				octaveFraction = 1 / 2;
				break;
			case '1':
				octaveFraction = 1;
				break;
			case 'ERB':
				// ERB (Equivalent Rectangular Bandwidth) - frequency-dependent
				return this.applyERBSmoothing(frequencies, magnitudes);
			default:
				console.warn(`Unknown smoothing type: ${smoothingType}`);
				return magnitudes;
		}

		// Apply fractional octave smoothing
		const smoothed = [];

		for (let i = 0; i < frequencies.length; i++) {
			const centerFreq = frequencies[i];

			// Calculate bandwidth for this octave fraction
			// Lower bound: f / 2^(octaveFraction/2)
			// Upper bound: f * 2^(octaveFraction/2)
			const factor = 2 ** (octaveFraction / 2);
			const lowerBound = centerFreq / factor;
			const upperBound = centerFreq * factor;

			// Find all points within this bandwidth
			let sum = 0;
			let count = 0;

			for (let j = 0; j < frequencies.length; j++) {
				if (frequencies[j] >= lowerBound && frequencies[j] <= upperBound) {
					// Convert dB to linear, accumulate, then convert back
					sum += 10 ** (magnitudes[j] / 20);
					count++;
				}
			}

			// Calculate average in linear domain, then convert to dB
			if (count > 0) {
				const average = sum / count;
				smoothed.push(20 * Math.log10(average));
			} else {
				smoothed.push(magnitudes[i]);
			}
		}

		return smoothed;
	}

	/**
	 * Apply ERB (Equivalent Rectangular Bandwidth) smoothing
	 * @param {number[]} frequencies - Frequency array
	 * @param {number[]} magnitudes - Magnitude array (dB)
	 * @returns {number[]} - Smoothed magnitude array
	 */
	applyERBSmoothing(frequencies, magnitudes) {
		const smoothed = [];

		for (let i = 0; i < frequencies.length; i++) {
			const centerFreq = frequencies[i];

			// ERB formula: ERB(f) = 24.7 * (4.37 * f/1000 + 1)
			const erbWidth = 24.7 * (4.37 * (centerFreq / 1000) + 1);

			// Use ERB as bandwidth
			const lowerBound = centerFreq - erbWidth / 2;
			const upperBound = centerFreq + erbWidth / 2;

			// Find all points within this bandwidth
			let sum = 0;
			let count = 0;

			for (let j = 0; j < frequencies.length; j++) {
				if (frequencies[j] >= lowerBound && frequencies[j] <= upperBound) {
					sum += 10 ** (magnitudes[j] / 20);
					count++;
				}
			}

			// Calculate average
			if (count > 0) {
				const average = sum / count;
				smoothed.push(20 * Math.log10(average));
			} else {
				smoothed.push(magnitudes[i]);
			}
		}

		return smoothed;
	}

	/**
	 * Linear interpolation helper using binary search.
	 * @param {number[]} xArray - X values (must be sorted ascending)
	 * @param {number[]} yArray - Y values
	 * @param {number} x - X value to interpolate at
	 * @returns {number} - Interpolated Y value
	 */
	interpolate(xArray, yArray, x) {
		// Handle edge cases
		if (x <= xArray[0]) {
			return yArray[0];
		}
		const lastIndex = xArray.length - 1;
		if (x >= xArray[lastIndex]) {
			return yArray[lastIndex];
		}

		// Binary search for the bracket
		let low = 0;
		let high = lastIndex;
		while (high - low > 1) {
			const mid = Math.floor((low + high) / 2);
			if (xArray[mid] <= x) {
				low = mid;
			} else {
				high = mid;
			}
		}

		// Linear interpolation
		const x0 = xArray[low];
		const x1 = xArray[high];
		const t = (x - x0) / (x1 - x0);
		return yArray[low] + t * (yArray[high] - yArray[low]);
	}
}

export default FrequencyAnalyzer;
