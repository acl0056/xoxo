# Requirements Document

## Introduction

This feature restructures the phase source setting from a single global `phaseSource` property on the Speaker model to per-file settings for each measurement file (FRD, ZMA, and each off-axis FRD). This matches xSim's behavior where each driver has independent Hilbert transform toggles for FRD phase and ZMA phase. The feature also wires up the existing `HilbertTransform` class to the simulation pipeline so that selecting "derived" actually computes minimum phase from magnitude data via the Hilbert transform, rather than being a no-op.

## Glossary

- **Speaker**: A loudspeaker driver component in the circuit, represented by the `Speaker` class. Each Speaker references FRD and ZMA measurement files.
- **FRD_File**: A Frequency Response Data file containing frequency, magnitude (dB), and phase (degrees) measurements for a speaker's acoustic response.
- **ZMA_File**: An impedance measurement file containing frequency, impedance magnitude (ohms), and impedance phase (degrees) for a speaker's electrical impedance.
- **Off_Axis_File**: An FRD file measured at a specific angle off the speaker's primary axis, stored as part of the Speaker's off-axis measurement collection.
- **Phase_Source_Setting**: A per-file setting with value `measured` or `derived` that controls whether the phase data from a measurement file is used as-is or replaced with minimum phase computed via the Hilbert transform.
- **Hilbert_Transform**: An algorithm that derives minimum phase from magnitude-only data. Implemented in the `HilbertTransform` class. Used when a Phase_Source_Setting is set to `derived`.
- **Minimum_Phase**: The phase response uniquely determined from a magnitude response for a minimum-phase system, computed via the Hilbert transform.
- **TuneDialog**: The Vue component that provides the UI for editing Speaker parameters, including file selection and phase source toggles.
- **FrequencyAnalyzer**: The simulation module that calculates SPL and phase response for each Speaker by interpolating FRD data and combining it with circuit solver results.
- **DxoImporter**: The module that imports xSim `.dxo` files and converts them to the internal circuit format.
- **Circuit_Schema**: The JSON Schema (`circuit.schema.json`) that defines the structure and validation rules for saved circuit files.

## Requirements

### Requirement 1: Per-File Phase Source Data Model

**User Story:** As a crossover designer, I want each measurement file to have its own phase source setting, so that I can independently choose measured or derived phase for the on-axis FRD, ZMA, and each off-axis FRD file.

#### Acceptance Criteria

1. THE Speaker SHALL store a `frdPhaseSource` property with value `measured` or `derived` that controls the phase source for the primary FRD_File.
2. THE Speaker SHALL store a `zmaPhaseSource` property with value `measured` or `derived` that controls the phase source for the ZMA_File.
3. THE Speaker SHALL store a `phaseSource` property with value `measured` or `derived` on each entry in the `offAxisFiles` array, controlling the phase source for that Off_Axis_File.
4. THE Speaker SHALL default `frdPhaseSource` to `measured` when creating a new Speaker.
5. THE Speaker SHALL default `zmaPhaseSource` to `measured` when creating a new Speaker.
6. THE Speaker SHALL default `phaseSource` to `measured` for each new Off_Axis_File entry.
7. THE Speaker SHALL remove the legacy global `phaseSource` property from the Speaker parameters.

### Requirement 2: Schema Update

**User Story:** As a developer, I want the circuit schema to reflect the per-file phase source structure, so that saved files are validated correctly.

#### Acceptance Criteria

1. THE Circuit_Schema SHALL define `frdPhaseSource` as a required string property on `speakerParameters` with allowed values `measured` and `derived`.
2. THE Circuit_Schema SHALL define `zmaPhaseSource` as a required string property on `speakerParameters` with allowed values `measured` and `derived`.
3. THE Circuit_Schema SHALL define `phaseSource` as a required string property on the `offAxisFile` definition with allowed values `measured` and `derived`.
4. THE Circuit_Schema SHALL remove the legacy global `phaseSource` property from `speakerParameters`.

### Requirement 3: Backward-Compatible File Migration

**User Story:** As a user with existing saved projects, I want my old files to load correctly after the update, so that I do not lose my work or settings.

#### Acceptance Criteria

1. WHEN a saved file contains a legacy global `phaseSource` property on a Speaker, THE Speaker SHALL apply that value to both `frdPhaseSource` and `zmaPhaseSource` during deserialization.
2. WHEN a saved file contains a legacy global `phaseSource` property on a Speaker, THE Speaker SHALL apply that value to the `phaseSource` of each Off_Axis_File entry that lacks a `phaseSource` property.
3. WHEN a saved file contains no `frdPhaseSource` property on a Speaker, THE Speaker SHALL default `frdPhaseSource` to `measured`.
4. WHEN a saved file contains no `zmaPhaseSource` property on a Speaker, THE Speaker SHALL default `zmaPhaseSource` to `measured`.
5. WHEN a saved file contains an Off_Axis_File entry without a `phaseSource` property, THE Speaker SHALL default that entry's `phaseSource` to `measured`.
6. THE Speaker SHALL serialize the new per-file phase source properties and exclude the legacy global `phaseSource` property when saving.

### Requirement 4: Conditional Phase Source UI

**User Story:** As a crossover designer, I want the phase source toggle to appear only when a file is loaded, so that the UI is not cluttered with irrelevant options.

