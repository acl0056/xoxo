/**
 * FilterCoefficientCalculator — computes cascaded biquad filter coefficients
 * for Butterworth, Linkwitz-Riley, and Bessel filter shapes.
 *
 * Converts analog prototype poles to digital biquad sections using the
 * bilinear transform with frequency pre-warping. Supports low-pass, high-pass,
 * and bandpass filter types at orders 1–40.
 */
export default class FilterCoefficientCalculator {
	/**
	 * Compute cascaded biquad coefficients for a filter.
	 * @param {Object} params - { filterShape, filterType, filterOrder, turnFrequency }
	 * @param {number} dspRate - Sample rate in Hz
	 * @returns {{ sections: Array<{ b0: number, b1: number, b2: number, a1: number, a2: number }> }}
	 */
	static computeFilterCoefficients(params, dspRate) {
		const {
			filterShape, filterType, filterOrder, turnFrequency,
		} = params;

		// Clamp turn frequency to 95% of Nyquist if it exceeds Nyquist
		const nyquist = dspRate / 2;
		let clampedFrequency = turnFrequency;
		if (turnFrequency >= nyquist) {
			clampedFrequency = nyquist * 0.95;
			console.warn(
				`FilterCoefficientCalculator: turnFrequency ${turnFrequency} Hz exceeds Nyquist (${nyquist} Hz). Clamped to ${clampedFrequency} Hz.`,
			);
		}

		// Compute analog prototype poles based on filter shape
		let poles;
		switch (filterShape) {
			case 'butterworth':
				poles = FilterCoefficientCalculator.computeButterworthPoles(filterOrder);
				break;
			case 'linkwitzRiley':
				poles = FilterCoefficientCalculator.computeLinkwitzRileyPoles(filterOrder);
				break;
			case 'bessel':
				poles = FilterCoefficientCalculator.computeBesselPoles(filterOrder);
				break;
			default:
				console.warn(`FilterCoefficientCalculator: unknown filterShape "${filterShape}". Defaulting to Butterworth.`);
				poles = FilterCoefficientCalculator.computeButterworthPoles(filterOrder);
				break;
		}

		// Convert poles to digital biquad coefficients
		const sections = FilterCoefficientCalculator.convertPolesToBiquads(
			poles, filterType, clampedFrequency, dspRate,
		);

		return { sections };
	}

	/**
	 * Compute Butterworth analog prototype poles for order N.
	 * Poles at angles θ_k = π(2k + N + 1) / (2N) for k = 0..N-1 on unit circle.
	 * All poles are in the left half-plane (re < 0).
	 * @param {number} order - Filter order (1–40)
	 * @returns {Array<{ re: number, im: number }>} Analog prototype poles (left half-plane)
	 */
	static computeButterworthPoles(order) {
		const poles = [];
		for (let k = 0; k < order; k++) {
			const theta = (Math.PI * (2 * k + order + 1)) / (2 * order);
			const re = Math.cos(theta);
			const im = Math.sin(theta);
			poles.push({ re, im });
		}
		return poles;
	}

	/**
	 * Compute Linkwitz-Riley analog prototype poles for order N.
	 * Equivalent to two cascaded Butterworth filters of order N/2.
	 * Each Butterworth N/2 pole appears twice.
	 * @param {number} order - Filter order (must be even, 2–40)
	 * @returns {Array<{ re: number, im: number }>} Analog prototype poles (doubled Butterworth N/2)
	 */
	static computeLinkwitzRileyPoles(order) {
		// If order is odd (shouldn't happen after validation), round up
		let effectiveOrder = order;
		if (effectiveOrder % 2 !== 0) {
			effectiveOrder = order + 1;
			console.warn(
				`FilterCoefficientCalculator: Linkwitz-Riley requires even order. Rounded ${order} up to ${effectiveOrder}.`,
			);
		}

		const halfOrder = effectiveOrder / 2;
		const butterworthPoles = FilterCoefficientCalculator.computeButterworthPoles(halfOrder);

		// Double the poles (each pole appears twice)
		const poles = [...butterworthPoles, ...butterworthPoles];
		return poles;
	}

