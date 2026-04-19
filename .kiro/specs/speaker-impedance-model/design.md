# Speaker Impedance Model Bugfix Design

## Overview

The xoxo crossover simulator has two confirmed correctness bugs causing its frequency response output to diverge significantly from the reference application (xsim):

1. **Fixed speaker impedance**: `CircuitSolver.calculateAdmittance()` returns a hardcoded `Complex(0.125, 0)` (8Ω resistive) for all speakers at all frequencies, ignoring loaded ZMA impedance measurement data. Real loudspeaker impedance is frequency-dependent with resonance peaks and phase rotation, so this makes every voltage divider calculation wrong.

2. **SPL not normalized by source voltage**: `FrequencyAnalyzer.calculateSPL()` computes `frdMagnitude + 20*log10(V_speaker)` instead of `frdMagnitude + 20*log10(V_speaker / V_source)`. At passband frequencies where V_speaker ≈ V_source (2.828V for 1W/8Ω), this adds ~9 dB of offset.

A third issue (mid/tweeter crossover inaccuracy) may be a consequence of bugs #1 and #2 and will be investigated after those fixes are applied, validated against xsim reference data.

The fix strategy is: fix → verify against xsim reference exports → investigate remaining discrepancies.

## Glossary

- **Bug_Condition (C)**: Two conditions: (C1) speaker has ZMA data but solver ignores it; (C2) SPL calculation uses absolute voltage instead of voltage ratio
- **Property (P)**: (P1) solver uses frequency-dependent interpolated impedance from ZMA data; (P2) SPL is normalized by V_source
- **Preservation**: All passive component admittance calculations, wire-segment modeling, muted speaker behavior, sensitivity/delay/polarity adjustments, open/short state handling
- **calculateAdmittance**: Method in `src/simulation/CircuitSolver.js` (line ~196) that computes complex admittance Y=1/Z for each component at a given angular frequency ω
- **calculateSPL**: Method in `src/simulation/FrequencyAnalyzer.js` (line ~26) that computes SPL for a speaker across all simulation frequencies
- **ZMA data**: Parsed impedance measurement data `{frequencies[], impedances[], phases[]}` stored on `speaker.zmaData`, loaded from `.zma` files
- **V_source**: Source voltage computed as `sqrt(power × impedance)` from the voltage source parameters (default: sqrt(1×8) = 2.828V)
- **xsim**: The reference application whose output xoxo must match within tolerance

## Bug Details

### Bug Condition

The bugs manifest in two independent code paths during circuit simulation:

**Bug C1 — Fixed Impedance**: When a speaker component has ZMA data loaded (`speaker.zmaData` is not null) and the circuit solver calls `calculateAdmittance(speaker, omega)`, the method ignores `speaker.zmaData` entirely and returns a hardcoded `Complex(0.125, 0)` regardless of frequency.

**Bug C2 — Missing Voltage Normalization**: When `calculateSPL` computes the voltage contribution to SPL, it uses `20*log10(voltageMagnitude)` where `voltageMagnitude` is the absolute voltage across the speaker, without dividing by the source voltage `V_source`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type {component: Component, frequency: number, solverResults: Object}
  OUTPUT: boolean

  // C1: Speaker with ZMA data gets wrong admittance
  IF input.component.type == 'speaker'
     AND input.component.zmaData != null
     AND input.component.zmaData.frequencies.length > 0
  THEN RETURN true

  // C2: Any speaker SPL calculation missing normalization
  IF input.component.type == 'speaker'
     AND input.component.frdData != null
     AND NOT input.component.parameters.muted
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **C1 at resonance**: Speaker with ZMA showing 40Ω impedance peak at 50 Hz → solver uses 8Ω → voltage divider ratio is completely wrong at that frequency
- **C1 at minimum**: Speaker with ZMA showing 6Ω minimum at 200 Hz → solver uses 8Ω → voltage divider is wrong in the opposite direction
- **C2 passband offset**: V_source = 2.828V, V_speaker ≈ 2.828V in passband → current code adds `20*log10(2.828) ≈ 9.03 dB` → xoxo shows ~105 dB where xsim shows ~95 dB
- **C2 with attenuation**: V_source = 2.828V, V_speaker = 0.283V (20 dB down) → current code adds `20*log10(0.283) ≈ -10.96 dB` → should be `20*log10(0.283/2.828) = -20 dB`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Resistor admittance: `Y = 1/R` (purely real)
- Capacitor admittance: `Y = 1/(ESR + 1/(jωC))`
- Inductor admittance: `Y = 1/(ESR + jωL)`
- Short state: returns `Complex(1e12, 0)` for any component type
- Open state: component excluded from MNA matrix
- Wire-segment: returns `Complex(1000, 0)` (1 mΩ resistance)
- Muted speakers: return `-Infinity` SPL for all frequencies
- Sensitivity adjustment: added to SPL after voltage contribution
- Delay phase shift: `-360 × f × delay_seconds` applied to phase
- Polarity inversion: 180° phase shift when `inverted` is true
- Voltage source: `V = sqrt(P × Z)`, default 1W at 8Ω = 2.828V
- Speaker with no ZMA data: falls back to 8Ω nominal impedance

