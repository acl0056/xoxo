# System Response Accuracy Bugfix Design

## Overview

The crossover network simulator (xoxo) produces a 2.4 dB SPL dip in the crossover region for multi-driver systems, and a 180° absolute phase offset for all speakers. Two independent bugs have been identified through numerical investigation comparing xoxo output against xSim reference data:

1. **Delay units mismatch** (PRIMARY — causes the crossover dip): The speaker delay parameter is stored in seconds, but `FrequencyAnalyzer.calculateSPL()` divides it by 1000, treating it as milliseconds. This makes the delay phase shift ~1000x too small, eliminating the time-alignment correction needed for correct multi-driver summation.

2. **Terminal ordering in voltage extraction** (causes 180° absolute phase offset): `getComponentTerminals()` returns terminals in wire iteration order rather than sorted order, consistently producing `[componentId_1, componentId_0]`. Since voltage is `V(terminals[0]) - V(terminals[1])`, this negates the voltage, adding 180° to the phase. This does not cause the crossover dip (both speakers are flipped equally, preserving relative phase) but produces incorrect absolute phase.

With both fixes applied, the tonic two-way system matches xSim within 0.3 dB SPL and 0.4° phase. The orbs single-driver system continues to match within 0.5 dB (unchanged, since it has no delay and the terminal flip doesn't affect magnitude).

## Glossary

- **Bug_Condition (C)**: Two conditions that trigger incorrect behavior: (1) any speaker with a non-zero delay parameter, and (2) any component whose terminals are discovered in non-sorted order
- **Property (P)**: (1) Delay phase shift shall use the delay value directly as seconds; (2) Terminals shall be sorted so `_0` precedes `_1` in voltage extraction
- **Preservation**: Single-driver SPL accuracy, impedance calculation, muted speaker behavior, sensitivity/polarity adjustments, and source voltage normalization must remain unchanged
- **`calculateSPL()`**: Method in `src/simulation/FrequencyAnalyzer.js` that computes SPL and phase for an individual speaker, including delay phase shift application
- **`getComponentTerminals()`**: Method in `src/simulation/CircuitSolver.js` that discovers terminal node IDs for a component by iterating over wire connections
- **`solveAllFrequencies()`**: Method in `src/simulation/CircuitSolver.js` that solves the MNA system across all frequency points and builds `componentVoltages` using terminal ordering
- **FRD**: Frequency Response Data — reference SPL and phase measurements from xSim
- **ZMA**: Impedance measurement data — reference impedance magnitude and phase
- **MNA**: Modified Nodal Analysis — the matrix-based circuit solving technique

## Bug Details

### Bug Condition

Two independent bugs produce incorrect system response:

**Bug 1 — Delay units mismatch**: The bug manifests when a speaker has a non-zero delay parameter and `calculateSPL()` computes the delay phase shift. The delay value is already in seconds (e.g., `0.0000804827191049731` for the tonic woofer), but the code divides by 1000, producing an effective delay of `8.05e-8` seconds instead of `8.05e-5` seconds. At 1000 Hz, the correct phase shift is -28.97°, but the code applies -0.029° — a factor of 1000 too small.

**Bug 2 — Terminal ordering**: The bug manifests when `getComponentTerminals()` discovers terminals by iterating over wires. The iteration order consistently places `terminal_1` before `terminal_0` in the returned array. When voltage is computed as `V(terminals[0]) - V(terminals[1])`, this produces `-V_expected`, adding 180° to the phase.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { speaker: Speaker, circuit: Circuit }
  OUTPUT: { hasDelayBug: boolean, hasTerminalBug: boolean }

  // Bug 1: Delay units mismatch
  hasDelayBug := speaker.parameters.delay != 0
                 AND calculateSPL divides delay by 1000

  // Bug 2: Terminal ordering
  terminals := getComponentTerminals(speaker)
  hasTerminalBug := terminals[0] ends with "_1"
                    AND terminals[1] ends with "_0"
                    (i.e., terminals are in reverse sorted order)

  RETURN { hasDelayBug, hasTerminalBug }
END FUNCTION
```

### Examples

- **Tonic woofer at 1000 Hz**: Delay = 0.0000804827 s. Expected phase shift = -360 × 1000 × 0.0000804827 = -28.97°. Actual phase shift = -360 × 1000 × 0.0000000805 = -0.029°. The ~29° error at the crossover frequency causes partial cancellation, producing a 2.4 dB dip instead of flat response.
- **Tonic woofer at 100 Hz**: Delay phase shift should be -2.90°, code applies -0.003°. Error is small at low frequencies, so the dip is concentrated in the crossover region.
- **Tonic woofer at 3000 Hz**: Delay phase shift should be -86.9°, code applies -0.087°. Large error causes significant cancellation.
- **Orbs single driver**: Delay = 0 (no delay parameter set). Bug 1 has no effect. Bug 2 flips the voltage sign but doesn't affect SPL magnitude (only phase). Single-driver SPL is unaffected.
- **Terminal ordering for any speaker**: `getComponentTerminals()` returns `[speakerId_1, speakerId_0]`. Voltage = V(_1) - V(_0) = -(V(_0) - V(_1)) = -V_expected. Phase is offset by 180°.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single-driver (orbs) SPL must continue to match xSim within 0.5 dB across the full frequency range
- Impedance calculation (`calculateImpedance()`) must remain unchanged — it uses source current, not component voltages affected by terminal ordering
- Muted speakers must continue to return -Infinity SPL
- Sensitivity adjustment must continue to be applied as an additive dB offset
- Polarity inversion must continue to add 180° to the phase
- Source voltage normalization (`20*log10(V_speaker / V_source)`) must remain unchanged
- MNA matrix construction and solving must remain unchanged — admittance stamps are symmetric, so terminal order doesn't affect the matrix

**Scope:**
The delay fix only changes one line in `calculateSPL()` — removing the `/1000` divisor. The terminal fix only changes the voltage extraction in `solveAllFrequencies()` — sorting terminals after discovery. Neither change affects the MNA matrix construction, admittance calculations, or impedance computation.

## Hypothesized Root Cause

Based on numerical investigation and verification:

1. **Delay units mismatch (CONFIRMED)**: Line 119 of `FrequencyAnalyzer.js`:
   ```javascript
   const delaySeconds = speakerComponent.parameters.delay / 1000;
   ```
   The delay parameter is stored in seconds (set during project import from .dxo files), but this line treats it as milliseconds. The `/1000` divisor makes the delay effectively zero for typical values (microsecond-range delays become nanoseconds). This eliminates the time-alignment phase correction needed for constructive summation at the crossover frequency.

2. **Terminal ordering (CONFIRMED)**: `getComponentTerminals()` (line 291 of `CircuitSolver.js`) iterates over `this.circuit.wires` and pushes terminals in the order they're encountered. For speakers, the wire that connects to terminal 1 is consistently encountered before the wire connecting to terminal 0, producing `[componentId_1, componentId_0]`. In `solveAllFrequencies()` (line 718), voltage is computed as:
   ```javascript
   const v1 = result.nodeVoltages[node1Id] || { re: 0, im: 0 };  // node1Id = _1
   const v2 = result.nodeVoltages[node2Id] || { re: 0, im: 0 };  // node2Id = _0
   return new Complex(v1.re - v2.re, v1.im - v2.im);  // V(_1) - V(_0) = -V_expected
   ```
   This negates the voltage, adding 180° to the phase. The MNA matrix is unaffected because admittance stamps are symmetric (`Y` is added to both diagonal entries and subtracted from both off-diagonal entries regardless of terminal order).

## Correctness Properties

Property 1: Bug Condition - Multi-Driver Crossover SPL Accuracy

_For any_ multi-driver crossover project where speakers have non-zero delay parameters, the fixed system response SPL SHALL be within 1 dB of the xSim reference data across the crossover region (1000–3000 Hz), demonstrating correct constructive summation rather than partial cancellation.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Absolute Phase Accuracy

_For any_ speaker component in any circuit, the fixed voltage extraction SHALL use terminals in sorted order (`terminal_0` before `terminal_1`), producing voltage with the correct polarity and phase within 1° of the xSim reference.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation - Single-Driver SPL Accuracy

_For any_ single-driver project (no crossover, no delay), the fixed code SHALL produce SPL values within 0.5 dB of the xSim reference data across the full frequency range, preserving existing single-driver accuracy.

**Validates: Requirements 3.1, 3.6**

Property 4: Preservation - Impedance Calculation Unchanged

_For any_ circuit, the impedance calculation SHALL produce identical results before and after the fix, since neither the delay correction nor the terminal sorting affects the MNA matrix or source current extraction.

**Validates: Requirements 3.2, 3.5**

## Fix Implementation

### Changes Required

Both root causes have been confirmed through numerical investigation. The fixes are minimal and targeted.

**File**: `src/simulation/FrequencyAnalyzer.js`

**Function**: `calculateSPL()`

**Specific Changes**:
1. **Remove `/1000` from delay calculation**: The delay parameter is already in seconds. Change:
   ```javascript
   // Before (buggy):
   const delaySeconds = speakerComponent.parameters.delay / 1000;
   // After (fixed):
   const delaySeconds = speakerComponent.parameters.delay;
   ```
   This single-line change restores the correct delay phase shift. For the tonic woofer at 1000 Hz, the phase shift goes from -0.029° (wrong) to -28.97° (correct).

---

**File**: `src/simulation/CircuitSolver.js`

**Function**: `solveAllFrequencies()`

**Specific Changes**:
2. **Sort terminals after discovery**: In the voltage extraction section where `getComponentTerminals()` is called to build `componentVoltages`, sort the terminals array so that `terminal_0` comes before `terminal_1`:
   ```javascript
   const terminals = this.getComponentTerminals(component);
   terminals.sort(); // Lexicographic sort: "_0" < "_1"
   const node1Id = terminals[0];
   const node2Id = terminals[1];
   ```
   Lexicographic string sort ensures `componentId_0` comes before `componentId_1`. This produces the correct voltage polarity `V(_0) - V(_1)`.

   Note: The terminal ordering in the MNA matrix stamping (earlier in `solveAllFrequencies()`) does NOT need to change — admittance stamps are symmetric, so terminal order doesn't affect the matrix. Only the voltage extraction needs the sort.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate both bugs BEFORE implementing the fixes. Confirm the root cause analysis.

**Test Plan**: Write tests that load the tonic two-way crossover project, run the simulation, and compare SPL/phase against xSim reference .FRD data. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Delay Phase Shift Test**: For the tonic woofer with delay = 0.0000804827 s, verify the delay phase shift at 1000 Hz. Expected: -28.97°. Unfixed code produces: -0.029° (will fail on unfixed code)
2. **Crossover SPL Test**: Load tonic project, simulate, compare system SPL at 1000–3000 Hz against reference. Expected: within 1 dB. Unfixed code shows 2.4 dB dip (will fail on unfixed code)
3. **Terminal Ordering Test**: Check that `getComponentTerminals()` returns terminals with `_0` before `_1`. Unfixed code returns `[_1, _0]` (will fail on unfixed code)
4. **Absolute Phase Test**: Compare speaker voltage phase at 1 Hz against expected ~0°. Unfixed code shows ~180° (will fail on unfixed code)

**Expected Counterexamples**:
- Delay phase shift is ~1000x too small, causing partial cancellation at crossover
- Terminal ordering is reversed, causing 180° absolute phase offset
- Possible cause confirmed: `/1000` divisor on delay already in seconds, and wire iteration order for terminals

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input).hasDelayBug DO
  result := calculateSPL_fixed(input.speaker, input.frequency)
  expectedPhaseShift := -360 * input.frequency * input.speaker.parameters.delay
  ASSERT abs(result.delayPhaseShift - expectedPhaseShift) < 0.01
END FOR

FOR ALL input WHERE isBugCondition(input).hasTerminalBug DO
  terminals := getComponentTerminals_fixed(input.component)
  ASSERT terminals[0] < terminals[1]  // sorted order
  voltage := V(terminals[0]) - V(terminals[1])
  ASSERT voltage has correct polarity (no 180° offset)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input).hasDelayBug DO
  // Single-driver projects with delay = 0
  ASSERT calculateSPL_original(input) = calculateSPL_fixed(input)
END FOR

FOR ALL input WHERE impedanceCalculation DO
  // Impedance is unaffected by both fixes
  ASSERT calculateImpedance_original(input) = calculateImpedance_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for single-driver projects and impedance calculations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single-Driver SPL Preservation**: Load orbs project, simulate on unfixed code, record SPL values. After fix, verify SPL values match within 0.5 dB of xSim reference
2. **Impedance Preservation**: Load tonic project, compute impedance on unfixed code. After fix, verify impedance values are identical (impedance uses source current, not component voltages)
3. **Muted Speaker Preservation**: Verify muted speakers still return -Infinity SPL after fix
4. **Sensitivity/Polarity Preservation**: Verify sensitivity offset and polarity inversion still apply correctly after fix

### Unit Tests

- Test delay phase shift calculation with known delay values and frequencies (verify no `/1000` divisor)
- Test `getComponentTerminals()` returns sorted terminals for various component types
- Test voltage extraction produces correct polarity with sorted terminals
- Test muted speaker returns -Infinity SPL
- Test sensitivity adjustment is additive dB offset
- Test polarity inversion adds 180° to phase

### Property-Based Tests

- Generate random delay values (0 to 0.01 seconds) and frequencies (20–20000 Hz), verify delay phase shift = -360 × frequency × delay (no `/1000`)
- Generate random component IDs, verify `terminals.sort()` always produces `_0` before `_1`
- Load orbs reference data, generate random frequency subsets, verify single-driver SPL matches within tolerance
- Generate random speaker configurations (muted/unmuted, various sensitivities), verify preservation of non-delay behaviors

### Integration Tests

- Load tonic two-way crossover project, simulate with both fixes, compare system SPL against `tonic 0_1_1 system.FRD` reference — verify within 1 dB across full range and within 0.3 dB in crossover region
- Load tonic project, compare system phase against reference — verify within 1° (no 180° offset)
- Load orbs single-driver project, simulate with both fixes, compare against `orbs system.FRD` reference — verify within 0.5 dB (preservation)
- Load tonic project, compare impedance against `tonic system.ZMA` reference — verify unchanged