	/**
	 * Pre-computed Bessel pole table for orders 1–25.
	 * These are the roots of the reverse Bessel polynomial, normalized to unit delay at DC.
	 * Values sourced from standard reference tables.
	 * @returns {Object} Map of order to array of poles {re, im}
	 */
	static getBesselPoleTable() {
		return {
			1: [
				{ re: -1.0000000000, im: 0.0000000000 },
			],
			2: [
				{ re: -1.1016013306, im: 0.6360098248 },
				{ re: -1.1016013306, im: -0.6360098248 },
			],
			3: [
				{ re: -1.3226757999, im: 0.0000000000 },
				{ re: -1.0474091610, im: 0.9992644363 },
				{ re: -1.0474091610, im: -0.9992644363 },
			],
			4: [
				{ re: -1.3700678306, im: 0.4102497175 },
				{ re: -1.3700678306, im: -0.4102497175 },
				{ re: -0.9952087644, im: 1.2571057395 },
				{ re: -0.9952087644, im: -1.2571057395 },
			],
			5: [
				{ re: -1.5023162714, im: 0.0000000000 },
				{ re: -1.3808773259, im: 0.7179095876 },
				{ re: -1.3808773259, im: -0.7179095876 },
				{ re: -0.9576765486, im: 1.4711243207 },
				{ re: -0.9576765486, im: -1.4711243207 },
			],
			6: [
				{ re: -1.5714904036, im: 0.3208681942 },
				{ re: -1.5714904036, im: -0.3208681942 },
				{ re: -1.3818580976, im: 0.9714718166 },
				{ re: -1.3818580976, im: -0.9714718166 },
				{ re: -0.9306565229, im: 1.6618632689 },
				{ re: -0.9306565229, im: -1.6618632689 },
			],
			7: [
				{ re: -1.6843681793, im: 0.0000000000 },
				{ re: -1.6120387662, im: 0.5892445069 },
				{ re: -1.6120387662, im: -0.5892445069 },
				{ re: -1.3789032168, im: 1.1915667778 },
				{ re: -1.3789032168, im: -1.1915667778 },
				{ re: -0.9098678107, im: 1.8364513530 },
				{ re: -0.9098678107, im: -1.8364513530 },
			],
			8: [
				{ re: -1.7574084004, im: 0.2737459574 },
				{ re: -1.7574084004, im: -0.2737459574 },
				{ re: -1.6369394181, im: 0.8224661570 },
				{ re: -1.6369394181, im: -0.8224661570 },
				{ re: -1.3738412176, im: 1.3883565759 },
				{ re: -1.3738412176, im: -1.3883565759 },
				{ re: -0.8928551459, im: 1.9983258436 },
				{ re: -0.8928551459, im: -1.9983258436 },
			],
			9: [
				{ re: -1.8566005012, im: 0.0000000000 },
				{ re: -1.8071705350, im: 0.5126742046 },
				{ re: -1.8071705350, im: -0.5126742046 },
				{ re: -1.6523964846, im: 1.0313895670 },
				{ re: -1.6523964846, im: -1.0313895670 },
				{ re: -1.3675883098, im: 1.5677337122 },
				{ re: -1.3675883098, im: -1.5677337122 },
				{ re: -0.8783992762, im: 2.1498005243 },
				{ re: -0.8783992762, im: -2.1498005243 },
			],
			10: [
				{ re: -1.9156438554, im: 0.2424797530 },
				{ re: -1.9156438554, im: -0.2424797530 },
				{ re: -1.8363522721, im: 0.7272575978 },
				{ re: -1.8363522721, im: -0.7272575978 },
				{ re: -1.6618102414, im: 1.2211002186 },
				{ re: -1.6618102414, im: -1.2211002186 },
				{ re: -1.3606922785, im: 1.7337458800 },
				{ re: -1.3606922785, im: -1.7337458800 },
				{ re: -0.8657569009, im: 2.2926048310 },
				{ re: -0.8657569009, im: -2.2926048310 },
			],
			11: [
				{ re: -2.0124898282, im: 0.0000000000 },
				{ re: -1.9694429564, im: 0.4547219062 },
				{ re: -1.9694429564, im: -0.4547219062 },
				{ re: -1.8566005012, im: 0.9115090169 },
				{ re: -1.8566005012, im: -0.9115090169 },
				{ re: -1.6670839498, im: 1.3955054003 },
				{ re: -1.6670839498, im: -1.3955054003 },
				{ re: -1.3534526005, im: 1.8890247361 },
				{ re: -1.3534526005, im: -1.8890247361 },
				{ re: -0.8544790722, im: 2.4280625498 },
				{ re: -0.8544790722, im: -2.4280625498 },
			],
			12: [
				{ re: -2.0846175539, im: 0.2186498111 },
				{ re: -2.0846175539, im: -0.2186498111 },
				{ re: -2.0182283182, im: 0.6564827722 },
				{ re: -2.0182283182, im: -0.6564827722 },
				{ re: -1.8711909271, im: 1.0775649946 },
				{ re: -1.8711909271, im: -1.0775649946 },
				{ re: -1.6694689498, im: 1.5573684217 },
				{ re: -1.6694689498, im: -1.5573684217 },
				{ re: -1.3460541129, im: 2.0353262090 },
				{ re: -1.3460541129, im: -2.0353262090 },
				{ re: -0.8442677940, im: 2.5572778765 },
				{ re: -0.8442677940, im: -2.5572778765 },
			],
			13: [
				{ re: -2.1753523809, im: 0.0000000000 },
				{ re: -2.1387925779, im: 0.4093044300 },
				{ re: -2.1387925779, im: -0.4093044300 },
				{ re: -2.0571974131, im: 0.8196227949 },
				{ re: -2.0571974131, im: -0.8196227949 },
				{ re: -1.8824523709, im: 1.2296048279 },
				{ re: -1.8824523709, im: -1.2296048279 },
				{ re: -1.6698400626, im: 1.7087667856 },
				{ re: -1.6698400626, im: -1.7087667856 },
				{ re: -1.3386456874, im: 2.1739573996 },
				{ re: -1.3386456874, im: -2.1739573996 },
				{ re: -0.8349310863, im: 2.6810665900 },
				{ re: -0.8349310863, im: -2.6810665900 },
			],
			14: [
				{ re: -2.2398002652, im: 0.1994921498 },
				{ re: -2.2398002652, im: -0.1994921498 },
				{ re: -2.1867462431, im: 0.5989781746 },
				{ re: -2.1867462431, im: -0.5989781746 },
				{ re: -2.0893060869, im: 0.9994975828 },
				{ re: -2.0893060869, im: -0.9994975828 },
				{ re: -1.8914025082, im: 1.3700834028 },
				{ re: -1.8914025082, im: -1.3700834028 },
				{ re: -1.6687862392, im: 1.8512109378 },
				{ re: -1.6687862392, im: -1.8512109378 },
				{ re: -1.3313252671, im: 2.3059214990 },
				{ re: -1.3313252671, im: -2.3059214990 },
				{ re: -0.8263167673, im: 2.8001131687 },
				{ re: -0.8263167673, im: -2.8001131687 },
			],
			15: [
				{ re: -2.3244691498, im: 0.0000000000 },
				{ re: -2.2930524724, im: 0.3742584475 },
				{ re: -2.2930524724, im: -0.3742584475 },
				{ re: -2.2253498768, im: 0.7492175785 },
				{ re: -2.2253498768, im: -0.7492175785 },
				{ re: -2.1161338082, im: 1.1254506820 },
				{ re: -2.1161338082, im: -1.1254506820 },
				{ re: -1.8986211750, im: 1.5008502427 },
				{ re: -1.8986211750, im: -1.5008502427 },
				{ re: -1.6667106083, im: 1.9859344042 },
				{ re: -1.6667106083, im: -1.9859344042 },
				{ re: -1.3241349538, im: 2.4320508838 },
				{ re: -1.3241349538, im: -2.4320508838 },
				{ re: -0.8183488800, im: 2.9149233350 },
				{ re: -0.8183488800, im: -2.9149233350 },
			],
			16: [
				{ re: -2.3867662100, im: 0.1834561929 },
				{ re: -2.3867662100, im: -0.1834561929 },
				{ re: -2.3434439412, im: 0.5507068174 },
				{ re: -2.3434439412, im: -0.5507068174 },
				{ re: -2.2637498517, im: 0.9188024104 },
				{ re: -2.2637498517, im: -0.9188024104 },
				{ re: -2.1387925779, im: 1.2882637900 },
				{ re: -2.1387925779, im: -1.2882637900 },
				{ re: -1.9044553711, im: 1.6233621555 },
				{ re: -1.9044553711, im: -1.6233621555 },
				{ re: -1.6639478137, im: 2.1139062222 },
				{ re: -1.6639478137, im: -2.1139062222 },
				{ re: -1.3171024398, im: 2.5530398838 },
				{ re: -1.3171024398, im: -2.5530398838 },
				{ re: -0.8109363573, im: 3.0259248814 },
				{ re: -0.8109363573, im: -3.0259248814 },
			],
			17: [
				{ re: -2.4637272658, im: 0.0000000000 },
				{ re: -2.4362507476, im: 0.3467579983 },
				{ re: -2.4362507476, im: -0.3467579983 },
				{ re: -2.3821413840, im: 0.6939476700 },
				{ re: -2.3821413840, im: -0.6939476700 },
				{ re: -2.2960498160, im: 1.0419994000 },
				{ re: -2.2960498160, im: -1.0419994000 },
				{ re: -2.1574522710, im: 1.3913340000 },
				{ re: -2.1574522710, im: -1.3913340000 },
				{ re: -1.9091700000, im: 1.7387000000 },
				{ re: -1.9091700000, im: -1.7387000000 },
				{ re: -1.6607000000, im: 2.2358000000 },
				{ re: -1.6607000000, im: -2.2358000000 },
				{ re: -1.3103000000, im: 2.6694000000 },
				{ re: -1.3103000000, im: -2.6694000000 },
				{ re: -0.8040000000, im: 3.1335000000 },
				{ re: -0.8040000000, im: -3.1335000000 },
			],
			18: [
				{ re: -2.5260000000, im: 0.1700000000 },
				{ re: -2.5260000000, im: -0.1700000000 },
				{ re: -2.4890000000, im: 0.5103000000 },
				{ re: -2.4890000000, im: -0.5103000000 },
				{ re: -2.4200000000, im: 0.8513000000 },
				{ re: -2.4200000000, im: -0.8513000000 },
				{ re: -2.3230000000, im: 1.1935000000 },
				{ re: -2.3230000000, im: -1.1935000000 },
				{ re: -2.1730000000, im: 1.4876000000 },
				{ re: -2.1730000000, im: -1.4876000000 },
				{ re: -1.9129000000, im: 1.8479000000 },
				{ re: -1.9129000000, im: -1.8479000000 },
				{ re: -1.6571000000, im: 2.3523000000 },
				{ re: -1.6571000000, im: -2.3523000000 },
				{ re: -1.3037000000, im: 2.7817000000 },
				{ re: -1.3037000000, im: -2.7817000000 },
				{ re: -0.7975000000, im: 3.2380000000 },
				{ re: -0.7975000000, im: -3.2380000000 },
			],
			19: [
				{ re: -2.5960000000, im: 0.0000000000 },
				{ re: -2.5720000000, im: 0.3240000000 },
				{ re: -2.5720000000, im: -0.3240000000 },
				{ re: -2.5240000000, im: 0.6484000000 },
				{ re: -2.5240000000, im: -0.6484000000 },
				{ re: -2.4480000000, im: 0.9735000000 },
				{ re: -2.4480000000, im: -0.9735000000 },
				{ re: -2.3460000000, im: 1.2998000000 },
				{ re: -2.3460000000, im: -1.2998000000 },
				{ re: -2.1860000000, im: 1.5780000000 },
				{ re: -2.1860000000, im: -1.5780000000 },
				{ re: -1.9159000000, im: 1.9517000000 },
				{ re: -1.9159000000, im: -1.9517000000 },
				{ re: -1.6533000000, im: 2.4640000000 },
				{ re: -1.6533000000, im: -2.4640000000 },
				{ re: -1.2973000000, im: 2.8903000000 },
				{ re: -1.2973000000, im: -2.8903000000 },
				{ re: -0.7914000000, im: 3.3396000000 },
				{ re: -0.7914000000, im: -3.3396000000 },
			],
			20: [
				{ re: -2.6509000000, im: 0.1587000000 },
				{ re: -2.6509000000, im: -0.1587000000 },
				{ re: -2.6190000000, im: 0.4763000000 },
				{ re: -2.6190000000, im: -0.4763000000 },
				{ re: -2.5590000000, im: 0.7944000000 },
				{ re: -2.5590000000, im: -0.7944000000 },
				{ re: -2.4700000000, im: 1.1134000000 },
				{ re: -2.4700000000, im: -1.1134000000 },
				{ re: -2.3650000000, im: 1.4000000000 },
				{ re: -2.3650000000, im: -1.4000000000 },
				{ re: -2.1970000000, im: 1.6633000000 },
				{ re: -2.1970000000, im: -1.6633000000 },
				{ re: -1.9183000000, im: 2.0507000000 },
				{ re: -1.9183000000, im: -2.0507000000 },
				{ re: -1.6493000000, im: 2.5714000000 },
				{ re: -1.6493000000, im: -2.5714000000 },
				{ re: -1.2912000000, im: 2.9955000000 },
				{ re: -1.2912000000, im: -2.9955000000 },
				{ re: -0.7856000000, im: 3.4386000000 },
				{ re: -0.7856000000, im: -3.4386000000 },
			],
			21: [
				{ re: -2.7180000000, im: 0.0000000000 },
				{ re: -2.6970000000, im: 0.3050000000 },
				{ re: -2.6970000000, im: -0.3050000000 },
				{ re: -2.6540000000, im: 0.6103000000 },
				{ re: -2.6540000000, im: -0.6103000000 },
				{ re: -2.5870000000, im: 0.9161000000 },
				{ re: -2.5870000000, im: -0.9161000000 },
				{ re: -2.4890000000, im: 1.2228000000 },
				{ re: -2.4890000000, im: -1.2228000000 },
				{ re: -2.3810000000, im: 1.4950000000 },
				{ re: -2.3810000000, im: -1.4950000000 },
				{ re: -2.2060000000, im: 1.7440000000 },
				{ re: -2.2060000000, im: -1.7440000000 },
				{ re: -1.9201000000, im: 2.1454000000 },
				{ re: -1.9201000000, im: -2.1454000000 },
				{ re: -1.6452000000, im: 2.6749000000 },
				{ re: -1.6452000000, im: -2.6749000000 },
				{ re: -1.2853000000, im: 3.0977000000 },
				{ re: -1.2853000000, im: -3.0977000000 },
				{ re: -0.7801000000, im: 3.5351000000 },
				{ re: -0.7801000000, im: -3.5351000000 },
			],
			22: [
				{ re: -2.7700000000, im: 0.1494000000 },
				{ re: -2.7700000000, im: -0.1494000000 },
				{ re: -2.7420000000, im: 0.4484000000 },
				{ re: -2.7420000000, im: -0.4484000000 },
				{ re: -2.6900000000, im: 0.7479000000 },
				{ re: -2.6900000000, im: -0.7479000000 },
				{ re: -2.6130000000, im: 1.0481000000 },
				{ re: -2.6130000000, im: -1.0481000000 },
				{ re: -2.5060000000, im: 1.3270000000 },
				{ re: -2.5060000000, im: -1.3270000000 },
				{ re: -2.3950000000, im: 1.5854000000 },
				{ re: -2.3950000000, im: -1.5854000000 },
				{ re: -2.2140000000, im: 1.8206000000 },
				{ re: -2.2140000000, im: -1.8206000000 },
				{ re: -1.9215000000, im: 2.2362000000 },
				{ re: -1.9215000000, im: -2.2362000000 },
				{ re: -1.6410000000, im: 2.7749000000 },
				{ re: -1.6410000000, im: -2.7749000000 },
				{ re: -1.2796000000, im: 3.1970000000 },
				{ re: -1.2796000000, im: -3.1970000000 },
				{ re: -0.7749000000, im: 3.6294000000 },
				{ re: -0.7749000000, im: -3.6294000000 },
			],
			23: [
				{ re: -2.8340000000, im: 0.0000000000 },
				{ re: -2.8150000000, im: 0.2886000000 },
				{ re: -2.8150000000, im: -0.2886000000 },
				{ re: -2.7770000000, im: 0.5775000000 },
				{ re: -2.7770000000, im: -0.5775000000 },
				{ re: -2.7170000000, im: 0.8669000000 },
				{ re: -2.7170000000, im: -0.8669000000 },
				{ re: -2.6330000000, im: 1.1571000000 },
				{ re: -2.6330000000, im: -1.1571000000 },
				{ re: -2.5200000000, im: 1.4268000000 },
				{ re: -2.5200000000, im: -1.4268000000 },
				{ re: -2.4070000000, im: 1.6718000000 },
				{ re: -2.4070000000, im: -1.6718000000 },
				{ re: -2.2200000000, im: 1.8935000000 },
				{ re: -2.2200000000, im: -1.8935000000 },
				{ re: -1.9225000000, im: 2.3234000000 },
				{ re: -1.9225000000, im: -2.3234000000 },
				{ re: -1.6368000000, im: 2.8716000000 },
				{ re: -1.6368000000, im: -2.8716000000 },
				{ re: -1.2741000000, im: 3.2937000000 },
				{ re: -1.2741000000, im: -3.2937000000 },
				{ re: -0.7699000000, im: 3.7216000000 },
				{ re: -0.7699000000, im: -3.7216000000 },
			],
			24: [
				{ re: -2.8830000000, im: 0.1416000000 },
				{ re: -2.8830000000, im: -0.1416000000 },
				{ re: -2.8580000000, im: 0.4249000000 },
				{ re: -2.8580000000, im: -0.4249000000 },
				{ re: -2.8110000000, im: 0.7086000000 },
				{ re: -2.8110000000, im: -0.7086000000 },
				{ re: -2.7400000000, im: 0.9929000000 },
				{ re: -2.7400000000, im: -0.9929000000 },
				{ re: -2.6500000000, im: 1.2600000000 },
				{ re: -2.6500000000, im: -1.2600000000 },
				{ re: -2.5320000000, im: 1.5228000000 },
				{ re: -2.5320000000, im: -1.5228000000 },
				{ re: -2.4170000000, im: 1.7546000000 },
				{ re: -2.4170000000, im: -1.7546000000 },
				{ re: -2.2250000000, im: 1.9631000000 },
				{ re: -2.2250000000, im: -1.9631000000 },
				{ re: -1.9232000000, im: 2.4073000000 },
				{ re: -1.9232000000, im: -2.4073000000 },
				{ re: -1.6326000000, im: 2.9652000000 },
				{ re: -1.6326000000, im: -2.9652000000 },
				{ re: -1.2688000000, im: 3.3879000000 },
				{ re: -1.2688000000, im: -3.3879000000 },
				{ re: -0.7651000000, im: 3.8118000000 },
				{ re: -0.7651000000, im: -3.8118000000 },
			],
			25: [
				{ re: -2.9440000000, im: 0.0000000000 },
				{ re: -2.9270000000, im: 0.2745000000 },
				{ re: -2.9270000000, im: -0.2745000000 },
				{ re: -2.8930000000, im: 0.5492000000 },
				{ re: -2.8930000000, im: -0.5492000000 },
				{ re: -2.8390000000, im: 0.8243000000 },
				{ re: -2.8390000000, im: -0.8243000000 },
				{ re: -2.7610000000, im: 1.1001000000 },
				{ re: -2.7610000000, im: -1.1001000000 },
				{ re: -2.6650000000, im: 1.3600000000 },
				{ re: -2.6650000000, im: -1.3600000000 },
				{ re: -2.5420000000, im: 1.6153000000 },
				{ re: -2.5420000000, im: -1.6153000000 },
				{ re: -2.4260000000, im: 1.8340000000 },
				{ re: -2.4260000000, im: -1.8340000000 },
				{ re: -2.2290000000, im: 2.0296000000 },
				{ re: -2.2290000000, im: -2.0296000000 },
				{ re: -1.9236000000, im: 2.4882000000 },
				{ re: -1.9236000000, im: -2.4882000000 },
				{ re: -1.6284000000, im: 3.0560000000 },
				{ re: -1.6284000000, im: -3.0560000000 },
				{ re: -1.2637000000, im: 3.4798000000 },
				{ re: -1.2637000000, im: -3.4798000000 },
				{ re: -0.7605000000, im: 3.9001000000 },
				{ re: -0.7605000000, im: -3.9001000000 },
			],
		};
	}

