# Implementation Plan: Per-File Phase Source

## Overview

This plan implements per-file phase source settings for the Speaker model, replacing the single global `phaseSource` with `frdPhaseSource`, `zmaPhaseSource`, and per-entry `phaseSource` on off-axis files. It also wires the existing `HilbertTransform` class into the simulation pipeline so that selecting "derived" actually computes minimum phase from magnitude data.

The implementation follows a schema-first approach: schema → model → simulation → importer → UI → tests.

## Tasks

- [x] 1. Update circuit schema for per-file phase source
  - [x] 1.1 Modify `speakerParameters` in `server/schemas/circuit.schema.json`
    - Remove `phaseSource` from the `required` array and `properties` object
    - Add `frdPhaseSource` as a required string property with enum `["measured", "derived"]` and description `"Phase data source for the primary FRD file"`
    - Add `zmaPhaseSource` as a required string property with enum `["measured", "derived"]` and description `"Phase data source for the ZMA file"`
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 1.2 Update `offAxisFile` definition in `server/schemas/circuit.schema.json`
    - Add `phaseSource` as a required string property with enum `["measured", "derived"]` and description `"Phase data source for this off-axis FRD file"`
    - Add `phaseSource` to the `required` array of `offAxisFile`
    - _Requirements: 2.3_

- [x] 2. Update Speaker model for per-file phase source
  - [x] 2.1 Update `src/models/Speaker.js` constructor defaults
    - Replace `phaseSource: 'measured'` with `frdPhaseSource: 'measured'` and `zmaPhaseSource: 'measured'`
    - Ensure `offAxisFiles` entries will include `phaseSource` field
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7_

  - [x] 2.2 Update `toJSON()` in `src/models/Speaker.js`
    - Serialize `frdPhaseSource` and `zmaPhaseSource` instead of legacy `phaseSource`
    - Serialize `phaseSource` on each off-axis entry
    - Ensure no derived phase arrays are included in output
    - _Requirements: 3.6, 8.1_

  - [x] 2.3 Update `fromJSON()` in `src/models/Speaker.js` with migration logic
    - If `json.parameters.frdPhaseSource` exists, use it directly
    - Else if `json.parameters.phaseSource` exists (legacy), apply it to both `frdPhaseSource` and `zmaPhaseSource`
    - Else default both to `'measured'`
    - For each off-axis entry: if it has `phaseSource`, use it; else if legacy global `phaseSource` exists, apply it; else default to `'measured'`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Update `validate()` in `src/models/Speaker.js`
    - Validate `frdPhaseSource` is one of `['measured', 'derived']`
    - Validate `zmaPhaseSource` is one of `['measured', 'derived']`
    - Validate each off-axis entry's `phaseSource` is one of `['measured', 'derived']`
    - Remove validation of the legacy `phaseSource` field
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 2.5 Update `addOffAxisFile()` in `src/models/Speaker.js`
    - New off-axis entries include `phaseSource: 'measured'` by default
    - _Requirements: 1.3, 1.6_

  - [ ]* 2.6 Write property tests for serialization round-trip (Property 1)
    - **Property 1: Serialization round-trip preserves per-file phase source settings**
    - Use `fast-check` to generate random Speaker parameters with random `frdPhaseSource`, `zmaPhaseSource`, and off-axis `phaseSource` values
    - Verify `toJSON()` → `fromJSON()` preserves all phase source fields
    - Verify serialized JSON contains `frdPhaseSource` and `zmaPhaseSource` but not legacy `phaseSource`
    - Verify no derived phase arrays in serialized output
    - **Validates: Requirements 3.6, 8.1, 8.2**

  - [ ]* 2.7 Write property tests for legacy migration (Property 2)
    - **Property 2: Legacy migration propagates global phaseSource to all per-file settings**
    - Use `fast-check` to generate legacy Speaker JSON with global `phaseSource` and off-axis entries without per-entry `phaseSource`
    - Verify `fromJSON()` sets `frdPhaseSource` and `zmaPhaseSource` to the legacy value
    - Verify each off-axis entry's `phaseSource` is set to the legacy value
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.8 Write property tests for default fallback (Property 3)
    - **Property 3: Missing phase source fields default to measured**
    - Use `fast-check` to generate Speaker JSON missing all phase source fields
    - Verify `fromJSON()` defaults all phase source fields to `'measured'`
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [ ]* 2.9 Write property tests for validation (Property 5)
    - **Property 5: Validation rejects invalid phase source values**
    - Use `fast-check` to generate Speakers with invalid phase source strings
    - Verify `validate()` returns `valid: false` with appropriate error messages
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 3. Checkpoint - Ensure schema and model tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate Hilbert transform into FrequencyAnalyzer
  - [x] 4.1 Add `getPhaseData()` helper to `src/simulation/FrequencyAnalyzer.js`
    - Import `HilbertTransform` at the top of the file (use `require` since it uses `module.exports`)
    - Add method `getPhaseData(frdData, phaseSource)` that returns the phase array:
      - If `phaseSource === 'derived'`: call `HilbertTransform.calculateMinimumPhase(frdData.frequencies, frdData.magnitudes)`, catch errors and fall back to `frdData.phases`
      - If `phaseSource === 'measured'`: return `frdData.phases`
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 4.2 Update `calculateSPL()` in `src/simulation/FrequencyAnalyzer.js` to use per-file phase source
    - For on-axis: resolve phase using `getPhaseData(frdData, speakerComponent.parameters.frdPhaseSource)`
    - For off-axis: look up the matching off-axis entry in `speakerComponent.parameters.offAxisFiles` by angle and use its `phaseSource`
    - Replace direct use of `frdData.phases` with the resolved phase array
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.3 Write property tests for derived FRD phase (Property 6)
    - **Property 6: Derived FRD phase equals HilbertTransform output**
    - Use real FRD test fixtures from `tests/fixtures/projects/`
    - Set `frdPhaseSource` to `'derived'`, verify phase output matches `HilbertTransform.calculateMinimumPhase()`
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 4.4 Write property tests for measured FRD phase identity (Property 7)
    - **Property 7: Measured FRD phase is identity**
    - Use real FRD test fixtures from `tests/fixtures/projects/`
    - Set `frdPhaseSource` to `'measured'`, verify phase output uses original FRD phases unmodified
    - **Validates: Requirements 5.2, 5.4**

