/**
 * Complex LU Solver operating on flat Float64Array buffers.
 *
 * Solves complex-valued linear systems A*x = b using LU decomposition
 * with partial pivoting. Matrices are stored as two separate Float64Array
 * buffers (real and imaginary parts) in row-major order.
 *
 * Element (i, j) of an n×n matrix is at index [i * n + j].
 */

/**
 * Solve A*x = b for complex-valued A and b using LU decomposition with partial pivoting.
 * Operates on flat Float64Array buffers in row-major order.
 * Modifies Are and Aim in place during factorization.
 *
 * @param {number} n - Matrix dimension
 * @param {Float64Array} Are - Real part of n×n matrix, row-major (MODIFIED IN PLACE)
 * @param {Float64Array} Aim - Imaginary part of n×n matrix, row-major (MODIFIED IN PLACE)
 * @param {Float64Array} bre - Real part of RHS vector, length n
 * @param {Float64Array} bim - Imaginary part of RHS vector, length n
 * @returns {{ xre: Float64Array, xim: Float64Array }} Solution vector
 * @throws {Error} If matrix is singular (pivot magnitude < 1e-12)
 */
export function complexLUSolve(n, Are, Aim, bre, bim) {
	const pivotIndices = new Int32Array(n);
	for (let i = 0; i < n; i++) pivotIndices[i] = i;

	// LU factorization with partial pivoting
	for (let k = 0; k < n; k++) {
		// Find pivot: row with largest |A[i][k]| magnitude for i >= k
		let maxMagnitudeSquared = 0;
		let maxRow = k;
		for (let i = k; i < n; i++) {
			const index = i * n + k;
			const magnitudeSquared = Are[index] * Are[index] + Aim[index] * Aim[index];
			if (magnitudeSquared > maxMagnitudeSquared) {
				maxMagnitudeSquared = magnitudeSquared;
				maxRow = i;
			}
		}

		// Check for singular or near-singular pivot
		const pivotMagnitude = Math.sqrt(maxMagnitudeSquared);
		if (pivotMagnitude < 1e-12) {
			throw new Error(
				`Singular matrix (n=${n}): pivot at index ${k} has magnitude ${pivotMagnitude.toExponential(1)}`,
			);
		}

		// Swap rows k and maxRow in A and pivot array
		if (maxRow !== k) {
			const temporaryPivot = pivotIndices[k];
			pivotIndices[k] = pivotIndices[maxRow];
			pivotIndices[maxRow] = temporaryPivot;

			for (let j = 0; j < n; j++) {
				const indexK = k * n + j;
				const indexMax = maxRow * n + j;
				let temporaryValue = Are[indexK];
				Are[indexK] = Are[indexMax];
				Are[indexMax] = temporaryValue;
				temporaryValue = Aim[indexK];
				Aim[indexK] = Aim[indexMax];
				Aim[indexMax] = temporaryValue;
			}
		}

		// Compute multipliers and eliminate below the pivot
		const pivotIndex = k * n + k;
		const pivotReal = Are[pivotIndex];
		const pivotImaginary = Aim[pivotIndex];
		const pivotMagnitudeSquared = pivotReal * pivotReal + pivotImaginary * pivotImaginary;

		for (let i = k + 1; i < n; i++) {
			const eliminationIndex = i * n + k;

			// Multiplier = A[i][k] / A[k][k] (complex division)
			const numeratorReal = Are[eliminationIndex];
			const numeratorImaginary = Aim[eliminationIndex];
			const multiplierReal = (numeratorReal * pivotReal + numeratorImaginary * pivotImaginary) / pivotMagnitudeSquared;
			const multiplierImaginary = (numeratorImaginary * pivotReal - numeratorReal * pivotImaginary) / pivotMagnitudeSquared;

			// Store multiplier in lower triangle
			Are[eliminationIndex] = multiplierReal;
			Aim[eliminationIndex] = multiplierImaginary;

			// Eliminate: A[i][j] -= multiplier * A[k][j] for j > k
			for (let j = k + 1; j < n; j++) {
				const targetIndex = i * n + j;
				const sourceIndex = k * n + j;
				// Complex multiply: multiplier * A[k][j]
				Are[targetIndex] -= multiplierReal * Are[sourceIndex] - multiplierImaginary * Aim[sourceIndex];
				Aim[targetIndex] -= multiplierReal * Aim[sourceIndex] + multiplierImaginary * Are[sourceIndex];
			}
		}
	}

	// Apply pivot permutation to b: create permuted copy
	const permutedReal = new Float64Array(n);
	const permutedImaginary = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		permutedReal[i] = bre[pivotIndices[i]];
		permutedImaginary[i] = bim[pivotIndices[i]];
	}

	// Forward substitution (L * y = P * b)
	for (let i = 1; i < n; i++) {
		for (let j = 0; j < i; j++) {
			const lowerIndex = i * n + j;
			// y[i] -= L[i][j] * y[j]
			permutedReal[i] -= Are[lowerIndex] * permutedReal[j] - Aim[lowerIndex] * permutedImaginary[j];
			permutedImaginary[i] -= Are[lowerIndex] * permutedImaginary[j] + Aim[lowerIndex] * permutedReal[j];
		}
	}

	// Back substitution (U * x = y)
	for (let i = n - 1; i >= 0; i--) {
		for (let j = i + 1; j < n; j++) {
			const upperIndex = i * n + j;
			permutedReal[i] -= Are[upperIndex] * permutedReal[j] - Aim[upperIndex] * permutedImaginary[j];
			permutedImaginary[i] -= Are[upperIndex] * permutedImaginary[j] + Aim[upperIndex] * permutedReal[j];
		}

		// Divide by diagonal: x[i] = y[i] / U[i][i]
		const diagonalIndex = i * n + i;
		const diagonalReal = Are[diagonalIndex];
		const diagonalImaginary = Aim[diagonalIndex];
		const diagonalMagnitudeSquared = diagonalReal * diagonalReal + diagonalImaginary * diagonalImaginary;
		const solutionReal = (permutedReal[i] * diagonalReal + permutedImaginary[i] * diagonalImaginary) / diagonalMagnitudeSquared;
		const solutionImaginary = (permutedImaginary[i] * diagonalReal - permutedReal[i] * diagonalImaginary) / diagonalMagnitudeSquared;
		permutedReal[i] = solutionReal;
		permutedImaginary[i] = solutionImaginary;
	}

	return { xre: permutedReal, xim: permutedImaginary };
}