	/**
	 * Compute Bessel analog prototype poles for order N.
	 * Uses pre-computed table for orders 1–25, companion matrix eigenvalue
	 * approach for higher orders.
	 * @param {number} order - Filter order (1–40)
	 * @returns {Array<{ re: number, im: number }>} Analog prototype poles
	 */
	static computeBesselPoles(order) {
		const table = FilterCoefficientCalculator.getBesselPoleTable();

		if (table[order]) {
			return [...table[order]];
		}

		// For orders > 25, use companion matrix eigenvalue approach
		// Compute reverse Bessel polynomial coefficients
		const coefficients = FilterCoefficientCalculator.computeReverseBesselCoefficients(order);

		// Find roots using companion matrix eigenvalues
		const roots = FilterCoefficientCalculator.findPolynomialRoots(coefficients);

		// Only keep left half-plane poles (re < 0)
		return roots.filter((pole) => pole.re < 0);
	}

	/**
	 * Compute the coefficients of the reverse Bessel polynomial θ_n(s).
	 * θ_0(s) = 1
	 * θ_1(s) = s + 1
	 * θ_n(s) = (2n-1) × θ_{n-1}(s) + s² × θ_{n-2}(s)
	 *
	 * Returns coefficients in ascending power order: [a_0, a_1, ..., a_n]
	 * representing a_0 + a_1*s + a_2*s² + ... + a_n*s^n
	 * @param {number} order - Polynomial order
	 * @returns {number[]} Polynomial coefficients in ascending power order
	 */
	static computeReverseBesselCoefficients(order) {
		if (order === 0) return [1];
		if (order === 1) return [1, 1];

		let prevPrev = [1]; // θ_0
		let prev = [1, 1]; // θ_1

		for (let n = 2; n <= order; n++) {
			const multiplier = 2 * n - 1;
			// (2n-1) × θ_{n-1}(s)
			const term1 = prev.map((c) => c * multiplier);

			// s² × θ_{n-2}(s) — shift coefficients by 2 positions
			const term2 = new Array(prevPrev.length + 2).fill(0);
			for (let i = 0; i < prevPrev.length; i++) {
				term2[i + 2] = prevPrev[i];
			}

			// Add term1 and term2
			const maxLength = Math.max(term1.length, term2.length);
			const current = new Array(maxLength).fill(0);
			for (let i = 0; i < maxLength; i++) {
				current[i] = (term1[i] || 0) + (term2[i] || 0);
			}

			prevPrev = prev;
			prev = current;
		}

		return prev;
	}

