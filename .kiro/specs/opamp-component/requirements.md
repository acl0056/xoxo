# Requirements Document

## Introduction

This document defines the requirements for adding an Operational Amplifier (OpAmp) component to the crossover network simulator. The OpAmp is modeled as a voltage-controlled voltage source (VCVS) with a frequency-dependent open-loop gain following a single-pole model. Unlike the PEQ and Active Filter components which apply fixed transfer functions to the signal path, the OpAmp's actual closed-loop behavior depends entirely on the external feedback network (resistors, capacitors) that users wire around it. Users build active filter circuits (inverting amplifiers, non-inverting amplifiers, Sallen-Key filters, multiple feedback filters, etc.) by connecting passive components between the OpAmp's output and input terminals.

The OpAmp shares the same 4-terminal differential layout and VCVS solver integration as PEQ and Active Filter, but its transfer function is a simple single-pole open-loop gain model:

```
A(f) = A₀ / (1 + j × f / f_c)
```

where A₀ is the DC open-loop gain in linear units and f_c is the corner frequency in Hz. The circuit solver's MNA framework determines the closed-loop behavior based on how external components feed back from output to input.

## Glossary

- **OpAmp**: Operational Amplifier — an active component modeled as a VCVS with frequency-dependent open-loop gain, whose closed-loop behavior is determined by external feedback networks
- **Open_Loop_Gain**: The frequency-dependent voltage gain A(f) of the OpAmp without any external feedback; expressed as a complex transfer function
- **DC_Gain**: The open-loop gain at zero frequency (A₀), specified in decibels; converted to linear units via A₀ = 10^(dB/20)
- **Corner_Frequency**: The frequency f_c at which the open-loop gain drops by 3 dB from its DC value; above this frequency the gain rolls off at -20 dB/decade
- **Single_Pole_Model**: A first-order frequency response model A(f) = A₀ / (1 + j×f/f_c) that approximates the dominant-pole behavior of a real operational amplifier
- **Unity_Gain_Frequency**: The gain-bandwidth product (GBW) equal to A₀ × f_c, representing the frequency at which open-loop gain magnitude equals 1 (0 dB)
- **VCVS**: Voltage-Controlled Voltage Source — the MNA modeling approach where output voltage equals a frequency-dependent gain times the input differential voltage
- **Feedback_Network**: External passive components (resistors, capacitors, inductors) connected between the OpAmp output and input terminals that determine closed-loop behavior
- **Circuit_Schema**: The JSON Schema at `src/schemas/circuit.schema.json` that defines all valid component types and their parameters
- **Circuit_Solver**: The MNA-based simulation engine (CircuitSolver.js) that calculates node voltages across the circuit
- **Tune_Dialog**: The modal UI panel (TuneDialog.vue) used to edit component parameters in real time
- **Circuit_Editor**: The canvas-based schematic editor (CircuitEditor.vue) that renders and manages component placement
- **Transfer_Function**: The complex frequency-domain ratio representing the OpAmp's open-loop gain A(f)
- **PEQ**: Parametric Equalizer — an existing active component that shares the "A" label prefix with the OpAmp
- **Active_Filter**: An existing active filter component that shares the "A" label prefix with the OpAmp

## Requirements

### Requirement 1: OpAmp Schema Definition

**User Story:** As a developer, I want the OpAmp component type and its parameters defined in the circuit schema, so that OpAmp data is validated consistently with all other components.

#### Acceptance Criteria

1. THE Circuit_Schema SHALL include "opamp" in the component type enum alongside existing types
2. THE Circuit_Schema SHALL define an `opampParameters` definition with required properties: `dcGain` and `cornerFrequency`
3. THE Circuit_Schema SHALL validate that `dcGain` is a number representing decibels with a default value of 100
4. THE Circuit_Schema SHALL validate that `cornerFrequency` is a number with exclusiveMinimum 0 representing hertz with a default value of 50
5. THE Circuit_Schema SHALL include a conditional validation rule using `allOf`/`if`/`then` to link the "opamp" type to `opampParameters`, consistent with other component type validations

### Requirement 2: OpAmp Component Model

**User Story:** As a developer, I want an OpAmp model class that extends Component, so that OpAmp instances can be created, validated, serialized, and deserialized like other components.

#### Acceptance Criteria

1. THE OpAmp model SHALL extend the Component base class with type "opamp"
2. THE OpAmp model SHALL initialize default parameters: dcGain 100 dB and cornerFrequency 50 Hz
3. THE OpAmp model SHALL define four terminals at the same positions as PEQ: positive input at offset (-2, -2), negative input at (-2, 2), positive output at (2, -2), and negative output at (2, 2)
4. WHEN validate() is called, THE OpAmp model SHALL verify dcGain is a finite number
5. WHEN validate() is called, THE OpAmp model SHALL verify cornerFrequency is a positive number
6. WHEN toJSON() is called, THE OpAmp model SHALL serialize all parameters including dcGain and cornerFrequency
7. WHEN fromJSON() is called with valid OpAmp data, THE OpAmp model SHALL reconstruct an OpAmp instance with all parameters restored
8. FOR ALL valid OpAmp parameter objects, serializing via toJSON() then deserializing via fromJSON() SHALL produce an equivalent OpAmp instance (round-trip property)

### Requirement 3: OpAmp Transfer Function Evaluation

**User Story:** As a developer, I want the OpAmp to compute its complex open-loop transfer function A(f) at any frequency, so that the circuit solver can determine the OpAmp's contribution to the MNA system.

