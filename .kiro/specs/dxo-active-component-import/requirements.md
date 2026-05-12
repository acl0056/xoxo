# Requirements Document

## Introduction

The DXO importer currently skips "Active blocks" with a warning. These blocks contain PEQ (Parametric Equalizer), Filter (Active Filter), and OpAmp (Operational Amplifier) component data that must be parsed and imported into the corresponding internal component models. This feature enables full round-trip import of DXO files containing active DSP components, preserving their parameters, positions, and connectivity.

## Glossary

- **DXO_Importer**: The `DxoImporter` class (`src/io/DxoImporter.js`) responsible for parsing XSim `.dxo` files into internal Circuit format
- **Active_Block**: A section in the DXO file format that encodes one active DSP component (PEQ, Filter, or OpAmp) with its parameters and biquad sections
- **PEQ_Component**: The internal `PEQ` model representing a parametric equalizer with cascaded biquad filter sections
- **Filter_Component**: The internal `Filter` model representing a DSP-based active filter (Butterworth, Linkwitz-Riley, or Bessel)
- **OpAmp_Component**: The internal `OpAmp` model representing an operational amplifier with frequency-dependent open-loop gain
- **Biquad_Section**: A second-order IIR filter section within a PEQ, defined by frequency, Q, gain, and filter type
- **Active_Block_Header**: The two lines at the start of the active blocks section specifying the count of blocks and lines per block
- **DSP_Rate**: The digital signal processing sample rate (typically 48000 Hz) used for biquad coefficient calculation
- **Grid_Position**: The X,Y coordinate pair specifying a component's location on the schematic grid
- **Terminal_Position**: The absolute grid coordinates of a component's connection points, calculated from the component center and terminal offsets (±2 grid units)
- **Transfer_Function**: The frequency-dependent complex gain of a component, used to verify correct import via comparison with reference FRD data

## Requirements

### Requirement 1: Parse Active Block Header

**User Story:** As a user importing a DXO file, I want the importer to correctly read the active block header, so that it knows how many active components to parse and how many lines each block occupies.

#### Acceptance Criteria

1. WHEN the DXO_Importer encounters the active blocks section, THE DXO_Importer SHALL read the first line as the number of active blocks to parse
2. WHEN the DXO_Importer encounters the active blocks section, THE DXO_Importer SHALL read the second line as the number of lines per active block
3. WHEN the active block count is zero, THE DXO_Importer SHALL skip the active blocks section without creating any active components
4. IF the active block count or lines-per-block value is not a valid integer, THEN THE DXO_Importer SHALL throw a descriptive error indicating the malformed header

### Requirement 2: Parse and Create PEQ Components

**User Story:** As a user importing a DXO file containing a PEQ, I want the importer to create a PEQ_Component with the correct biquad sections, so that the imported PEQ produces the same frequency response as the original.

#### Acceptance Criteria

1. WHEN an active block has type value 0, THE DXO_Importer SHALL create a PEQ_Component
2. WHEN creating a PEQ_Component, THE DXO_Importer SHALL extract only the non-bypassed biquad sections (where UnBypassed is "T") from the active block
3. WHEN creating a PEQ_Component, THE DXO_Importer SHALL map DXO biquad type codes to internal filter type strings: 0→"peaking", 1→"highShelf", 2→"lowShelf", 3→"lowPass1", 4→"highPass1", 5→"lowPass2", 6→"highPass2", 7→"allPass"
4. WHEN creating a PEQ_Component, THE DXO_Importer SHALL set each biquad section's frequency, Q, and gain from the corresponding DXO values
5. WHEN creating a PEQ_Component, THE DXO_Importer SHALL set the DSP_Rate parameter from the active block's DSP sample rate field
6. WHEN creating a PEQ_Component, THE DXO_Importer SHALL set the global gain to 0 dB (the DXO scalar gain of 1 for PEQ represents unity, which is 0 dB)
7. IF a biquad type code is not in the range 0–7, THEN THE DXO_Importer SHALL emit a warning and skip that biquad section

### Requirement 3: Parse and Create OpAmp Components

**User Story:** As a user importing a DXO file containing an OpAmp, I want the importer to create an OpAmp_Component with the correct DC gain and corner frequency, so that the imported OpAmp models the same open-loop behavior as the original.

#### Acceptance Criteria

1. WHEN an active block has type value 1, THE DXO_Importer SHALL create an OpAmp_Component
2. WHEN creating an OpAmp_Component, THE DXO_Importer SHALL convert the DXO scalar gain field from linear to decibels using the formula: dcGain = 20 × log10(scalarGain)
3. WHEN creating an OpAmp_Component, THE DXO_Importer SHALL set the corner frequency from the active block's "turn frequency" field
4. WHEN the scalar gain value is zero or negative, THE DXO_Importer SHALL emit a warning and use a default dcGain of 100 dB

### Requirement 4: Parse and Create Filter Components

**User Story:** As a user importing a DXO file containing a Filter, I want the importer to create a Filter_Component with the correct shape, type, order, and frequency, so that the imported Filter produces the same frequency response as the original.

#### Acceptance Criteria