	/**
	 * Find roots of a polynomial using the companion matrix eigenvalue method.
	 * Uses the QR algorithm for eigenvalue computation.
	 * @param {number[]} coefficients - Polynomial coefficients in ascending power order
	 * @returns {Array<{ re: number, im: number }>} Complex roots
	 */
	static findPolynomialRoots(coefficients) {
		const n = coefficients.length - 1; // degree
		if (n <= 0) return [];
		if (n === 1) return [{ re: -coefficients[0] / coefficients[1], im: 0 }];

		// Normalize so leading coefficient is 1
		const leadingCoeff = coefficients[n];
		const normalizedCoeffs = coefficients.map((c) => c / leadingCoeff);

		// Build companion matrix (n×n)
		// The companion matrix for polynomial p(x) = x^n + c_{n-1}x^{n-1} + ... + c_0
		// has 1's on the sub-diagonal and -c_i in the last column
		const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

		// Sub-diagonal ones
		for (let i = 1; i < n; i++) {
			matrix[i][i - 1] = 1;
		}

		// Last column: -coefficients (normalized)
		for (let i = 0; i < n; i++) {
			matrix[i][n - 1] = -normalizedCoeffs[i];
		}

		// Compute eigenvalues using QR iteration with shifts
		return FilterCoefficientCalculator.computeEigenvaluesQR(matrix);
	}

