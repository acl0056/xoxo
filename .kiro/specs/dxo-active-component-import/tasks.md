# Implementation Plan: DXO Active Component Import

## Overview

Extend `DxoImporter` to parse active blocks from DXO files and create PEQ, Filter, and OpAmp components with correct parameters, positions, and connectivity. All implementation changes are in `src/io/DxoImporter.js`. Tests use real DXO/FRD fixtures from `research/filters/`.

## Tasks

- [ ] 1. Implement active block parsing in DxoImporter
  - [x] 1.1 Add imports for PEQ, Filter, and OpAmp models
    - Add `import { PEQ } from '../models/PEQ'` to the import block
    - Add `import { Filter } from '../models/Filter'` to the import block
    - Add `import { OpAmp } from '../models/OpAmp'` to the import block
    - _Requirements: 2.1, 3.1, 4.1_

  - [x] 1.2 Replace `parseActiveBlocks()` with actual parsing logic
    - Read header: count (first line) and linesPerBlock (second line)
    - Validate both are valid integers; throw descriptive error if not
    - If count is 0, return without creating components
    - Loop over blocks, calling `parseActiveBlock(index)` for each
    - Maintain a shared `activeIndex` counter for labeling (A0, A1, A2...)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3_

  - [x] 1.3 Add `parseActiveBlock(index)` method
    - Read all 68 lines of a single active block
    - Extract common fields: type, x, y, inverted, inputR, outputR, scalarGain, turnFrequency, bandpassBandwidth, chebychevError, filterShape, filterType, filterOrder, adjustableDelay, inherentDelay, dspModel, dspRate, biquadCount
    - Extract 10 biquad sections (5 lines each: unbypassed, frequency, Q, gain, type)
    - Dispatch to creation method based on type code (0→PEQ, 1→OpAmp, 2→Filter)
    - For unknown types: emit warning with type value and block index, skip
    - _Requirements: 2.1, 3.1, 4.1, 9.1, 9.2, 9.3_

  - [x] 1.4 Add `createPEQFromBlock(blockData, index)` method
    - Create `PEQ` at (blockData.x, blockData.y)
    - Set `gain = 0` (DXO scalar gain of 1 = unity = 0 dB)
    - Set `delay` from adjustableDelay (clamp to ≥ 0, warn if negative)
    - Set `dspRate` from blockData.dspRate
    - Filter biquad sections: include only those with `unbypassed === true`
    - Map biquad type codes to strings: 0→"peaking", 1→"highShelf", 2→"lowShelf", 3→"lowPass1", 4→"highPass1", 5→"lowPass2", 6→"highPass2", 7→"allPass"
    - Skip biquads with type code outside 0–7 (emit warning)
    - Set frequency, Q, gain for each section
    - Assign label `A{index}`
    - Register position and add to circuit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 7.1, 8.1, 8.3_

  - [x] 1.5 Add `createOpAmpFromBlock(blockData, index)` method
    - Create `OpAmp` at (blockData.x, blockData.y)
    - Convert scalar gain to dB: `dcGain = 20 * Math.log10(scalarGain)`
    - If scalarGain ≤ 0: emit warning, default dcGain to 100 dB
    - Set `cornerFrequency` from turnFrequency
    - Assign label `A{index}`
    - Register position and add to circuit
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 7.1_

  - [x] 1.6 Add `createFilterFromBlock(blockData, index)` method
    - Create `Filter` at (blockData.x, blockData.y)
    - Map filter shape: 0→"butterworth", 1→"linkwitzRiley", 2→"bessel" (default "butterworth" if out of range, warn)
    - Map filter type: 0→"lowPass", 1→"highPass", 2→"bandpass" (default "lowPass" if out of range, warn)
    - Set filterOrder, turnFrequency, gain = 0, delay (clamped to ≥ 0, warn if negative)
    - Assign label `A{index}`
    - Register position and add to circuit
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 7.1, 8.2, 8.3_

  - [x] 1.7 Extend `calculateTerminalPositions()` for active component types
    - Add cases for `component.type === 'peq'`, `'filter'`, `'opamp'`
    - Return 4 terminals: (x-2, y-2), (x-2, y+2), (x+2, y-2), (x+2, y+2)
    - _Requirements: 5.3, 6.1, 6.2, 6.3_

