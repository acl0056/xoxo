# Bugfix Requirements Document

## Introduction

The crossover network simulator (xoxo) produces inaccurate system response when combining multiple drivers in a multi-way crossover design. Comparing xoxo's output against the reference application (xSim) using exported .FRD reference data reveals:

- **Single driver (orbs)**: xoxo matches xSim within 0.5 dB across the full frequency range — the single-driver simulation is accurate.
- **Two-way crossover (tonic)**: xoxo shows a dip of up to **2.4 dB** in the crossover region (1000–3000 Hz) compared to xSim's flat ~84 dB response. The maximum error occurs around 1900 Hz.

Two bugs have been identified through numerical investigation:

1. **Delay units mismatch (PRIMARY)**: In `FrequencyAnalyzer.calculateSPL()`, the speaker delay parameter is already stored in seconds (e.g., `0.0000804827191049731`), but the code divides by 1000 treating it as milliseconds. This makes the delay effectively zero, eliminating the phase shift needed for correct multi-driver summation. At 1000 Hz the correct delay phase shift should be -28.97°, but the code applies -0.029°. This ~29° phase error at the crossover frequency causes partial cancellation instead of constructive summation, producing the 2.4 dB dip.

2. **Terminal ordering in voltage extraction**: `getComponentTerminals()` in `CircuitSolver` discovers terminals in wire iteration order, consistently returning `[componentId_1, componentId_0]` instead of `[componentId_0, componentId_1]`. Since voltage is computed as `V(terminals[0]) - V(terminals[1])`, this produces the negative of the expected voltage, adding 180° to the absolute phase. This does NOT cause the crossover dip (both speakers have the same flip, so relative phase is preserved), but it makes the absolute phase wrong by 180°.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the system response is calculated for a two-way crossover project (tonic) with two drivers AND the frequency is in the crossover region (1000–3000 Hz) THEN the system produces SPL values up to 2.4 dB lower than the xSim reference, showing a dip where xSim shows a flat response

1.2 WHEN a speaker has a non-zero delay parameter (stored in seconds) AND `calculateSPL()` computes the delay phase shift THEN the code divides the delay by 1000 (treating it as milliseconds), making the effective delay ~1000x too small and the delay phase shift negligible

1.3 WHEN `getComponentTerminals()` discovers terminals for a speaker component THEN it returns terminals in wire iteration order `[componentId_1, componentId_0]` instead of sorted order `[componentId_0, componentId_1]`, causing voltage to be computed as the negative of the expected value and adding 180° to the absolute phase

### Expected Behavior (Correct)

2.1 WHEN the system response is calculated for a two-way crossover project (tonic) with two drivers AND the frequency is in the crossover region (1000–3000 Hz) THEN the system SHALL produce SPL values within 1 dB of the xSim reference data, showing a flat response through the crossover region

2.2 WHEN a speaker has a non-zero delay parameter (stored in seconds) AND `calculateSPL()` computes the delay phase shift THEN the code SHALL use the delay value directly as seconds without dividing by 1000, producing the correct phase shift (e.g., -28.97° at 1000 Hz for the tonic woofer)

2.3 WHEN `getComponentTerminals()` discovers terminals for a component THEN the terminals SHALL be returned in a consistent sorted order so that `terminal_0` comes before `terminal_1`, producing the correct voltage polarity

2.4 WHEN the system response phase is compared to xSim at any frequency for the tonic project THEN the xoxo phase values SHALL be within 1° of xSim's phase values, without a systematic 180° offset

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the system response is calculated for a single-driver project (orbs) THEN the system SHALL CONTINUE TO produce SPL values within 0.5 dB of the xSim reference data across the full frequency range (20 Hz–20 kHz)

3.2 WHEN the circuit solver computes voltage across speaker terminals using MNA THEN the system SHALL CONTINUE TO return correct complex voltage values (magnitude and phase) for all passive components

3.3 WHEN a speaker is muted THEN the system SHALL CONTINUE TO return -Infinity SPL and exclude that speaker from the system response summation

3.4 WHEN sensitivity adjustment or polarity inversion are applied to a speaker THEN the system SHALL CONTINUE TO apply these adjustments correctly

3.5 WHEN the impedance response is calculated THEN the system SHALL CONTINUE TO produce correct impedance magnitude and phase values using the ZMA-based speaker impedance model

3.6 WHEN the SPL is calculated for an individual speaker THEN the system SHALL CONTINUE TO normalize by source voltage using `20*log10(V_speaker / V_source)`