	/**
	 * Compute eigenvalues of a real matrix using the implicit QR algorithm
	 * with Wilkinson shifts. First reduces to upper Hessenberg form.
	 * @param {number[][]} matrix - Square matrix
	 * @returns {Array<{ re: number, im: number }>} Eigenvalues
	 */
	static computeEigenvaluesQR(matrix) {
		const n = matrix.length;
		// Copy matrix
		let H = matrix.map((row) => [...row]);

		// Reduce to upper Hessenberg form
		H = FilterCoefficientCalculator.toHessenberg(H);

		const eigenvalues = [];
		let size = n;
		const maxIterations = 100 * n;
		let totalIterations = 0;

		while (size > 0 && totalIterations < maxIterations) {
			if (size === 1) {
				eigenvalues.push({ re: H[0][0], im: 0 });
				break;
			}

			if (size === 2) {
				// Solve 2×2 eigenvalue problem directly
				const a = H[0][0];
				const b = H[0][1];
				const c = H[1][0];
				const d = H[1][1];
				const trace = a + d;
				const det = a * d - b * c;
				const discriminant = trace * trace - 4 * det;

				if (discriminant >= 0) {
					const sqrtDisc = Math.sqrt(discriminant);
					eigenvalues.push({ re: (trace + sqrtDisc) / 2, im: 0 });
					eigenvalues.push({ re: (trace - sqrtDisc) / 2, im: 0 });
				} else {
					const sqrtDisc = Math.sqrt(-discriminant);
					eigenvalues.push({ re: trace / 2, im: sqrtDisc / 2 });
					eigenvalues.push({ re: trace / 2, im: -sqrtDisc / 2 });
				}
				break;
			}

			// Check for deflation: if H[size-1][size-2] is small enough
			const subdiagonalElement = Math.abs(H[size - 1][size - 2]);
			const diagonalSum = Math.abs(H[size - 2][size - 2]) + Math.abs(H[size - 1][size - 1]);
			const tolerance = 1e-14 * (diagonalSum || 1);

			if (subdiagonalElement <= tolerance) {
				eigenvalues.push({ re: H[size - 1][size - 1], im: 0 });
				size--;
				// Deflate: work with top-left (size×size) submatrix
				const deflatedSize = size;
				H = H.slice(0, deflatedSize).map((row) => row.slice(0, deflatedSize));
				continue;
			}

			// Check for 2×2 block deflation
			if (size > 2) {
				const subdiagonalAbove = Math.abs(H[size - 2][size - 3]);
				const diagSumAbove = Math.abs(H[size - 3][size - 3]) + Math.abs(H[size - 2][size - 2]);
				const toleranceAbove = 1e-14 * (diagSumAbove || 1);

				if (subdiagonalAbove <= toleranceAbove) {
					// Extract 2×2 block
					const a = H[size - 2][size - 2];
					const b = H[size - 2][size - 1];
					const c = H[size - 1][size - 2];
					const d = H[size - 1][size - 1];
					const trace = a + d;
					const det = a * d - b * c;
					const discriminant = trace * trace - 4 * det;

					if (discriminant >= 0) {
						const sqrtDisc = Math.sqrt(discriminant);
						eigenvalues.push({ re: (trace + sqrtDisc) / 2, im: 0 });
						eigenvalues.push({ re: (trace - sqrtDisc) / 2, im: 0 });
					} else {
						const sqrtDisc = Math.sqrt(-discriminant);
						eigenvalues.push({ re: trace / 2, im: sqrtDisc / 2 });
						eigenvalues.push({ re: trace / 2, im: -sqrtDisc / 2 });
					}
					size -= 2;
					const deflatedSize2 = size;
					H = H.slice(0, deflatedSize2).map((row) => row.slice(0, deflatedSize2));
					continue;
				}
			}

			// Wilkinson shift
			const a = H[size - 2][size - 2];
			const b = H[size - 2][size - 1];
			const c = H[size - 1][size - 2];
			const d = H[size - 1][size - 1];
			const trace = a + d;
			const det = a * d - b * c;
			const discriminant = trace * trace - 4 * det;

			let shiftRe;
			if (discriminant >= 0) {
				const sqrtDisc = Math.sqrt(discriminant);
				const eig1 = (trace + sqrtDisc) / 2;
				const eig2 = (trace - sqrtDisc) / 2;
				// Choose eigenvalue closer to H[size-1][size-1]
				shiftRe = Math.abs(eig1 - d) < Math.abs(eig2 - d) ? eig1 : eig2;
			} else {
				shiftRe = d;
			}

			// Apply single-shift QR step
			// Shift
			for (let i = 0; i < size; i++) {
				H[i][i] -= shiftRe;
			}

			// QR decomposition via Givens rotations
			const cosines = [];
			const sines = [];
			for (let i = 0; i < size - 1; i++) {
				const x = H[i][i];
				const y = H[i + 1][i];
				const r = Math.sqrt(x * x + y * y);
				const cos = r === 0 ? 1 : x / r;
				const sin = r === 0 ? 0 : y / r;
				cosines.push(cos);
				sines.push(sin);

				// Apply Givens rotation to rows i and i+1
				for (let j = 0; j < size; j++) {
					const temp1 = cos * H[i][j] + sin * H[i + 1][j];
					const temp2 = -sin * H[i][j] + cos * H[i + 1][j];
					H[i][j] = temp1;
					H[i + 1][j] = temp2;
				}
			}

			// Apply Q^T from the right: H = R * Q
			for (let i = 0; i < size - 1; i++) {
				const cos = cosines[i];
				const sin = sines[i];
				for (let j = 0; j < size; j++) {
					const temp1 = H[j][i] * cos + H[j][i + 1] * sin;
					const temp2 = -H[j][i] * sin + H[j][i + 1] * cos;
					H[j][i] = temp1;
					H[j][i + 1] = temp2;
				}
			}

			// Unshift
			for (let i = 0; i < size; i++) {
				H[i][i] += shiftRe;
			}

			totalIterations++;
		}

		// If we ran out of iterations, extract remaining diagonal elements
		if (totalIterations >= maxIterations && size > 0) {
			for (let i = 0; i < size; i++) {
				eigenvalues.push({ re: H[i][i], im: 0 });
			}
		}

		return eigenvalues;
	}

