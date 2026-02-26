# Requirements Document

## Introduction

This document specifies the requirements for a cross-platform loudspeaker crossover network modeling application. The system enables audio engineers and enthusiasts to design, simulate, and analyze passive and active crossover networks for loudspeaker systems. The application provides a visual circuit editor, component libraries, real-time simulation, and frequency response visualization.

## Glossary

- **System**: The crossover network simulator application
- **Circuit_Editor**: The visual interface for designing crossover networks
- **Component**: An electronic element (resistor, capacitor, inductor, op-amp, etc.)
- **Crossover_Network**: An electronic circuit that divides audio signals into frequency bands
- **Frequency_Response**: The magnitude and phase response of a circuit across frequencies
- **SPL**: Sound Pressure Level, measured in decibels
- **Impedance**: The complex electrical resistance of a component or circuit
- **Node**: A connection point between components in a circuit
- **Wire**: A connection between two nodes in a circuit
- **Design_File**: A saved crossover network design in JSON format
- **Simulation_Engine**: The computational component that calculates circuit behavior
- **Graph_Viewer**: The component that displays frequency response curves
- **Component_Library**: A collection of predefined component models and parameters

## Requirements

### Requirement 1: Circuit Editor

**User Story:** As a user, I want to design crossover networks visually, so that I can create and modify circuit topologies intuitively.

#### Acceptance Criteria

1. THE Circuit_Editor SHALL provide a canvas for placing and connecting components
2. WHEN a user selects a component from the library, THE Circuit_Editor SHALL allow placement on the canvas
3. WHEN a user drags between two component terminals, THE Circuit_Editor SHALL create a wire connection
4. WHEN a user selects a component or wire, THE Circuit_Editor SHALL allow deletion via keyboard or context menu
5. THE Circuit_Editor SHALL support undo and redo operations for all editing actions
6. WHEN a user moves a component, THE Circuit_Editor SHALL update connected wires automatically
7. THE Circuit_Editor SHALL support adding text annotations to the canvas for documentation
8. WHEN a user adds text, THE Circuit_Editor SHALL allow editing the text content, font size, and position
9. THE System SHALL exclude text annotations from circuit simulation (visual only)
10. THE Circuit_Editor SHALL display a grid of dots to guide component and wire placement
11. THE Circuit_Editor SHALL snap components and wire endpoints to grid points
12. WHEN a user drags a wire, THE System SHALL allow routing to any grid point to create corners and turns
13. THE Circuit_Editor SHALL support creating multi-segment wires with corner points for flexible routing
14. THE Circuit_Editor SHALL support scrolling to navigate large circuit designs
15. THE Circuit_Editor SHALL provide zoom in and zoom out buttons for viewing circuits at different scales
16. THE Circuit_Editor SHALL provide a numeric input field for setting zoom percentage
17. THE Circuit_Editor SHALL default to 100% zoom when opening or creating a new project
18. THE Circuit_Editor SHALL maintain grid alignment and snapping at all zoom levels
19. THE Circuit_Editor SHALL support a Move tool mode for repositioning components
20. WHEN a user drags a component from the component palette, THE System SHALL create a new component instance and enter Move mode
21. WHEN a user single-clicks or click-drags a component on the canvas, THE System SHALL enter Move mode for that component
22. WHEN in Move mode, THE System SHALL allow the component to follow the mouse cursor until placed
23. THE Circuit_Editor SHALL initialize new documents with a scrollable area extending well beyond the visible viewport
24. THE Circuit_Editor SHALL automatically expand the scrollable area to maintain a buffer zone around the outermost components
25. THE System SHALL maintain sufficient buffer space at each edge of the canvas beyond the nearest component

### Requirement 2: Component Library

**User Story:** As a user, I want access to various electronic components, so that I can build realistic crossover networks.

#### Acceptance Criteria

1. THE Component_Library SHALL include passive components: resistors, capacitors, and inductors
2. THE Component_Library SHALL include loudspeaker components with SPL and impedance curves
3. WHEN a component is placed, THE System SHALL assign default parameter values
4. THE Component_Library SHALL support component models: ideal, parasitic, and exponential
5. THE Component_Library SHALL include ground nodes for circuit reference points
6. WHEN a passive component is placed, THE System SHALL automatically assign a unique label (R1, R2, C1, C2, L1, L2, etc.)
7. THE System SHALL ensure all component labels are unique within a document
8. THE System SHALL increment label numbers sequentially for each component type
9. THE Component_Library SHALL NOT include voltage source in the draggable component palette
10. THE System SHALL automatically include a single voltage source (power amp) in each new document
11. THE voltage source component SHALL have positive (+) and negative (-) connection terminals
12. THE ground component SHALL NOT receive an automatic label
13. THE ground component SHALL NOT have a Tune dialog