1. WHEN an active block has type value 2, THE DXO_Importer SHALL create a Filter_Component
2. WHEN creating a Filter_Component, THE DXO_Importer SHALL map the DXO filter shape code to internal strings: 0→"butterworth", 1→"linkwitzRiley", 2→"bessel"
3. WHEN creating a Filter_Component, THE DXO_Importer SHALL map the DXO filter type code to internal strings: 0→"lowPass", 1→"highPass", 2→"bandpass"
4. WHEN creating a Filter_Component, THE DXO_Importer SHALL set the filter order from the active block's FilterOrder field
5. WHEN creating a Filter_Component, THE DXO_Importer SHALL set the turn frequency from the active block's "turn frequency" field
6. WHEN creating a Filter_Component, THE DXO_Importer SHALL set the gain to 0 dB (the DXO scalar gain of 1 for Filter represents unity)
7. IF the filter shape code is not in the range 0–2, THEN THE DXO_Importer SHALL emit a warning and default to "butterworth"
8. IF the filter type code is not in the range 0–2, THEN THE DXO_Importer SHALL emit a warning and default to "lowPass"

### Requirement 5: Position Active Components on the Grid

**User Story:** As a user importing a DXO file, I want active components to be placed at their correct grid positions, so that the schematic layout matches the original DXO design.

#### Acceptance Criteria

1. WHEN creating an active component, THE DXO_Importer SHALL set the component's X and Y coordinates from the active block's position X and position Y fields
2. WHEN creating an active component, THE DXO_Importer SHALL register the component position using the existing `registerComponentPosition` method
3. WHEN creating an active component, THE DXO_Importer SHALL calculate terminal positions at offsets (±2, ±2) from the component center, matching the 4-terminal layout defined in PEQ_Component, Filter_Component, and OpAmp_Component

### Requirement 6: Calculate Terminal Positions for Wire Mapping

**User Story:** As a user importing a DXO file, I want active component terminals to participate in wire connectivity, so that the imported circuit is fully connected.

#### Acceptance Criteria

1. THE DXO_Importer SHALL calculate terminal positions for active components using the same 4-terminal layout: terminal 0 at (x-2, y-2), terminal 1 at (x-2, y+2), terminal 2 at (x+2, y-2), terminal 3 at (x+2, y+2)
2. WHEN the `calculateTerminalPositions` method is called for a PEQ, Filter, or OpAmp component, THE DXO_Importer SHALL return all four terminal positions
3. WHEN wire mapping is performed, THE DXO_Importer SHALL include active component terminals in the position-to-terminal map for connectivity resolution

### Requirement 7: Assign Shared "A" Labels

**User Story:** As a user importing a DXO file, I want all active components (PEQ, Filter, OpAmp) to receive sequential "A" labels, so that they follow the established labeling convention.

#### Acceptance Criteria

1. THE DXO_Importer SHALL assign labels with the "A" prefix followed by a sequential zero-based index (A0, A1, A2...) to all imported active components
2. THE DXO_Importer SHALL assign labels in the order the active blocks appear in the DXO file
3. WHEN multiple active blocks exist, THE DXO_Importer SHALL share a single counter across all active component types (PEQ, Filter, and OpAmp)

### Requirement 8: Import Delay Parameter

**User Story:** As a user importing a DXO file, I want the adjustable delay value from active blocks to be preserved, so that time-alignment settings are maintained.

#### Acceptance Criteria

1. WHEN creating a PEQ_Component, THE DXO_Importer SHALL set the delay parameter from the active block's "Adjustable Delay" field (in seconds)
2. WHEN creating a Filter_Component, THE DXO_Importer SHALL set the delay parameter from the active block's "Adjustable Delay" field (in seconds)
3. WHEN the adjustable delay value is negative, THE DXO_Importer SHALL clamp the delay to zero and emit a warning

### Requirement 9: Handle Unknown Active Block Types

**User Story:** As a user importing a DXO file with future or unknown active block types, I want the importer to skip them gracefully, so that the rest of the file imports correctly.

#### Acceptance Criteria

1. IF an active block has a type value other than 0, 1, or 2, THEN THE DXO_Importer SHALL skip that block without creating a component
2. IF an active block has an unknown type, THEN THE DXO_Importer SHALL emit a warning indicating the unknown type value and block index
3. IF an active block has an unknown type, THEN THE DXO_Importer SHALL continue parsing subsequent active blocks without interruption

### Requirement 10: Frequency Response Verification

**User Story:** As a developer, I want to verify that imported active components produce the correct frequency response, so that I can confirm the import is accurate.

#### Acceptance Criteria

1. WHEN a PEQ_Component is imported from the reference file `research/filters/peq/orbs-peq.dxo`, THE PEQ_Component SHALL produce a frequency response matching the reference data in `research/filters/peq/orbs-peq.FRD` within ±0.1 dB magnitude tolerance across the measured frequency range
2. WHEN an OpAmp_Component is imported from the reference file `research/filters/opamp/orbs-opamp.dxo`, THE OpAmp_Component SHALL produce a frequency response matching the reference data in `research/filters/opamp/orbs-opamp.FRD` within ±0.1 dB magnitude tolerance across the measured frequency range
3. WHEN a Filter_Component is imported from the reference file `research/filters/filter/orbs-filter.dxo`, THE Filter_Component SHALL produce a frequency response matching the reference data in `research/filters/filter/orbs-filter.FRD` within ±0.1 dB magnitude tolerance across the measured frequency range
