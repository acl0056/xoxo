# Implementation Tasks: Crossover Network Simulator

## Phase 1: Project Setup and Core Infrastructure

### 1. Project Initialization
- [x] 1.1 Initialize Electron + Vue 3 project structure
- [x] 1.2 Configure build system (webpack/vite) with development and production modes
- [x] 1.3 Set up ESLint with Airbnb base configuration and custom rules from .eslintrc.cjs
- [x] 1.4 Configure path aliases (@/ for src directory)
- [x] 1.5 Set up Jest testing framework with Vue 3 support
- [x] 1.6 Install and configure fast-check for property-based testing
- [x] 1.7 Install Ajv for JSON Schema validation
- [x] 1.8 Create basic Electron main process entry point
- [x] 1.9 Create basic Vue 3 renderer process with App.vue

### 2. JSON Schema Definitions
- [x] 2.1 Create src/schemas/ directory structure
- [x] 2.2 Implement circuit.schema.json with all component type definitions
- [x] 2.3 Implement frd-data.schema.json for frequency response data
- [x] 2.4 Implement zma-data.schema.json for impedance data
- [x] 2.5 Implement simulation-results.schema.json for simulation output
- [x] 2.6 Write unit tests to validate schema files are valid JSON Schema
- [x] 2.7 Write property test: Generated circuit data validates against circuit schema

## Phase 2: Data Models and Serialization

### 3. Core Data Model Classes
- [x] 3.1 Implement Circuit class with component/wire/annotation management
- [x] 3.2 Implement Component base class with common properties
- [x] 3.3 Implement Resistor, Capacitor, Inductor component classes
- [x] 3.4 Implement Speaker component class with FRD/ZMA data support
- [x] 3.5 Implement VoltageSource component class
- [x] 3.6 Implement Ground component class
- [x] 3.7 Implement Wire class with multi-segment support
- [x] 3.8 Implement Node class for connection points
- [x] 3.9 Implement TextAnnotation class
- [x] 3.10 Write unit tests for each component class constructor and default values
- [x] 3.11 Write property test: Component labeling uniqueness and sequence (Property 7)

### 4. JSON Serialization
- [x] 4.1 Implement toJSON() methods for all model classes
- [x] 4.2 Implement fromJSON() static methods for all model classes
- [x] 4.3 Implement JsonSerializer class with validation
- [x] 4.4 Write unit tests for serialization of each component type
- [x] 4.5 Write property test: Serialization round-trip preserves all data (Property 11)
- [x] 4.6 Write property test: Circuit modification preserves validity (Property 1)

- [x] 5. Utility Functions
	- [x] 5.1 Implement generateUniqueId() function for component IDs
	- [x] 5.2 Implement parseEngineering() for engineering notation parsing (4.7k, 10u, 100n)
	- [x] 5.3 Implement formatEngineering() for engineering notation formatting
	- [x] 5.4 Implement E12/E24 standard value stepping functions
	- [x] 5.5 Write unit tests for engineering notation parsing edge cases
	- [x] 5.6 Write property test: Engineering notation parsing round-trip (Property 9)
	- [x] 5.7 Write property test: Parameter validation rejects invalid values (Property 10)

## Phase 3: File I/O and Data Import

- [x] 6. File Operations
	- [x] 6.1 Implement file save functionality with schema validation
	- [x] 6.2 Implement file load functionality with schema validation and error handling
	- [x] 6.3 Implement unsaved changes tracking (dirty flag)
	- [x] 6.4 Implement recent files list management
	- [x] 6.5 Write unit tests for file save/load with valid and invalid files
	- [x] 6.6 Write property test: Invalid file rejection (Property 19)
	- [x] 6.7 Write property test: Unsaved changes tracking (Property 20)

- [ ] 7. FRD/ZMA File Parsing
	- [x] 7.1 Implement FrdParser class for parsing frequency response files
	- [x] 7.2 Implement ZmaParser class for parsing impedance files
	- [x] 7.3 Implement monotonic frequency validation
	- [x] 7.4 Implement FRD/ZMA export functionality
	- [x] 7.5 Write unit tests for FRD/ZMA parsing with valid and invalid files
	- [x] 7.6 Write property test: FRD/ZMA parsing produces monotonic frequencies (Property 21)
	- [x] 7.7 Write property test: Invalid data error reporting (Property 22)

