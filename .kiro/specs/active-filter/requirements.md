# Requirements Document

## Introduction

This document defines the requirements for adding an Active Filter component to the crossover network simulator. The Active Filter is a DSP-based component that implements classic analog filter shapes (Butterworth, Linkwitz-Riley, Bessel) as cascaded biquad sections. It shares the same 4-terminal differential layout and VCVS solver integration as the existing PEQ component, but provides a higher-level interface where the user specifies filter shape, type, order, and turn frequency rather than individual biquad sections. High-order filters (up to order 40) are decomposed internally into cascaded 2nd-order sections with appropriate pole placement for each filter shape.

## Glossary

- **Active_Filter**: A DSP-based component that implements a classic analog filter (Butterworth, Linkwitz-Riley, or Bessel) as cascaded biquad sections with configurable order, type, and turn frequency
- **Filter_Shape**: The mathematical characteristic of the filter's pole placement — Butterworth (maximally flat magnitude), Linkwitz-Riley (two cascaded Butterworth at half order, -6 dB at crossover), or Bessel (maximally flat group delay)
- **Filter_Type**: The passband behavior — Low Pass, High Pass, or Bandpass
- **Filter_Order**: The steepness of the filter rolloff, expressed as an integer from 1 to 40; higher orders produce steeper slopes
- **Turn_Frequency**: The corner/crossover frequency of the filter in Hz; for Bandpass filters this is the center frequency
- **Cascaded_Biquad**: A series of 2nd-order IIR filter sections whose individual transfer functions are multiplied together to form the complete filter response
- **Biquad_Section**: A single 2nd-order IIR filter defined by five coefficients (b0, b1, b2, a1, a2)
- **Pole_Placement**: The mathematical determination of filter pole positions on the s-plane based on the chosen filter shape
- **Circuit_Schema**: The JSON Schema at `server/schemas/circuit.schema.json` that defines all valid component types and their parameters
- **Circuit_Solver**: The MNA-based simulation engine (CircuitSolver.js) that calculates node voltages across the circuit
- **Tune_Dialog**: The modal UI panel (TuneDialog.vue) used to edit component parameters in real time
- **Circuit_Editor**: The canvas-based schematic editor (CircuitEditor.vue) that renders and manages component placement
- **Transfer_Function**: The complex frequency-domain ratio H(f) = V_out(f) / V_in(f) representing the filter's effect on the signal
- **DSP_Rate**: The sample rate in samples per second used for biquad coefficient calculation via the bilinear transform
- **VCVS**: Voltage-Controlled Voltage Source — the MNA modeling approach used for active components where output voltage is a frequency-dependent multiple of input voltage
- **PEQ**: Parametric Equalizer — the existing active component that shares the "A" label prefix with the Active_Filter

## Requirements

### Requirement 1: Active Filter Schema Definition

**User Story:** As a developer, I want the Active Filter component type and its parameters defined in the circuit schema, so that filter data is validated consistently with all other components.

#### Acceptance Criteria

1. THE Circuit_Schema SHALL include "filter" in the component type enum alongside existing types
2. THE Circuit_Schema SHALL define a `filterParameters` definition with required properties: `filterShape`, `filterType`, `filterOrder`, `turnFrequency`, `gain`, `delay`, and `muted`
3. THE Circuit_Schema SHALL validate that `filterShape` is one of: "butterworth", "linkwitzRiley", "bessel"
4. THE Circuit_Schema SHALL validate that `filterType` is one of: "lowPass", "highPass", "bandpass"
5. THE Circuit_Schema SHALL validate that `filterOrder` is an integer with minimum 1 and maximum 40
6. THE Circuit_Schema SHALL validate that `turnFrequency` is a number with exclusiveMinimum 0 representing hertz
7. THE Circuit_Schema SHALL validate that `gain` is a number representing decibels
8. THE Circuit_Schema SHALL validate that `delay` is a number with minimum 0 representing seconds
9. THE Circuit_Schema SHALL validate that `muted` is a boolean
10. THE Circuit_Schema SHALL include a conditional validation rule using `allOf`/`if`/`then` to link the "filter" type to `filterParameters`, consistent with other component type validations

### Requirement 2: Active Filter Component Model

**User Story:** As a developer, I want a Filter model class that extends Component, so that Filter instances can be created, validated, serialized, and deserialized like other components.

#### Acceptance Criteria

