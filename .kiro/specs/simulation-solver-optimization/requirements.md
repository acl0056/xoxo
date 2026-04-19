# Requirements Document

## Introduction

The crossover network simulation pipeline currently takes ~924ms on the vivace 3-way crossover circuit (32×32 MNA matrix, 251 frequency points). Profiling from the parent `simulation-performance` spec identified two dominant bottlenecks: `math.lusolve()` at 817ms (88.4%) and `buildMNAMatrix` at 64ms (6.9%). A prototype custom LU solver on flat `Float64Array` buffers achieved 14.3ms for all 251 solves (57× faster than mathjs). This feature replaces the mathjs matrix operations in `CircuitSolver` with a custom complex LU decomposition solver operating on flat typed arrays, and refactors matrix construction to use direct typed array stamping, targeting a full pipeline time under 80ms.

## Glossary

- **Circuit_Solver**: The `CircuitSolver` class (`src/simulation/CircuitSolver.js`) that implements Modified Nodal Analysis (MNA) for AC circuit simulation, solving the circuit at multiple frequency points
- **Complex_LU_Solver**: The new standalone module (`src/simulation/ComplexLUSolver.js`) that performs complex LU decomposition with partial pivoting and forward/back substitution on flat `Float64Array` buffers
- **MNA_Matrix**: The Modified Nodal Analysis matrix — a complex-valued N×N matrix (plus RHS vector) built by `CircuitSolver.buildMNAMatrix()` and solved at each frequency point
- **Flat_Typed_Array**: A `Float64Array` storing matrix data in row-major order as a one-dimensional buffer, with element (i,j) accessed as `array[i * n + j]`
- **Frequency_Analyzer**: The `FrequencyAnalyzer` class (`src/simulation/FrequencyAnalyzer.js`) that consumes solver results to calculate SPL, phase, and impedance responses
- **Golden_Reference**: The captured simulation output at `benchmarks/golden-reference.json` used as the correctness baseline for numerical equivalence verification
- **Pipeline**: The full simulation execution path: `CircuitSolver.solveAllFrequencies()` → `FrequencyAnalyzer.calculateSystemResponse()` + `calculateImpedance()`
- **Vivace_Circuit**: The vivace 1_0_3.json 3-way crossover circuit (6 speakers, ~15 passive components, 32×32 MNA matrix, 251 frequency points at 50 points/decade from 1 Hz to 100 kHz) used as the performance benchmark

## Requirements

### Requirement 1: Complex LU Solver Module

**User Story:** As a developer, I want a standalone complex LU decomposition solver operating on flat Float64Arrays, so that the simulation can solve the MNA system without the overhead of mathjs generic matrix operations.

#### Acceptance Criteria

1. THE Complex_LU_Solver SHALL expose a `complexLUSolve(n, Are, Aim, bre, bim)` function that accepts the matrix dimension `n`, real and imaginary parts of the matrix as Flat_Typed_Arrays in row-major order, and real and imaginary parts of the right-hand side vector as Flat_Typed_Arrays
2. WHEN `complexLUSolve` is called with a valid non-singular complex matrix, THE Complex_LU_Solver SHALL return an object containing the solution vector's real part and imaginary part as Flat_Typed_Arrays of length `n`
3. THE Complex_LU_Solver SHALL implement LU factorization with partial pivoting to ensure numerical stability for the MNA matrices encountered in crossover circuit simulation
4. THE Complex_LU_Solver SHALL modify the input matrix arrays (`Are`, `Aim`) in place during factorization to avoid allocating intermediate buffers
5. IF the input matrix is singular or near-singular (pivot magnitude below 1e-12), THEN THE Complex_LU_Solver SHALL throw an Error with a descriptive message including the matrix dimension and pivot index
6. FOR ALL valid non-singular complex matrices of dimension `n`, solving then multiplying `A * x` SHALL produce a result equal to `b` within a tolerance of 1e-10 per element (round-trip property)

### Requirement 2: Typed Array Matrix Construction

**User Story:** As a developer, I want `buildMNAMatrix` to construct the MNA matrix directly into flat Float64Array buffers using index arithmetic, so that matrix construction avoids the overhead of mathjs `zeros()`, `index()`, `subset()`, `add()`, and `subtract()` calls.

