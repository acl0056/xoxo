# Simulation Performance Bugfix Design

## Overview

The crossover network simulation pipeline takes ~1400ms on a real 3-way crossover circuit (vivace 1_0_3.json — 6 speakers, 3 connected + 3 disconnected reference speakers, ~250 frequency points at 50 points/decade from 1 Hz to 100 kHz). The target is under 80ms. Previous ad-hoc optimization attempts broke correctness, so this spec takes a structured, instrumentation-first approach:

1. **Diagnose**: Add reusable `performance.now()` instrumentation around each pipeline stage
2. **Benchmark**: Create a standalone Node.js script that loads the vivace circuit and runs the instrumented pipeline without Electron
3. **Optimize**: Apply targeted optimizations based on profiling data, with likely candidates being mathjs matrix operations, per-frequency object allocation, and interpolation in FrequencyAnalyzer
4. **Verify**: Compare optimized output against a captured "golden" reference to ensure correctness within tolerance
5. **Clean up**: Remove diagnostic instrumentation after optimization is validated

## Glossary

- **Bug_Condition (C)**: The simulation pipeline takes >80ms to complete on a typical 3-way crossover circuit
- **Property (P)**: The simulation pipeline completes in <80ms while producing numerically identical results
- **Preservation**: All simulation outputs (frequency response SPL/phase, impedance magnitude/phase, per-speaker responses) must remain within floating-point tolerance of the pre-optimization output
- **Pipeline**: The full simulation execution path: `CircuitSolver.solveAllFrequencies()` → `FrequencyAnalyzer.calculateSystemResponse()` + `calculateImpedance()` → JSON serialization → schema validation → IPC broadcast
- **Golden reference**: A captured snapshot of the simulation output (frequency response + impedance response) from the current (slow) code, used as the correctness baseline
- **MNA matrix**: Modified Nodal Analysis matrix built by `CircuitSolver.buildMNAMatrix()` — a complex-valued sparse matrix solved via LU decomposition at each frequency point
- **mathjs**: The linear algebra library (`create(all)`) used for matrix construction, element access (`subset`/`index`), and LU solve — initialized once at module load via `const math = create(all)`
- **complex.js**: Library for complex arithmetic used in admittance calculations and FrequencyAnalyzer
- **Frequency points**: ~250 logarithmically spaced points (50 per decade, 1 Hz–100 kHz) — each requires a full matrix build + LU solve

## Bug Details

### Bug Condition

The bug manifests when the simulation runs on a circuit of moderate complexity (3-way crossover with 6 speakers and ~15 passive components). The full pipeline — matrix construction, LU solve at each of ~250 frequencies, frequency analysis, impedance calculation, JSON serialization, and schema validation — takes ~1400ms, which is 17× slower than the 80ms target.

The performance bottleneck is likely concentrated in the per-frequency inner loop of `CircuitSolver.solveAllFrequencies()`, where for each of ~250 frequency points the code:
1. Calls `buildMNAMatrix(frequency)` — allocates a new `math.zeros()` matrix and vector, iterates all components, calls `math.index()`/`math.subset()` for each matrix stamp
2. Calls `solve(frequency)` — runs `math.lusolve(A, b)`, then extracts results via `math.index()`/`math.subset()` into plain objects
3. Runs `SchemaValidator.validateSolverResult()` on each per-frequency result

Secondary costs may come from `FrequencyAnalyzer.calculateSPL()` (linear search interpolation per frequency per speaker), JSON serialization of large result objects, and the top-level `ajv.validate()` on the IPC payload.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type {circuit: Circuit, frequencyRange: {start, end, pointsPerDecade}}
  OUTPUT: boolean

  totalTime := measureExecutionTime(runFullPipeline(input.circuit, input.frequencyRange))
  RETURN totalTime > 80ms