- [x] 5. Integrate Hilbert transform into CircuitSolver for ZMA
  - [x] 5.1 Update `calculateAdmittance()` and `stampComponentAdmittance()` in `src/simulation/CircuitSolver.js`
    - Import `HilbertTransform` at the top of the file
    - In the `speaker` case: check `component.parameters.zmaPhaseSource`
    - When `'derived'`: compute derived ZMA phases using `HilbertTransform.calculateMinimumPhase(frequencies, magnitudesInDb)` where `magnitudesInDb = impedances.map(z => 20 * Math.log10(z))`
    - Cache derived phases as `component._derivedZmaPhases` (transient, non-serialized)
    - Invalidate cache if `zmaPhaseSource` changes or ZMA data is reloaded
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Update `interpolateZMA()` function in `src/simulation/CircuitSolver.js`
    - Add an optional `phasesOverride` parameter to accept pre-resolved phase array
    - When `phasesOverride` is provided, interpolate from it instead of `zmaData.phases`
    - Update callers to pass derived phases when `zmaPhaseSource === 'derived'`
    - Wrap Hilbert transform call in try/catch, fall back to measured phase on error
    - _Requirements: 6.1, 6.2_

  - [ ]* 5.3 Write property tests for ZMA phase source (Property 8)
    - **Property 8: ZMA phase source controls impedance phase computation**
    - Use real ZMA test fixtures from `tests/fixtures/projects/`
    - Verify that when `zmaPhaseSource` is `'derived'`, admittance uses Hilbert-derived phase from dB-converted impedance magnitudes
    - Verify that when `zmaPhaseSource` is `'measured'`, original ZMA phases are used
    - **Validates: Requirements 6.1, 6.2**

