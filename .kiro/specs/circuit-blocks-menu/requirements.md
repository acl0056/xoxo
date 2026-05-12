# Requirements Document

## Introduction

The Circuit Blocks Menu provides a palette of pre-built passive crossover filter circuit templates that users can insert into their schematic. Rather than building common filter topologies component-by-component, users select a circuit block (e.g., "Low Pass 2nd Order"), provide parametric variable values (frequency, Q, impedance), and the system generates the complete sub-circuit with correctly calculated component values, wiring, and layout. Inserted blocks are grouped entities — their components move together as a unit and retain a parametric link to the block definition, enabling ongoing tuning via the Variable_Dialog. When the user is satisfied with approximate values, they can dissolve the block into independent components for fine-tuning with real-world purchasable values. Circuit block definitions are stored as `.xsc` data files bundled within the project, parsed at runtime by the Block_Registry. This architecture keeps the door open for future extensibility (additional files, user-created blocks) without requiring code changes. The menu UI presents blocks as a clean integrated palette — the file-based nature is an implementation detail, not exposed to the user. Block groups are also reconstructed when importing DXO project files: the importer parses the Subckt section and component Subckt# fields, preserving the parametric link for continued tuning. When saving, Block_Groups persist as part of the native JSON project format.

## Glossary

- **Circuit_Block**: A pre-defined template representing a common passive crossover filter topology, consisting of component definitions, parametric variable declarations, value formulas, and wiring information. Loaded at runtime from a `.xsc` file.
- **Block_Registry**: The module that discovers and loads all `.xsc` files from the designated blocks directory, parses them via the XSC_Parser, and provides lookup of Circuit_Block definitions by identifier.
- **Blocks_Directory**: The designated directory within the project (`src/data/circuit-blocks/`) where `.xsc` files are stored as bundled application data.
- **XSC_Parser**: The module responsible for reading the xsim `.xsc` file format and producing a structured Circuit_Block object containing the block's title, variables, components, wiring, and text annotations.
- **XSC_Printer**: The module responsible for serializing a structured Circuit_Block object back into the `.xsc` file format string.
- **Variable**: A named parametric input (e.g., frequency, Q, impedance, dB) declared by a Circuit_Block, with a description and default value, that the user supplies to calculate component values.
- **Formula_Engine**: The module responsible for evaluating parametric formulas (e.g., `R/(2*pi*freq*Q)`) using user-supplied Variable values to produce component parameter values.
- **Block_Menu**: The UI component that presents the list of available Circuit_Blocks to the user for selection.
- **Variable_Dialog**: The UI component that presents the Variables for a selected Circuit_Block, allowing the user to review defaults and enter custom values before insertion.
- **Insertion_Engine**: The module that takes a resolved Circuit_Block (with calculated component values) and adds the components and wires into the active Circuit as a Block_Group at a specified position.
- **Component**: A passive circuit element (Resistor, Capacitor, or Inductor) as defined in the xoxo model layer.
- **Circuit**: The top-level data structure representing the user's crossover network design, containing components, wires, and annotations.
- **Block_Group**: The composite entity in the Circuit representing an inserted Circuit_Block that maintains its parametric link, allowing grouped selection, grouped movement, and tuning.
- **Block_Dissolution**: The one-way operation of converting a Block_Group into independent Components, removing the parametric link while preserving current component values.
- **DXO_File**: The native project file format for xoxo/xsim crossover designs, containing voltage source, components (passives), subcircuit (block) definitions, grounds, wires, drivers, and simulation setup.
- **Subckt**: A subcircuit definition within a DXO file that represents a Circuit Block, containing the block title, variable definitions (6 slots with names, values, descriptions), and step modes. Components reference their parent subcircuit via the Subckt# field.
- **DXO_Importer**: The module responsible for reading a DXO_File and reconstructing the Circuit, including Block_Groups from Subckt definitions and component associations.

## Requirements

### Requirement 1: File-Based Circuit Block Registry

**User Story:** As a crossover designer, I want the application to automatically load circuit block templates from data files bundled with the project, so that new blocks can be added in the future by simply adding files without code changes.

#### Acceptance Criteria