- [ ] 2. Tests
  - [x] 2.1 Copy test fixture files from research/filters/ to tests/fixtures/projects/
    - Copy `research/filters/peq/orbs-peq.dxo` → `tests/fixtures/projects/peq/orbs-peq.dxo`
    - Copy `research/filters/peq/orbs-peq.FRD` → `tests/fixtures/projects/peq/orbs-peq.FRD`
    - Copy `research/filters/opamp/orbs-opamp.dxo` → `tests/fixtures/projects/opamp/orbs-opamp.dxo`
    - Copy `research/filters/opamp/orbs-opamp.FRD` → `tests/fixtures/projects/opamp/orbs-opamp.FRD`
    - Copy `research/filters/filter/orbs-filter.dxo` → `tests/fixtures/projects/filter/orbs-filter.dxo`
    - Copy `research/filters/filter/orbs-filter.FRD` → `tests/fixtures/projects/filter/orbs-filter.FRD`
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 2.2 Write unit tests for active block parsing (`tests/unit/io/DxoImporter-active.spec.js`)
    - Test: Import `orbs-peq.dxo` → verify PEQ created with correct biquad sections (only unbypassed ones)
    - Test: Import `orbs-opamp.dxo` → verify OpAmp with dcGain ≈ 100 dB, cornerFrequency = 50
    - Test: Import `orbs-filter.dxo` → verify Filter with shape=butterworth, type=bandpass, order=1, freq=4000
    - Test: Zero active blocks → no active components created
    - Test: Malformed header (non-integer count) → throws descriptive error
    - Test: Labels assigned sequentially (A0, A1, A2...)
    - Test: Terminal positions calculated correctly for active components
    - Test: Negative delay → clamped to 0, warning emitted
    - Test: Unknown block type → warning emitted, block skipped, subsequent blocks parsed
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1, 8.1, 8.3, 9.1, 9.2, 9.3_

  - [x] 2.3 Write property-based test: Active block type determines component type
    - **Property 1: Active block type code determines component type**
    - Generate random active blocks with type codes 0, 1, 2
    - Assert created component type matches mapping: 0→"peq", 1→"opamp", 2→"filter"
    - **Validates: Requirements 2.1, 3.1, 4.1**

  - [x] 2.4 Write property-based test: PEQ biquad bypass filtering
    - **Property 2: PEQ biquad bypass filtering**
    - Generate PEQ blocks with arbitrary bypass combinations across 10 sections
    - Assert created PEQ contains exactly the sections marked unbypassed
    - **Validates: Requirements 2.2**

  - [x] 2.5 Write property-based test: PEQ biquad parameters preserved
    - **Property 3: PEQ biquad parameters are preserved**
    - Generate PEQ blocks with random frequency, Q, gain, and type values
    - Assert each unbypassed section in the created PEQ matches source values
    - **Validates: Requirements 2.3, 2.4, 2.5, 8.1**

  - [x] 2.6 Write property-based test: OpAmp gain conversion
    - **Property 4: OpAmp gain conversion**
    - Generate OpAmp blocks with positive scalar gain values
    - Assert dcGain equals `20 × log10(scalarGain)` and cornerFrequency equals turnFrequency
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.7 Write property-based test: Filter parameters correctly mapped
    - **Property 5: Filter parameters are correctly mapped**
    - Generate Filter blocks with valid shape (0–2), type (0–2), and order values
    - Assert filterShape, filterType, filterOrder, and turnFrequency match source
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 8.2**

  - [x] 2.8 Write property-based test: Active component terminal positions
    - **Property 6: Active component terminal positions**
    - Generate active components at random (x, y) positions
    - Assert terminal positions are exactly (x-2,y-2), (x-2,y+2), (x+2,y-2), (x+2,y+2)
    - **Validates: Requirements 5.1, 5.3, 6.1, 6.2**

  - [x] 2.9 Write property-based test: Sequential shared "A" labeling
    - **Property 7: Sequential shared "A" labeling**
    - Generate sequences of N active blocks with mixed types
    - Assert labels are A0, A1, ..., A(N-1) in file order
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 2.10 Write property-based test: Unknown types don't interrupt parsing
    - **Property 8: Unknown type blocks don't interrupt subsequent parsing**
    - Generate sequences with unknown type codes interspersed among valid blocks
    - Assert all valid blocks after unknown ones still produce correct components
    - **Validates: Requirements 9.1, 9.3**

  - [x] 2.11 Write integration tests for frequency response verification
    - Import `orbs-peq.dxo`, evaluate PEQ transfer function at FRD frequencies, compare magnitudes within ±0.1 dB of `orbs-peq.FRD` reference
    - Import `orbs-opamp.dxo`, evaluate OpAmp transfer function at FRD frequencies, compare magnitudes within ±0.1 dB of `orbs-opamp.FRD` reference
    - Import `orbs-filter.dxo`, evaluate Filter transfer function at FRD frequencies, compare magnitudes within ±0.1 dB of `orbs-filter.FRD` reference
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 3. Final checkpoint
  - Ensure `npm run lint` passes with zero errors
  - Ensure `npm test` passes with zero failures
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All changes are in `src/io/DxoImporter.js` plus test files
- Test fixtures are real DXO/FRD files from `research/filters/` — do NOT create synthetic data
- Property-based tests use `fast-check` and are REQUIRED (not optional)
- Each property test references a specific correctness property from the design document
- The design uses JavaScript, matching the existing codebase