**Scope:**
All inputs that do NOT involve speaker admittance calculation or SPL voltage contribution should be completely unaffected by this fix. This includes:
- All passive component calculations (resistors, capacitors, inductors)
- Wire-segment modeling
- Voltage source behavior
- MNA matrix construction for non-speaker components
- Phase calculations (delay, polarity, FRD phase)
- Smoothing algorithms
- Impedance graph calculation (uses source current, not SPL)

## Hypothesized Root Cause

Based on code analysis:

1. **`calculateAdmittance` speaker case is a stub**: The `case 'speaker'` block in `CircuitSolver.calculateAdmittance()` (line ~240) contains a comment "For now, use a simple model (will be enhanced in later tasks)" and returns `Complex(0.125, 0)`. The ZMA data exists on `component.zmaData` but is never accessed. The fix requires interpolating ZMA data at the given frequency, converting impedance magnitude + phase to complex impedance, then inverting to admittance.

2. **`calculateSPL` missing voltage ratio**: In `FrequencyAnalyzer.calculateSPL()` (line ~90), the code computes `calculatedSPL += 20 * Math.log10(voltageMagnitude)`. The `FrequencyAnalyzer` has access to `this.circuit` which contains the voltage source component. The fix requires finding the voltage source, calling `getVoltage()` to get V_source, and computing `20 * Math.log10(voltageMagnitude / sourceVoltage)` instead.

3. **Mid/tweeter crossover**: Likely a downstream consequence of bugs #1 and #2. With incorrect impedance modeling, the voltage divider ratios at crossover frequencies are wrong, and the SPL offset compounds the error. Will be investigated after fixes are applied.

## Correctness Properties

Property 1: Bug Condition — Frequency-Dependent Speaker Admittance

_For any_ speaker component with loaded ZMA data and _for any_ simulation frequency within the ZMA data range, the fixed `calculateAdmittance` function SHALL interpolate the ZMA impedance magnitude and phase at that frequency, convert to complex impedance `Z = |Z| × (cos(φ) + j×sin(φ))`, and return the complex admittance `Y = 1/Z`, rather than a fixed 8Ω value.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — SPL Normalized by Source Voltage

_For any_ non-muted speaker with FRD data and _for any_ simulation frequency where the speaker voltage magnitude is greater than zero, the fixed `calculateSPL` function SHALL compute the voltage contribution as `20*log10(V_speaker / V_source)` where `V_source = sqrt(power × impedance)` from the circuit's voltage source parameters.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation — Passive Component Admittance Unchanged

_For any_ passive component (resistor, capacitor, inductor) and _for any_ frequency, the fixed `calculateAdmittance` function SHALL produce exactly the same admittance value as the original function, preserving all existing passive component calculations.

**Validates: Requirements 3.1, 3.2, 3.5**

Property 4: Preservation — SPL Adjustments Unchanged

_For any_ non-muted speaker, the fixed `calculateSPL` function SHALL continue to apply sensitivity adjustment, delay phase shift, and polarity inversion identically to the original function, with only the voltage contribution formula changed.