1. THE Block_Registry SHALL discover and load all `.xsc` files from the Blocks_Directory at application startup.
2. THE Block_Registry SHALL parse each discovered `.xsc` file using the XSC_Parser to produce a Circuit_Block definition.
3. WHEN a Circuit_Block is retrieved from the Block_Registry, THE Block_Registry SHALL return the block's display name, variable definitions (name, description, default value), component definitions (type, formula, ESR, orientation, position), and wiring topology.
4. THE Block_Registry SHALL provide the following Circuit_Blocks (shipped as `.xsc` files): Low Pass 1st Order, High Pass 1st Order, Low Pass 2nd Order Q, High Pass 2nd Order Q, All Pass 1st Order, All Pass 2nd Order, L-Pad, Series Notch, Shunt Notch.
5. IF a `.xsc` file in the Blocks_Directory fails to parse, THEN THE Block_Registry SHALL log a warning identifying the file and continue loading remaining files.
6. THE Block_Registry SHALL derive a unique identifier for each Circuit_Block from its source filename (without extension).

### Requirement 2: XSC File Parser and Printer

**User Story:** As a developer, I want a parser that reads the xsim `.xsc` file format into structured data and a printer that serializes it back, so that circuit block definitions are data-driven, maintainable, and testable.

#### Acceptance Criteria

1. WHEN a `.xsc` file content string is provided, THE XSC_Parser SHALL parse it into a structured Circuit_Block object containing: title (line 1), variable definitions (6 slots, each with name, description, and default value), component definitions, ground definitions, wire segments, and text annotations.
2. THE XSC_Parser SHALL parse each Variable slot as: variable name (string, may be empty), description (string, may be empty), and default numeric value.
3. THE XSC_Parser SHALL parse each component (passive) definition including: part type (0=resistor, 1=capacitor, 2=inductor), default value, ESR, rating, relative grid position (X, Y), orientation (T=horizontal, F=vertical), step mode, short/value/open mode, value formula string, and formula scale factor.
4. THE XSC_Parser SHALL parse wire segments as pairs of start (X, Y) and end (X, Y) grid coordinates.
5. THE XSC_Parser SHALL parse text annotations including: label string, position (X, Y), font size, and color value.
6. IF a `.xsc` file content string has invalid structure (missing sections, non-numeric values where numbers are expected, or truncated content), THEN THE XSC_Parser SHALL return a descriptive error identifying the nature and location of the problem.
7. THE XSC_Printer SHALL serialize a structured Circuit_Block object back into a valid `.xsc` format string.
8. FOR ALL valid Circuit_Block objects, parsing the printed output SHALL produce an equivalent Circuit_Block object (round-trip property).

### Requirement 3: Parametric Formula Evaluation

**User Story:** As a crossover designer, I want component values to be automatically calculated from my design parameters (frequency, Q, impedance), so that I get correctly sized components without manual calculation.

#### Acceptance Criteria

1. WHEN the user provides Variable values for a Circuit_Block, THE Formula_Engine SHALL evaluate each component's value formula using those Variable values to produce a numeric component value.
2. THE Formula_Engine SHALL support arithmetic operators (addition, subtraction, multiplication, division, exponentiation), the constant `pi` (equivalent to 3.14159...), and the functions `10^x` (power of ten).
3. WHEN a formula references a Variable name, THE Formula_Engine SHALL substitute the user-supplied value for that Variable.
4. IF a formula evaluation produces a non-finite result (NaN, Infinity, or negative value for a component), THEN THE Formula_Engine SHALL return a descriptive error identifying the problematic component and formula.
5. THE Formula_Engine SHALL evaluate formulas such as `R/(2*pi*freq*Q)`, `Q/(2*pi*freq*R)`, `R*(1-(10^(-(dB+0.001)/20)))`, and `Z*TC` correctly.
6. FOR ALL valid Variable inputs and formula strings, evaluating a formula then formatting the result then re-parsing SHALL produce an equivalent numeric value (round-trip property).

### Requirement 4: Circuit Block Menu UI

**User Story:** As a crossover designer, I want a visible menu showing available circuit block templates, so that I can browse and select the topology I need without navigating file dialogs.

#### Acceptance Criteria

