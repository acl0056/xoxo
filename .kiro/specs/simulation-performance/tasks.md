# Implementation Plan

- [x] 1. Write bug condition exploration test (BEFORE implementing any changes)
  - **Property 1: Bug Condition** — Pipeline Execution Time >80ms
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the performance bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after optimization
  - **GOAL**: Surface counterexamples that demonstrate the pipeline exceeds the 80ms target
  - **Scoped PBT Approach**: Scope the property to the vivace 1_0_3.json circuit (the concrete failing case)
  - Test file: `tests/unit/simulation-performance.exploration.property.spec.js`
  - Load `research/dxo-files/vivace 1_0_3.json`, construct Circuit via `Circuit.fromJSON()`
  - Run the full pipeline: `CircuitSolver.solveAllFrequencies(1, 100000, 50)` → `FrequencyAnalyzer.calculateSystemResponse()` + `calculateImpedance()`
  - Measure execution time with `performance.now()`
  - Assert total pipeline time < 80ms (from Bug Condition: `isBugCondition(input) → totalTime > 80ms`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (~1400ms >> 80ms target — this confirms the bug exists)
  - Document the measured time as the counterexample (e.g., "pipeline took 1400ms, target is 80ms")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing any changes)
  - **Property 2: Preservation** — Simulation Output Numerical Equivalence
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `tests/unit/simulation-performance.preservation.property.spec.js`
  - **Capture golden reference**: Load vivace circuit, run the full pipeline on UNFIXED code, save the complete output (frequency response SPL/phase per speaker, combined system response, impedance magnitude/phase) to `benchmarks/golden-reference.json`
  - **Frequency response preservation**: For all frequency points and all speakers, assert SPL matches golden reference within ±0.01 dB and phase within ±0.1°
  - **System response preservation**: For all frequency points, assert combined SPL within ±0.01 dB and phase within ±0.1°
  - **Impedance preservation**: For all frequency points, assert impedance magnitude within ±0.01 Ω and phase within ±0.1°
  - **Frequency point preservation**: Assert the number and values of frequency points are identical
  - Tolerance constants: `SPL_TOLERANCE_DB = 0.01`, `PHASE_TOLERANCE_DEG = 0.1`, `IMPEDANCE_TOLERANCE_OHM = 0.01`
  - Run tests on UNFIXED code (comparing output against itself — should trivially pass)
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior captured correctly)
  - Mark task complete when golden reference is captured, tests are written, run, and passing on unfixed code
  - _Requirements: 2.2, 3.1, 3.2, 3.5_

- [x] 3. Phase 1 — Diagnostic instrumentation and benchmark setup

  - [x] 3.1 Create `SimulationProfiler` class
    - New file: `src/simulation/SimulationProfiler.js`
    - Implement `startStage(name)` / `endStage(name)` methods using `performance.now()`
    - Support hierarchical/nested stages for drill-down profiling (Level 2+ added later)
    - Level 1 (coarse) stages: `buildNodeMap`, `buildMNAMatrix`, `lusolve`, `extractResults`, `calculateSystemResponse`, `calculateImpedance`, `jsonSerialization`, `schemaValidation`
    - Implement `report()` method returning per-stage durations, call counts, and average time per call
    - Profiler is optional — when absent, no timing overhead is added to pipeline functions
    - _Requirements: 1.1_

  - [x] 3.2 Integrate Level 1 profiling into `CircuitSolver`
    - Accept optional `profiler` parameter in `solveAllFrequencies()`
    - Wrap `buildNodeMap()` call with `profiler.startStage('buildNodeMap')` / `profiler.endStage('buildNodeMap')`
    - Inside the per-frequency loop, wrap `buildMNAMatrix()`, `math.lusolve()`, and result extraction with profiler calls
    - Accumulate totals across all ~250 frequency iterations
    - No behavioral changes — profiler is purely additive instrumentation
    - _Requirements: 1.1_

  - [x] 3.3 Integrate Level 1 profiling into `FrequencyAnalyzer`
    - Accept optional `profiler` parameter in `calculateSystemResponse()` and `calculateImpedance()`
    - Wrap each method body with profiler stage calls
    - No behavioral changes
    - _Requirements: 1.1_