#### Acceptance Criteria

1. WHEN an FRD_File is loaded for a Speaker, THE TuneDialog SHALL display a phase source radio group (`As Measured` / `Derived (Minimum Phase)`) adjacent to the FRD file selector.
2. WHILE no FRD_File is loaded for a Speaker, THE TuneDialog SHALL hide the FRD phase source radio group.
3. WHEN a ZMA_File is loaded for a Speaker, THE TuneDialog SHALL display a phase source radio group adjacent to the ZMA file selector.
4. WHILE no ZMA_File is loaded for a Speaker, THE TuneDialog SHALL hide the ZMA phase source radio group.
5. WHEN an Off_Axis_File has a valid file path, THE TuneDialog SHALL display a phase source radio group for that Off_Axis_File entry.
6. WHILE an Off_Axis_File has no valid file path, THE TuneDialog SHALL hide the phase source radio group for that Off_Axis_File entry.

### Requirement 5: Hilbert Transform Integration for FRD Phase

**User Story:** As a crossover designer, I want the simulation to use Hilbert-derived minimum phase when I select "derived" for an FRD file, so that I can evaluate the crossover with minimum-phase assumptions.

#### Acceptance Criteria

1. WHEN `frdPhaseSource` is set to `derived` for a Speaker, THE FrequencyAnalyzer SHALL compute minimum phase from the FRD magnitude data using the Hilbert_Transform and use the computed phase instead of the measured FRD phase.
2. WHEN `frdPhaseSource` is set to `measured` for a Speaker, THE FrequencyAnalyzer SHALL use the phase data from the FRD_File without modification.
3. WHEN an Off_Axis_File has `phaseSource` set to `derived`, THE FrequencyAnalyzer SHALL compute minimum phase from that Off_Axis_File's magnitude data using the Hilbert_Transform and use the computed phase instead of the measured phase.
4. WHEN an Off_Axis_File has `phaseSource` set to `measured`, THE FrequencyAnalyzer SHALL use the phase data from the Off_Axis_File without modification.
5. THE FrequencyAnalyzer SHALL compute derived phase on demand and not store the derived phase data on the Speaker model or in the saved file.

### Requirement 6: Hilbert Transform Integration for ZMA Phase

**User Story:** As a crossover designer, I want the option to derive minimum phase for impedance data, so that I can match xSim's per-file Hilbert behavior for ZMA files.

#### Acceptance Criteria

1. WHEN `zmaPhaseSource` is set to `derived` for a Speaker, THE simulation pipeline SHALL compute minimum phase from the ZMA impedance magnitude data using the Hilbert_Transform and use the computed phase instead of the measured ZMA phase.
2. WHEN `zmaPhaseSource` is set to `measured` for a Speaker, THE simulation pipeline SHALL use the phase data from the ZMA_File without modification.

### Requirement 7: DXO Import Per-File Phase Source Mapping

**User Story:** As a user importing xSim projects, I want the per-driver Hilbert settings from the DXO file to map correctly to the new per-file phase source settings, so that imported projects behave the same as in xSim.

#### Acceptance Criteria

1. WHEN importing a DXO file, THE DxoImporter SHALL map the `useHilbert` flag for each driver to the `frdPhaseSource` property of the corresponding Speaker (`derived` when true, `measured` when false).
2. WHEN importing a DXO file, THE DxoImporter SHALL map the `zPhaseHilbert` flag for each driver to the `zmaPhaseSource` property of the corresponding Speaker (`derived` when true, `measured` when false).
3. WHEN importing a DXO file, THE DxoImporter SHALL set `phaseSource` to `measured` for each Off_Axis_File entry, since xSim does not store per-off-axis Hilbert settings.

### Requirement 8: Derived Phase Is Not Persisted

**User Story:** As a developer, I want derived phase data to be computed on demand rather than saved, so that saved files remain compact and the derived phase is always consistent with the current magnitude data.

#### Acceptance Criteria

1. THE Speaker SHALL not include derived phase arrays in the serialized JSON output.
2. WHEN a Speaker is deserialized from a saved file, THE Speaker SHALL not expect derived phase arrays in the input data.
3. WHEN the phase source is toggled from `measured` to `derived` or vice versa, THE FrequencyAnalyzer SHALL recompute the simulation result using the appropriate phase data without requiring a file reload.

### Requirement 9: Validation of Per-File Phase Source Settings

**User Story:** As a developer, I want the Speaker validation to enforce valid per-file phase source values, so that invalid configurations are caught early.

#### Acceptance Criteria

1. THE Speaker SHALL validate that `frdPhaseSource` is one of `measured` or `derived`.
2. THE Speaker SHALL validate that `zmaPhaseSource` is one of `measured` or `derived`.
3. THE Speaker SHALL validate that each Off_Axis_File entry's `phaseSource` is one of `measured` or `derived`.
4. IF `frdPhaseSource` contains an invalid value, THEN THE Speaker SHALL report a validation error.
5. IF `zmaPhaseSource` contains an invalid value, THEN THE Speaker SHALL report a validation error.
6. IF an Off_Axis_File entry's `phaseSource` contains an invalid value, THEN THE Speaker SHALL report a validation error.