1. THE Block_Menu SHALL display all Circuit_Blocks from the Block_Registry as selectable items with their display names.
2. THE Block_Menu SHALL group Circuit_Blocks by category: Filters (Low Pass 1st Order, High Pass 1st Order, Low Pass 2nd Order Q, High Pass 2nd Order Q), Phase (All Pass 1st Order, All Pass 2nd Order), Attenuators (L-Pad), and Notch Filters (Series Notch, Shunt Notch).
3. WHEN the user selects a Circuit_Block from the Block_Menu, THE Block_Menu SHALL open the Variable_Dialog for that block.
4. WHILE no circuit is open in the editor, THE Block_Menu SHALL be disabled and display a tooltip indicating that a circuit must be open.

### Requirement 5: Variable Input Dialog

**User Story:** As a crossover designer, I want to enter my design parameters (frequency, Q, impedance) before a circuit block is inserted, so that the components are sized correctly for my application.

#### Acceptance Criteria

1. WHEN the Variable_Dialog opens for a Circuit_Block, THE Variable_Dialog SHALL display each Variable's name, description, and default value as an editable numeric input field.
2. THE Variable_Dialog SHALL only display Variables that have a non-empty name (skipping unused variable slots from the .xsc format).
3. WHEN the user confirms the Variable_Dialog, THE Variable_Dialog SHALL pass the entered Variable values to the Formula_Engine for component value calculation.
4. WHEN the user cancels the Variable_Dialog, THE Variable_Dialog SHALL close without modifying the Circuit.
5. IF the user enters a non-numeric or empty value for a Variable, THEN THE Variable_Dialog SHALL display a validation error and prevent confirmation until all values are valid positive numbers.

### Requirement 6: Circuit Block Insertion as Grouped Entity

**User Story:** As a crossover designer, I want the generated components and wires to be placed into my schematic as a grouped block entity, so that the block retains its parametric association and its components move together as a unit.

#### Acceptance Criteria

1. WHEN the Formula_Engine returns calculated component values, THE Insertion_Engine SHALL create Component instances (Resistor, Capacitor, or Inductor) with those values and add them to the active Circuit as a Block_Group.
2. THE Insertion_Engine SHALL position inserted components at grid coordinates offset from a user-specified insertion point, using the relative positions defined in the Circuit_Block.
3. THE Insertion_Engine SHALL create Wire instances connecting the inserted components according to the wiring topology defined in the Circuit_Block.
4. THE Insertion_Engine SHALL assign sequential labels to inserted components following the existing per-type labeling convention in the Circuit (e.g., R6, C1, L2 continuing from the highest existing label for each component type).
5. THE Block_Group SHALL retain a reference to its source Circuit_Block definition and the current Variable values, updated each time the user tunes the block.
6. WHEN the user selects any Component within a Block_Group, THE Circuit SHALL visually highlight all Components in that Block_Group as a single selected unit.
7. WHEN the user drags any Component within a Block_Group, THE Circuit SHALL move all Components and Wires in that Block_Group together, preserving their relative positions.
8. WHEN insertion is complete, THE Insertion_Engine SHALL trigger a simulation refresh so the frequency response reflects the newly added components.
9. IF the Circuit_Block defines component ESR values greater than zero, THEN THE Insertion_Engine SHALL set the ESR parameter on the created Component.

### Requirement 7: Formula Parser and Printer

**User Story:** As a developer, I want a robust formula parser that can read xsim-style parametric expressions and a printer that can serialize them back, so that formula evaluation is reliable and testable.

#### Acceptance Criteria

1. WHEN a formula string is provided, THE Formula_Parser SHALL parse it into an abstract syntax tree representing the mathematical expression.
2. THE Formula_Parser SHALL handle operator precedence: parentheses first, then exponentiation, then multiplication and division (left-to-right), then addition and subtraction (left-to-right).
3. THE Formula_Printer SHALL format an abstract syntax tree back into a valid formula string.
4. FOR ALL valid formula abstract syntax trees, parsing the printed output SHALL produce an equivalent abstract syntax tree (round-trip property).
5. IF a formula string contains invalid syntax, THEN THE Formula_Parser SHALL return a descriptive error indicating the position and nature of the syntax error.

### Requirement 8: Block Tuning