- [x] 8. DXO File Import
	- [x] 8.1 Research XSim .dxo file format structure
	- [x] 8.2 Implement DxoImporter class for parsing .dxo files
	- [x] 8.3 Implement component mapping from DXO to internal format
	- [x] 8.4 Implement connection mapping from DXO to internal Wire format
	- [x] 8.5 Write unit tests for DXO import with reference files
	- [x] 8.6 Handle unsupported DXO features with warnings

## Phase 4: Circuit Editor UI

- [x] 9. Canvas Rendering
	- [x] 9.1 Create CircuitEditor.vue component with HTML5 Canvas
	- [x] 9.2 Implement grid dot rendering with configurable spacing
	- [x] 9.3 Implement component rendering for all component types
	- [x] 9.4 Implement wire rendering with multi-segment support
	- [x] 9.5 Implement annotation text rendering
	- [x] 9.6 Implement selection highlighting
	- [x] 9.7 Write unit tests for coordinate transformations
	- [x] 9.8 Write property test: Grid snapping invariant (Property 5)

- [x] 10. Mouse Interaction
	- [x] 10.1 Implement mouse event handlers (mousedown, mousemove, mouseup)
	- [x] 10.2 Implement component selection on click
	- [x] 10.3 Implement component drag-and-drop from palette
	- [x] 10.4 Implement component move mode with grid snapping
	- [x] 10.5 Implement wire creation by dragging between terminals
	- [x] 10.6 Implement multi-segment wire routing
	- [x] 10.7 Implement scroll/pan functionality
	- [x] 10.8 Write unit tests for hit detection and selection
	- [x] 10.9 Write property test: Wire connectivity invariant (Property 3)
	- [x] 10.10 Write property test: Multi-segment wire validity (Property 6)

- [x] 11. Zoom and View Controls
	- [x] 11.1 Implement zoom in/out buttons
	- [x] 11.2 Implement zoom percentage input field
	- [x] 11.3 Implement zoom transformation for canvas rendering
	- [x] 11.4 Implement scroll area expansion logic
	- [x] 11.5 Write unit tests for zoom calculations
	- [x] 11.6 Verify grid snapping works at all zoom levels

- [x] 12. Component Palette
	- [x] 12.1 Create ComponentPalette.vue component
	- [x] 12.2 Implement component icons (SVG or image assets)
	- [x] 12.3 Implement drag-and-drop from palette to canvas
	- [x] 12.4 Implement component creation on drop
	- [x] 12.5 Write unit tests for palette interactions

- [x] 13. Context Menu and Keyboard Shortcuts
	- [x] 13.1 Implement right-click context menu for components
	- [x] 13.2 Implement context menu items: Tune, Delete, Rotate, Invert, Mute
	- [x] 13.3 Implement keyboard shortcuts: Delete, T (tune), Spacebar (rotate), Escape
	- [x] 13.4 Implement context menu for wires (Delete)
	- [x] 13.5 Write unit tests for keyboard event handling
	- [x] 13.6 Write property test: Component rotation preserves connections (Property 24)

- [x] 14. Undo/Redo System
	- [x] 14.1 Implement undo stack in Vuex store
	- [x] 14.2 Implement redo stack in Vuex store
	- [x] 14.3 Implement action recording for all editing operations
	- [x] 14.4 Implement undo/redo keyboard shortcuts (Ctrl+Z, Ctrl+Y)
	- [x] 14.5 Write unit tests for undo/redo operations
	- [x] 14.6 Write property test: Undo/redo inverse operations (Property 2)

## Phase 5: Component Parameter Dialogs

- [x] 15. Tune Dialog Component
	- [x] 15.1 Create TuneDialog.vue component with modal overlay
	- [x] 15.2 Implement passive component parameter inputs (value, tolerance, ESR, state)
	- [x] 15.3 Implement speaker parameter inputs (name, sensitivity, delay, invert, mute)
	- [x] 15.4 Implement voltage source parameter inputs (power, impedance, delay, invert)
	- [x] 15.5 Implement file selection buttons for FRD/ZMA files
	- [x] 15.6 Implement phase source radio buttons (measured/derived)
	- [x] 15.7 Implement off-axis file management UI
	- [x] 15.8 Implement up/down increment buttons with E12/E24 stepping
	- [x] 15.9 Implement engineering notation input parsing
	- [x] 15.10 Write unit tests for parameter validation
	- [x] 15.11 Write property test: Default parameter assignment (Property 8)