/**
 * Format a single complex number as a human-readable string.
 * Shows both real and imaginary parts (e.g., "3.14 + 2.72i" or "3.14 - 2.72i").
 *
 * @param {number} real - Real part
 * @param {number} imaginary - Imaginary part
 * @returns {string} Formatted complex number
 */
function formatComplexElement(real, imaginary) {
	if (imaginary >= 0) {
		return `${real} + ${imaginary}i`;
	}
	return `${real} - ${-imaginary}i`;
}

/**
 * Format a flat typed array complex matrix as a human-readable string.
 *
 * @param {number} n - Matrix dimension
 * @param {Float64Array} Are - Real part, row-major
 * @param {Float64Array} Aim - Imaginary part, row-major
 * @returns {string} Formatted matrix string with rows in brackets
 */
export function formatComplexMatrix(n, Are, Aim) {
	const rows = [];
	for (let i = 0; i < n; i++) {
		const elements = [];
		for (let j = 0; j < n; j++) {
			const index = i * n + j;
			elements.push(formatComplexElement(Are[index], Aim[index]));
		}
		rows.push(`[ ${elements.join(',  ')} ]`);
	}
	return rows.join('\n');
}

/**
 * Format a flat typed array complex vector as a human-readable string.
 *
 * @param {number} n - Vector length
 * @param {Float64Array} bre - Real part
 * @param {Float64Array} bim - Imaginary part
 * @returns {string} Formatted vector string with elements in brackets
 */
export function formatComplexVector(n, bre, bim) {
	const elements = [];
	for (let i = 0; i < n; i++) {
		elements.push(`[ ${formatComplexElement(bre[i], bim[i])} ]`);
	}
	return elements.join('\n');
}