### Requirement 18: Future Specialized Components (Non-MVP)

**User Story:** As a user, I want access to specialized components, so that I can build advanced crossover designs.

#### Acceptance Criteria

1. THE Component_Library MAY include specialized components: transformers, potentiometers, switches, FDNR, and custom impedance (future enhancement, non-MVP)
2. THE Component_Library MAY provide a potentiometer taper library with common response curves (future enhancement, non-MVP)
3. Specialized component support is not required for the initial MVP release

### Requirement 16: Future Active Components (Non-MVP)

**User Story:** As a user, I want to use active components in my designs, so that I can model active crossovers and filters.

#### Acceptance Criteria

1. THE Component_Library MAY include active components: operational amplifiers, voltage buffers, and summers (future enhancement)
2. THE Component_Library MAY provide an operational amplifier library with predefined models (future enhancement)
3. Active component support is not required for the initial MVP release

### Requirement 3: Component Parameters

**User Story:** As a user, I want to adjust component parameters, so that I can fine-tune my crossover design.

#### Acceptance Criteria

1. THE System SHALL support engineering notation for all numeric inputs (e.g., 4.7k, 10u, 100n)
2. WHEN a user modifies a parameter, THE System SHALL validate the input against acceptable ranges
3. THE System SHALL support component tolerance specifications for passive components
4. WHEN a parameter is changed, THE System SHALL trigger simulation updates if auto-simulation is enabled
5. THE System SHALL persist parameter changes when saving the design
6. THE System SHALL allow users to specify ESR (Equivalent Series Resistance) for capacitors and inductors
7. THE System SHALL include ESR in simulation calculations for realistic component modeling
8. WHEN a user right-clicks on a component, THE System SHALL provide a "Tune" menu item in the context menu
9. WHEN a user selects "Tune", THE System SHALL open a dialog with all component parameters and options
10. THE System SHALL support three electrical states for passive components: normal, open (disconnected), and short (bypassed)
11. WHEN a component is set to open state, THE Simulation_Engine SHALL treat it as disconnected from the circuit
12. WHEN a component is set to short state, THE Simulation_Engine SHALL treat it as a zero-resistance connection
13. THE System SHALL provide normal/open/short state options in both the context menu and the Tune dialog for quick access
14. WHEN a user double-clicks on a component, THE System SHALL open the Tune dialog for that component
15. THE System SHALL provide up/down arrow buttons on numeric input fields for incrementing values
16. WHEN incrementing resistor, capacitor, or inductor values, THE System SHALL step through standard component values (E12/E24 series)
17. WHEN incrementing decibel values, THE System SHALL use 0.25 dB increments
18. WHEN incrementing distance values in inches, THE System SHALL use 0.01 inch increments
19. WHEN a user holds down an increment button, THE System SHALL continue incrementing at a reasonable rate
20. THE System SHALL create a single undo entry when the increment button is released, not for each step
21. WHEN a user presses the 'T' key with a component selected, THE System SHALL open the Tune dialog for that component
22. THE Tune dialog SHALL include a Close button to dismiss the dialog
23. WHEN the Tune dialog is closed, THE System SHALL apply all parameter changes to the component

### Requirement 4: Circuit Simulation

**User Story:** As a user, I want to simulate my crossover network, so that I can analyze its electrical behavior.

#### Acceptance Criteria