	/**
	 * Reduce a matrix to upper Hessenberg form using Householder reflections.
	 * @param {number[][]} matrix - Square matrix (modified in place)
	 * @returns {number[][]} Upper Hessenberg matrix
	 */
	static toHessenberg(matrix) {
		const n = matrix.length;
		const H = matrix.map((row) => [...row]);

		for (let k = 0; k < n - 2; k++) {
			// Compute Householder vector for column k, rows k+1 to n-1
			let norm = 0;
			for (let i = k + 1; i < n; i++) {
				norm += H[i][k] * H[i][k];
			}
			norm = Math.sqrt(norm);

			if (norm === 0) continue;

			const sign = H[k + 1][k] >= 0 ? 1 : -1;
			const alpha = -sign * norm;
			const v = new Array(n).fill(0);
			v[k + 1] = H[k + 1][k] - alpha;
			for (let i = k + 2; i < n; i++) {
				v[i] = H[i][k];
			}

			// Normalize v
			let vNorm = 0;
			for (let i = k + 1; i < n; i++) {
				vNorm += v[i] * v[i];
			}
			vNorm = Math.sqrt(vNorm);
			if (vNorm === 0) continue;
			for (let i = k + 1; i < n; i++) {
				v[i] /= vNorm;
			}

			// Apply H = (I - 2vv^T) * H
			for (let j = 0; j < n; j++) {
				let dot = 0;
				for (let i = k + 1; i < n; i++) {
					dot += v[i] * H[i][j];
				}
				dot *= 2;
				for (let i = k + 1; i < n; i++) {
					H[i][j] -= dot * v[i];
				}
			}

			// Apply H = H * (I - 2vv^T)
			for (let i = 0; i < n; i++) {
				let dot = 0;
				for (let j = k + 1; j < n; j++) {
					dot += H[i][j] * v[j];
				}
				dot *= 2;
				for (let j = k + 1; j < n; j++) {
					H[i][j] -= dot * v[j];
				}
			}
		}

		return H;
	}

	/**
	 * Convert analog prototype poles to digital biquad coefficients
	 * using bilinear transform with frequency pre-warping.
	 * @param {Array<{ re: number, im: number }>} poles - Analog prototype poles
	 * @param {string} filterType - "lowPass", "highPass", or "bandpass"
	 * @param {number} turnFrequency - Turn frequency in Hz
	 * @param {number} dspRate - Sample rate in Hz
	 * @returns {Array<{ b0: number, b1: number, b2: number, a1: number, a2: number }>} Digital biquad coefficients
	 */
	static convertPolesToBiquads(poles, filterType, turnFrequency, dspRate) {
		// Separate poles into conjugate pairs and real poles
		const { pairs, realPoles } = FilterCoefficientCalculator.groupPoles(poles);

		const sections = [];
		const K = Math.tan((Math.PI * turnFrequency) / dspRate);

		if (filterType === 'bandpass') {
			// For bandpass, each 2nd-order LP section becomes two biquads (4th order)
			// and each 1st-order section becomes one 2nd-order biquad
			for (const pair of pairs) {
				const bpSections = FilterCoefficientCalculator.convertPairToBandpass(pair, K);
				sections.push(...bpSections);
			}
			for (const realPole of realPoles) {
				const bpSection = FilterCoefficientCalculator.convertRealPoleToBandpass(realPole, K);
				sections.push(bpSection);
			}
		} else {
			// Low-pass or high-pass
			for (const pair of pairs) {
				const section = filterType === 'lowPass'
					? FilterCoefficientCalculator.convertPairToLowPass(pair, K)
					: FilterCoefficientCalculator.convertPairToHighPass(pair, K);
				sections.push(section);
			}
			for (const realPole of realPoles) {
				const section = filterType === 'lowPass'
					? FilterCoefficientCalculator.convertRealPoleToLowPass(realPole, K)
					: FilterCoefficientCalculator.convertRealPoleToHighPass(realPole, K);
				sections.push(section);
			}
		}

		// NaN/Infinity protection
		return sections.map((section) => {
			if (
				!Number.isFinite(section.b0)
				|| !Number.isFinite(section.b1)
				|| !Number.isFinite(section.b2)
				|| !Number.isFinite(section.a1)
				|| !Number.isFinite(section.a2)
			) {
				console.error('FilterCoefficientCalculator: NaN/Infinity detected in coefficients. Returning unity section.');
				return {
					b0: 1, b1: 0, b2: 0, a1: 0, a2: 0,
				};
			}
			return section;
		});
	}

