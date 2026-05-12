# Implementation Plan: Circuit Blocks Menu

## Overview

This plan implements the parametric circuit block system for xoxo. The approach is schema-first, building from the lowest-level parsing modules up through the engine layer, then wiring into the store and UI. Each task builds incrementally on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Create JSON schemas for new data structures
  - [x] 1.1 Create `src/schemas/circuit-block.schema.json`
    - Define the CircuitBlock schema with title, identifier, variables (6 slots), components array, grounds array, wires array, and texts array
    - Each variable slot: name (string), description (string), defaultValue (number)
    - Each component: partType (0/1/2), defaultValue, esr, rating, position {x,y}, isHorizontal, stepMode, bypassMode, formula, formulaScale
    - Each wire: start {x,y}, end {x,y}
    - Each ground: {x,y}
    - Each text: label, position {x,y}, size, color
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 Create `src/schemas/formula-ast.schema.json`
    - Define the FormulaNode schema as a discriminated union (type field)
    - Node types: "number" (value), "identifier" (name), "binary" (operator, left, right), "unary" (operator, operand), "group" (expression)
    - Operators for binary: +, -, *, /, ^
    - Operator for unary: -
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.3 Update `src/schemas/circuit.schema.json` with BlockGroup definition
    - Add `blockGroups` array to the top-level circuit schema
    - Define blockGroup object: id, blockIdentifier, blockTitle, variables array, componentIds array, wireSegmentIds array, formulas array, stepModes array (6 integers)
    - _Requirements: 6.5, 8.3, 9.4_

- [x] 2. Implement XSC Parser and Printer
  - [x] 2.1 Implement `src/io/XscParser.js`
    - Export `parseXsc(content)` function returning `{ success, block, error }`
    - Parse line 1 as title, then 6 variable slots (name, description, defaultValue)
    - Parse passives count and lines-per-passive header, then each component
    - Parse grounds count and lines-per-ground header, then each ground position
    - Parse wires count and lines-per-wire header, then each wire (start/end pairs)
    - Parse texts count and lines-per-text header, then each text annotation
    - Return descriptive errors for truncated files, missing sections, non-numeric values
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Implement `src/io/XscPrinter.js`
    - Export `printXsc(block)` function returning a .xsc format string
    - Serialize title, 6 variable slots, components, grounds, wires, texts
    - Match the exact whitespace and comment format of the original .xsc files
    - _Requirements: 2.7_

  - [x] 2.3 Write property test for XSC round-trip (Property 1)
    - **Property 1: XSC parse/print round-trip**
    - Create `tests/unit/io/XscParser.spec.js`
    - Build `circuitBlockGenerator()` using fast-check: random titles, 0-6 non-empty variable slots, 1-8 components with valid formulas, random wires/grounds/texts
    - Assert: `parseXsc(printXsc(block)).block` is structurally equivalent to `block`
    - Minimum 100 iterations
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8**

  - [x] 2.4 Write unit tests for XSC Parser with real .xsc files
    - In the same `tests/unit/io/XscParser.spec.js` file
    - Parse each of the 9 shipped .xsc files from `src/data/circuit-blocks/`
    - Verify LowPassFirstOrder: title="Low Pass 1st Order", 2 non-empty variables (freq, R), 1 component (inductor), 1 wire, 4 texts
    - Verify Shunt Notch: title="Shunt Notch", 3 non-empty variables (f, Q, R), 3 components
    - Test error cases: truncated file, missing sections, non-numeric values
    - _Requirements: 2.1, 2.6_