1. WHEN a user initiates simulation, THE Simulation_Engine SHALL calculate frequency response from 1 Hz to 100 kHz
2. THE Simulation_Engine SHALL compute voltage, current, and impedance for all circuit nodes
3. THE Simulation_Engine SHALL support both grounded and differential voltage measurements
4. THE Simulation_Engine SHALL handle floating circuit sections correctly
5. WHEN the circuit contains loudspeaker components, THE Simulation_Engine SHALL calculate SPL response
6. THE Simulation_Engine SHALL compute power dissipation for resistive components
7. IF the circuit contains invalid connections, THEN THE Simulation_Engine SHALL report specific error messages
8. THE Simulation_Engine SHALL apply Hilbert Transform to loudspeaker frequency response data for phase calculation
9. THE Simulation_Engine SHALL support acoustic offset adjustments (z-offset/mod delays) for driver time alignment
10. THE Simulation_Engine SHALL calculate combined frequency response from multiple drivers
11. THE Simulation_Engine SHALL display power consumption and stress on individual components during simulation
12. WHEN a component value changes, THE Simulation_Engine SHALL automatically re-solve the circuit network
13. THE System SHALL allow users to add time delays to individual loudspeaker components for phase alignment
14. THE System SHALL support both positive and negative delay values for driver alignment
15. THE System SHALL allow users to invert the polarity of individual loudspeaker components
16. THE Simulation_Engine SHALL only include components connected by wires in the simulation model
17. WHEN components are not connected to the circuit path between source and drivers, THE Simulation_Engine SHALL exclude them from calculations

### Requirement 5: Real-Time Visualization

**User Story:** As a user, I want to see frequency response graphs update in real-time, so that I can understand the impact of parameter changes immediately.

#### Acceptance Criteria

1. THE Graph_Viewer SHALL display frequency response curves with logarithmic frequency axis
2. THE Graph_Viewer SHALL support multiple curve types: magnitude, phase, impedance, and SPL
3. WHEN a user adjusts a component parameter with live simulation enabled, THE Graph_Viewer SHALL update curves within 500 milliseconds
4. THE Graph_Viewer SHALL allow users to zoom and pan the graph display
5. THE Graph_Viewer SHALL display grid lines and axis labels with appropriate units
6. THE Graph_Viewer SHALL support displaying multiple curves simultaneously with different colors
7. WHEN a user hovers over a curve, THE Graph_Viewer SHALL display frequency and magnitude values
8. THE System SHALL support animated simulation mode where parameter adjustments update graphs continuously
9. THE Graph_Viewer SHALL allow users to toggle individual driver curves and combined response visibility
10. THE Graph_Viewer SHALL display crossover points where driver slopes intersect
11. THE Graph_Viewer SHALL support configurable frequency range display (e.g., 100 Hz to 20 kHz)
12. THE Graph_Viewer SHALL support multiple simultaneous graph views for different measurements
13. THE Graph_Viewer SHALL display group delay, impulse response, step response, and square wave response
14. THE Graph_Viewer SHALL allow exporting graphs as standard image file formats (PNG, SVG, JPEG)
15. THE Graph_Viewer SHALL provide a Curves menu for managing displayed curves in the frequency response window
16. THE Graph_Viewer SHALL allow users to load additional FRD files for comparison via "Get File" menu item
17. THE Graph_Viewer SHALL provide menu items for each driver and system response with configuration options
18. WHEN a user selects a driver or system curve menu item, THE System SHALL display a modal with graph color selection
19. THE System SHALL provide a checkbox to show/hide the phase curve for each driver or system response
20. THE System SHALL provide smoothing options: none, 1/24 octave, 1/12 octave, 1/6 octave, 1/3 octave, 1/2 octave, 1 octave, and auditory ERB
21. THE System SHALL provide a button to hide individual modeled graphs entirely
22. WHEN smoothing is applied, THE Graph_Viewer SHALL apply the selected fractional octave smoothing to the frequency response curve
23. THE Graph_Viewer SHALL provide a File menu with export options for frequency response window
24. THE Graph_Viewer SHALL allow exporting the system frequency response as an FRD file
25. THE Graph_Viewer SHALL allow taking a snapshot of the frequency response graph window and saving it to a file
26. THE Graph_Viewer SHALL allow copying a snapshot of the frequency response graph window to the system clipboard
27. THE Graph_Viewer SHALL provide a File menu with export options for impedance window
28. THE Graph_Viewer SHALL allow exporting the system impedance as a ZMA file
29. THE Graph_Viewer SHALL allow taking a snapshot of the impedance graph window and saving it to a file
30. THE Graph_Viewer SHALL allow copying a snapshot of the impedance graph window to the system clipboard
31. THE Graph_Viewer SHALL provide a Curves menu for managing displayed curves in the impedance window
32. THE Graph_Viewer SHALL allow users to load additional ZMA files for comparison in the impedance window
33. THE impedance window Curves menu SHALL provide the same configuration options as the frequency response window (color, phase toggle, smoothing, hide)
34. THE Graph_Viewer SHALL provide a Hold button in both frequency response and impedance windows
35. WHEN a user clicks the Hold button, THE System SHALL capture the current graph state and overlay it in gray
36. THE held graph SHALL remain visible as a reference while the user makes changes to the circuit
37. WHEN a user clicks the Hold button again, THE System SHALL clear the held graph overlay
38. THE Graph_Viewer SHALL provide a Scale menu in both frequency response and impedance windows
39. THE Scale menu SHALL allow users to set the minimum frequency for the graph display
40. THE Scale menu SHALL allow users to set the maximum frequency for the graph display
41. THE Scale menu SHALL allow users to set the vertical center value for the graph
42. THE Scale menu SHALL allow users to set the vertical step size with a default of 5 dB
43. WHEN scale settings are changed, THE Graph_Viewer SHALL update the graph axes and grid accordingly
44. THE Graph_Viewer SHALL default to a frequency range of 20 Hz to 20 kHz for new projects