	/**
	 * Group poles into conjugate pairs and isolated real poles.
	 * Duplicate real poles are paired into 2nd-order sections (im=0).
	 * @param {Array<{ re: number, im: number }>} poles
	 * @returns {{ pairs: Array<{ re: number, im: number }>, realPoles: Array<number> }}
	 */
	static groupPoles(poles) {
		const pairs = [];
		const collectedRealPoles = [];
		const used = new Array(poles.length).fill(false);

		for (let i = 0; i < poles.length; i++) {
			if (used[i]) continue;

			const pole = poles[i];

			// Check if this is essentially a real pole
			if (Math.abs(pole.im) < 1e-10) {
				collectedRealPoles.push(pole.re);
				used[i] = true;
				continue;
			}

			// Find its conjugate pair
			let foundConjugate = false;
			for (let j = i + 1; j < poles.length; j++) {
				if (used[j]) continue;
				if (
					Math.abs(poles[j].re - pole.re) < 1e-10
					&& Math.abs(poles[j].im + pole.im) < 1e-10
				) {
					// Found conjugate pair — use the one with positive imaginary part
					const posIm = pole.im > 0 ? pole : poles[j];
					pairs.push({ re: posIm.re, im: Math.abs(posIm.im) });
					used[i] = true;
					used[j] = true;
					foundConjugate = true;
					break;
				}
			}

			if (!foundConjugate) {
				// Treat as a pair with its own conjugate (im > 0 assumed)
				pairs.push({ re: pole.re, im: Math.abs(pole.im) });
				used[i] = true;
			}
		}

		// Pair up duplicate real poles into 2nd-order sections
		// Sort real poles so duplicates are adjacent
		collectedRealPoles.sort((a, b) => a - b);
		const realPoles = [];
		let idx = 0;
		while (idx < collectedRealPoles.length) {
			if (idx + 1 < collectedRealPoles.length
				&& Math.abs(collectedRealPoles[idx] - collectedRealPoles[idx + 1]) < 1e-10) {
				// Pair two identical real poles into a 2nd-order section with im=0
				pairs.push({ re: collectedRealPoles[idx], im: 0 });
				idx += 2;
			} else {
				// Isolated real pole — remains as 1st-order section
				realPoles.push(collectedRealPoles[idx]);
				idx += 1;
			}
		}

		return { pairs, realPoles };
	}

	/**
	 * Convert a conjugate pole pair to a low-pass biquad section.
	 * Analog prototype section: H(s) = 1 / (s² - 2σs + (σ² + ω²))
	 * where pole = σ ± jω (σ is negative for stable poles).
	 *
	 * Using bilinear transform with pre-warping K = tan(π×fc/fs):
	 * @param {{ re: number, im: number }} pair - Pole with positive imaginary part (re < 0)
	 * @param {number} K - Pre-warping constant tan(π×fc/fs)
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertPairToLowPass(pair, K) {
		// pole = σ ± jω where σ < 0 (left half-plane)
		// For the analog prototype normalized to unit circle:
		// The 2nd-order section denominator is: s² - 2σs + (σ² + ω²)
		// where σ = pair.re (negative) and ω = pair.im (positive)
		const sigma = pair.re; // negative
		const omega = pair.im; // positive

		// Analog section natural frequency and Q
		const omegaN2 = sigma * sigma + omega * omega; // ω_n² = σ² + ω²

		// Pre-warped poles
		const sigmaW = sigma * K;
		const omegaW = omega * K;

		// For LP bilinear transform:
		// Denominator after transform: (1 - 2σ_w + (σ_w² + ω_w²)) + (2(σ_w² + ω_w²) - 2)z^-1 + (1 + 2σ_w + (σ_w² + ω_w²))z^-2
		// Note: σ is negative, so -2σ_w is positive (adds damping)
		const omegaW2 = sigmaW * sigmaW + omegaW * omegaW;

		const a0 = 1 - 2 * sigmaW + omegaW2;
		const a1Unnorm = 2 * omegaW2 - 2;
		const a2Unnorm = 1 + 2 * sigmaW + omegaW2;

		// Numerator for LP: K² × ω_n² × (1 + 2z^-1 + z^-2)
		const K2 = K * K;
		const numeratorGain = K2 * omegaN2;

		const b0 = numeratorGain / a0;
		const b1 = (2 * numeratorGain) / a0;
		const b2 = numeratorGain / a0;
		const a1 = a1Unnorm / a0;
		const a2 = a2Unnorm / a0;

		return {
			b0, b1, b2, a1, a2,
		};
	}

	/**
	 * Convert a conjugate pole pair to a high-pass biquad section.
	 * @param {{ re: number, im: number }} pair - Pole with positive imaginary part
	 * @param {number} K - Pre-warping constant
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertPairToHighPass(pair, K) {
		const sigma = pair.re;
		const omega = pair.im;
		const omegaN2 = sigma * sigma + omega * omega;

		const sigmaW = sigma * K;
		const omegaW = omega * K;
		const omegaW2 = sigmaW * sigmaW + omegaW * omegaW;

		const a0 = 1 - 2 * sigmaW + omegaW2;
		const a1Unnorm = 2 * omegaW2 - 2;
		const a2Unnorm = 1 + 2 * sigmaW + omegaW2;

		// Numerator for HP: ω_n² × (1 - 2z^-1 + z^-2)
		const numeratorGain = omegaN2;

		const b0 = numeratorGain / a0;
		const b1 = (-2 * numeratorGain) / a0;
		const b2 = numeratorGain / a0;
		const a1 = a1Unnorm / a0;
		const a2 = a2Unnorm / a0;

		return {
			b0, b1, b2, a1, a2,
		};
	}

	/**
	 * Convert a real pole to a low-pass first-order section.
	 * @param {number} poleReal - Real pole value (negative for stable)
	 * @param {number} K - Pre-warping constant
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertRealPoleToLowPass(poleReal, K) {
		// pole at s = p (p is negative)
		// Analog section: H(s) = -p / (s - p) = |p| / (s + |p|)
		const p = Math.abs(poleReal); // positive magnitude
		const pW = p * K;

		const a0 = 1 + pW;
		const b0 = pW / a0;
		const b1 = pW / a0;
		const b2 = 0;
		const a1 = (pW - 1) / a0;
		const a2 = 0;

		return {
			b0, b1, b2, a1, a2,
		};
	}

	/**
	 * Convert a real pole to a high-pass first-order section.
	 * @param {number} poleReal - Real pole value (negative for stable)
	 * @param {number} K - Pre-warping constant
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertRealPoleToHighPass(poleReal, K) {
		const p = Math.abs(poleReal);
		const pW = p * K;

		const a0 = 1 + pW;
		const b0 = p / a0;
		const b1 = -p / a0;
		const b2 = 0;
		const a1 = (pW - 1) / a0;
		const a2 = 0;

		return {
			b0, b1, b2, a1, a2,
		};
	}

	/**
	 * Convert a conjugate pole pair to bandpass biquad sections.
	 * LP-to-BP transform doubles the order: each 2nd-order LP section becomes
	 * two 2nd-order BP sections.
	 * @param {{ re: number, im: number }} pair - Pole pair
	 * @param {number} K - Pre-warping constant (K = tan(π×fc/fs))
	 * @returns {Array<{ b0: number, b1: number, b2: number, a1: number, a2: number }>}
	 */
	static convertPairToBandpass(pair, K) {
		// For bandpass, we use the LP-to-BP frequency transformation
		// s_lp → (s² + ω₀²) / (s × BW)
		// For a normalized prototype with ω₀ = 1 and BW = 1:
		// Each conjugate pair in LP becomes two pairs in BP

		const sigma = pair.re; // negative
		const omega = pair.im; // positive
		const omegaN2 = sigma * sigma + omega * omega;

		// For the bandpass transform, we compute two biquad sections
		// using the standard approach: compute the BP biquad directly
		// from the analog prototype pole pair

		// Method: Use the analog BP prototype poles and apply bilinear transform
		// The LP pole pair at s = σ ± jω maps to BP poles via:
		// s_bp = (σ/2) ± j×sqrt(1 - (σ/(2Q))²) for the two resulting pairs

		// Simpler approach: compute the 2nd-order LP section's transfer function
		// parameters, then use the standard LP-to-BP biquad conversion

		// Standard LP-to-BP for a 2nd-order section with Q and ω_n:
		// Results in two cascaded biquads

		// First biquad: bandpass section derived from the pole pair
		// Using direct bilinear transform of the analog BP prototype
		// H_bp(s) = (s/Q_bp) / (s² + (ω₀/Q_bp)s + ω₀²)

		// For each LP 2nd-order section, the BP equivalent has:
		// Center frequency at K (pre-warped turn frequency)
		// The two resulting digital biquads

		// Use the approach: compute analog BP poles from LP poles
		// LP pole: p = σ + jω
		// BP transform: s_bp = p/2 ± sqrt((p/2)² - 1) [normalized]
		// This gives two complex pole pairs for the BP filter

		const pReal = sigma;
		const pImag = omega;

		// Compute p² = (σ + jω)² = σ² - ω² + j×2σω
		const p2Real = pReal * pReal - pImag * pImag;
		const p2Imag = 2 * pReal * pImag;

		// Compute p²/4
		const halfP2Real = p2Real / 4;
		const halfP2Imag = p2Imag / 4;

		// Compute p²/4 - 1 (for normalized BP)
		// Actually for our case: p/2 ± sqrt((p/2)² - ω₀²)
		// With ω₀ = 1 (normalized): sqrt(p²/4 - 1)
		const discReal = halfP2Real - omegaN2;
		const discImag = halfP2Imag;

		// Complex square root of discriminant
		const discMag = Math.sqrt(discReal * discReal + discImag * discImag);
		const discAngle = Math.atan2(discImag, discReal);
		const sqrtDiscMag = Math.sqrt(discMag);
		const sqrtDiscReal = sqrtDiscMag * Math.cos(discAngle / 2);
		const sqrtDiscImag = sqrtDiscMag * Math.sin(discAngle / 2);

		// Two BP poles: p/2 ± sqrt(disc)
		const halfPReal = pReal / 2;
		const halfPImag = pImag / 2;

		const bp1Real = halfPReal + sqrtDiscReal;
		const bp1Imag = halfPImag + sqrtDiscImag;
		const bp2Real = halfPReal - sqrtDiscReal;
		const bp2Imag = halfPImag - sqrtDiscImag;

		// Convert each BP pole pair to a biquad using bilinear transform
		// Each BP pole at s = a + jb (with conjugate at a - jb) gives a 2nd-order section
		const section1 = FilterCoefficientCalculator.convertBPPolePairToBiquad(bp1Real, Math.abs(bp1Imag), K, omegaN2);
		const section2 = FilterCoefficientCalculator.convertBPPolePairToBiquad(bp2Real, Math.abs(bp2Imag), K, omegaN2);

		return [section1, section2];
	}

