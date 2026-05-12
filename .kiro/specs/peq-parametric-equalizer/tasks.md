# Implementation Plan: PEQ Parametric Equalizer

## Overview

Implement a Parametric Equalizer (PEQ) component for the crossover network simulator. The PEQ is an active DSP component modeled as a VCVS (Voltage-Controlled Voltage Source) in the MNA framework, supporting 1–10 cascaded biquad filter sections with configurable filter types, global gain, delay, and mute. Implementation follows schema-first methodology: schema → model → simulation → UI.

## Tasks

- [ ] 1. Schema definition and BiquadCalculator core
  - [x] 1.1 Add PEQ type and parameter definitions to circuit.schema.json
    - Add "peq" to the component type enum
    - Define `peqParameters` with required properties: gain, delay, dspRate, sections, muted
    - Define `filterSection` with required properties: filterType, frequency, q, bypass, and optional gain
    - Add conditional validation block for peq type in the component allOf array
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [x] 1.2 Create src/simulation/BiquadCalculator.js with coefficient computation
    - Implement `computeCoefficients(section, dspRate)` for all 8 filter types using Audio EQ Cookbook formulas
    - Implement bilinear transform with frequency pre-warping
    - Implement Nyquist clamping at 95% with console.warn
    - Implement `evaluateTransferFunction(coeffs, frequency, dspRate)` returning {re, im}
    - Implement `evaluatePEQ(params, frequency)` combining all non-bypassed sections with global gain and delay
    - Handle muted state (return zero), edge cases (Q clamping, NaN protection)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 1.3 Create src/models/PEQ.js extending Component
    - Extend Component with type "peq"
    - Set default parameters: gain 0, delay 0, dspRate 48000, muted false, one default section (peaking, 1000 Hz, Q 0.707, gain 0, bypass false)
    - Define 4 terminals: +in {x:-2,y:-2}, -in {x:-2,y:2}, +out {x:2,y:-2}, -out {x:2,y:2}
    - Implement validate() checking all parameter constraints
    - Implement evaluateTransferFunction(frequency) delegating to BiquadCalculator.evaluatePEQ
    - Implement toJSON() and static fromJSON(json)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [x] 1.4 Register PEQ in Circuit.js deserialization and label assignment
    - Import PEQ in src/models/Circuit.js
    - Add case 'peq' to the fromJSON switch returning PEQ.fromJSON(componentData)
    - Add "peq" to the Component base class validTypes array
    - Add label prefix "A" with counter starting at 0 (A0, A1, A2...) in the labeling logic
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 1.5 Checkpoint — lint and verify schema + model
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure no existing tests are broken
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 2. BiquadCalculator tests and PEQ model tests
  - [x] 2.1 Create tests/unit/BiquadCalculator.spec.js with unit tests
    - Test peaking filter: gain at center frequency equals specified gain (±0.1 dB)
    - Test highShelf: gain at 10× transition frequency approaches specified gain
    - Test lowShelf: gain at 0.1× transition frequency approaches specified gain
    - Test lowPass1 and lowPass2: unity at DC, attenuation above corner
    - Test highPass1 and highPass2: zero at DC, unity well above corner
    - Test allPass: unity magnitude at all frequencies
    - Test Nyquist clamping behavior and warning
    - Test edge cases: very low Q, very high frequency, zero gain
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 2.2 Write property test for peaking filter gain at center frequency
    - **Property 3: Peaking Filter Gain at Center Frequency**
    - **Validates: Requirements 3.1**

  - [x] 2.3 Write property test for shelf filter asymptotic gain
    - **Property 4: Shelf Filter Asymptotic Gain**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.4 Write property test for low-pass DC passthrough
    - **Property 5: Low-Pass Filter DC Passthrough**
    - **Validates: Requirements 3.4, 3.6**

  - [x] 2.5 Write property test for high-pass DC blocking
    - **Property 6: High-Pass Filter DC Blocking**
    - **Validates: Requirements 3.5, 3.7**

  - [x] 2.6 Write property test for all-pass unity magnitude
    - **Property 7: All-Pass Unity Magnitude**
    - **Validates: Requirements 3.8**

  - [x] 2.7 Create tests/unit/PEQ.spec.js with unit tests
    - Test constructor defaults match schema
    - Test validate() with valid parameters returns valid: true
    - Test validate() with invalid parameters (negative delay, zero dspRate, empty sections, invalid filterType, etc.)
    - Test terminal positions and rotation
    - Test evaluateTransferFunction with muted (returns zero)
    - Test evaluateTransferFunction with bypassed sections (excluded from product)
    - Test evaluateTransferFunction with global gain and delay
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.4, 4.5, 4.6_

  - [x] 2.8 Write property test for PEQ serialization round-trip
    - **Property 1: PEQ Serialization Round-Trip**
    - **Validates: Requirements 2.11, 10.3**

  - [x] 2.9 Write property test for PEQ validation correctness
    - **Property 2: PEQ Validation Correctness**
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8**

  - [x] 2.10 Write property test for combined transfer function equals product
    - **Property 8: Combined Transfer Function Equals Product of Non-Bypassed Sections**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 2.11 Write property test for global gain scales magnitude
    - **Property 9: Global Gain Scales Magnitude**
    - **Validates: Requirements 4.4**

  - [x] 2.12 Write property test for delay preserves magnitude
    - **Property 10: Delay Preserves Magnitude**
    - **Validates: Requirements 4.5**

  - [x] 2.13 Write property test for mute produces zero output
    - **Property 11: Mute Produces Zero Output**
    - **Validates: Requirements 4.6**

  - [x] 2.14 Checkpoint — lint and verify all model/calculator tests
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Circuit solver VCVS integration
  - [x] 3.1 Add VCVS stamping for PEQ in CircuitSolver.js
    - Add PEQ to the voltageSourceMap allocation (one extra row/column per PEQ for branch current)
    - Implement VCVS MNA stamping: stamp +1/-1 for output node KCL, stamp +1/-1/-G/+G for VCVS constraint row
    - Evaluate H(f) via component.evaluateTransferFunction(frequency) at each frequency point
    - Handle PEQ with fewer than 4 connected terminals (skip and log warning)
    - Integrate into both buildMNAMatrix and the optimized solveAllFrequencies loop
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Create tests/unit/PEQ-integration.spec.js
    - Test single PEQ in simple circuit: output voltage = input × H(f)
    - Test PEQ with unity gain (all sections bypassed): output equals input
    - Test PEQ muted: zero output
    - Test multiple PEQs in series: cascaded transfer functions
    - Test PEQ with passive components in circuit
    - Test disconnected PEQ is excluded from simulation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.3 Checkpoint — lint and verify solver integration
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Biquad export functionality
  - [x] 4.1 Add biquad export formatting logic to BiquadCalculator.js
    - Implement `formatBiquadExport(params)` returning plain text with "biquadN," headers and coefficient lines
    - Normalize coefficients so a0 = 1 (implicit)
    - Bypassed sections export as unity: b0=1, b1=0, b2=0, a1=0, a2=0
    - Number sections starting from 1
    - _Requirements: 8.3, 8.4, 8.6_

  - [x] 4.2 Create tests/unit/BiquadExport.spec.js
    - Test export format with known coefficients
    - Test bypassed sections produce unity coefficients
    - Test section numbering starts at 1
    - Test multi-section export ordering
    - _Requirements: 8.3, 8.4, 8.6_

  - [x] 4.3 Write property test for biquad export format correctness
    - **Property 12: Biquad Export Format and Normalization**
    - **Validates: Requirements 8.3, 8.4**

  - [x] 4.4 Write property test for bypassed sections export as unity
    - **Property 13: Bypassed Sections Export as Unity**
    - **Validates: Requirements 8.6**

  - [x] 4.5 Checkpoint — lint and verify export tests
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. UI: PEQ canvas rendering and TuneDialog
  - [x] 5.1 Add PEQ rendering to CircuitEditor.vue
    - Add `renderPEQ(component)` method drawing amplifier-style triangle with "PEQ" text
    - Render 4 terminal dots at ±2 grid units (top-left, bottom-left, top-right, bottom-right)
    - Render component label (e.g., "A0") above the symbol
    - Support selection highlighting consistent with other components
    - Support rotation of symbol and terminals
    - Render muted indicator when muted parameter is true
    - Add PEQ to the component rendering dispatch (switch/if block)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.2 Add PEQ section to TuneDialog.vue
    - Add PEQ parameter section with: label, global gain (dB), delay (seconds), DSP rate combo box (48000/96000/192000 presets + custom entry), muted checkbox
    - Add dynamic filter section rows (1–10) with: filter type dropdown, frequency input, Q input, section gain input (shown only for peaking/highShelf/lowShelf), bypass checkbox
    - Add "Add Section" button (disabled at 10 sections) and "Remove" button per row (disabled at 1 section)
    - Add Nyquist warning indicator when section frequency > dspRate/2
    - Add "View/Export BiQuads" button
    - Emit real-time parameter updates on any change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 5.3 Create src/renderer/components/BiquadExportWindow.vue
    - Display computed biquad coefficients in plain text format
    - Include "Save to File", "Select All", and "Copy to Clipboard" action buttons
    - Open as a separate window/modal from the TuneDialog
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 5.4 Checkpoint — lint and verify UI components
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Final integration and verification
  - [x] 6.1 Wire PEQ into component palette and creation flow
    - Add PEQ to the component palette/toolbar so users can place it on the canvas
    - Ensure label assignment (A0, A1, A2...) works when adding/removing PEQ components
    - Ensure PEQ appears in save/load round-trip (serialize and deserialize circuit with PEQ)
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 6.2 Final checkpoint — full lint and test suite
    - Run `npm run lint` and fix any errors
    - Run `npm test` to ensure ALL tests pass (zero failures)
    - Verify no `.skip()` or `.only()` left in test files
    - Verify no stale console.log debugging statements
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property-based tests are required and will be executed during "run all tasks"
- Each task group ends with a lint + test checkpoint per the task-execution-quality steering document
- Order of operations: implementation → lint → tests → verify → mark complete
- The project uses Jest for testing and fast-check (v4.5.3) for property-based tests
- Schema-first: task 1.1 (schema) must be completed before model/simulation work
- All code uses tab indentation per project ESLint config
- Label prefix "A" starts at 0 (A0, A1, A2...) unlike passive components which start at 1