### Requirement 6: File Operations

**User Story:** As a user, I want to save and load my designs, so that I can work on projects over multiple sessions.

#### Acceptance Criteria

1. WHEN a user saves a design, THE System SHALL serialize the circuit to JSON format
2. THE System SHALL include all component parameters, positions, and connections in the saved file
3. WHEN a user loads a design file, THE System SHALL reconstruct the circuit on the canvas
4. IF a design file is corrupted or invalid, THEN THE System SHALL display an error message and prevent loading
5. THE System SHALL track unsaved changes and prompt the user before closing or loading a new file
6. THE System SHALL support a recent files list accessible from the File menu
7. WHEN saving a file, THE System SHALL validate that all required data is present
8. THE System SHALL support importing XSim .dxo files and converting them to the native JSON format
9. WHEN importing a .dxo file, THE System SHALL parse the circuit structure and component values
10. IF a .dxo file contains unsupported features, THEN THE System SHALL import what is supported and warn about unsupported elements
11. THE System SHALL allow users to open multiple projects simultaneously in separate windows or tabs
12. WHEN multiple projects are open, THE System SHALL track unsaved changes independently for each project
13. THE layout window SHALL provide a File menu with standard file operations
14. THE File menu SHALL include menu items for: New, Open, Save, Save As, Recent Files, Import .dxo, and Exit
15. THE Recent Files menu item SHALL display a submenu with recently opened files
16. THE System SHALL maintain a list of the most recently opened files (minimum 5, maximum 10)

### Requirement 7: Data Import

**User Story:** As a user, I want to import measurement data, so that I can use real loudspeaker impedance and SPL curves in my designs.

#### Acceptance Criteria

1. THE System SHALL support importing impedance curves from FRD (frequency response data) files
2. THE System SHALL support importing impedance curves from ZMA (impedance) files
3. THE System SHALL support importing SPL curves from text files with frequency-value pairs
4. WHEN importing data, THE System SHALL parse frequency-value pairs in common formats
5. IF imported data contains invalid values, THEN THE System SHALL report specific parsing errors
6. THE System SHALL validate that imported frequency data is monotonically increasing
7. WHEN data is imported successfully, THE System SHALL associate it with the selected loudspeaker component
8. THE System SHALL support standard measurement file formats used by audio measurement tools

### Requirement 13: Off-Axis Response Analysis

**User Story:** As a user, I want to analyze off-axis frequency response, so that I can understand speaker directivity and listening window performance.

#### Acceptance Criteria