#### Acceptance Criteria

1. WHEN `buildMNAMatrix` is called, THE Circuit_Solver SHALL construct the MNA matrix using pre-allocated `Float64Array(n * n)` buffers for real and imaginary parts instead of calling `math.zeros(n, n)`
2. WHEN `buildMNAMatrix` stamps component admittances into the matrix, THE Circuit_Solver SHALL use direct array index arithmetic (`array[i * n + j] += value`) instead of calling `math.index()`, `math.subset()`, `math.add()`, or `math.subtract()`
3. WHEN `buildMNAMatrix` constructs the right-hand side vector, THE Circuit_Solver SHALL use `Float64Array(n)` buffers for real and imaginary parts instead of calling `math.zeros(n, 1)`
4. WHEN `buildMNAMatrix` stamps voltage source entries, THE Circuit_Solver SHALL use direct array assignment (`array[i * n + j] = value`) instead of calling `math.subset()` with `math.complex()`
5. THE Circuit_Solver SHALL return the matrix and vector as plain objects containing the Flat_Typed_Array buffers (`{ Are, Aim, bre, bim }`) instead of mathjs matrix objects

### Requirement 3: Solver Integration

**User Story:** As a developer, I want `CircuitSolver.solve()` to use the custom Complex_LU_Solver instead of `math.lusolve()`, so that the per-frequency solve step runs in microseconds instead of milliseconds.

#### Acceptance Criteria

1. WHEN `solve` is called at a given frequency, THE Circuit_Solver SHALL call `complexLUSolve(n, Are, Aim, bre, bim)` instead of `math.lusolve(A, b)`
2. WHEN `solve` extracts node voltages from the solution vector, THE Circuit_Solver SHALL read values directly from the Flat_Typed_Array solution buffers using index arithmetic instead of calling `math.index()` and `math.subset()` on a mathjs matrix
3. WHEN `solve` extracts voltage source currents from the solution vector, THE Circuit_Solver SHALL read values directly from the Flat_Typed_Array solution buffers using index arithmetic

### Requirement 4: Buffer Pre-allocation and Reuse

**User Story:** As a developer, I want `solveAllFrequencies` to pre-allocate matrix buffers once and reuse them across all frequency iterations, so that the solver avoids allocating and discarding ~500 typed arrays (251 frequencies × 2 arrays per matrix) during a single simulation run.

#### Acceptance Criteria

1. WHEN `solveAllFrequencies` begins, THE Circuit_Solver SHALL pre-allocate the matrix buffers (`Are`, `Aim`, `bre`, `bim`) once based on the computed matrix size
2. WHILE iterating over frequency points, THE Circuit_Solver SHALL zero the pre-allocated buffers and refill them at each frequency instead of allocating new buffers
3. WHEN `solveAllFrequencies` completes, THE Circuit_Solver SHALL have allocated matrix buffers exactly once for the entire frequency sweep, regardless of the number of frequency points

### Requirement 5: Result Format Preservation

**User Story:** As a developer, I want the refactored solver to produce results in the same format consumed by FrequencyAnalyzer, so that no changes are required to downstream analysis code.

#### Acceptance Criteria

1. THE Circuit_Solver SHALL CONTINUE TO return results from `solveAllFrequencies` in the format `{ frequencies: number[], componentVoltages: { [componentId]: Complex[] }, sourceCurrents: { [sourceId]: Complex[] } }` where `Complex` objects are from the `complex.js` library
2. THE Circuit_Solver SHALL CONTINUE TO accept the same constructor signature `new CircuitSolver(circuit)` and the same `solveAllFrequencies(startFrequency, endFrequency, pointsPerDecade, profiler)` parameters
3. WHEN the Frequency_Analyzer consumes solver results, THE Frequency_Analyzer SHALL require zero code changes to produce correct frequency response and impedance output

### Requirement 6: Numerical Correctness

**User Story:** As a developer, I want the optimized simulation to produce numerically identical results to the pre-optimization output, so that correctness is preserved through the performance refactor.

#### Acceptance Criteria