1. THE Active_Filter model SHALL extend the Component base class with type "filter"
2. THE Active_Filter model SHALL initialize default parameters: filterShape "butterworth", filterType "lowPass", filterOrder 2, turnFrequency 1000 Hz, gain 0 dB, delay 0 seconds, and muted false
3. THE Active_Filter model SHALL define four terminals at the same positions as PEQ: positive input at offset (-2, -2), negative input at (-2, 2), positive output at (2, -2), and negative output at (2, 2)
4. WHEN validate() is called, THE Active_Filter model SHALL verify filterShape is one of the three valid shapes
5. WHEN validate() is called, THE Active_Filter model SHALL verify filterType is one of the three valid types
6. WHEN validate() is called, THE Active_Filter model SHALL verify filterOrder is an integer between 1 and 40
7. WHEN validate() is called, THE Active_Filter model SHALL verify that filterOrder is even when filterShape is "linkwitzRiley"
8. WHEN validate() is called, THE Active_Filter model SHALL verify turnFrequency is a positive number
9. WHEN validate() is called, THE Active_Filter model SHALL verify gain is a finite number and delay is a non-negative number
10. WHEN toJSON() is called, THE Active_Filter model SHALL serialize all parameters
11. WHEN fromJSON() is called with valid filter data, THE Active_Filter model SHALL reconstruct a Filter instance with all parameters restored
12. FOR ALL valid Active_Filter parameter objects, serializing via toJSON() then deserializing via fromJSON() SHALL produce an equivalent Filter instance (round-trip property)

### Requirement 3: Filter Coefficient Calculation

**User Story:** As a developer, I want accurate filter coefficient computation for Butterworth, Linkwitz-Riley, and Bessel shapes, so that the Active Filter produces the correct frequency response at any order.

#### Acceptance Criteria

1. WHEN a Butterworth filter is requested, THE coefficient calculator SHALL compute pole positions equally spaced on the left half of the unit circle in the s-plane
2. WHEN a Linkwitz-Riley filter of order N is requested, THE coefficient calculator SHALL compute the response as two cascaded Butterworth filters each of order N/2
3. WHEN a Bessel filter is requested, THE coefficient calculator SHALL compute pole positions from the roots of the Bessel polynomial of the specified order
4. WHEN the filter order N is even, THE coefficient calculator SHALL decompose the filter into N/2 second-order biquad sections
5. WHEN the filter order N is odd, THE coefficient calculator SHALL decompose the filter into (N-1)/2 second-order biquad sections plus one first-order section
6. WHEN a Low Pass filter is requested, THE coefficient calculator SHALL produce biquad coefficients implementing a low-pass response at the specified turn frequency
7. WHEN a High Pass filter is requested, THE coefficient calculator SHALL produce biquad coefficients implementing a high-pass response at the specified turn frequency
8. WHEN a Bandpass filter is requested, THE coefficient calculator SHALL produce biquad coefficients implementing a bandpass response centered at the specified turn frequency
9. THE coefficient calculator SHALL use the bilinear transform with frequency pre-warping to convert analog prototype poles to digital biquad coefficients at the configured DSP_Rate
10. WHEN the turn frequency exceeds the Nyquist frequency (DSP_Rate / 2), THE coefficient calculator SHALL clamp the frequency to 95% of Nyquist and log a warning
11. THE coefficient calculator SHALL produce numerically stable coefficients for all supported orders (1 through 40) without NaN or Infinity values

### Requirement 4: Active Filter Transfer Function Evaluation

**User Story:** As a developer, I want the Active Filter to compute its complex transfer function H(f) at any frequency, so that the simulation can determine the filter's effect on the signal.

#### Acceptance Criteria

1. WHEN evaluateTransferFunction(frequency) is called, THE Active_Filter model SHALL compute the combined transfer function as the product of all cascaded biquad section transfer functions
2. THE Active_Filter model SHALL evaluate each Biquad_Section transfer function using H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2) where z = e^(j*2π*f/DSP_Rate)
3. WHEN the Active_Filter has a non-zero gain parameter, THE Active_Filter model SHALL multiply the combined transfer function by 10^(gain/20) to apply global gain
4. WHEN the Active_Filter has a non-zero delay parameter, THE Active_Filter model SHALL multiply the combined transfer function by e^(-j*2π*f*delay) to apply phase delay
5. WHEN the Active_Filter muted parameter is true, THE Active_Filter model SHALL return a transfer function of zero magnitude at all frequencies
6. THE Active_Filter transfer function evaluation SHALL return a complex value with real and imaginary parts for each frequency point
7. WHEN a Butterworth low-pass filter is evaluated at the turn frequency, THE Active_Filter model SHALL produce a magnitude of approximately -3 dB relative to passband
8. WHEN a Linkwitz-Riley filter is evaluated at the turn frequency, THE Active_Filter model SHALL produce a magnitude of approximately -6 dB relative to passband

### Requirement 5: Circuit Solver Integration

**User Story:** As a developer, I want the circuit solver to incorporate Active Filter components into the simulation, so that filter effects appear in the frequency response results.

#### Acceptance Criteria