**User Story:** As a crossover designer, I want to re-open the variable dialog for an inserted block and adjust parameters, so that I can iteratively tune component values without removing and re-inserting the block.

#### Acceptance Criteria

1. WHEN the user right-clicks a Block_Group, THE Circuit SHALL display a context menu containing a "Tune" action.
2. WHEN the user selects the "Tune" action, THE Variable_Dialog SHALL open pre-populated with the Block_Group's current Variable values.
3. WHEN the user confirms new Variable values in the Variable_Dialog, THE Formula_Engine SHALL recalculate all component values using the updated Variables and the Block_Group's associated formulas.
4. WHEN recalculation is complete, THE Block_Group SHALL update the value of each Component to the newly calculated value.
5. WHEN recalculation is complete, THE Block_Group SHALL update each Component's displayed label to reflect the new value (e.g., "L2 1.4mH" updates to "L2 1.8mH").
6. WHEN recalculation is complete, THE Circuit SHALL trigger a simulation refresh so that frequency response graphs reflect the updated component values.
7. WHEN the user cancels the Variable_Dialog during tuning, THE Block_Group SHALL retain its previous Variable values and component values unchanged.

### Requirement 9: Block Dissolution

**User Story:** As a crossover designer, I want to dissolve a block into separate independent components, so that I can substitute real-world component values that are commercially available (e.g., replacing a calculated 19.6µF with a purchasable 22µF capacitor).

#### Acceptance Criteria

1. WHEN the user right-clicks a Block_Group, THE Circuit SHALL display a context menu containing a "Change Block to separate parts" action.
2. WHEN the user selects the "Change Block to separate parts" action, THE Circuit SHALL perform a Block_Dissolution on the Block_Group.
3. WHEN Block_Dissolution is performed, THE Circuit SHALL convert each Component in the Block_Group into an independent Component that retains its current calculated value, label, position, and ESR.
4. WHEN Block_Dissolution is performed, THE Circuit SHALL remove the Block_Group entity and its parametric link to the Circuit_Block definition and Variable values.
5. WHEN Block_Dissolution is performed, THE dissolved Components SHALL be individually selectable, movable, editable, and deletable independent of each other.
6. WHEN Block_Dissolution has been performed on a former Block_Group, THE Circuit SHALL no longer offer the "Tune" action for those Components.
7. THE Block_Dissolution operation SHALL be one-way; a dissolved Block_Group cannot be reconstituted into a Block_Group.

### Requirement 10: DXO Import of Circuit Blocks

**User Story:** As a crossover designer, I want circuit blocks to be correctly restored when I open a DXO project file, so that my parametric block groups are preserved across save/load cycles and I can continue tuning them.

#### Acceptance Criteria

1. WHEN a DXO_File is imported, THE DXO_Importer SHALL parse the Subckts section to extract each Subckt definition including: title, 6 variable slots (name, value, description), and step modes.
2. WHEN a DXO_File is imported, THE DXO_Importer SHALL read the Subckt# field on each component to determine subcircuit membership (Subckt# of -1 indicates an independent component, Subckt# of 0 or greater indicates membership in the corresponding subcircuit index).
3. WHEN a DXO_File contains components sharing the same non-negative Subckt# value, THE DXO_Importer SHALL reconstruct a Block_Group from those components.
4. WHEN a DXO_File component belongs to a Subckt, THE DXO_Importer SHALL restore the parametric formulas from the two subcircuit equation lines on that component.
5. WHEN a DXO_File component has a Subckt# of -1, THE DXO_Importer SHALL import that component as an independent Component not associated with any Block_Group.
6. WHEN a Block_Group is reconstructed from a DXO_File, THE DXO_Importer SHALL attempt to match the Subckt title against Circuit_Block definitions in the Block_Registry.
7. IF no matching Circuit_Block is found in the Block_Registry for a Subckt title, THEN THE DXO_Importer SHALL still reconstruct the Block_Group using the embedded variable definitions and formula data from the DXO_File (the block definition is self-contained in the DXO).
8. WHEN a Block_Group is reconstructed from a DXO_File, THE DXO_Importer SHALL populate the Block_Group's Variable values from the Subckt variable slots (using the stored current values).