- [x] 4. Phase 2 — Standalone benchmark script and golden reference capture

  - [x] 4.1 Create benchmark script
    - New file: `benchmarks/simulation-benchmark.js`
    - Load `research/dxo-files/vivace 1_0_3.json` and construct Circuit via `Circuit.fromJSON()`
    - Run full pipeline with `SimulationProfiler` enabled: `solveAllFrequencies(1, 100000, 50)` → `calculateSystemResponse()` + `calculateImpedance()` → JSON serialization → schema validation
    - Warm-up run (1 iteration to JIT), then 5 timed iterations reporting median
    - Print per-stage breakdown and total time to stdout
    - Must run under plain Node.js without Electron
    - _Requirements: 1.1, 2.1_

  - [x] 4.2 Add `--capture` mode to save golden reference
    - When run with `--capture` flag, save the full simulation output to `benchmarks/golden-reference.json`
    - Include: frequency array, per-speaker SPL/phase arrays, combined system SPL/phase, impedance magnitude/phase
    - Run this BEFORE any optimizations to establish the correctness baseline
    - _Requirements: 2.2, 3.1, 3.2_

  - [x] 4.3 Add `--verify` mode for golden reference comparison
    - When run with `--verify` flag, load `benchmarks/golden-reference.json` and compare current output element-by-element
    - Tolerance: ±0.01 dB SPL, ±0.1° phase, ±0.01 Ω impedance
    - Print PASS/FAIL per category (frequency response, system response, impedance) with max deviation found
    - Exit code 0 on pass, 1 on fail
    - _Requirements: 2.2, 3.1, 3.2_

  - [x] 4.4 Run benchmark and capture baseline profiling data
    - Execute `node benchmarks/simulation-benchmark.js` to get Level 1 per-stage timing
    - Execute `node benchmarks/simulation-benchmark.js --capture` to save golden reference
    - Document the per-stage breakdown (which stages account for >80% of time)
    - This establishes the baseline for optimization decisions
    - _Requirements: 1.1_

- [x] 5. Phase 3 — Interactive optimization (DECISION POINT)
  - ⚠️ **STOP HERE AND REVIEW WITH USER** — Do not proceed without discussion
  - Review the profiling data from task 4.4 together
  - Identify the dominant bottleneck(s) from the per-stage breakdown
  - If needed, add Level 2 (finer-grained) instrumentation to the identified bottleneck stages and re-run the benchmark to drill down further
  - Decide together which optimization approach to pursue based on measured data:
    - In-place JS optimizations (typed arrays, pre-allocation, binary search, removing per-frequency validation)
    - Dependency replacement (swap mathjs/complex.js for lighter alternatives)
    - Native modules (C++/Rust addon for the hot path)
    - Algorithmic changes (sparse solvers, symbolic factorization reuse)
    - WebAssembly (compile solver to WASM)
    - Or a combination of approaches
  - **Optimization implementation tasks will be added here after the decision is made**
  - _Requirements: 2.1_

- [ ] 6. Verification and cleanup

  - [ ] 6.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Pipeline Execution Time <80ms
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (pipeline < 80ms)
    - When this test passes, it confirms the performance target is met
    - Run `npm test -- simulation-performance.exploration.property.spec.js`
    - **EXPECTED OUTCOME**: Test PASSES (confirms pipeline is now under 80ms)
    - _Requirements: 2.1_

  - [ ] 6.2 Verify preservation tests still pass
    - **Property 2: Preservation** — Simulation Output Numerical Equivalence
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npm test -- simulation-performance.preservation.property.spec.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no numerical regressions)
    - Confirm all outputs match golden reference within tolerance
    - _Requirements: 2.2, 3.1, 3.2_

  - [ ] 6.3 Run golden reference verification via benchmark
    - Run `node benchmarks/simulation-benchmark.js --verify`
    - Confirm all categories pass (frequency response, system response, impedance)
    - _Requirements: 2.2, 3.1, 3.2_

  - [ ] 6.4 Remove profiler integration from production code paths
    - Remove optional `profiler` parameter wiring from `CircuitSolver` and `FrequencyAnalyzer`
    - Keep `SimulationProfiler.js` class file for future use
    - Keep `benchmarks/` directory (benchmark script + golden reference) for regression testing
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure all existing tests still pass (no regressions)
  - Ensure exploration test (task 1) now passes
  - Ensure preservation tests (task 2) still pass
  - Ensure `node benchmarks/simulation-benchmark.js --verify` passes
  - Ask the user if questions arise