END FUNCTION
```

### Examples

- **Vivace 3-way crossover**: 6 speakers (3 connected, 3 disconnected reference), ~15 passive components, 250 frequency points → ~1400ms (target: <80ms)
- **Per-frequency breakdown (estimated)**: `buildMNAMatrix` + `lusolve` ≈ 4–5ms × 250 = 1000–1250ms; `FrequencyAnalyzer` ≈ 50–100ms; JSON + validation ≈ 50–100ms
- **Matrix operations**: Each `buildMNAMatrix` call creates a fresh `math.zeros(N, N)` matrix, then uses `math.index()`/`math.subset()` for every stamp — these mathjs accessor calls have significant overhead compared to raw array access
- **Interpolation**: `FrequencyAnalyzer.interpolate()` uses a linear scan (`while` loop) to find the bracket for each frequency — called once per frequency per speaker per FRD/ZMA dataset

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Frequency response SPL values for each speaker must match the pre-optimization output within ±0.01 dB
- Frequency response phase values for each speaker must match within ±0.1°
- Combined system response (complex pressure summation) must match within ±0.01 dB SPL and ±0.1° phase
- Impedance magnitude must match within ±0.01 Ω
- Impedance phase must match within ±0.1°
- Muted speakers continue to return -Infinity SPL
- Open/short component states continue to be handled correctly
- Speakers without ZMA data continue to use 8Ω nominal fallback
- Schema validation continues to pass on all simulation outputs
- The number and spacing of frequency points remains identical (50 points/decade, 1 Hz–100 kHz)

**Scope:**
All simulation inputs and outputs must be functionally identical. Only the execution time changes. No API signatures, data formats, or behavioral semantics are modified. The instrumentation code is additive (timing wrappers) and the benchmark script is a new standalone file — neither changes existing behavior.

## Hypothesized Root Cause

Based on code analysis of the simulation pipeline, the most likely performance bottlenecks are:

1. **mathjs matrix accessor overhead**: `buildMNAMatrix()` and `solve()` use `math.zeros()`, `math.index()`, `math.subset()`, `math.add()`, `math.subtract()`, `math.complex()`, and `math.lusolve()` — all high-level mathjs API calls with type checking, broadcasting logic, and object allocation overhead. For a small matrix (likely 10–20 nodes), the overhead of these generic API calls dominates the actual arithmetic. This is called ~250 times (once per frequency).

2. **Per-frequency matrix allocation**: Each call to `buildMNAMatrix()` allocates a new `math.zeros(matrixSize, matrixSize)` matrix and `math.zeros(matrixSize, 1)` vector. For 250 frequencies, this creates ~500 matrix/vector objects that are immediately discarded. Reusing a pre-allocated matrix and zeroing it would eliminate this allocation churn.

3. **Per-frequency schema validation in solve()**: `SchemaValidator.validateSolverResult()` is called inside `solve()` for every frequency point. This runs AJV validation 250 times on intermediate results. Moving validation to the final output (or removing per-frequency validation entirely) would save significant time.

4. **Linear-scan interpolation**: `FrequencyAnalyzer.interpolate()` and `interpolateZMA()` use a `while` loop linear scan to find the interpolation bracket. With ~250 simulation frequencies and ~500+ FRD/ZMA data points, this is O(n×m) per speaker. Binary search would reduce this to O(n×log(m)).

5. **FrequencyAnalyzer per-frequency object allocation**: `calculateSPL()` creates `new Complex()` objects in the inner loop for each frequency point. Pre-allocating or using scalar arithmetic where possible would reduce GC pressure.

6. **JSON serialization + top-level schema validation**: `JSON.parse(JSON.stringify(ipcData))` deep-clones the entire result for IPC. The top-level AJV validation then walks the entire structure again. These are likely smaller contributors but worth measuring.

## Correctness Properties

Property 1: Bug Condition — Pipeline Execution Time

_For any_ circuit of moderate complexity (3-way crossover with 6 speakers), the optimized simulation pipeline SHALL complete in under 80ms, compared to the current ~1400ms.

**Validates: Requirements 2.1**

Property 2: Preservation — Frequency Response Numerical Equivalence

_For any_ valid circuit with speakers that have FRD data loaded, the optimized simulation pipeline SHALL produce frequency response output (SPL and phase arrays for each speaker and the combined system response) that matches the pre-optimization golden reference within ±0.01 dB magnitude and ±0.1° phase at every frequency point.

**Validates: Requirements 2.2, 3.1**

Property 3: Preservation — Impedance Response Numerical Equivalence

_For any_ valid circuit with a voltage source, the optimized simulation pipeline SHALL produce impedance response output (magnitude and phase arrays) that matches the pre-optimization golden reference within ±0.01 Ω magnitude and ±0.1° phase at every frequency point.

**Validates: Requirements 2.2, 3.2**

## Fix Implementation

### Changes Required

The fix follows a phased approach: instrument → benchmark → profile → optimize → verify → clean up.

**Phase 1: Diagnostic Instrumentation**

**File**: `src/simulation/SimulationProfiler.js` (new file)

**Purpose**: Reusable timing instrumentation that wraps each pipeline stage with `performance.now()` measurements. The benchmark script and in-app diagnostics both call the same instrumented pipeline.

**Specific Changes**:
1. **Create `SimulationProfiler` class**: Provides `startStage(name)` / `endStage(name)` methods that record `performance.now()` timestamps. Supports hierarchical/nested stages for drill-down profiling.
2. **Stage granularity (Level 1 — coarse)**: `buildNodeMap`, `buildMNAMatrix` (total across all frequencies), `lusolve` (total), `extractResults` (total), `calculateSystemResponse`, `calculateImpedance`, `jsonSerialization`, `schemaValidation`
3. **Drill-down granularity (Level 2+ — added iteratively)**: Once a slow stage is identified, add sub-stage timing within it. For example:
   - If `buildMNAMatrix` is slow → time `getComponentTerminals()`, `calculateAdmittance()`, `math.index()`/`math.subset()` calls separately
   - If `lusolve` is slow → time factorization vs. back-substitution
   - If `calculateSPL` is slow → time interpolation vs. complex arithmetic vs. object allocation
   - If `calculateImpedance` is slow → time ZMA interpolation vs. voltage extraction
4. **Iterative approach**: We start with Level 1 timing, identify the dominant cost center(s), add finer-grained instrumentation to those specific areas, re-run the benchmark, and repeat until we've pinpointed the actual hot calls. Each iteration narrows the focus.
5. **Report method**: Returns a hierarchical summary with per-stage and per-sub-stage durations, call counts, and average time per call
6. **Integration**: The profiler is passed into the pipeline functions as an optional parameter — when absent, no timing overhead is added

**Phase 2: Standalone Benchmark Script**

**File**: `benchmarks/simulation-benchmark.js` (new file)

**Purpose**: Loads the vivace 1_0_3.json circuit, constructs a `Circuit` object via `Circuit.fromJSON()`, runs the full simulation pipeline with the profiler enabled, and prints per-stage timing to stdout. Runs under plain Node.js without Electron.

**Specific Changes**:
1. **Load circuit JSON**: Read `research/dxo-files/vivace 1_0_3.json` and parse
2. **Construct Circuit**: Use `Circuit.fromJSON()` to build the circuit object with all 6 speakers
3. **Run pipeline**: `CircuitSolver.solveAllFrequencies()` → `FrequencyAnalyzer.calculateSystemResponse()` + `calculateImpedance()` → JSON serialization → schema validation
4. **Warm-up run**: Execute once to warm up JIT, then run 5 timed iterations and report median
5. **Output**: Print per-stage breakdown and total time

**Phase 3: Optimization Planning (Interactive)**

After profiling data is collected, the optimization strategy will be decided interactively based on the measured bottlenecks. No approach is off the table — the existing dependencies (mathjs, complex.js) are not sacred cows and can be replaced entirely if the profiling data justifies it.

**Possible directions include (but are not limited to):**

- **In-place JS optimizations**: Typed arrays, pre-allocation, binary search interpolation, removing per-frequency validation — staying within the current stack
- **Dependency replacement**: Swap mathjs/complex.js for lighter-weight alternatives (e.g., `ml-matrix`, `ndarray`, or a custom minimal solver)
- **Native modules**: Replace the hot path with a Node.js native addon written in C++ (or Rust via napi-rs) — particularly attractive for the LU decomposition + matrix stamping inner loop
- **Algorithmic changes**: Exploit circuit structure (e.g., sparse matrix solvers, symbolic factorization reuse across frequencies where only component values change)
- **WebAssembly**: Compile a C/Rust solver to WASM for use in the renderer process without native module packaging concerns

**Decision point**: After Phase 2 produces per-stage timing data, we pause and review the profiling results together to decide which optimization path(s) to pursue. The choice depends on where the time is actually spent and the tradeoff between implementation complexity, maintenance burden, and performance gain.

**Candidate bottlenecks to investigate:**
1. `buildMNAMatrix()` — mathjs matrix accessor overhead (`math.index()`/`math.subset()`) vs actual arithmetic
2. `math.lusolve()` — generic solver overhead for small matrices (10–20 nodes)
3. Per-frequency allocation — new matrix/vector objects at each of ~250 frequency points
4. Per-frequency schema validation — `SchemaValidator.validateSolverResult()` called 250 times
5. `FrequencyAnalyzer.interpolate()` — linear-scan interpolation across FRD/ZMA datasets
6. Complex object allocation — `new Complex()` in inner loops
7. JSON serialization + top-level schema validation — deep clone via `JSON.parse(JSON.stringify())`

**Phase 4: Golden Reference Verification**

**File**: `benchmarks/simulation-benchmark.js` (extended)

**Specific Changes**:
1. **Capture golden reference**: Before any optimization, run the benchmark and save the full output (frequency response + impedance response) to `benchmarks/golden-reference.json`
2. **Comparison mode**: Add a `--verify` flag that loads the golden reference and compares the current output element-by-element within tolerance (±0.01 dB SPL, ±0.1° phase, ±0.01 Ω impedance)
3. **Tolerance constants**: Define `SPL_TOLERANCE_DB = 0.01`, `PHASE_TOLERANCE_DEG = 0.1`, `IMPEDANCE_TOLERANCE_OHM = 0.01`

**Phase 5: Cleanup**

After optimization is validated:
1. **Remove `SimulationProfiler` integration** from production code paths (keep the class for future use)
2. **Keep benchmark script** in `benchmarks/` for regression testing
3. **Keep golden reference** for CI comparison

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, establish the performance baseline and capture golden reference output on the current (slow) code, then verify that optimizations achieve the target speed while preserving numerical correctness.

### Exploratory Bug Condition Checking

**Goal**: Measure the current pipeline performance to confirm the ~1400ms timing and identify which stages are the bottlenecks. This establishes the baseline before any optimization.

**Test Plan**: Run the benchmark script on the vivace 1_0_3.json circuit with the profiler enabled. Record per-stage timings to identify the dominant cost centers.

**Test Cases**:
1. **Full pipeline timing**: Run complete simulation on vivace circuit → expect ~1400ms total (confirms the bug condition)
2. **Per-stage breakdown**: Measure `buildMNAMatrix` total, `lusolve` total, `FrequencyAnalyzer` total, JSON serialization, schema validation → identify which stages account for >80% of time
3. **Per-frequency cost**: Measure average time per frequency point in the solver loop → expect 4–5ms per point
4. **Matrix size check**: Log the MNA matrix dimensions for the vivace circuit → understand the problem size

**Expected Counterexamples**:
- Total pipeline time ~1400ms, confirming the bug condition (>80ms target)
- Solver inner loop (buildMNAMatrix + lusolve) likely accounts for 70–90% of total time
- mathjs API overhead likely dominates actual arithmetic for the small matrix sizes involved

### Fix Checking

**Goal**: Verify that after optimization, the pipeline completes within the 80ms target on the vivace circuit.

**Pseudocode:**
```
FOR ALL iteration IN [1..5] DO
  time := measureExecutionTime(runFullPipeline(vivaceCircuit))
  ASSERT time < 80ms
