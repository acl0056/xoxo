# Requirements Document

## Introduction

This document defines the requirements for adding a Parametric Equalizer (PEQ) component to the crossover network simulator. The PEQ is a DSP-based active component that applies configurable biquad filter sections to modify the frequency response of a signal path. Unlike passive components (resistor, capacitor, inductor) which are modeled as admittance elements in the MNA matrix, the PEQ operates as a transfer function H(f) that modifies voltage at its output relative to its input. It supports multiple cascaded filter sections, global gain, and signal delay.

## Glossary

- **PEQ**: Parametric Equalizer — an active DSP component that applies biquad filter sections to shape frequency response
- **Biquad_Filter**: A second-order IIR filter defined by five coefficients (b0, b1, b2, a1, a2) that implements a specific filter type at a given frequency and Q factor
- **Filter_Section**: A single biquad filter stage within the PEQ, characterized by filter type, center frequency, Q factor, and bypass state
- **Transfer_Function**: The complex frequency-domain ratio H(f) = V_out(f) / V_in(f) representing the PEQ's effect on the signal
- **DSP_Rate**: The sample rate in samples per second (sps) used for biquad coefficient calculation via the bilinear transform
- **Circuit_Schema**: The JSON Schema at `src/schemas/circuit.schema.json` that defines all valid component types and their parameters
- **Component_Registry**: The set of recognized component types in the schema enum and Component model class
- **Tune_Dialog**: The modal UI panel (TuneDialog.vue) used to edit component parameters in real time
- **Circuit_Solver**: The MNA-based simulation engine (CircuitSolver.js) that calculates node voltages across the circuit
- **Frequency_Analyzer**: The module (FrequencyAnalyzer.js) that computes SPL and frequency response from solver results

## Requirements

### Requirement 1: PEQ Schema Definition

**User Story:** As a developer, I want the PEQ component type and its parameters defined in the circuit schema, so that PEQ data is validated consistently with all other components.

#### Acceptance Criteria

1. THE Circuit_Schema SHALL include "peq" in the component type enum alongside existing types
2. THE Circuit_Schema SHALL define a `peqParameters` definition with required properties: `gain`, `delay`, `dspRate`, `sections`, and `muted`
3. WHEN a PEQ component is serialized, THE Circuit_Schema SHALL validate that `gain` is a number representing decibels
4. WHEN a PEQ component is serialized, THE Circuit_Schema SHALL validate that `delay` is a number with minimum 0 representing seconds
5. WHEN a PEQ component is serialized, THE Circuit_Schema SHALL validate that `dspRate` is a number with exclusiveMinimum 0 representing samples per second
6. WHEN a PEQ component is serialized, THE Circuit_Schema SHALL validate that `sections` is an array of Filter_Section objects with minItems 1 and maxItems 10
7. THE Circuit_Schema SHALL define each Filter_Section with required properties: `filterType`, `frequency`, `q`, and `bypass`
8. THE Circuit_Schema SHALL validate that `filterType` is one of: "peaking", "highShelf", "lowShelf", "lowPass1", "highPass1", "lowPass2", "highPass2", "allPass"
9. THE Circuit_Schema SHALL validate that Filter_Section `frequency` is a number with exclusiveMinimum 0 representing hertz
10. THE Circuit_Schema SHALL validate that Filter_Section `q` is a number with exclusiveMinimum 0
11. THE Circuit_Schema SHALL validate that Filter_Section `bypass` is a boolean
12. WHEN a peaking or shelf Filter_Section is defined, THE Circuit_Schema SHALL include a `gain` property (number, in dB) for that section

### Requirement 2: PEQ Component Model

**User Story:** As a developer, I want a PEQ model class that extends Component, so that PEQ instances can be created, validated, serialized, and deserialized like other components.

#### Acceptance Criteria

1. THE PEQ model SHALL extend the Component base class with type "peq"
2. THE PEQ model SHALL initialize default parameters: gain 0 dB, delay 0 seconds, dspRate 48000, muted false, and one default Filter_Section (peaking, 1000 Hz, Q 0.707, gain 0 dB, bypass false)
3. THE PEQ model SHALL define four terminals: positive input (top-left), negative input (bottom-left), positive output (top-right), and negative output (bottom-right)
4. WHEN validate() is called, THE PEQ model SHALL verify gain is a finite number
5. WHEN validate() is called, THE PEQ model SHALL verify delay is a non-negative number
6. WHEN validate() is called, THE PEQ model SHALL verify dspRate is a positive number
7. WHEN validate() is called, THE PEQ model SHALL verify sections contains between 1 and 10 valid Filter_Section entries
8. WHEN validate() is called, THE PEQ model SHALL verify each Filter_Section has a valid filterType, positive frequency, positive Q, and boolean bypass
9. WHEN toJSON() is called, THE PEQ model SHALL serialize all parameters including the sections array
10. WHEN fromJSON() is called with valid PEQ data, THE PEQ model SHALL reconstruct a PEQ instance with all parameters and sections restored
11. FOR ALL valid PEQ parameter objects, serializing via toJSON() then deserializing via fromJSON() SHALL produce an equivalent PEQ instance (round-trip property)