- [x] 16. Component State Management
	- [x] 16.1 Implement normal/open/short state toggle in context menu
	- [x] 16.2 Implement state selection in Tune dialog
	- [x] 16.3 Implement visual indication of component state on canvas
	- [x] 16.4 Write unit tests for state transitions
	- [x] 16.5 Write property test: Component state simulation behavior (Property 13)

## Phase 6: Simulation Engine

- [x] 17. Circuit Solver (MNA)
	- [x] 17.1 Implement CircuitSolver class with Modified Nodal Analysis
	- [x] 17.2 Implement node mapping and indexing
	- [x] 17.3 Implement MNA matrix construction for passive components
	- [x] 17.4 Implement voltage source handling in MNA
	- [x] 17.5 Implement complex number math library integration
	- [x] 17.6 Implement matrix solver (LU decomposition or similar)
	- [x] 17.7 Implement frequency point generation (logarithmic spacing)
	- [x] 17.8 Write unit tests for simple RC, RL, RLC circuits
	- [x] 17.9 Write property test: Simulation frequency range (Property 14)
	- [x] 17.10 Write property test: Simulation completeness (Property 15)

- [x] 18. Component State Handling in Simulation
	- [x] 18.1 Implement open state handling (infinite impedance)
	- [x] 18.2 Implement short state handling (zero resistance)
	- [x] 18.3 Implement ESR inclusion in capacitor/inductor models
	- [x] 18.4 Write unit tests for component state effects
	- [x] 18.5 Write property test: ESR simulation impact (Property 12)

- [x] 19. Frequency Response Analysis
	- [x] 19.1 Implement FrequencyAnalyzer class
	- [x] 19.2 Implement SPL calculation for individual speakers
	- [x] 19.3 Implement combined system response calculation
	- [x] 19.4 Implement sensitivity adjustment application
	- [x] 19.5 Implement delay/phase shift application
	- [x] 19.6 Implement polarity inversion handling
	- [x] 19.7 Write unit tests for frequency response calculations
	- [x] 19.8 Write property test: Polarity inversion (Property 26)

- [x] 20. Impedance Calculation
	- [x] 20.1 Implement input impedance calculation at each frequency
	- [x] 20.2 Implement impedance magnitude and phase extraction
	- [x] 20.3 Run ESLint on impedance calculation code and fix any issues
	- [x] 20.4 Write unit tests for impedance calculations

- [x] 20.5 Create Missing Schemas for Module Boundaries
	- [x] 20.5.1 Create solver-result.schema.json for CircuitSolver.solve() return type
	- [x] 20.5.2 Create frequency-response-data.schema.json for FrequencyAnalyzer output
	- [x] 20.5.3 Create impedance-response-data.schema.json for ImpedanceCalculator output
	- [x] 20.5.4 Add schema validation at module boundaries (CircuitSolver, FrequencyAnalyzer, ImpedanceCalculator)
	- [x] 20.5.5 Update existing tests to validate against new schemas
	- [x] 20.5.6 Write unit tests to validate schema files are valid JSON Schema

- [x] 21. Hilbert Transform
	- [x] 21.1 Research and implement Hilbert Transform algorithm
	- [x] 21.2 Implement minimum phase derivation from magnitude data
	- [x] 21.3 Run ESLint on Hilbert Transform code and fix any issues
	- [x] 21.4 Write unit tests comparing measured vs derived phase
	- [x] 21.5 Write property test: Minimum phase derivation (Property 17)

- [x] 22. Circuit Validation
	- [x] 22.1 Implement floating node detection
	- [x] 22.2 Implement short circuit detection
	- [x] 22.3 Implement missing ground detection
	- [x] 22.4 Implement disconnected component detection
	- [x] 22.5 Run ESLint on circuit validation code and fix any issues
	- [x] 22.6 Write unit tests for each validation error type
	- [x] 22.7 Write property test: Invalid circuit error reporting (Property 16)
	- [x] 22.8 Write property test: Disconnected component exclusion (Property 18)

- [x] 23. Voltage Source Calculations
	- [x] 23.1 Implement voltage calculation from power and impedance (V = sqrt(P * Z))
	- [x] 23.2 Implement default initialization (1W at 8Ω = 2.828 Vrms)
	- [x] 23.3 Run ESLint on voltage source code and fix any issues
	- [x] 23.4 Write unit tests for voltage source calculations
	- [x] 23.5 Write property test: Voltage source calculation (Property 25)

