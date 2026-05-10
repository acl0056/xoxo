# Implementation Plan: OpAmp Component

## Overview

Implement an Operational Amplifier (OpAmp) component for the crossover network simulator. The OpAmp is modeled as a VCVS with a simple single-pole open-loop gain: `A(f) = A₀ / (1 + j×f/f_c)`. It shares the same 4-terminal differential layout and solver integration as PEQ and Filter. Only 2 parameters (dcGain, cornerFrequency), no mute, no separate calculator module — the transfer function is computed inline. Implementation follows schema-first methodology: schema → model → simulation → UI.

## Tasks

- [ ] 1. Schema definition and OpAmp model
  - [ ] 1.1 Add OpAmp type and parameter definitions to circuit.schema.json
    - Add "opamp" to the component type enum alongside existing types
    - Define `opampParameters` with required properties: `dcGain` (number, default 100) and `cornerFrequency` (number, exclusiveMinimum 0, default 50)
    - Add conditional validation block (allOf/if/then) for "opamp" type in the component definition
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 1.2 Create src/models/OpAmp.js extending Component
    - Extend Component with type "opamp"
    - Set default parameters: dcGain 100 (dB), cornerFrequency 50 (Hz)
    - Define 4 terminals at same positions as PEQ: +in {x:-2,y:-2}, -in {x:-2,y:2}, +out {x:2,y:-2}, -out {x:2,y:2}
    - Implement validate() checking: dcGain is a finite number, cornerFrequency is a positive number
    - Implement evaluateTransferFunction(frequency) — single-pole model computed inline: A₀ = 10^(dcGain/20), ratio = f/f_c, denomMagSquared = 1 + ratio², re = A₀/denomMagSquared, im = -A₀×ratio/denomMagSquared
    - Implement toJSON() serializing all parameters (id, type, label, x, y, rotation, parameters)
    - Implement static fromJSON(json) reconstructing OpAmp instance with all parameters restored
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 1.3 Register OpAmp in Circuit.js deserialization and Component validTypes
    - Import OpAmp in src/models/Circuit.js
    - Add case 'opamp' to the fromJSON switch returning OpAmp.fromJSON(componentData)
    - Add "opamp" to the Component base class validTypes array
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 1.4 Add OpAmp to VCVS handling in CircuitSolver.js
    - In `buildNodeMap()`: include "opamp" type alongside "peq" and "filter" when assigning VCVS branch current indices in `peqCurrentMap`
    - In `solveAllFrequencies()`: include "opamp" components in the `peqCache` array (same 4-terminal VCVS structure, same `evaluateTransferFunction` interface)
    - In `buildMNAMatrix()`: handle `component.type === 'opamp'` the same as `'peq'` — call `this.stampPEQ(Are, Aim, component, frequency, n)`
    - OpAmp with fewer than 4 connected terminals: skip and log warning (same as PEQ behavior)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ] 1.5 Checkpoint — lint and verify schema + model + solver integration
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure no existing tests are broken
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 2. OpAmp unit tests and property-based tests
  - [ ] 2.1 Create tests/unit/OpAmp.spec.js with unit tests
    - Test constructor defaults match schema (dcGain 100, cornerFrequency 50)
    - Test terminal positions match PEQ layout (4 terminals at ±2 grid units)
    - Test validate() with valid parameters returns valid: true
    - Test validate() rejects NaN dcGain, Infinity dcGain, non-positive cornerFrequency, NaN cornerFrequency
    - Test evaluateTransferFunction at f=0 returns { re: A₀, im: 0 } where A₀ = 10^(100/20)
    - Test evaluateTransferFunction at f=cornerFrequency returns magnitude ≈ -3.01 dB below DC
    - Test evaluateTransferFunction at high frequency (10× corner) shows roll-off
    - Test toJSON() includes all parameters
    - Test fromJSON() reconstructs equivalent instance with correct parameters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 2.2 Write property test for OpAmp serialization round-trip
    - **Property 1: OpAmp Serialization Round-Trip**
    - For any valid OpAmp instance with arbitrary dcGain (finite number) and cornerFrequency (positive number), verify toJSON() then fromJSON() produces identical parameters
    - **Validates: Requirements 2.6, 2.7, 2.8, 8.1, 8.2, 8.3**

  - [ ] 2.3 Write property test for OpAmp validation correctness
    - **Property 2: OpAmp Validation Correctness**
    - For any OpAmp parameter object, verify validate() returns valid:true iff dcGain is finite AND cornerFrequency is positive; valid:false otherwise with appropriate errors
    - **Validates: Requirements 2.4, 2.5**

  - [ ] 2.4 Write property test for transfer function formula correctness
    - **Property 3: Transfer Function Formula Correctness**
    - For any valid OpAmp parameters and any non-negative frequency f, verify re = A₀/(1+(f/f_c)²) and im = -A₀×(f/f_c)/(1+(f/f_c)²) within floating-point tolerance
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 2.5 Write property test for DC gain magnitude
    - **Property 4: DC Gain Magnitude**
    - For any valid OpAmp with dcGain G dB, verify evaluateTransferFunction(0) produces magnitude equal to 10^(G/20) within floating-point tolerance
    - **Validates: Requirements 3.3**

  - [ ] 2.6 Write property test for corner frequency -3 dB point
    - **Property 5: Corner Frequency -3 dB Point**
    - For any valid OpAmp with dcGain G and cornerFrequency f_c, verify evaluateTransferFunction(f_c) produces magnitude approximately 3.01 dB below DC gain (±0.01 dB tolerance)
    - **Validates: Requirements 3.4**

  - [ ] 2.7 Write property test for high-frequency roll-off rate
    - **Property 6: High-Frequency Roll-Off Rate**
    - For any valid OpAmp and two frequencies f₁, f₂ where f₂ = 10×f₁ and f₁ ≥ 10×cornerFrequency, verify magnitude at f₂ is approximately 20 dB below magnitude at f₁ (±1 dB tolerance)
    - **Validates: Requirements 3.5**

  - [ ] 2.8 Write property test for circuit-level serialization round-trip
    - **Property 7: Circuit-Level Serialization Round-Trip**
    - For any valid circuit containing one or more OpAmp components with arbitrary valid parameters, verify Circuit.fromJSON(Circuit.toJSON(circuit)) preserves OpAmp parameters identically
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ] 2.9 Checkpoint — lint and verify all OpAmp tests
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Integration tests and solver verification
  - [ ] 3.1 Create tests/unit/OpAmp-integration.spec.js
    - Test single OpAmp in simple circuit: output voltage = input × A(f) at each frequency
    - Test OpAmp at DC: output ≈ A₀ × input differential voltage
    - Test OpAmp at high frequency: gain rolls off as expected
    - Test OpAmp with resistive feedback (inverting amplifier): closed-loop gain ≈ -R_f/R_in at low frequencies
    - Test disconnected OpAmp is excluded from simulation (same as PEQ behavior)
    - Test shared "A" label assignment: PEQ gets A0, OpAmp gets A1 (or vice versa)
    - Test save/load round-trip of circuit containing OpAmp components
    - Test circuit with both PEQ and OpAmp: both stamped correctly as VCVS
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_

  - [ ] 3.2 Checkpoint — lint and verify integration tests
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. UI: OpAmp canvas rendering, palette, and shared label logic
  - [ ] 4.1 Add OpAmp rendering to CircuitEditor.vue
    - Add `renderOpAmp(component)` method drawing the same amplifier-style triangle as PEQ but with "Op" text inside instead of "PEQ"
    - Render 4 terminal dots at ±2 grid units (same positions as PEQ)
    - Render component label (e.g., "A2") above the symbol
    - Support selection highlighting consistent with other components
    - Support rotation of symbol and terminals
    - Add OpAmp to the component rendering dispatch
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 4.2 Update label assignment logic for shared "A" prefix
    - Update the label prefix map to include `opamp: 'A'`
    - Modify the counter logic so that when prefix is "A", it counts across "peq", "filter", and "opamp" component types
    - Find the lowest available number not used by any existing PEQ, Filter, or OpAmp component
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 4.3 Add OpAmp to ComponentPalette.vue
    - Add OpAmp entry to the component palette so users can place it on the canvas
    - Use appropriate icon/label to distinguish from PEQ and Filter
    - _Requirements: 5.1_

  - [ ] 4.4 Checkpoint — lint and verify rendering
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. UI: OpAmp Tune Dialog and final verification
  - [ ] 5.1 Add OpAmp Configuration section to TuneDialog.vue
    - Display "Op Amp Setup" panel header when an OpAmp is selected
    - Display editable field for DC Gain in decibels (default 100 dB)
    - Display editable field for Corner Frequency in hertz (default 50 Hz, must be > 0)
    - Display computed Unity-Gain Frequency (GBW = 10^(dcGain/20) × cornerFrequency) as read-only field in engineering notation (e.g., "5.00 MHz")
    - Emit real-time parameter updates on any change to trigger simulation recalculation
    - Revert to previous valid value on blur if user enters invalid input (non-numeric or cornerFrequency ≤ 0)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 5.2 Final checkpoint — full lint and test suite
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure ALL tests pass (zero failures)
    - Verify no `.skip()` or `.only()` left in test files
    - Verify no stale console.log debugging statements
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- All 7 property-based tests are REQUIRED and will be executed during task runs
- Each task group ends with a lint + test checkpoint per the task-execution-quality steering document
- Order of operations: implementation → lint → tests → verify → mark complete
- The project uses Jest for testing and fast-check for property-based tests
- Schema-first: task 1.1 (schema) must be completed before model/simulation work
- All code uses tab indentation per project ESLint config
- Label prefix "A" is shared between PEQ, Filter, and OpAmp, starting at 0 (A0, A1, A2...)
- The OpAmp reuses the same `stampPEQ()` VCVS stamping mechanism — no new solver math needed
- Transfer function is computed inline (5 lines of arithmetic) — no separate calculator module
- No mute parameter: muting an OpAmp in a feedback circuit would break the topology
- CircuitSolver treats OpAmp identically to PEQ — same stampPEQ method, same peqCurrentMap/peqCache path