### Requirement 3: Biquad Coefficient Calculation

**User Story:** As a developer, I want accurate biquad filter coefficient computation, so that each Filter_Section produces the correct frequency response.

#### Acceptance Criteria

1. WHEN a Filter_Section with type "peaking" is provided, THE Biquad_Filter calculator SHALL compute coefficients using the standard peaking EQ formula with center frequency, Q, and gain parameters
2. WHEN a Filter_Section with type "highShelf" is provided, THE Biquad_Filter calculator SHALL compute coefficients using the standard high-shelf formula with transition frequency, Q, and gain parameters
3. WHEN a Filter_Section with type "lowShelf" is provided, THE Biquad_Filter calculator SHALL compute coefficients using the standard low-shelf formula with transition frequency, Q, and gain parameters
4. WHEN a Filter_Section with type "lowPass1" is provided, THE Biquad_Filter calculator SHALL compute coefficients for a first-order low-pass filter at the specified frequency
5. WHEN a Filter_Section with type "highPass1" is provided, THE Biquad_Filter calculator SHALL compute coefficients for a first-order high-pass filter at the specified frequency
6. WHEN a Filter_Section with type "lowPass2" is provided, THE Biquad_Filter calculator SHALL compute coefficients for a second-order low-pass filter at the specified frequency and Q
7. WHEN a Filter_Section with type "highPass2" is provided, THE Biquad_Filter calculator SHALL compute coefficients for a second-order high-pass filter at the specified frequency and Q
8. WHEN a Filter_Section with type "allPass" is provided, THE Biquad_Filter calculator SHALL compute coefficients for a second-order all-pass filter at the specified frequency and Q
9. THE Biquad_Filter calculator SHALL use the bilinear transform with frequency pre-warping to convert analog prototypes to digital coefficients at the configured DSP_Rate
10. WHEN the filter frequency exceeds the Nyquist frequency (dspRate / 2), THE Biquad_Filter calculator SHALL clamp the frequency to 95% of Nyquist and log a warning

### Requirement 4: PEQ Transfer Function Evaluation

**User Story:** As a developer, I want the PEQ to compute its complex transfer function H(f) at any frequency, so that the simulation can determine the PEQ's effect on the signal.

#### Acceptance Criteria

1. WHEN evaluateTransferFunction(frequency) is called, THE PEQ model SHALL compute the combined transfer function as the product of all non-bypassed Filter_Section transfer functions
2. WHEN a Filter_Section has bypass set to true, THE PEQ model SHALL exclude that section from the transfer function product (treat as unity gain)
3. THE PEQ model SHALL evaluate each biquad section's transfer function using H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2) where z = e^(j*2π*f/dspRate)
4. WHEN the PEQ has a non-zero gain parameter, THE PEQ model SHALL multiply the combined transfer function by 10^(gain/20) to apply global gain
5. WHEN the PEQ has a non-zero delay parameter, THE PEQ model SHALL multiply the combined transfer function by e^(-j*2π*f*delay) to apply phase delay
6. WHEN the PEQ muted parameter is true, THE PEQ model SHALL return a transfer function of zero magnitude at all frequencies
7. THE PEQ transfer function evaluation SHALL return a complex value with real and imaginary parts for each frequency point

### Requirement 5: Circuit Solver Integration

**User Story:** As a developer, I want the circuit solver to incorporate PEQ components into the simulation, so that PEQ effects appear in the frequency response results.

#### Acceptance Criteria

1. WHEN a PEQ component is present in the circuit, THE Circuit_Solver SHALL treat the PEQ as a voltage-controlled voltage source where the output differential voltage equals the input differential voltage multiplied by the PEQ transfer function H(f) at each frequency
2. WHEN solving at a given frequency, THE Circuit_Solver SHALL evaluate the PEQ transfer function and apply it to the voltage relationship between the PEQ input terminal pair and output terminal pair
3. WHEN multiple PEQ components are present in series, THE Circuit_Solver SHALL correctly cascade their transfer functions through the MNA solution
4. WHEN a PEQ component is connected in a circuit path, THE Frequency_Analyzer SHALL include the PEQ's effect in the calculated SPL and phase response
5. IF a PEQ component has no valid connection on all four terminals, THEN THE Circuit_Solver SHALL skip the PEQ during simulation and log a warning

### Requirement 6: PEQ Canvas Rendering

**User Story:** As a user, I want to see the PEQ component on the circuit schematic with a recognizable symbol, so that I can identify and position it in my crossover design.