## Phase 7: Graph Visualization

- [x] 24. Frequency Response Graph
	- [x] 24.1 Create FrequencyResponseGraph.vue component
	- [x] 24.2 Implement logarithmic frequency axis rendering
	- [x] 24.3 Implement linear dB magnitude axis rendering
	- [x] 24.4 Implement grid line rendering
	- [x] 24.5 Implement curve rendering for multiple traces
	- [x] 24.6 Implement curve color management
	- [x] 24.7 Implement hover tooltips with frequency/magnitude values
	- [x] 24.8 Run ESLint on FrequencyResponseGraph component and fix any issues
	- [x] 24.9 Write unit tests for axis calculations

- [x] 25. Impedance Graph
	- [x] 25.1 Create ImpedanceGraph.vue component
	- [x] 25.2 Implement impedance curve rendering
	- [x] 25.3 Implement phase curve rendering
	- [x] 25.4 Reuse axis and grid rendering from frequency response graph
	- [x] 25.5 Run ESLint on ImpedanceGraph component and fix any issues
	- [x] 25.6 Write unit tests for impedance graph rendering

- [-] 26. Graph Controls and Menus
	- [x] 26.1 Implement Curves menu for frequency response graph
	- [x] 26.2 Implement curve visibility toggles
	- [x] 26.3 Implement curve color selection
	- [x] 26.4 Implement phase curve toggle
	- [x] 26.5 Implement smoothing options (1/24, 1/12, 1/6, 1/3, 1/2, 1, ERB)
	- [x] 26.6 Implement smoothing algorithm for fractional octave smoothing
	- [x] 26.7 Implement Curves menu for impedance graph
	- [x] 26.8 Run ESLint on graph controls code and fix any issues
	- [x] 26.9 Write unit tests for smoothing calculations

- [x] 27. Graph Scale Controls
	- [x] 27.1 Implement Scale menu for frequency response graph
	- [x] 27.2 Implement min/max frequency inputs
	- [x] 27.3 Implement vertical center value input
	- [x] 27.4 Implement vertical step size input
	- [x] 27.5 Implement Scale menu for impedance graph
	- [x] 27.6 Run ESLint on scale controls code and fix any issues
	- [x] 27.7 Write unit tests for scale transformations

- [x] 28. Hold Feature
	- [x] 28.1 Implement Hold button for frequency response graph
	- [x] 28.2 Implement graph state capture on Hold activation
	- [x] 28.3 Implement gray overlay rendering of held curves
	- [x] 28.4 Implement Hold button for impedance graph
	- [x] 28.5 Run ESLint on hold feature code and fix any issues
	- [x] 28.6 Write unit tests for hold state management

- [x] 29. Graph Export
	- [x] 29.1 Implement FRD file export from frequency response graph
	- [x] 29.2 Implement ZMA file export from impedance graph
	- [x] 29.3 Implement graph snapshot to PNG file
	- [x] 29.4 Implement graph snapshot to clipboard
	- [x] 29.5 Run ESLint on graph export code and fix any issues
	- [x] 29.6 Write unit tests for export functionality

- [x] 30. External File Comparison
	- [x] 30.1 Implement "Get File" menu item for loading external FRD files
	- [x] 30.2 Implement external FRD curve rendering in frequency response graph
	- [x] 30.3 Implement "Get File" menu item for loading external ZMA files
	- [x] 30.4 Implement external ZMA curve rendering in impedance graph
	- [x] 30.5 Run ESLint on external file comparison code and fix any issues
	- [x] 30.6 Write unit tests for external file loading

## Phase 8: Off-Axis Response

- [ ] 31. Off-Axis Data Management
	- [ ] 31.1 Implement off-axis file storage in Speaker component
	- [ ] 31.2 Implement off-axis file loading and parsing
	- [ ] 31.3 Implement angle validation (0-180 degrees)
	- [ ] 31.4 Implement off-axis file UI in Tune dialog
	- [ ] 31.5 Run ESLint on off-axis data management code and fix any issues
	- [ ] 31.6 Write unit tests for off-axis data management