END FOR
medianTime := median(times)
ASSERT medianTime < 80ms
```

### Preservation Checking

**Goal**: Verify that the optimized pipeline produces numerically identical results to the pre-optimization golden reference.

**Pseudocode:**
```
goldenReference := loadJSON("benchmarks/golden-reference.json")
optimizedOutput := runFullPipeline(vivaceCircuit)

FOR ALL i IN [0..frequencies.length) DO
  // Frequency response preservation
  FOR ALL speakerId IN speakerResponses DO
    ASSERT |optimizedOutput.spl[speakerId][i] - goldenReference.spl[speakerId][i]| < 0.01 dB
    ASSERT |optimizedOutput.phase[speakerId][i] - goldenReference.phase[speakerId][i]| < 0.1°
  END FOR

  // System response preservation
  ASSERT |optimizedOutput.systemSPL[i] - goldenReference.systemSPL[i]| < 0.01 dB
  ASSERT |optimizedOutput.systemPhase[i] - goldenReference.systemPhase[i]| < 0.1°

  // Impedance preservation
  ASSERT |optimizedOutput.impedance[i] - goldenReference.impedance[i]| < 0.01 Ω
  ASSERT |optimizedOutput.impedancePhase[i] - goldenReference.impedancePhase[i]| < 0.1°