#### Acceptance Criteria

1. THE Circuit_Editor SHALL render the PEQ component using an amplifier-style triangle symbol with "PEQ" text label
2. THE Circuit_Editor SHALL render the PEQ component with positive and negative input terminals on the left and positive and negative output terminals on the right, spanning approximately 4 grid units wide by 4 grid units tall
3. THE Circuit_Editor SHALL render the PEQ label (e.g., "A0") above or below the component symbol
4. WHEN the PEQ is selected, THE Circuit_Editor SHALL highlight the PEQ symbol using the same selection style as other components
5. WHEN the PEQ is rotated, THE Circuit_Editor SHALL rotate the symbol and terminal positions consistent with other component rotation behavior
6. WHEN the PEQ muted parameter is true, THE Circuit_Editor SHALL render the PEQ with a visual muted indicator

### Requirement 7: PEQ Tune Dialog

**User Story:** As a user, I want a tuning dialog for the PEQ that lets me configure gain, delay, DSP rate, and individual filter sections, so that I can shape the frequency response interactively.

#### Acceptance Criteria

1. WHEN the user double-clicks a PEQ component, THE Tune_Dialog SHALL display the PEQ configuration panel
2. THE Tune_Dialog SHALL display editable fields for: component label, global gain (dB), delay (seconds), DSP rate (combo box with preset options 48000, 96000, 192000 but allowing custom entry), and muted checkbox
3. THE Tune_Dialog SHALL display a configurable number of Filter_Section rows (1 to 10)
4. THE Tune_Dialog SHALL display each Filter_Section row with: filter type dropdown, frequency input (Hz), Q input, section gain input (for peaking/shelf types), and bypass checkbox
5. WHEN the user adds a new Filter_Section, THE Tune_Dialog SHALL append a section with default values (peaking, 1000 Hz, Q 0.707, gain 0 dB, bypass false)
6. WHEN the user removes a Filter_Section, THE Tune_Dialog SHALL remove the section from the array, provided at least one section remains
7. WHEN the user modifies any PEQ parameter, THE Tune_Dialog SHALL update the component parameters and trigger a simulation recalculation in real time
8. WHEN a Filter_Section type is not peaking, lowShelf, or highShelf, THE Tune_Dialog SHALL hide the section gain input for that row
9. IF the user enters a frequency exceeding Nyquist (dspRate / 2), THEN THE Tune_Dialog SHALL display a warning indicator on that section row

### Requirement 8: PEQ Biquad Export

**User Story:** As a user, I want to view and export the computed biquad coefficients for my PEQ configuration, so that I can program them into an external DSP processor.

#### Acceptance Criteria

1. THE Tune_Dialog SHALL include a "View/Export BiQuads" button for PEQ components
2. WHEN the user clicks "View/Export BiQuads", THE application SHALL open a separate export window displaying the computed biquad coefficients for all Filter_Sections
3. THE export window SHALL display coefficients in plain text format with each section headed by "biquadN," followed by "b0=value," "b1=value," "b2=value," "a1=value," "a2=value," on separate lines
4. THE biquad export SHALL show coefficients normalized so that a0 = 1 (a0 is implicit and not listed)
5. THE export window SHALL include actions for: save to file, select all, and copy to clipboard
6. THE biquad export SHALL include all sections (bypassed sections export as unity: b0=1, b1=0, b2=0, a1=0, a2=0)

### Requirement 9: PEQ Component Label Assignment

**User Story:** As a developer, I want PEQ components to receive auto-assigned labels following the existing labeling convention, so that each PEQ is uniquely identifiable in the schematic.

#### Acceptance Criteria

1. WHEN a PEQ component is added to the circuit, THE Component_Registry SHALL assign a label with prefix "A" followed by an incrementing number (A0, A1, A2, etc.)
2. THE label assignment SHALL skip numbers already in use by other PEQ components in the circuit
3. WHEN a PEQ component is deleted and a new one added, THE Component_Registry SHALL reuse the lowest available number

### Requirement 10: PEQ Serialization Round-Trip

**User Story:** As a developer, I want PEQ components to survive save/load cycles without data loss, so that user configurations are preserved across sessions.

#### Acceptance Criteria

1. WHEN a circuit containing PEQ components is saved, THE serializer SHALL include all PEQ parameters and Filter_Section data in the output JSON
2. WHEN a circuit file containing PEQ components is loaded, THE deserializer SHALL reconstruct PEQ instances with all parameters and sections intact
3. FOR ALL valid PEQ configurations, saving then loading a circuit SHALL produce PEQ components with identical parameters to the originals (round-trip property)
4. WHEN a circuit file from a version without PEQ support is loaded, THE deserializer SHALL handle the absence of PEQ components gracefully without errors