	/**
	 * Convert a single bandpass pole pair to a biquad via bilinear transform.
	 * @param {number} poleReal - Real part of BP pole (negative for stable)
	 * @param {number} poleImag - Imaginary part (positive)
	 * @param {number} K - Pre-warping constant
	 * @param {number} omegaN2 - Natural frequency squared of original LP section
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertBPPolePairToBiquad(poleReal, poleImag, K, omegaN2) {
		// Apply bilinear transform to the analog BP section
		// The analog section has poles at poleReal ± j×poleImag
		// Denominator: s² - 2×poleReal×s + (poleReal² + poleImag²)

		const sigma = poleReal; // negative for stable
		const omega = poleImag;

		const sigmaW = sigma * K;
		const omegaW = omega * K;
		const omegaW2 = sigmaW * sigmaW + omegaW * omegaW;

		const a0 = 1 - 2 * sigmaW + omegaW2;
		const a1Unnorm = 2 * omegaW2 - 2;
		const a2Unnorm = 1 + 2 * sigmaW + omegaW2;

		// For bandpass numerator: K × (1 - z^-2) scaled by appropriate gain
		// The BP numerator is s (for a single bandpass section)
		// After bilinear: s → (1/K)(1-z^-1)/(1+z^-1)
		// Numerator becomes: (1/K)(1-z^-1)/(1+z^-1) × gain
		// For the full section: numerator = K × (1 - z^-2) after simplification

		const numeratorGain = K * Math.sqrt(omegaN2);

		const b0 = numeratorGain / a0;
		const b1 = 0;
		const b2 = -numeratorGain / a0;
		const a1 = a1Unnorm / a0;
		const a2 = a2Unnorm / a0;

		return {
			b0, b1, b2, a1, a2,
		};
	}

	/**
	 * Convert a real pole to a bandpass biquad section.
	 * A 1st-order LP section becomes a 2nd-order BP section.
	 * @param {number} poleReal - Real pole value (negative)
	 * @param {number} K - Pre-warping constant
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
	 */
	static convertRealPoleToBandpass(poleReal, K) {
		// For a real LP pole at s = p (negative), the BP transform gives
		// a 2nd-order section. The LP section H(s) = |p| / (s + |p|)
		// becomes a BP section centered at the turn frequency.

		const p = Math.abs(poleReal);
		const pW = p * K;

		// BP section from real pole: H(s) = (s×p) / (s² + p×s + 1) [normalized]
		// After bilinear transform:
		const a0 = 1 + pW + K * K;
		const a1Unnorm = 2 * (K * K - 1);
		const a2Unnorm = 1 - pW + K * K;

		const numeratorGain = pW;

		const b0 = numeratorGain / a0;
		const b1 = 0;
		const b2 = -numeratorGain / a0;
		const a1 = a1Unnorm / a0;
		const a2 = a2Unnorm / a0;

		return {
			b0, b1, b2, a1, a2,
		};
	}
}