- [x] 3. Implement Formula Parser, Printer, and Engine
  - [x] 3.1 Implement `src/formulas/FormulaParser.js`
    - Export `parseFormula(formula)` returning `{ success, ast, error }`
    - Recursive-descent parser following the EBNF grammar: Expression → Term → Exponent → Unary → Atom
    - Handle operator precedence: parentheses > exponentiation > multiplication/division > addition/subtraction
    - Treat `pi` as a special identifier (numeric constant)
    - Support scientific notation in number literals (e.g., 5.6E-6)
    - Return descriptive errors with character position for invalid syntax
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 3.2 Implement `src/formulas/FormulaPrinter.js`
    - Export `printFormula(ast)` returning a formula string
    - Emit minimal parentheses based on operator precedence
    - Preserve grouping nodes as explicit parentheses
    - _Requirements: 7.3_

  - [x] 3.3 Implement `src/formulas/FormulaEngine.js`
    - Export `evaluateFormula(formula, variables)` returning `{ success, value, error }`
    - Parse formula string to AST, then recursively evaluate
    - Substitute variable names with provided values; `pi` → Math.PI
    - Support `10^x` pattern for power-of-ten calculations
    - Return errors for: undefined variables, division by zero, NaN/Infinity results, negative component values
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.4 Write property test for formula round-trip (Property 2)
    - **Property 2: Formula parse/print round-trip**
    - Create `tests/unit/formulas/FormulaParser.spec.js`
    - Build `formulaAstGenerator(maxDepth=4)` using fast-check: generates valid ASTs with numbers, identifiers, binary ops, unary negation, groups
    - Assert: `parseFormula(printFormula(ast)).ast` evaluates to the same value as `ast` for all variable bindings
    - Minimum 100 iterations
    - **Validates: Requirements 7.1, 7.3, 7.4**

  - [x] 3.5 Write property test for formula evaluation determinism (Property 3)
    - **Property 3: Formula evaluation determinism**
    - In `tests/unit/formulas/FormulaEngine.spec.js`
    - Build `variableBindingsGenerator(ast)` that extracts identifiers and generates positive finite bindings
    - Assert: for any valid formula and positive finite variable bindings, `evaluateFormula` returns a finite positive number
    - Minimum 100 iterations
    - **Validates: Requirements 3.1, 3.3**

  - [x] 3.6 Write property test for operator precedence (Property 4)
    - **Property 4: Formula operator precedence**
    - In `tests/unit/formulas/FormulaParser.spec.js`
    - Generate formulas with mixed operators and compare evaluation result against JavaScript's native evaluation (using Function constructor with safe inputs)
    - Assert: FormulaEngine result matches mathematically correct evaluation
    - Minimum 100 iterations
    - **Validates: Requirements 7.2**

  - [x] 3.7 Write unit tests for Formula Engine with known formulas
    - In `tests/unit/formulas/FormulaEngine.spec.js`
    - Test `R/(2*pi*freq)` with R=8, freq=1000 → ≈0.001273
    - Test `(Q*8)/(6.28*f)` with Q=1, f=1000 → ≈0.001274
    - Test `1/(6.28*f*8*Q)` with f=1000, Q=1 → expected value
    - Test `R*(1-(10^(-(dB+0.001)/20)))` with R=8, dB=6
    - Test error cases: undefined variable, division by zero, empty formula
    - _Requirements: 3.1, 3.4, 3.5_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Copy .xsc data files and implement Block Registry
  - [x] 5.1 Copy .xsc files to `src/data/circuit-blocks/`
    - Copy all 9 .xsc files from `research/CircuitBlocks/` to `src/data/circuit-blocks/`
    - Exclude "L-Pad - Copy.xsc" if present
    - Files: AllPass1stOrder.xsc, AllPass2ndOrder.xsc, HighPass2ndOrderQ.xsc, HighPassFirstOrder.xsc, L-Pad.xsc, LowPass2ndOrderQ.xsc, LowPassFirstOrder.xsc, Series Notch.xsc, Shunt Notch.xsc
    - _Requirements: 1.4_

  - [x] 5.2 Implement `src/blocks/BlockRegistry.js`
    - Export `loadBlockRegistry(blocksDirectory)` returning `{ blocks: Map, errors: Array }`
    - Discover all .xsc files in the directory using fs/path
    - Parse each file with `parseXsc()`, derive identifier from filename (without extension)
    - Provide `getBlock(identifier)` and `getBlocksByCategory()` methods
    - Static category mapping: Filters, Phase, Attenuators, Notch Filters
    - Log warnings for files that fail to parse, continue loading remaining
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ]* 5.3 Write unit tests for Block Registry
    - Create `tests/unit/blocks/BlockRegistry.spec.js`
    - Load all 9 shipped blocks and verify titles match expected list
    - Verify category assignment for all 9 blocks
    - Verify `getBlock('LowPassFirstOrder')` returns correct block
    - Test graceful handling of a malformed .xsc file among valid ones
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Implement Insertion Engine and Block operations
  - [x] 6.1 Implement `src/blocks/InsertionEngine.js`
    - Export `insertBlock(circuit, block, variables, insertionPoint)` returning `{ success, blockGroup, error }`
    - Evaluate each component's formula using FormulaEngine with user-supplied variables
    - Create Component instances (Resistor/Capacitor/Inductor) with calculated values
    - Position components at insertionPoint offset by block's relative positions
    - Create Wire instances from block's wiring topology
    - Assign sequential labels continuing from highest existing label per type (R6→R7, C1→C2, etc.)
    - Set ESR on components where block defines ESR > 0
    - Create BlockGroup metadata linking components, wires, variables, and formulas
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 6.2 Implement block tuning logic
    - Add `tuneBlock(circuit, blockGroupId, newVariables)` function
    - Re-evaluate all component formulas with new variable values
    - Update each component's value to the recalculated result
    - Update the BlockGroup's stored variable values
    - Preserve component positions, labels, and ESR values
    - _Requirements: 8.3, 8.4, 8.5_

  - [x] 6.3 Implement block dissolution logic
    - Add `dissolveBlock(circuit, blockGroupId)` function
    - Remove the BlockGroup entity from the circuit's blockGroups array
    - Leave all components and wires in place with their current values, positions, labels, and ESR
    - Components become independently selectable/movable/editable
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [ ]* 6.4 Write property test for block insertion correctness (Property 5)
    - **Property 5: Block insertion creates correct components**
    - Create `tests/unit/blocks/InsertionEngine.spec.js`
    - Generate valid CircuitBlocks with N components and M wires, valid variable bindings
    - Assert: circuit component count increases by N, wire segments match topology, positions offset correctly, values match formula evaluation
    - Minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.9**

  - [ ]* 6.5 Write property test for sequential label assignment (Property 6)
    - **Property 6: Block insertion assigns sequential labels**
    - In `tests/unit/blocks/InsertionEngine.spec.js`
    - Generate circuits with existing labeled components, then insert a block
    - Assert: new labels continue sequentially from highest existing label per type
    - Minimum 100 iterations
    - **Validates: Requirements 6.4**

  - [ ]* 6.6 Write property test for block dissolution (Property 7)
    - **Property 7: Block dissolution preserves component state**
    - Create `tests/unit/blocks/BlockDissolution.spec.js`
    - Generate circuits with Block_Groups, dissolve each group
    - Assert: component values, positions, labels, ESR unchanged; BlockGroup removed from circuit
    - Minimum 100 iterations
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 6.7 Write property test for block tuning (Property 8)
    - **Property 8: Block tuning recalculates all components**
    - Create `tests/unit/blocks/BlockTuning.spec.js`
    - Generate Block_Groups with N components and new valid variable values
    - Assert: every component value matches formula evaluation with new variables; positions, labels, ESR unchanged
    - Minimum 100 iterations
    - **Validates: Requirements 8.3, 8.4**

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement DXO Subckt import
  - [x] 8.1 Extend DXO Importer with Subckt parsing
    - Modify the existing DXO importer to parse the Subckts section
    - Extract each Subckt definition: title, 6 variable slots (name, value, description), step modes
    - Read Subckt# field on each component (-1 = independent, 0+ = subcircuit membership)
    - Read the two subcircuit equation lines per component (formula + scale, or "//No Subckt equation" placeholders)
    - Reconstruct Block_Groups from components sharing the same Subckt# value
    - Attempt to match Subckt title against Block_Registry; if no match, use embedded data
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 8.3 Write property test for DXO import verification (Property 9)
    - **Property 9: DXO import reconstructs Block_Groups correctly**
    - Create `tests/unit/io/DxoSubckt.spec.js`
    - Generate circuits with 1-3 Block_Groups (each with 1-8 components, valid formulas/variables)
    - Assert: importing a DXO file produces correct Block_Groups (same titles, variable values, component associations, formula strings)
    - Minimum 100 iterations
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.8**

  - [ ]* 8.4 Write unit tests for DXO Subckt with real files
    - In `tests/unit/io/DxoSubckt.spec.js`
    - Import `research/circuit-block-examples/shunt-notch.dxo` and verify Block_Group reconstruction
    - Verify: 1 Subckt with title "Shunt Notch", 3 block components (Subckt#=0), 5 independent components (Subckt#=-1)
    - Verify variable values: f=917.00404, Q=1, R=0.01
    - Verify formula strings on block components: `(Q*8)/(6.28*f)`, `1/(6.28*f*8*Q)`, `R*1`
    - Test import of DXO files from `tests/fixtures/projects/` (vivace, tonic, center) — verify they load without errors (they have 0 subckts)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7_

- [x] 9. Implement Variable filtering and UI data layer
  - [x] 9.1 Implement variable filtering utility
    - Create a utility function that filters a CircuitBlock's 6 variable slots to return only those with non-empty names
    - Used by Variable_Dialog to determine which fields to display
    - _Requirements: 5.2_

  - [ ]* 9.2 Write property test for variable filtering (Property 10)
    - **Property 10: Variable filtering shows only non-empty slots**
    - Create `tests/unit/blocks/VariableFiltering.spec.js`
    - Generate CircuitBlocks with 0-6 non-empty variable slots in random positions
    - Assert: filtering returns exactly K variables (where K = count of non-empty name slots), each with a non-empty name
    - Minimum 100 iterations
    - **Validates: Requirements 5.2**

- [x] 10. Implement Vuex store extensions for Block_Groups
  - [x] 10.1 Add Block_Group state and mutations to circuit store
    - Add `blockGroups` array to circuit store state
    - Add mutations: `ADD_BLOCK_GROUP`, `REMOVE_BLOCK_GROUP`, `UPDATE_BLOCK_GROUP_VARIABLES`
    - Add actions: `insertBlock` (calls InsertionEngine, commits mutations, triggers simulation refresh), `tuneBlock` (calls tuning logic, commits update, triggers simulation refresh), `dissolveBlock` (calls dissolution logic, commits removal)
    - Wire group selection: selecting any component in a Block_Group highlights all components in the group
    - Wire group movement: dragging any component in a Block_Group moves all components/wires together
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 8.3, 8.6, 9.2_

- [x] 11. Implement UI components
  - [x] 11.1 Implement Block_Menu Vue component
    - Create Vue component displaying all blocks from Block_Registry grouped by category (Filters, Phase, Attenuators, Notch Filters)
    - Each block shown as a selectable item with its display name
    - On selection, open the Variable_Dialog for that block
    - Disable menu with tooltip when no circuit is open
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 11.2 Implement Variable_Dialog Vue component
    - Create modal dialog showing editable numeric input fields for each non-empty variable
    - Display variable name, description, and default value
    - Validate inputs: reject non-numeric or empty values, show validation errors
    - On confirm: pass variable values to the store's insertBlock action
    - On cancel: close without modifying circuit
    - Support re-opening for tuning (pre-populated with current values)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.3 Implement context menu actions (Tune and Dissolve)
    - Add "Tune" action to Block_Group right-click context menu
    - Add "Change Block to separate parts" action to Block_Group right-click context menu
    - "Tune" opens Variable_Dialog pre-populated with current values; on confirm, dispatches tuneBlock action
    - "Change Block to separate parts" dispatches dissolveBlock action
    - After dissolution, context menu no longer shows "Tune" for those components
    - _Requirements: 8.1, 8.2, 8.7, 9.1, 9.6_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Schema-first: task 1 creates schemas before any implementation code
- The .xsc files in `research/CircuitBlocks/` are the source data; task 5.1 copies them into the app bundle location
- Real test data for DXO round-trip exists in `tests/fixtures/projects/` and `research/circuit-block-examples/`
- All code uses plain JavaScript with tab indentation per project conventions
- Tests use Jest with fast-check v4.5.3 for property-based testing