1. WHEN a user adds a loudspeaker component, THE System SHALL require an on-axis FRD file as the primary measurement
2. THE System SHALL allow users to add multiple secondary FRD files for off-axis measurements
3. WHEN adding a secondary FRD file, THE System SHALL allow the user to specify the measurement angle
4. THE System SHALL support common measurement angles: 15°, 30°, 45°, 60°, 75°, and 90°
5. THE System SHALL allow users to specify custom measurement angles for secondary FRD files
6. THE System SHALL provide a control to switch the entire loudspeaker network simulation between measurement angles
7. WHEN switching measurement angles, THE System SHALL update all loudspeaker components simultaneously to their corresponding off-axis data
8. IF a loudspeaker component lacks data for the selected angle, THEN THE System SHALL exclude that driver from the simulation (effectively muting it) and display a warning indicator
9. THE Graph_Viewer SHALL indicate which measurement angle is currently active in the simulation
10. WHEN a user right-clicks on a loudspeaker component and selects "Tune", THE System SHALL open a dialog for configuring FRD files, ZMA files, and delay parameters
11. THE driver Tune dialog SHALL include a name field for the driver
12. THE System SHALL automatically assign labels to drivers (S1, S2, S3, etc.) when placed
13. THE driver Tune dialog SHALL include checkboxes for inverting polarity and muting the driver
14. THE driver Tune dialog SHALL include numeric inputs for modifying sensitivity (dB) and delay (time/distance)
15. THE driver Tune dialog SHALL include file selection buttons for FRD and ZMA files
16. THE driver Tune dialog SHALL provide radio buttons for phase source: "as measured" or "derived" (minimum phase)
17. WHEN "derived" phase is selected, THE System SHALL calculate and apply minimum phase data based on magnitude measurements
18. THE driver Tune dialog SHALL include a section for managing off-axis FRD files with angle specifications (15°, 30°, 45°, 60°, 75°, 90°, or custom)
19. THE driver Tune dialog SHALL allow users to add, remove, and configure multiple off-axis FRD files within the dialog
20. THE driver Tune dialog MAY include a button to save the modified response as a new FRD file (future enhancement, non-MVP)
21. THE driver Tune dialog MAY include an acoustic effect file button for additional FRD files (future enhancement, non-MVP)
22. THE driver Tune dialog MAY include buttons to edit or create FRD/ZMA files (future enhancement, non-MVP)
23. WHEN a user right-clicks on a driver component, THE System SHALL display a context menu with options: Tune, Invert/Normal, and Mute/Unmute
24. WHEN a user presses Escape or clicks outside the context menu, THE System SHALL close the context menu
25. THE loudspeaker component SHALL display connection terminals labeled "+" and "-"
26. WHEN polarity is inverted, THE System SHALL swap the "+" and "-" terminal labels and connections
27. THE voltage source component SHALL display connection terminals labeled "+" and "-"
28. WHEN voltage source polarity is changed, THE System SHALL swap the "+" and "-" terminal labels and connections

### Requirement 8: Cross-Platform Desktop Application

**User Story:** As a user, I want to run the application on Windows, macOS, and Linux, so that I can use my preferred operating system.

#### Acceptance Criteria

1. THE System SHALL run as a native desktop application on Windows 10 and later
2. THE System SHALL run as a native desktop application on macOS 10.14 and later
3. THE System SHALL run as a native desktop application on Linux distributions with GTK support
4. THE System SHALL provide consistent user interface across all platforms
5. THE System SHALL use native file dialogs for each platform
6. THE System SHALL store user preferences in platform-appropriate locations

### Requirement 9: User Interface Layout

**User Story:** As a user, I want a flexible workspace layout, so that I can organize my tools efficiently.

#### Acceptance Criteria

1. THE System SHALL provide a component palette panel on the left side of the layout window for selecting components
2. THE component palette SHALL display components as icon and text label pairs stacked vertically
3. THE System SHALL allow users to resize panels by dragging dividers
4. THE System SHALL persist panel sizes and positions between sessions
5. WHEN a panel is minimized, THE System SHALL provide a way to restore it
6. THE System SHALL provide separate dedicated windows or panels for: circuit layout editor, frequency response graph, and impedance graph
7. THE System SHALL allow users to view circuit layout, frequency response, and impedance simultaneously
8. THE System SHALL support docking and undocking panels for flexible workspace arrangement

### Requirement 11: Circuit Templates and Examples

**User Story:** As a user, I want access to example circuits and templates, so that I can learn from working designs and start quickly.

#### Acceptance Criteria

1. THE System SHALL provide a library of example crossover designs
2. THE System SHALL include circuit block templates for common topologies (Butterworth, Linkwitz-Riley, etc.)
3. WHEN a user selects an example, THE System SHALL load it into the circuit editor
4. THE System SHALL allow users to save their own designs as templates
5. THE System SHALL provide documentation or tooltips explaining each example circuit
6. THE System SHALL include examples for 2-way, 3-way, and 4-way crossover designs
7. THE System SHALL support circuit blocks with configurable parameters (Q, corner frequency, attenuation)
8. WHEN a user places a circuit block, THE System SHALL allow tuning via overall parameters rather than individual components