- [x] 6. Checkpoint - Ensure simulation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update DxoImporter for per-file phase source mapping
  - [x] 7.1 Update `parseDriver()` in `src/io/DxoImporter.js`
    - Instead of skipping 19 lines blindly, read them individually to extract `zPhaseHilbert` (at offset +14 within the 19-line block, i.e., the "Z Phase Hilbert" line)
    - Map: `frdPhaseSource = useHilbert ? 'derived' : 'measured'`
    - Map: `zmaPhaseSource = zPhaseHilbert ? 'derived' : 'measured'`
    - Replace `speaker.parameters.phaseSource = ...` with `speaker.parameters.frdPhaseSource = ...` and `speaker.parameters.zmaPhaseSource = ...`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write unit tests for DXO import phase source mapping
    - Import real DXO files from `tests/fixtures/projects/` (vivace, tonic, center)
    - Verify `frdPhaseSource` and `zmaPhaseSource` are correctly mapped from `useHilbert` and `zPhaseHilbert` flags
    - Verify off-axis entries get `phaseSource: 'measured'`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Update TuneDialog UI for per-file phase source controls
  - [x] 8.1 Replace global phase source radio group in `src/renderer/components/TuneDialog.vue`
    - Remove the existing single "Phase Source" radio group bound to `localParameters.phaseSource`
    - Add FRD phase source radio group (`As Measured` / `Derived (Minimum Phase)`) bound to `localParameters.frdPhaseSource`, visible only when `localParameters.frdFile` is truthy
    - Add ZMA phase source radio group bound to `localParameters.zmaPhaseSource`, visible only when `localParameters.zmaFile` is truthy
    - For each off-axis entry, add a phase source radio group bound to `offAxis.phaseSource`, visible only when `offAxis.frdPath` is truthy
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 8.2 Write unit tests for TuneDialog conditional visibility
    - Verify FRD phase source radio group is visible when `frdFile` is set, hidden when null
    - Verify ZMA phase source radio group is visible when `zmaFile` is set, hidden when null
    - Verify off-axis phase source radio group is visible when `offAxis.frdPath` is truthy
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 9. Update existing tests for per-file phase source
  - [x] 9.1 Update `tests/unit/Speaker.spec.js`
    - Update all references from `phaseSource` to `frdPhaseSource` / `zmaPhaseSource`
    - Add tests for new defaults, serialization, and validation
    - _Requirements: 1.4, 1.5, 1.7, 9.1, 9.2, 9.3_

  - [x] 9.2 Update `tests/unit/schema-validation.spec.js` and `tests/unit/circuit-schema.property.spec.js`
    - Update speaker parameter generators to use `frdPhaseSource` and `zmaPhaseSource`
    - Update off-axis file generators to include `phaseSource`
    - Remove references to legacy global `phaseSource`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.3 Update `tests/unit/serialization-roundtrip.property.spec.js`
    - Update Speaker serialization generators to use new per-file phase source fields
    - Verify round-trip preserves `frdPhaseSource`, `zmaPhaseSource`, and off-axis `phaseSource`
    - _Requirements: 3.6, 8.1, 8.2_

  - [ ]* 9.4 Write schema validation property test (Property 4)
    - **Property 4: Schema validates per-file phase source structure**
    - Generate random valid speaker parameter objects with valid phase source values and verify schema acceptance
    - Generate objects with invalid phase source values and verify schema rejection
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `HilbertTransform` class method is `calculateMinimumPhase(frequencies, magnitudes)` — already verified in `src/simulation/HilbertTransform.js`
- ZMA impedances need conversion to dB before Hilbert transform: `20 * Math.log10(impedance)`
- Cache derived ZMA phases as transient property `_derivedZmaPhases` on component instance
- Fallback to measured phase if Hilbert transform throws
- Use real test fixtures from `tests/fixtures/projects/` — never create synthetic FRD/ZMA data
- Jest test runner: use `npm test -- <filename>` (not `--run`)