- [ ] 32. Angle Switching
	- [ ] 32.1 Implement global angle control in UI
	- [ ] 32.2 Implement angle switching logic for all speakers
	- [ ] 32.3 Implement driver exclusion (effective muting) when angle data is missing
	- [ ] 32.4 Implement warning indicator for drivers missing angle data
	- [ ] 32.5 Implement angle indicator in graph viewer
	- [ ] 32.6 Run ESLint on angle switching code and fix any issues
	- [ ] 32.7 Write unit tests for angle switching
	- [ ] 32.8 Write property test: Off-axis angle switching (Property 23)

## Phase 9: Vuex State Management

- [ ] 33. Circuit State Module
	- [ ] 33.1 Implement circuit state module (circuit.js)
	- [ ] 33.2 Implement mutations for component add/remove/update
	- [ ] 33.3 Implement mutations for wire add/remove
	- [ ] 33.4 Implement mutations for annotation add/remove/update
	- [ ] 33.5 Implement actions for file operations
	- [ ] 33.6 Implement undo/redo state management
	- [ ] 33.7 Run ESLint on circuit state module and fix any issues
	- [ ] 33.8 Write unit tests for state mutations

- [ ] 34. Simulation State Module
	- [ ] 34.1 Implement simulation state module (simulation.js)
	- [ ] 34.2 Implement auto-simulate toggle
	- [ ] 34.3 Implement current angle state
	- [ ] 34.4 Implement frequency response state
	- [ ] 34.5 Implement impedance response state
	- [ ] 34.6 Implement simulation action with async solver
	- [ ] 34.7 Run ESLint on simulation state module and fix any issues
	- [ ] 34.8 Write unit tests for simulation state management

- [ ] 35. UI State Module
	- [ ] 35.1 Implement UI state module (ui.js)
	- [ ] 35.2 Implement panel size/position state
	- [ ] 35.3 Implement zoom level state
	- [ ] 35.4 Implement selected component state
	- [ ] 35.5 Implement graph scale settings state
	- [ ] 35.6 Run ESLint on UI state module and fix any issues
	- [ ] 35.7 Write unit tests for UI state management

## Phase 10: Application Integration

- [ ] 36. Electron Main Process
	- [ ] 36.1 Implement application menu (File, Edit, View, Help)
	- [ ] 36.2 Implement file dialog handlers (open, save, import)
	- [ ] 36.3 Implement window management
	- [ ] 36.4 Implement IPC communication between main and renderer
	- [ ] 36.5 Implement recent files persistence
	- [ ] 36.6 Run ESLint on Electron main process code and fix any issues
	- [ ] 36.7 Write unit tests for IPC handlers

- [ ] 37. Application Lifecycle
	- [ ] 37.1 Implement new project initialization with default voltage source
	- [ ] 37.2 Implement unsaved changes prompt on close
	- [ ] 37.3 Implement last opened file restoration
	- [ ] 37.4 Implement error logging to file
	- [ ] 37.5 Implement crash recovery data saving
	- [ ] 37.6 Implement about dialog
	- [ ] 37.7 Run ESLint on application lifecycle code and fix any issues
	- [ ] 37.8 Write unit tests for lifecycle events

- [ ] 38. Auto-Simulation
	- [ ] 38.1 Implement auto-simulate toggle in UI
	- [ ] 38.2 Implement parameter change detection
	- [ ] 38.3 Implement debounced simulation trigger
	- [ ] 38.4 Implement simulation progress indicator
	- [ ] 38.5 Run ESLint on auto-simulation code and fix any issues
	- [ ] 38.6 Write unit tests for auto-simulation logic

## Phase 11: Annotation System

- [ ] 39. Text Annotations
	- [ ] 39.1 Implement text annotation creation on canvas
	- [ ] 39.2 Implement text editing dialog
	- [ ] 39.3 Implement font size control
	- [ ] 39.4 Implement annotation positioning and dragging
	- [ ] 39.5 Implement annotation deletion
	- [ ] 39.6 Run ESLint on text annotation code and fix any issues
	- [ ] 39.7 Write unit tests for annotation management
	- [ ] 39.8 Write property test: Annotation simulation independence (Property 4)

## Phase 12: Testing and Validation

- [ ] 40. Unit Test Suite
	- [ ] 40.1 Achieve 80%+ code coverage for model classes
	- [ ] 40.2 Achieve 80%+ code coverage for simulation engine
	- [ ] 40.3 Achieve 70%+ code coverage for UI components
	- [ ] 40.4 Write integration tests for end-to-end workflows
	- [ ] 40.5 Write tests for error handling and edge cases