### Requirement 12: Component Rotation and Manipulation

**User Story:** As a user, I want to rotate and arrange components easily, so that I can create clean, readable circuit layouts.

#### Acceptance Criteria

1. WHEN a user selects a component and presses the spacebar, THE Circuit_Editor SHALL rotate the component by 90 degrees
2. THE Circuit_Editor SHALL support rotating components in both clockwise and counter-clockwise directions
3. WHEN a component is rotated, THE Circuit_Editor SHALL update connected wires to maintain connections
4. THE Circuit_Editor SHALL support flipping components horizontally and vertically
5. THE Circuit_Editor SHALL provide visual feedback during component manipulation
6. THE Circuit_Editor SHALL snap components to a grid for alignment
7. WHEN a user right-clicks on a component, THE Circuit_Editor SHALL display a context menu with rotation options
8. THE System SHALL size passive components (resistors, capacitors, inductors) to span 6 grid dots in their primary orientation

### Requirement 10: Application Lifecycle

**User Story:** As a user, I want the application to start quickly and handle errors gracefully, so that I have a reliable tool.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL initialize within 3 seconds on modern hardware
2. WHEN the application starts, THE System SHALL restore the last opened file if configured
3. IF the application crashes, THEN THE System SHALL attempt to save recovery data
4. THE System SHALL log errors to a file for troubleshooting
5. WHEN the user closes the application with unsaved changes, THE System SHALL prompt for confirmation
6. THE System SHALL provide an about dialog with version information and credits
7. WHEN a user creates a new project, THE System SHALL initialize it with a voltage source set to 1W at 8 ohms (2.828 Vrms)
8. THE System SHALL allow users to modify or remove the default voltage source in new projects

### Requirement 17: Voltage Source Configuration

**User Story:** As a user, I want to configure the voltage source parameters, so that I can simulate different amplifier power levels.

#### Acceptance Criteria

1. THE voltage source component SHALL have a Tune dialog accessible via double-click, right-click menu, or 'T' key
2. THE voltage source Tune dialog SHALL include a numeric field for power in Watts
3. THE voltage source Tune dialog SHALL include a numeric field for reference impedance in Ohms
4. THE voltage source Tune dialog SHALL display "at" label between the Watts and Ohms fields
5. THE voltage source Tune dialog SHALL include a numeric field for delay
6. THE voltage source Tune dialog SHALL include a "Std" button that resets values to 1W at 8 Ohms
7. THE voltage source Tune dialog SHALL include an invert polarity checkbox
8. WHEN polarity is inverted, THE System SHALL swap the voltage source terminal connections and labels

### Requirement 14: Code Quality and Standards

**User Story:** As a developer, I want consistent code style and quality checks, so that the codebase is maintainable and follows best practices.

#### Acceptance Criteria

1. THE System SHALL use a modified Airbnb JavaScript/TypeScript style guide for code formatting
2. THE System SHALL include ESLint configured with the provided custom configuration based on Airbnb rules
3. THE System SHALL enforce code style checks during development
4. THE System SHALL provide pre-commit hooks to validate code style before commits
5. THE System SHALL include Prettier for automatic code formatting consistent with the style guide

### Requirement 15: Simulation Validation Testing

**User Story:** As a developer, I want to validate simulation accuracy against XSim, so that I can ensure the simulation engine produces correct results.

#### Acceptance Criteria

1. THE System SHALL include a test suite with reference crossover designs for validation
2. THE test suite SHALL include at least 3 reference projects: a 2-way crossover, a 3-way crossover, and an edge case design
3. WHEN running validation tests, THE System SHALL load each reference project's .dxo file and source FRD/ZMA files
4. THE System SHALL simulate each reference project and generate frequency response and impedance curves
5. THE System SHALL compare generated curves against XSim's exported FRD and ZMA files for each reference project
6. THE System SHALL assert that generated curves match reference curves within acceptable tolerance (±0.5 dB magnitude, ±5° phase)
7. IF validation tests fail, THE System SHALL report which frequencies and values are out of tolerance
8. THE System SHALL store reference project files in a designated test fixtures directory
