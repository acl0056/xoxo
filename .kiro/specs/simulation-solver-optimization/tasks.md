# Implementation Plan: Simulation Solver Optimization

## Overview

Replace the mathjs-based matrix operations in `CircuitSolver` with a custom complex LU decomposition solver on flat `Float64Array` buffers. The implementation follows an incremental approach: first create the standalone solver module, then refactor `CircuitSolver` to use it, then verify correctness and performance against the golden reference.

## Tasks

- [x] 1. Create the ComplexLUSolver module
  - [x] 1.1 Implement `complexLUSolve(n, Are, Aim, bre, bim)` in `src/simulation/ComplexLUSolver.js`
    - Port the prototype LU solver from `temporary-test.js` into a proper ES module
    - Implement LU factorization with partial pivoting on flat `Float64Array` buffers in row-major order
    - Modify `Are` and `Aim` in place during factorization to avoid intermediate allocations
    - Throw an `Error` with descriptive message (including matrix dimension and pivot index) when pivot magnitude falls below 1e-12
    - Return `{ xre: Float64Array, xim: Float64Array }` as newly allocated solution vectors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Implement `formatComplexMatrix(n, Are, Aim)` and `formatComplexVector(n, bre, bim)` in the same module
    - Format flat typed array complex matrices and vectors as human-readable strings
    - Each element should show both real and imaginary parts
    - _Requirements: 10.1, 10.2_

  - [ ]* 1.3 Write unit tests for ComplexLUSolver in `tests/unit/ComplexLUSolver.spec.js`
    - Test known 2×2 and 3×3 systems with hand-computed solutions
    - Test singular matrix detection (zero row, duplicate rows)
    - Test identity matrix solve (x should equal b)
    - Test real-only matrix (imaginary parts all zero)
    - Test purely imaginary matrix
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ]* 1.4 Write property test: Solver Round-Trip (Property 1)
    - **Property 1: Solver Round-Trip (A × x ≈ b)**
    - **Validates: Requirements 1.6, 10.3**
    - Generate random n (1–64), random non-singular n×n complex matrices, random b vectors using fast-check
    - Snapshot A before calling `complexLUSolve` (since it modifies in place)
    - Compute A·x using the snapshot and assert each element of (A·x - b) has magnitude < 1e-10

  - [ ]* 1.5 Write property test: Pretty Printer Completeness (Property 3)
    - **Property 3: Pretty Printer Completeness**
    - **Validates: Requirements 10.1, 10.2**
    - Generate random n (1–16), random complex matrices and vectors using fast-check
    - Call `formatComplexMatrix` / `formatComplexVector`
    - Assert the output string contains a numeric representation of every element's real and imaginary parts

- [x] 2. Checkpoint - Verify ComplexLUSolver module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Refactor CircuitSolver to use flat typed arrays
  - [x] 3.1 Refactor `buildMNAMatrix` to accept and fill pre-allocated `Float64Array` buffers
    - Change signature to `buildMNAMatrix(frequency, Are, Aim, bre, bim)`
    - Zero the buffers with `.fill(0)` at the start
    - Replace all `math.zeros()`, `math.index()`, `math.subset()`, `math.add()`, `math.subtract()`, `math.complex()` calls with direct array index arithmetic (`Are[i * n + j] += value`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Refactor `addPassiveComponent` to stamp directly into typed array buffers
    - Change signature to `addPassiveComponent(Are, Aim, admittanceRe, admittanceIm, n1, n2, n)`
    - Replace mathjs matrix operations with direct `Are[n1 * n + n1] += admittanceRe` style arithmetic
    - _Requirements: 2.2_

  - [x] 3.3 Refactor `addVoltageSource` to stamp directly into typed array buffers
    - Change signature to `addVoltageSource(Are, Aim, bre, bim, component, n1, n2, n)`
    - Replace `math.subset()` and `math.complex()` calls with direct array assignment
    - _Requirements: 2.4_

  - [x] 3.4 Refactor `solve` to use `complexLUSolve` instead of `math.lusolve`
    - Change signature to `solve(frequency, Are, Aim, bre, bim, profiler)`
    - Call `complexLUSolve(this.matrixSize, Are, Aim, bre, bim)` instead of `math.lusolve(A, b)`
    - Extract node voltages and source currents directly from `xre[index]` and `xim[index]` instead of `math.index()` / `math.subset()`
    - Remove per-frequency schema validation (identified as unnecessary overhead)
    - Preserve profiler `startStage`/`endStage` calls
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.5 Refactor `solveAllFrequencies` to pre-allocate and reuse buffers
    - Pre-allocate `Are`, `Aim`, `bre`, `bim` once after `buildNodeMap()`
    - Pass buffers to `solve()` in the frequency loop (buffers are zeroed and refilled each iteration inside `buildMNAMatrix`)
    - Keep the same public signature `solveAllFrequencies(startFrequency, endFrequency, pointsPerDecade, profiler)`
    - Continue returning `{ frequencies, componentVoltages, sourceCurrents }` with `complex.js` Complex objects
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 3.6 Remove mathjs imports from CircuitSolver.js
    - Remove `import { create, all } from 'mathjs'` and `const math = create(all)`
    - Add `import { complexLUSolve } from './ComplexLUSolver'`
    - Verify `complex.js` import is retained for result construction
    - Preserve `interpolateZMA` export
    - _Requirements: 9.1, 9.2_

- [x] 4. Checkpoint - Verify refactored CircuitSolver
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update existing tests and add integration verification
  - [x] 5.1 Update `CircuitSolver.spec.js` to work with the refactored solver
    - The `solve()` method signature changed — update tests that call `solve()` directly to pass typed array buffers, or test through `solveAllFrequencies` instead
    - Verify `nodeVoltages` is now a plain object (not a Map) — update assertions from `.size` to `Object.keys().length` if the refactored code changes the return type
    - Ensure all existing test scenarios still pass
    - _Requirements: 8.4_

  - [ ]* 5.2 Write property test: Result Format Preservation (Property 2)
    - **Property 2: Result Format Preservation**
    - **Validates: Requirements 5.1, 5.2**
    - Generate simple circuits (voltage source + resistor + ground with random resistance values) using fast-check
    - Call `solveAllFrequencies` with a small frequency range
    - Assert return has `frequencies` (number[]), `componentVoltages` (object with Complex[]), `sourceCurrents` (object with Complex[])
    - Assert all Complex arrays have same length as frequencies array
    - Assert each element is a `complex.js` Complex instance (has `.re`, `.im` properties and `.abs()` method)

  - [x] 5.3 Add static no-mathjs verification test
    - Read `src/simulation/CircuitSolver.js` source and assert it does not contain `import.*mathjs` or `require.*mathjs`
    - Add as a test case in `ComplexLUSolver.spec.js` or a dedicated test file
    - _Requirements: 9.1_

- [x] 6. Checkpoint - Run full test suite and golden reference verification
  - Run `npm test` to verify no regressions across the entire test suite
  - Run the existing preservation property tests (`simulation-performance.preservation.property.spec.js`) to verify golden reference match
  - Run the existing exploration property test (`simulation-performance.exploration.property.spec.js`) to verify pipeline completes under 80ms
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 8.1, 8.2, 8.3, 8.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The prototype LU solver in `temporary-test.js` serves as the reference implementation for task 1.1
- Existing preservation and exploration tests from the `simulation-performance` spec serve as integration tests — no new integration test files needed
- The benchmark script at `benchmarks/simulation-benchmark.js` can be used for additional performance verification