**Validates: Requirements 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/simulation/CircuitSolver.js`

**Function**: `calculateAdmittance(component, omega)`

**Specific Changes**:
1. **Add ZMA interpolation in speaker case**: When `component.zmaData` is not null and has data, interpolate impedance magnitude and phase at the current frequency (`frequency = omega / (2π)`)
2. **Convert to complex impedance**: `Z = |Z| × (cos(φ_rad) + j × sin(φ_rad))` where φ_rad is the interpolated phase converted to radians
3. **Return complex admittance**: `Y = 1 / Z`
4. **Preserve fallback**: When `component.zmaData` is null or empty, continue returning `Complex(0.125, 0)` (8Ω nominal)
5. **Edge extrapolation**: When frequency is below/above ZMA data range, clamp to the nearest available data point (same behavior as `FrequencyAnalyzer.interpolate`)

**File**: `src/simulation/FrequencyAnalyzer.js`

**Function**: `calculateSPL(speakerComponent, currentAngle)`

**Specific Changes**:
1. **Find voltage source**: At the start of the method, find the voltage source component from `this.circuit.components`
2. **Get source voltage**: Call `voltageSource.getVoltage()` to obtain V_source (or compute `Math.sqrt(power × impedance)` directly)
3. **Normalize voltage**: Change `20 * Math.log10(voltageMagnitude)` to `20 * Math.log10(voltageMagnitude / sourceVoltage)`
4. **Handle edge case**: If no voltage source is found, fall back to V_source = 1.0 (no normalization) with a console warning

**Helper**: An `interpolate(xArray, yArray, x)` method already exists on `FrequencyAnalyzer`. The same linear interpolation logic (with edge clamping) should be used in `CircuitSolver` for ZMA data. Either extract it to a shared utility or duplicate the small function.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior. Final validation involves comparing xoxo output against xsim reference FRD/ZMA exports.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that create speakers with known ZMA data and verify the admittance returned by `calculateAdmittance`. Write tests that check the SPL output against expected normalized values. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Fixed impedance test**: Create speaker with ZMA data showing 40Ω at 50 Hz, call `calculateAdmittance` at 50 Hz → expect admittance ≠ Complex(0.125, 0) (will fail on unfixed code, returning 0.125 instead of ~0.025)
2. **SPL offset test**: Create circuit with 1W/8Ω source, speaker in passband (V_speaker ≈ V_source) → expect SPL ≈ FRD magnitude + 0 dB (will fail on unfixed code, showing ~+9 dB offset)
3. **Frequency-dependent impedance test**: Create speaker with ZMA data having different impedances at different frequencies → expect different admittances (will fail on unfixed code, all returning 0.125)

**Expected Counterexamples**:
- `calculateAdmittance(speaker_with_zma, omega_50Hz)` returns `Complex(0.125, 0)` instead of frequency-dependent value
- `calculateSPL` returns SPL values ~9 dB too high in passband

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL speaker WHERE speaker.zmaData != null DO
  FOR ALL frequency IN simulationRange DO
    admittance := calculateAdmittance_fixed(speaker, 2π × frequency)
    expectedZ := interpolateZMA(speaker.zmaData, frequency)
    expectedY := 1 / expectedZ
    ASSERT admittance ≈ expectedY
  END FOR
END FOR

FOR ALL speaker WHERE NOT speaker.muted DO
  FOR ALL frequency WHERE V_speaker > 0 DO
    spl := calculateSPL_fixed(speaker, frequency)
    expectedContribution := 20*log10(V_speaker / V_source)
    ASSERT spl ≈ frdMagnitude + expectedContribution + sensitivity
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL component WHERE component.type IN ['resistor', 'capacitor', 'inductor', 'wire-segment'] DO
  FOR ALL frequency IN simulationRange DO
    ASSERT calculateAdmittance_original(component, omega) = calculateAdmittance_fixed(component, omega)
  END FOR
END FOR

FOR ALL speaker WHERE speaker.zmaData == null DO
  ASSERT calculateAdmittance_fixed(speaker, omega) = Complex(0.125, 0)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random component configurations and frequencies automatically
- It catches edge cases (extreme frequencies, very small/large component values)
- It provides strong guarantees that passive component behavior is unchanged

**Test Plan**: Capture behavior of unfixed code for passive components, then write property-based tests verifying the fixed code produces identical results.

**Test Cases**:
1. **Passive admittance preservation**: Generate random resistors, capacitors, inductors with random values and frequencies → verify admittance is identical before and after fix
2. **No-ZMA fallback preservation**: Speaker with null zmaData → verify admittance remains Complex(0.125, 0)
3. **Muted speaker preservation**: Muted speaker → verify SPL is still -Infinity
4. **Sensitivity/delay/polarity preservation**: Verify these adjustments still apply correctly on top of the now-normalized SPL

### Unit Tests

- Test `calculateAdmittance` with speaker having known ZMA data at specific frequencies
- Test `calculateAdmittance` with speaker having no ZMA data (fallback)
- Test `calculateAdmittance` at frequencies outside ZMA range (edge clamping)
- Test `calculateSPL` with known V_source and V_speaker values
- Test `calculateSPL` with default 1W/8Ω source in passband (expect ~0 dB contribution)

### Property-Based Tests

- Generate random ZMA data (monotonic frequencies, positive impedances, phases in [-180, 180]) and verify admittance matches manual interpolation + inversion
- Generate random passive components and verify admittance is unchanged by the fix
- Generate random source power/impedance configurations and verify SPL normalization is correct

### Integration Tests

- **MANUAL**: Export reference FRD files from xsim for the test crossover design
- **MANUAL**: Run xoxo simulation on the same design and export FRD files
- **MANUAL**: Compare xoxo vs xsim FRD output — verify SPL curves match within ±0.5 dB magnitude tolerance
- **MANUAL**: After fixes #1 and #2, investigate mid/tweeter crossover discrepancy — if it persists, file a separate bug