1. FOR ALL frequency points in the Vivace_Circuit simulation, THE Pipeline SHALL produce per-speaker SPL values that match the Golden_Reference within ±0.01 dB
2. FOR ALL frequency points in the Vivace_Circuit simulation, THE Pipeline SHALL produce per-speaker phase values that match the Golden_Reference within ±0.1°
3. FOR ALL frequency points in the Vivace_Circuit simulation, THE Pipeline SHALL produce combined system response SPL values that match the Golden_Reference within ±0.01 dB and phase values within ±0.1°
4. FOR ALL frequency points in the Vivace_Circuit simulation, THE Pipeline SHALL produce impedance magnitude values that match the Golden_Reference within ±0.01 Ω and impedance phase values within ±0.1°
5. THE Pipeline SHALL produce the same number and values of frequency points as the Golden_Reference

### Requirement 7: Performance Target

**User Story:** As a developer, I want the full simulation pipeline to complete in under 80ms on the vivace 3-way crossover circuit, so that real-time parameter tuning feels responsive.

#### Acceptance Criteria

1. WHEN the Pipeline runs on the Vivace_Circuit (32×32 MNA matrix, 251 frequency points), THE Pipeline SHALL complete in under 80ms total wall-clock time
2. WHEN the Pipeline runs on the Vivace_Circuit, THE Complex_LU_Solver step (all 251 solves combined) SHALL complete in under 20ms
3. WHEN the Pipeline runs on the Vivace_Circuit, THE matrix construction step (`buildMNAMatrix` across all 251 frequencies) SHALL complete in under 30ms

### Requirement 8: Regression Prevention

**User Story:** As a developer, I want all existing simulation tests to continue passing after the refactor, so that no regressions are introduced.

#### Acceptance Criteria

1. WHEN the existing preservation property tests (`simulation-performance.preservation.property.spec.js`) are run against the refactored code, THE tests SHALL pass with all outputs matching the Golden_Reference within the defined tolerances
2. WHEN the existing exploration property test (`simulation-performance.exploration.property.spec.js`) is run against the refactored code, THE test SHALL pass (pipeline completes in under 80ms)
3. WHEN the golden reference verification benchmark (`node benchmarks/simulation-benchmark.js --verify`) is run against the refactored code, THE benchmark SHALL report PASS for all categories (frequency response, system response, impedance)
4. WHEN the full test suite (`npm test`) is run, THE test suite SHALL pass with no regressions in any existing tests

### Requirement 9: Dependency Scope

**User Story:** As a developer, I want mathjs removed from the CircuitSolver hot path while preserving it for any other uses in the project, so that the simulation module has minimal dependencies.

#### Acceptance Criteria

1. WHEN the refactored Circuit_Solver module is loaded, THE module SHALL NOT import or call any mathjs functions (`math.zeros`, `math.index`, `math.subset`, `math.add`, `math.subtract`, `math.complex`, `math.lusolve`)
2. THE Circuit_Solver SHALL CONTINUE TO use `complex.js` for constructing the `Complex` objects in the `solveAllFrequencies` return value (componentVoltages and sourceCurrents arrays)
3. IF mathjs is used elsewhere in the project outside of Circuit_Solver, THEN THE mathjs dependency SHALL remain in `package.json`

### Requirement 10: Complex LU Solver Pretty Printer and Round-Trip Verification

**User Story:** As a developer, I want a utility that formats flat typed array matrices and vectors into human-readable complex matrix notation, so that solver inputs and outputs can be inspected during debugging and verified via round-trip testing.

#### Acceptance Criteria

1. THE Complex_LU_Solver module SHALL expose a `formatComplexMatrix(n, Are, Aim)` function that returns a human-readable string representation of the n×n complex matrix stored in the Flat_Typed_Arrays
2. THE Complex_LU_Solver module SHALL expose a `formatComplexVector(n, bre, bim)` function that returns a human-readable string representation of the n-element complex vector stored in the Flat_Typed_Arrays
3. FOR ALL valid non-singular complex matrices of dimension n ≤ 64, solving `A * x = b` with `complexLUSolve` and then computing `A * x` SHALL produce a result within 1e-10 of the original `b` per element (round-trip property)