1. WHEN an Active_Filter component is present in the circuit, THE Circuit_Solver SHALL treat the Active_Filter as a VCVS where the output differential voltage equals the input differential voltage multiplied by the filter transfer function H(f) at each frequency
2. WHEN solving at a given frequency, THE Circuit_Solver SHALL evaluate the Active_Filter transfer function and apply it to the voltage relationship between the filter input terminal pair and output terminal pair
3. THE Circuit_Solver SHALL handle Active_Filter components using the same VCVS stamping mechanism as PEQ components
4. WHEN multiple Active_Filter and PEQ components are present in series, THE Circuit_Solver SHALL correctly cascade their transfer functions through the MNA solution
5. IF an Active_Filter component has no valid connection on all four terminals, THEN THE Circuit_Solver SHALL skip the Active_Filter during simulation and log a warning

### Requirement 6: Active Filter Canvas Rendering

**User Story:** As a user, I want to see the Active Filter component on the circuit schematic with a recognizable symbol, so that I can identify and position it in my crossover design.

#### Acceptance Criteria

1. THE Circuit_Editor SHALL render the Active_Filter component using the same amplifier-style triangle symbol as PEQ but with "H(f)" text label inside the triangle instead of "PEQ"
2. THE Circuit_Editor SHALL render the Active_Filter with positive and negative input terminals on the left and positive and negative output terminals on the right, spanning approximately 4 grid units wide by 4 grid units tall
3. THE Circuit_Editor SHALL render the Active_Filter label (e.g., "A1") above or below the component symbol
4. WHEN the Active_Filter is selected, THE Circuit_Editor SHALL highlight the symbol using the same selection style as other components
5. WHEN the Active_Filter is rotated, THE Circuit_Editor SHALL rotate the symbol and terminal positions consistent with other component rotation behavior
6. WHEN the Active_Filter muted parameter is true, THE Circuit_Editor SHALL render the component with a visual muted indicator

### Requirement 7: Active Filter Tune Dialog

**User Story:** As a user, I want a tuning dialog for the Active Filter that lets me configure filter shape, type, order, and turn frequency, so that I can design crossover filters interactively.

#### Acceptance Criteria

1. WHEN the user double-clicks an Active_Filter component, THE Tune_Dialog SHALL display the Filter Configuration panel
2. THE Tune_Dialog SHALL display a filter shape selector with options: Butterworth, Linkwitz-Riley, and Bessel
3. THE Tune_Dialog SHALL display a filter type selector with options: Low Pass, High Pass, and Bandpass
4. THE Tune_Dialog SHALL display a filter order spinner allowing integer values from 1 to 40
5. THE Tune_Dialog SHALL display a turn frequency input field accepting values in Hz with engineering notation display (e.g., "4 k[Hz]")
6. THE Tune_Dialog SHALL display editable fields for gain (dB) and delay (seconds)
7. THE Tune_Dialog SHALL display a muted checkbox
8. WHEN the user selects "linkwitzRiley" as the filter shape, THE Tune_Dialog SHALL constrain the filter order spinner to step by 2 (even values only: 2, 4, 6, ..., 40)
9. WHEN the user selects "linkwitzRiley" and the current order is odd, THE Tune_Dialog SHALL automatically round the order up to the next even value
10. WHEN the user modifies any Active_Filter parameter, THE Tune_Dialog SHALL update the component parameters and trigger a simulation recalculation in real time
11. IF the user enters a turn frequency exceeding Nyquist (DSP_Rate / 2), THEN THE Tune_Dialog SHALL display a warning indicator

### Requirement 8: Shared Label Assignment

**User Story:** As a developer, I want Active Filter components to share the "A" label counter with PEQ components, so that both active component types are labeled sequentially in the schematic.

#### Acceptance Criteria

1. WHEN an Active_Filter component is added to the circuit, THE label assignment logic SHALL assign a label with prefix "A" followed by an incrementing number (A0, A1, A2, etc.)
2. THE label assignment SHALL use a shared counter between PEQ and Active_Filter components, so that if a PEQ is labeled A0, the next Active_Filter receives A1
3. THE label assignment SHALL skip numbers already in use by other PEQ or Active_Filter components in the circuit
4. WHEN a PEQ or Active_Filter component is deleted and a new active component is added, THE label assignment logic SHALL reuse the lowest available number from the shared counter

### Requirement 9: Active Filter Serialization Round-Trip

**User Story:** As a developer, I want Active Filter components to survive save/load cycles without data loss, so that user configurations are preserved across sessions.

#### Acceptance Criteria

1. WHEN a circuit containing Active_Filter components is saved, THE serializer SHALL include all filter parameters (filterShape, filterType, filterOrder, turnFrequency, gain, delay, muted) in the output JSON
2. WHEN a circuit file containing Active_Filter components is loaded, THE deserializer SHALL reconstruct Filter instances with all parameters intact
3. FOR ALL valid Active_Filter configurations, saving then loading a circuit SHALL produce Active_Filter components with identical parameters to the originals (round-trip property)
4. WHEN a circuit file from a version without Active_Filter support is loaded, THE deserializer SHALL handle the absence of Active_Filter components gracefully without errors