END FOR
```

**Testing Approach**: The golden reference comparison is deterministic (same input, same code path), so a direct element-by-element comparison within tolerance is sufficient. Property-based testing is not needed here because the input is fixed (vivace circuit) and the comparison is exhaustive across all frequency points.

**Test Plan**: Capture golden reference from unfixed code, apply optimizations, run benchmark with `--verify` flag to compare.

**Test Cases**:
1. **Frequency response SPL preservation**: Compare per-speaker SPL arrays element-by-element within ±0.01 dB
2. **Frequency response phase preservation**: Compare per-speaker phase arrays within ±0.1°
3. **System response preservation**: Compare combined SPL and phase within tolerance
4. **Impedance magnitude preservation**: Compare impedance array within ±0.01 Ω
5. **Impedance phase preservation**: Compare impedance phase array within ±0.1°
6. **Schema validation preservation**: Verify optimized output still passes AJV schema validation
7. **Edge case preservation**: Verify muted speakers still return -Infinity SPL, disconnected speakers are still excluded

### Unit Tests

- Test `SimulationProfiler` stage timing accuracy (start/end/report)
- Test that the benchmark script loads the vivace circuit and produces valid output
- Test golden reference capture and comparison logic
- Test tolerance comparison functions (within/outside tolerance)

### Property-Based Tests

- Generate random circuits with varying numbers of components and verify the optimized solver produces the same node voltages as the original solver within tolerance
- Generate random frequency ranges and verify frequency point generation is identical
- Generate random component values and verify admittance calculations are unchanged

### Integration Tests

- Run full benchmark on vivace circuit and verify total time < 80ms (post-optimization)
- Run benchmark with `--verify` flag and confirm all outputs match golden reference
- Run existing test suite (`npm test`) and confirm no regressions
- Verify the simulation store action `runSimulation` still works end-to-end in the Electron app (manual test)