#### Acceptance Criteria

1. WHEN evaluateTransferFunction(frequency) is called, THE OpAmp model SHALL compute the open-loop gain as A(f) = A₀ / (1 + j × f / f_c) where A₀ = 10^(dcGain/20) and f_c = cornerFrequency
2. THE OpAmp transfer function evaluation SHALL return a complex value with real and imaginary parts
3. WHEN evaluated at frequency 0 (DC), THE OpAmp model SHALL return a gain magnitude equal to A₀ = 10^(dcGain/20)
4. WHEN evaluated at the corner frequency, THE OpAmp model SHALL return a gain magnitude approximately 3 dB below the DC gain
5. WHEN evaluated at frequencies well above the corner frequency, THE OpAmp model SHALL produce a gain magnitude that decreases at approximately -20 dB per decade

### Requirement 4: Circuit Solver Integration

**User Story:** As a developer, I want the circuit solver to incorporate OpAmp components into the MNA simulation, so that OpAmp behavior with external feedback networks is correctly computed.

#### Acceptance Criteria

1. WHEN an OpAmp component is present in the circuit, THE Circuit_Solver SHALL treat the OpAmp as a VCVS where the output differential voltage equals the input differential voltage multiplied by the open-loop gain A(f) at each frequency
2. WHEN solving at a given frequency, THE Circuit_Solver SHALL evaluate the OpAmp transfer function and apply it to the voltage relationship between the OpAmp input terminal pair and output terminal pair
3. THE Circuit_Solver SHALL handle OpAmp components using the same VCVS stamping mechanism as PEQ and Active_Filter components
4. WHEN an OpAmp is connected with external feedback components (resistors, capacitors between output and input terminals), THE Circuit_Solver SHALL correctly compute the closed-loop transfer function through the MNA solution
5. IF an OpAmp component has no valid connection on all four terminals, THEN THE Circuit_Solver SHALL skip the OpAmp during simulation and log a warning

### Requirement 5: OpAmp Canvas Rendering

**User Story:** As a user, I want to see the OpAmp component on the circuit schematic with a recognizable symbol, so that I can identify and position it in my crossover design.

#### Acceptance Criteria

1. THE Circuit_Editor SHALL render the OpAmp component using the same amplifier-style triangle symbol as PEQ and Active_Filter but with "Op" text label inside the triangle
2. THE Circuit_Editor SHALL render the OpAmp with positive and negative input terminals on the left and positive and negative output terminals on the right, spanning approximately 4 grid units wide by 4 grid units tall
3. THE Circuit_Editor SHALL render the OpAmp label (e.g., "A2") above or below the component symbol
4. WHEN the OpAmp is selected, THE Circuit_Editor SHALL highlight the symbol using the same selection style as other components
5. WHEN the OpAmp is rotated, THE Circuit_Editor SHALL rotate the symbol and terminal positions consistent with other component rotation behavior

### Requirement 6: OpAmp Tune Dialog

**User Story:** As a user, I want a tuning dialog for the OpAmp that lets me configure the open-loop DC gain and corner frequency, so that I can model different operational amplifier characteristics.

#### Acceptance Criteria

1. WHEN the user double-clicks an OpAmp component, THE Tune_Dialog SHALL display the Op Amp Setup panel
2. THE Tune_Dialog SHALL display an editable field for open-loop DC gain in decibels with a default value of 100 dB
3. THE Tune_Dialog SHALL display an editable field for open-loop corner frequency in hertz with a default value of 50 Hz
4. WHEN the user modifies any OpAmp parameter, THE Tune_Dialog SHALL update the component parameters and trigger a simulation recalculation in real time
5. THE Tune_Dialog SHALL display the computed unity-gain frequency (GBW = 10^(dcGain/20) × cornerFrequency) as a read-only informational field

### Requirement 7: Shared Label Assignment

**User Story:** As a developer, I want OpAmp components to share the "A" label counter with PEQ and Active Filter components, so that all active component types are labeled sequentially in the schematic.

#### Acceptance Criteria

1. WHEN an OpAmp component is added to the circuit, THE label assignment logic SHALL assign a label with prefix "A" followed by an incrementing number (A0, A1, A2, etc.)
2. THE label assignment SHALL use a shared counter between PEQ, Active_Filter, and OpAmp components, so that if a PEQ is labeled A0 and an Active_Filter is labeled A1, the next OpAmp receives A2
3. THE label assignment SHALL skip numbers already in use by other PEQ, Active_Filter, or OpAmp components in the circuit
4. WHEN a PEQ, Active_Filter, or OpAmp component is deleted and a new active component is added, THE label assignment logic SHALL reuse the lowest available number from the shared counter

### Requirement 8: OpAmp Serialization Round-Trip

**User Story:** As a developer, I want OpAmp components to survive save/load cycles without data loss, so that user configurations are preserved across sessions.

#### Acceptance Criteria

1. WHEN a circuit containing OpAmp components is saved, THE serializer SHALL include all OpAmp parameters (dcGain, cornerFrequency) in the output JSON
2. WHEN a circuit file containing OpAmp components is loaded, THE deserializer SHALL reconstruct OpAmp instances with all parameters intact
3. FOR ALL valid OpAmp configurations, saving then loading a circuit SHALL produce OpAmp components with identical parameters to the originals (round-trip property)
4. WHEN a circuit file from a version without OpAmp support is loaded, THE deserializer SHALL handle the absence of OpAmp components gracefully without errors
