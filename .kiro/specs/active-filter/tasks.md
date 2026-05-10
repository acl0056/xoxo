# Implementation Plan: Active Filter

## Overview

Implement an Active Filter component for the crossover network simulator. The Active Filter implements classic analog filter shapes (Butterworth, Linkwitz-Riley, Bessel) as cascaded biquad sections, modeled as a VCVS in the MNA framework. It shares the same 4-terminal differential layout and solver integration as PEQ, but provides a higher-level interface where the user specifies filter shape, type, order, and turn frequency. A new `FilterCoefficientCalculator` module handles pole computation and biquad coefficient generation. Implementation follows schema-first methodology: schema → model → simulation → UI.

## Tasks

- [ ] 1. Schema definition and FilterCoefficientCalculator core
  - [x] 1.1 Add Filter type and parameter definitions to circuit.schema.json
    - Add "filter" to the component type enum alongside existing types
    - Define `filterParameters` with required properties: filterShape, filterType, filterOrder, turnFrequency, gain, delay, muted
    - Validate filterShape enum: "butterworth", "linkwitzRiley", "bessel"
    - Validate filterType enum: "lowPass", "highPass", "bandpass"
    - Validate filterOrder as integer with minimum 1, maximum 40
    - Validate turnFrequency as number with exclusiveMinimum 0
    - Validate gain as number, delay as number with minimum 0, muted as boolean
    - Add conditional validation block (allOf/if/then) for "filter" type in the component definition
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 1.2 Create src/simulation/FilterCoefficientCalculator.js
    - Implement `computeFilterCoefficients(params, dspRate)` returning `{ sections: Array<{ b0, b1, b2, a1, a2 }> }`
    - Implement `computeButterworthPoles(order)` — poles equally spaced on left half of unit circle at angles θ_k = π(2k + N - 1)/(2N)
    - Implement `computeLinkwitzRileyPoles(order)` — doubled Butterworth poles at order N/2
    - Implement `computeBesselPoles(order)` — roots of reverse Bessel polynomial using companion matrix eigenvalue approach with pre-computed table for orders 1–25
    - Implement `convertPolesToBiquads(poles, filterType, turnFrequency, dspRate)` — bilinear transform with frequency pre-warping for LP, HP, and BP
    - Handle first-order sections for odd-order filters (b2=0, a2=0)
    - Handle bandpass doubling (each 2nd-order LP section becomes two biquads)
    - Implement Nyquist clamping at 95% with console.warn when turnFrequency ≥ dspRate/2
    - Implement NaN/Infinity protection — return unity coefficients for affected sections and log error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [x] 1.3 Create src/models/Filter.js extending Component
    - Extend Component with type "filter"
    - Set default parameters: filterShape "butterworth", filterType "lowPass", filterOrder 2, turnFrequency 1000, gain 0, delay 0, muted false
    - Define 4 terminals at same positions as PEQ: +in {x:-2,y:-2}, -in {x:-2,y:2}, +out {x:2,y:-2}, -out {x:2,y:2}
    - Implement validate() checking: filterShape in valid set, filterType in valid set, filterOrder integer 1–40, filterOrder even when linkwitzRiley, turnFrequency > 0, gain is finite, delay ≥ 0
    - Implement evaluateTransferFunction(frequency) — compute cached biquad coefficients via FilterCoefficientCalculator, evaluate each section via BiquadCalculator.evaluateTransferFunction, multiply products, apply global gain and delay, return {re, im}; return zero when muted
    - Implement coefficient caching with dirty flag invalidation (`_cachedCoefficients`, `_parametersDirty`)
    - Implement toJSON() serializing all parameters
    - Implement static fromJSON(json) reconstructing Filter instance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.4 Register Filter in Circuit.js deserialization and Component validTypes
    - Import Filter in src/models/Circuit.js
    - Add case 'filter' to the fromJSON switch returning Filter.fromJSON(componentData)
    - Add "filter" to the Component base class validTypes array
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 1.5 Checkpoint — lint and verify schema + model
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure no existing tests are broken
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 2. FilterCoefficientCalculator tests and Filter model tests
  - [x] 2.1 Create tests/unit/FilterCoefficientCalculator.spec.js with unit tests
    - Test Butterworth order 2 poles at known positions (±45° on unit circle)
    - Test Butterworth order 4 poles at known positions
    - Test Linkwitz-Riley order 4 equals doubled Butterworth order 2 poles
    - Test Bessel order 2 poles at known reference values (-1.1016 ± j0.6368)
    - Test Bessel order 3 poles at known reference values
    - Test low-pass Butterworth order 2 at 1 kHz: verify coefficient values against known reference
    - Test high-pass Butterworth order 2 at 1 kHz: verify coefficient values
    - Test bandpass produces double the number of biquad sections
    - Test odd-order filter produces first-order section (b2=0, a2=0)
    - Test Nyquist clamping when turnFrequency ≥ dspRate/2
    - Test orders 1 through 10 produce no NaN/Infinity coefficients for all shapes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [x] 2.2 Write property test for coefficient numerical stability
    - **Property 3: Coefficient Numerical Stability**
    - For any valid filter parameters (all three shapes, all three types, orders 1–40, turnFrequency between 1 Hz and 95% of Nyquist), verify all biquad coefficients are finite numbers
    - **Validates: Requirements 3.11**

  - [x] 2.3 Write property test for correct biquad section decomposition
    - **Property 4: Correct Biquad Section Decomposition**
    - For any filter of order N (LP/HP), verify exactly ⌈N/2⌉ biquad sections; for bandpass, verify section count doubles
    - **Validates: Requirements 3.4, 3.5**

  - [x] 2.4 Write property test for low-pass DC passthrough
    - **Property 5: Low-Pass Filter DC Passthrough**
    - For any low-pass filter (any shape, any order 1–40, turnFrequency 20–20000 Hz), verify |H(f_low)| ≈ 0 dB (±0.1 dB) at f = turnFrequency/100 (minimum 1 Hz)
    - **Validates: Requirements 3.6**

  - [x] 2.5 Write property test for high-pass DC blocking
    - **Property 6: High-Pass Filter DC Blocking**
    - For any high-pass filter (any shape, any order 1–40, turnFrequency 20–20000 Hz), verify |H(f_low)| is significantly attenuated (below -20 dB for order ≥ 2, below -10 dB for order 1)
    - **Validates: Requirements 3.7**

  - [x] 2.6 Write property test for Butterworth -3 dB at turn frequency
    - **Property 7: Butterworth -3 dB at Turn Frequency**
    - For any Butterworth LP or HP filter (any order 1–40, turnFrequency 20–20000 Hz), verify |H(fc)| ≈ -3.01 dB (±0.5 dB)
    - **Validates: Requirements 4.7**

  - [x] 2.7 Write property test for Linkwitz-Riley -6 dB at turn frequency
    - **Property 8: Linkwitz-Riley -6 dB at Turn Frequency**
    - For any LR LP or HP filter (any even order 2–40, turnFrequency 20–20000 Hz), verify |H(fc)| ≈ -6.02 dB (±0.5 dB)
    - **Validates: Requirements 4.8**

  - [x] 2.8 Write property test for Linkwitz-Riley equals squared Butterworth
    - **Property 9: Linkwitz-Riley Equals Squared Butterworth**
    - For any LR filter of order N and any evaluation frequency, verify |H_LR(f)| ≈ |H_BW_N/2(f)|² (±0.01 dB)
    - **Validates: Requirements 3.2**

  - [x] 2.9 Create tests/unit/Filter.spec.js with unit tests
    - Test constructor defaults match schema (filterShape, filterType, filterOrder, turnFrequency, gain, delay, muted)
    - Test validate() with valid parameters returns valid: true
    - Test validate() rejects invalid filterShape, filterType, non-integer order, out-of-range order, odd order for LR, non-positive turnFrequency, NaN gain, negative delay
    - Test terminal positions match PEQ layout
    - Test evaluateTransferFunction with muted returns zero
    - Test evaluateTransferFunction with Butterworth LP order 2 at 1 kHz produces expected magnitude at turn frequency (~-3 dB)
    - Test evaluateTransferFunction with non-zero gain scales magnitude
    - Test evaluateTransferFunction with non-zero delay preserves magnitude
    - Test toJSON() includes all parameters
    - Test fromJSON() reconstructs equivalent instance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

  - [x] 2.10 Write property test for Filter serialization round-trip
    - **Property 1: Filter Serialization Round-Trip**
    - For any valid Filter instance with arbitrary parameters, verify toJSON() then fromJSON() produces identical parameters
    - **Validates: Requirements 2.10, 2.11, 2.12, 9.1, 9.2, 9.3**

  - [x] 2.11 Write property test for Filter validation correctness
    - **Property 2: Filter Validation Correctness**
    - For any Filter parameter object, verify validate() returns valid:true iff all constraints are met, and valid:false otherwise
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

  - [x] 2.12 Write property test for combined transfer function equals product of sections
    - **Property 10: Combined Transfer Function Equals Product of Sections**
    - For any Filter configuration and any frequency, verify combined H(f) (excluding gain/delay) equals product of individual biquad section evaluations
    - **Validates: Requirements 4.1**

  - [x] 2.13 Write property test for gain scales magnitude
    - **Property 11: Gain Scales Magnitude**
    - For any Filter configuration and any frequency, verify changing gain from 0 to G dB scales magnitude by 10^(G/20)
    - **Validates: Requirements 4.3**

  - [x] 2.14 Write property test for delay preserves magnitude
    - **Property 12: Delay Preserves Magnitude**
    - For any Filter configuration with delay D > 0 and any frequency, verify |H(f)| is identical with or without delay
    - **Validates: Requirements 4.4**

  - [x] 2.15 Write property test for mute produces zero output
    - **Property 13: Mute Produces Zero Output**
    - For any Filter configuration with muted=true and any frequency, verify H(f) = {re: 0, im: 0}
    - **Validates: Requirements 4.5**

  - [x] 2.16 Checkpoint — lint and verify all model/calculator tests
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Circuit solver integration
  - [x] 3.1 Add Filter to VCVS handling in CircuitSolver.js
    - In `buildNodeMap()`: include "filter" type alongside "peq" when assigning VCVS branch current indices in `peqCurrentMap`
    - In `solveAllFrequencies()`: include "filter" components in the `peqCache` array (same 4-terminal VCVS structure, same `evaluateTransferFunction` interface)
    - In `buildMNAMatrix()`: handle `component.type === 'filter'` the same as `'peq'` — call `this.stampPEQ(Are, Aim, component, frequency, n)`
    - Filter with fewer than 4 connected terminals: skip and log warning (same as PEQ behavior)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Create tests/unit/Filter-integration.spec.js
    - Test single Filter (Butterworth LP order 2) in simple circuit: output voltage = input × H(f)
    - Test Filter with unity response (gain 0, low frequency well in passband): output ≈ input
    - Test Filter muted: zero output
    - Test Filter + PEQ in series: cascaded transfer functions
    - Test Filter with passive components (resistor divider + filter)
    - Test disconnected Filter is excluded from simulation
    - Test shared "A" label assignment: PEQ gets A0, Filter gets A1 (or vice versa)
    - Test save/load round-trip of circuit containing Filter components
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3_

  - [x] 3.3 Checkpoint — lint and verify solver integration
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 4. UI: Filter canvas rendering and shared label logic
  - [x] 4.1 Add Filter rendering to CircuitEditor.vue
    - Add `renderFilter(component)` method drawing the same amplifier-style triangle as PEQ but with "H(f)" text inside instead of "PEQ"
    - Render 4 terminal dots at ±2 grid units (same positions as PEQ)
    - Render component label (e.g., "A1") above the symbol
    - Support selection highlighting consistent with other components
    - Support rotation of symbol and terminals
    - Render muted indicator when muted parameter is true
    - Add Filter to the component rendering dispatch
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 4.2 Update label assignment logic for shared "A" prefix
    - Update the label prefix map to include `filter: 'A'`
    - Modify the counter logic so that when prefix is "A", it counts across both "peq" and "filter" component types
    - Find the lowest available number not used by any existing PEQ or Filter component
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.3 Add Filter to ComponentPalette.vue
    - Add Filter entry to the component palette so users can place it on the canvas
    - Use appropriate icon/label to distinguish from PEQ
    - _Requirements: 6.1_

  - [x] 4.4 Checkpoint — lint and verify rendering
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 5. UI: Filter Tune Dialog
  - [x] 5.1 Add Filter Configuration section to TuneDialog.vue
    - Display filter shape selector with options: Butterworth, Linkwitz-Riley, Bessel
    - Display filter type selector with options: Low Pass, High Pass, Bandpass
    - Display filter order spinner (integer 1–40)
    - Display turn frequency input with engineering notation (e.g., "4 k[Hz]")
    - Display gain (dB) and delay (seconds) editable fields
    - Display muted checkbox
    - When "linkwitzRiley" is selected: constrain order spinner to step by 2 (even values only)
    - When "linkwitzRiley" is selected and current order is odd: auto-round up to next even value
    - Display Nyquist warning indicator when turnFrequency > dspRate/2
    - Emit real-time parameter updates on any change to trigger simulation recalculation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [x] 5.2 Checkpoint — lint and verify TuneDialog
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Final integration and verification
  - [x] 6.1 End-to-end wiring verification
    - Verify Filter appears in component palette and can be placed on canvas
    - Verify shared "A" label assignment works correctly with mixed PEQ and Filter components
    - Verify Filter parameters can be edited in TuneDialog and simulation updates in real time
    - Verify save/load round-trip preserves all Filter parameters
    - Verify circuit files without Filter components load gracefully (backward compatibility)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

  - [x] 6.2 Final checkpoint — full lint and test suite
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure ALL tests pass (zero failures)
    - Verify no `.skip()` or `.only()` left in test files
    - Verify no stale console.log debugging statements
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- All 13 property-based tests are REQUIRED and will be executed during task runs
- Each task group ends with a lint + test checkpoint per the task-execution-quality steering document
- Order of operations: implementation → lint → tests → verify → mark complete
- The project uses Jest for testing and fast-check for property-based tests
- Schema-first: task 1.1 (schema) must be completed before model/simulation work
- All code uses tab indentation per project ESLint config
- Label prefix "A" is shared between PEQ and Filter, starting at 0 (A0, A1, A2...)
- The Filter reuses BiquadCalculator.evaluateTransferFunction for individual section evaluation
- Coefficient caching on the Filter instance avoids recomputation on every frequency point
- CircuitSolver treats Filter identically to PEQ — same stampPEQ method, same peqCurrentMap/peqCache path
