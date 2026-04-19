# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing fix)
  - **Property 1: Bug Condition** — Fixed Impedance & Missing SPL Normalization
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for reproducibility
  - Test file: `tests/unit/speaker-impedance-bugfix.exploration.property.spec.js`
  - **C1 — Fixed Impedance**: Create a speaker with ZMA data (e.g., 40Ω at 50 Hz, 6Ω at 200 Hz), call `calculateAdmittance(speaker, omega)` at those frequencies. Assert admittance equals `1/Z_complex` from interpolated ZMA data, NOT `Complex(0.125, 0)`. On unfixed code this returns the hardcoded 8Ω stub → test FAILS.
  - **C2 — SPL Normalization**: Create a circuit with 1W/8Ω source (V_source=2.828V) and a speaker in passband (V_speaker ≈ V_source). Assert SPL voltage contribution ≈ `20*log10(V_speaker / V_source) ≈ 0 dB`. On unfixed code the contribution is `20*log10(2.828) ≈ +9 dB` → test FAILS.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Passive Component Admittance & SPL Adjustments
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `tests/unit/speaker-impedance-bugfix.preservation.property.spec.js`
  - **Passive admittance preservation**: Generate random resistors (R > 0), capacitors (C > 0, ESR ≥ 0), inductors (L > 0, ESR ≥ 0) and random frequencies. Call `calculateAdmittance` on unfixed code. Write property: for all passive components, admittance matches the known formulas (1/R, 1/(ESR+1/jωC), 1/(ESR+jωL)). Also verify short state → `Complex(1e12, 0)`, wire-segment → `Complex(1000, 0)`.
  - **No-ZMA fallback preservation**: Speaker with `zmaData = null` → admittance remains `Complex(0.125, 0)`.
  - **Muted speaker preservation**: Muted speaker → SPL is `-Infinity` for all frequencies.
  - **Sensitivity/delay/polarity preservation**: Verify these adjustments still apply correctly on top of SPL calculation (sensitivity adds dB, delay adds phase shift, inverted adds 180°).
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix speaker impedance model and SPL normalization

  - [x] 3.1 Add ZMA interpolation helper to CircuitSolver
    - Add a `interpolateZMA(zmaData, frequency)` method (or standalone function) to `src/simulation/CircuitSolver.js`
    - Use the same linear interpolation with edge clamping as `FrequencyAnalyzer.interpolate`
    - Interpolate both impedance magnitude and phase at the given frequency
    - Convert frequency from `omega / (2π)` before interpolation
    - _Bug_Condition: C1 — speaker.zmaData != null AND speaker.zmaData.frequencies.length > 0_
    - _Requirements: 2.1, 3.4_

  - [x] 3.2 Update `calculateAdmittance` speaker case to use ZMA data
    - In the `case 'speaker'` block of `calculateAdmittance()` (~line 240 in CircuitSolver.js):
    - When `component.zmaData` is not null and has data: interpolate impedance magnitude and phase at `frequency = omega / (2π)`
    - Convert to complex impedance: `Z = |Z| × (cos(φ_rad) + j × sin(φ_rad))`
    - Return complex admittance: `Y = 1 / Z`
    - When `component.zmaData` is null or empty: preserve existing fallback `Complex(0.125, 0)`
    - _Bug_Condition: isBugCondition(input) where component.type == 'speaker' AND component.zmaData != null_
    - _Expected_Behavior: admittance = 1 / Z_interpolated, frequency-dependent_
    - _Preservation: Fallback to 8Ω when no ZMA data; all passive component cases untouched_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.4, 3.5_

  - [x] 3.3 Normalize SPL by source voltage in `calculateSPL`
    - In `calculateSPL()` (~line 90 in FrequencyAnalyzer.js):
    - Find the voltage source component from `this.circuit.components` (type === 'source')
    - Get `sourceVoltage = voltageSource.getVoltage()` (or `Math.sqrt(power × impedance)`)
    - Change `20 * Math.log10(voltageMagnitude)` → `20 * Math.log10(voltageMagnitude / sourceVoltage)`
    - Edge case: if no voltage source found, fall back to `sourceVoltage = 1.0` with console warning
    - _Bug_Condition: isBugCondition(input) where component.type == 'speaker' AND NOT muted_
    - _Expected_Behavior: SPL = frdMagnitude + 20*log10(V_speaker / V_source) + sensitivity_
    - _Preservation: Muted speakers still return -Infinity; sensitivity/delay/polarity adjustments unchanged_
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 3.6, 3.7, 3.8_

  - [x] 3.4 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** — Fixed Impedance & SPL Normalization
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run `npm test -- speaker-impedance-bugfix.exploration.property.spec.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** — Passive Component Admittance & SPL Adjustments
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npm test -- speaker-impedance-bugfix.preservation.property.spec.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_

- [x] 4. Investigate mid/tweeter crossover discrepancy
  - After fixes #1 and #2 are applied and validated, investigate whether the mid/tweeter crossover inaccuracy (requirement 1.6) persists
  - If it persists, document findings and file a separate bug
  - If it is resolved by fixes #1 and #2, document that it was a downstream consequence
  - _Requirements: 1.6, 2.6_

- [ ] 5. **MANUAL** — Export reference FRD files from xsim for comparison
  - ⚠️ This task requires USER action — it cannot be automated
  - Open the test crossover design in xsim
  - Export reference FRD files for each driver (woofer, mid, tweeter) and system response
  - Export reference ZMA file for system impedance
  - Save exported files to `tests/fixtures/` for use in integration comparison
  - Compare xoxo output vs xsim reference — verify SPL curves match within ±0.5 dB magnitude and ±5° phase tolerance
  - If discrepancies remain after fixes, document which frequencies and values are out of tolerance

- [-] 6. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure all existing tests still pass (no regressions)
  - Ensure exploration tests (task 1) now pass
  - Ensure preservation tests (task 2) still pass
  - Ask the user if questions arise
