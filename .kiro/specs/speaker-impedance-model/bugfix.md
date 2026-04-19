# Bugfix Requirements Document

## Introduction

The crossover network simulator (xoxo) has three correctness issues causing its simulation output to diverge significantly from the reference application (xsim):

1. **Fixed speaker impedance** — The circuit solver uses a fixed 8Ω resistive impedance for all speaker components, ignoring loaded ZMA (impedance measurement) data. Real loudspeaker impedance is frequency-dependent with resonance peaks and valleys, so the fixed model causes every voltage divider calculation to be wrong, producing frequency response curves that are much smoother than reality.

2. **SPL not normalized by source voltage** — The SPL calculation uses the absolute speaker voltage (`20*log10(V_speaker)`) instead of normalizing by the source voltage (`20*log10(V_speaker / V_source)`). At passband frequencies where V_speaker ≈ V_source (2.828V for 1W/8Ω), this adds ~9 dB of offset, causing SPL levels to be ~10–15 dB higher than xsim (e.g., xoxo shows S1 tweeter peaking around 105 dB vs. xsim's ~95 dB).

3. **Frequency response inaccuracy at mid/tweeter crossover** — The frequency response graph shows incorrect behavior around the mid and tweeter crossover point. This may be a consequence of issues #1 and #2, or could be a separate issue requiring investigation after the other fixes are applied.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a speaker component has ZMA impedance data loaded AND the circuit solver calculates admittance for that speaker at any frequency THEN the system returns a fixed admittance of `Complex(0.125, 0)` (equivalent to a constant 8Ω resistor), ignoring the speaker's actual frequency-dependent impedance data

1.2 WHEN the impedance graph is displayed for a circuit containing speakers with ZMA data THEN the system shows a smooth curve without the resonance peaks and valleys that are present in the speaker's ZMA measurements, because the solver treats the speaker as a flat 8Ω load

1.3 WHEN a speaker component has no ZMA data loaded (zmaData is null) AND the circuit solver calculates admittance THEN the system returns the same fixed `Complex(0.125, 0)` admittance with no indication that impedance data is missing

1.4 WHEN the SPL is calculated for a speaker at any frequency THEN the system computes `frdMagnitude + 20*log10(voltageMagnitude)` where `voltageMagnitude` is the absolute voltage across the speaker, without normalizing by the source voltage

1.5 WHEN the source voltage is 2.828V (1W at 8Ω) AND the speaker is in the passband (V_speaker ≈ V_source) THEN the system adds approximately `20*log10(2.828) ≈ 9 dB` to the SPL, causing SPL levels to be ~10–15 dB higher than the reference application (xsim)

1.6 WHEN the frequency response graph is displayed for a circuit with mid and tweeter drivers THEN the system shows incorrect behavior around the mid/tweeter crossover point compared to the reference application (xsim)

### Expected Behavior (Correct)

2.1 WHEN a speaker component has ZMA impedance data loaded AND the circuit solver calculates admittance for that speaker at a given frequency THEN the system SHALL interpolate the speaker's ZMA data at that frequency to obtain the impedance magnitude and phase, convert the complex impedance to admittance, and return the frequency-dependent admittance value

2.2 WHEN the impedance graph is displayed for a circuit containing speakers with ZMA data THEN the system SHALL show the characteristic resonance peaks and valleys from the speaker's actual impedance measurements, matching the behavior of the reference application (xsim)

2.3 WHEN a speaker component has no ZMA data loaded (zmaData is null) AND the circuit solver calculates admittance THEN the system SHALL fall back to a nominal 8Ω resistive impedance (admittance of `Complex(0.125, 0)`) as a reasonable default

2.4 WHEN the SPL is calculated for a speaker at any frequency THEN the system SHALL normalize the voltage by the source voltage, computing `frdMagnitude + 20*log10(V_speaker / V_source)` where `V_source = sqrt(P × Z)` from the voltage source parameters

2.5 WHEN the source voltage is 2.828V (1W at 8Ω) AND the speaker is in the passband (V_speaker ≈ V_source) THEN the system SHALL compute `20*log10(V_speaker / V_source) ≈ 0 dB`, resulting in SPL levels that match the reference application (xsim) — e.g., S1 tweeter peaking around 95 dB

2.6 WHEN the frequency response graph is displayed for a circuit with mid and tweeter drivers THEN the system SHALL show correct crossover behavior at the mid/tweeter crossover point, matching the reference application (xsim) — this requires investigation after fixes #1 and #2 are applied to determine if it is a separate issue

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the circuit solver calculates admittance for resistor, capacitor, or inductor components THEN the system SHALL CONTINUE TO compute admittance using the existing formulas (1/R for resistors, 1/(ESR + 1/jωC) for capacitors, 1/(ESR + jωL) for inductors)

3.2 WHEN a passive component is in 'short' state THEN the system SHALL CONTINUE TO return very high conductance `Complex(1e12, 0)` regardless of component type

3.3 WHEN a passive component is in 'open' state THEN the system SHALL CONTINUE TO be excluded from the MNA matrix during simulation

3.4 WHEN the simulation frequency falls outside the range of the speaker's ZMA data THEN the system SHALL CONTINUE TO produce a valid admittance value by clamping to the nearest available ZMA data point (edge extrapolation)

3.5 WHEN a wire-segment component is in the circuit THEN the system SHALL CONTINUE TO model it as 1 milliohm resistance (admittance of `Complex(1000, 0)`)

3.6 WHEN a speaker is muted THEN the system SHALL CONTINUE TO return -Infinity SPL for all frequencies

3.7 WHEN sensitivity adjustment, delay phase shift, or polarity inversion are applied to a speaker THEN the system SHALL CONTINUE TO apply these adjustments correctly on top of the normalized SPL calculation

3.8 WHEN the voltage source parameters are set to the default 1W at 8Ω THEN the system SHALL CONTINUE TO compute V_source = sqrt(1 × 8) = 2.828V