- [ ] 41. Property-Based Test Suite
	- [ ] 41.1 Implement circuit generator for PBT
	- [ ] 41.2 Implement component generator for PBT
	- [ ] 41.3 Implement engineering notation generator for PBT
	- [ ] 41.4 Implement FRD data generator for PBT
	- [ ] 41.5 Implement ZMA data generator for PBT
	- [ ] 41.6 Configure fast-check with minimum 100 iterations per test
	- [ ] 41.7 Tag all property tests with feature name and property number

- [ ] 42. XSim Validation Testing
	- [ ] 42.1 Obtain or create reference 2-way crossover project
	- [ ] 42.2 Obtain or create reference 3-way crossover project
	- [ ] 42.3 Obtain or create reference edge case project
	- [ ] 42.4 Implement validation test suite
	- [ ] 42.5 Implement curve comparison with tolerance checking (±0.5 dB, ±5°)
	- [ ] 42.6 Store reference files in test fixtures directory
	- [ ] 42.7 Document validation test results

## Phase 13: Polish and Documentation

- [ ] 43. UI Polish
	- [ ] 43.1 Implement consistent styling across all components
	- [ ] 43.2 Implement loading indicators for long operations
	- [ ] 43.3 Implement error message dialogs with clear messaging
	- [ ] 43.4 Implement tooltips for all UI controls
	- [ ] 43.5 Implement keyboard shortcut reference dialog
	- [ ] 43.6 Optimize canvas rendering performance

- [ ] 44. Cross-Platform Testing
	- [ ] 44.1 Test on Windows 10/11
	- [ ] 44.2 Test on macOS 10.14+
	- [ ] 44.3 Test on Linux (Ubuntu, Fedora)
	- [ ] 44.4 Verify native file dialogs work on all platforms
	- [ ] 44.5 Verify preferences storage works on all platforms

- [ ] 45. Documentation
	- [ ] 45.1 Write user guide with screenshots
	- [ ] 45.2 Write developer documentation for architecture
	- [ ] 45.3 Document JSON file format specification
	- [ ] 45.4 Document FRD/ZMA file format support
	- [ ] 45.5 Create example circuit library
	- [ ] 45.6 Write troubleshooting guide

- [ ] 46. Build and Packaging
	- [ ] 46.1 Configure Electron Builder for Windows
	- [ ] 46.2 Configure Electron Builder for macOS
	- [ ] 46.3 Configure Electron Builder for Linux
	- [ ] 46.4 Create application icons for all platforms
	- [ ] 46.5 Test installers on all platforms
	- [ ] 46.6 Set up code signing for macOS and Windows

## Phase 14: Future Enhancements (Non-MVP)

- [ ] 47. Circuit Templates (Future)
	- [ ]* 47.1 Implement template library system
	- [ ]* 47.2 Create Butterworth filter templates
	- [ ]* 47.3 Create Linkwitz-Riley filter templates
	- [ ]* 47.4 Implement template parameter tuning
	- [ ]* 47.5 Implement user template saving

- [ ] 48. Active Components (Future)
	- [ ]* 48.1 Implement OpAmp component class
	- [ ]* 48.2 Implement Buffer component class
	- [ ]* 48.3 Implement Summer component class
	- [ ]* 48.4 Extend MNA solver for active components
	- [ ]* 48.5 Create active component library

- [ ] 49. Specialized Components (Future)
	- [ ]* 49.1 Implement Transformer component class
	- [ ]* 49.2 Implement Potentiometer component class
	- [ ]* 49.3 Implement Switch component class
	- [ ]* 49.4 Implement FDNR component class
	- [ ]* 49.5 Implement custom impedance component class

- [ ] 50. Advanced Features (Future)
	- [ ]* 50.1 Implement FRD/ZMA file editor within application
	- [ ]* 50.2 Implement acoustic effect file support
	- [ ]* 50.3 Implement group delay visualization
	- [ ]* 50.4 Implement impulse response visualization
	- [ ]* 50.5 Implement step response visualization
	- [ ]* 50.6 Implement square wave response visualization

## Notes

- Tasks marked with `*` are optional future enhancements (non-MVP)
- Property tests reference the numbered properties in the design document
- All property tests should run with minimum 100 iterations
- Schema-first approach: Update schemas before implementing code changes
- Follow ESLint configuration from .eslintrc.cjs for all code
- Use tabs for indentation, not spaces
- Validate all data against JSON schemas at I/O boundaries
