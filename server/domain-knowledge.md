<!-- version: 1.2.3 -->

# Crossover Domain Knowledge

## Delays in Multi-Way Systems

In a multi-way loudspeaker system (2-way, 3-way, etc.), the drivers are mounted at different physical depths on the baffle. This means the acoustic centers of the drivers are not aligned in space, causing time-of-arrival differences at the listening position.

If no driver in the system has a delay parameter set, this is likely a user error. Prompt the user to verify whether time-alignment delays are needed. In most real-world designs, at least one driver requires a delay offset to compensate for physical mounting depth differences.

### Delay Units

Speaker and voltage source `parameters.delay` values are stored internally in seconds. Active DSP components such as PEQ and Filter also use seconds for their `delay` parameters.

For speaker components, `parameters.delay` is the authoritative acoustic/DSP delay value and is always seconds. `parameters.delayUnit` is only a UI presentation preference that controls how the desktop app displays and parses the delay field. If `delay` is `0.00008048` and `delayUnit` is `"in"`, this means "store 0.00008048 seconds and display it as inches," not "store 0.00008048 inches."

The desktop UI may display speaker delay as inches (`in`), centimeters (`cm`), or milliseconds (`ms`), but those are display units only. Do not write an inch, centimeter, or millisecond value directly into `parameters.delay`, and do not reinterpret an existing `parameters.delay` value based on `parameters.delayUnit`.

When the user gives a physical offset:

- Inches to seconds: `delay = inches / 13504`
- Centimeters to seconds: `delay = centimeters / 34300`
- Milliseconds to seconds: `delay = milliseconds / 1000`

For example, a 1.0868 inch acoustic offset should be written as approximately `0.00008048` seconds, not `1.0868`.

## Selected Graph Angle and Simulation Scope

The desktop app has one selected frequency-response graph angle at a time. The selected angle is the angle used by the simulation whenever the circuit/layout/component values are updated.

Simulation updates are intentionally scoped to the selected angle only. When ChatGPT changes a component, changes the layout, or otherwise causes the circuit to update, the app re-runs the simulation for the currently selected angle. It does not automatically re-run simulations for every available off-axis angle.

Selecting a new graph angle also runs the simulation for that newly selected angle when auto-simulation is enabled. If ChatGPT needs fresh simulation results for all available angles after a circuit change, it should:

1. Call `get_frequency_response` with `listAngles: true` to discover available angles
2. Call `select_graph_angle` for each angle that needs fresh results
3. After each angle selection completes, call `get_frequency_response` for that angle to read the updated result

Use angle `0` for on-axis. Off-axis angles should match the available angles reported by the app.

## Standard Component Value Series

When suggesting component values for resistors, capacitors, and inductors, prefer values from standard component series so the user can purchase real-world components:

- **E12 series** (12 values per decade, ±10% tolerance): 1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2
- **E24 series** (24 values per decade, ±5% tolerance): 1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
- **E48 series** (48 values per decade, ±2% tolerance): used for precision applications

For crossover design, E24 is the most common choice. Suggest the nearest E24 value unless the user specifically requests tighter tolerance (E48) or is working with limited stock (E12).

## Empty Document State

A new empty document contains only a voltage source (power amplifier) component and nothing else. When you see this state, do not make assumptions about the design. Instead, ask the user what kind of crossover they want to design:

- How many ways? (2-way, 3-way, 4-way)
- Active or passive?
- What drivers are they using?
- What are the target crossover frequencies?

## Edit Group Wrapping

Always wrap multi-step edits in `begin_edit_group` / `end_edit_group` so the user can undo the full change atomically with a single undo operation (Cmd+Z / Ctrl+Z). Any time you are making more than one modification to the circuit (adding multiple components, adjusting multiple values, rewiring), group them together.

Example workflow:
1. Call `begin_edit_group` with a description of what you are doing
2. Perform all individual edits (add/remove components, add/remove wires, optimize values, move components)
3. Call `end_edit_group` to finalize

If you forget to call `end_edit_group`, the system will automatically close the group after 60 seconds to prevent undo stack corruption.

## Measurement-Comparison Workflow

After an initial crossover design is complete, users often take real-world acoustic measurements and load them as FRD (Frequency Response Data) files into the graph to compare against the simulation.

Use `get_user_loaded_frds` to see these measurements. When measurement data is present:

1. Compare the measured response against the simulated response
2. Identify discrepancies between simulation and measurement (room effects, driver behavior differences, baffle diffraction, etc.)
3. Suggest fine-tuning adjustments that optimize the real-world acoustic response
4. Accept that optimizing for real-world measurements may make the simulation look less ideal — this is expected and correct behavior, because the goal is the best actual acoustic performance, not the prettiest simulation curve

The measurement-comparison workflow is iterative: adjust values, re-measure, compare again, and refine until the real-world response meets the design goals.

## Component Geometry and Terminal Positions

All positions are on a grid coordinate system. Terminal positions are relative to the component's center (x, y). When a component is rotated, terminal positions are rotated around the center by the component's rotation angle (0°, 90°, 180°, 270°).

The `getTerminalPosition(index)` method applies rotation to the stored terminal offsets. Wires connect to absolute terminal positions (component center + rotated terminal offset).

### Resistor, Capacitor, Inductor (2-terminal passive, horizontal)

- Body spans 6 grid units horizontally
- Terminal 0: `{ x: -3, y: 0 }` (left)
- Terminal 1: `{ x: 3, y: 0 }` (right)
- At rotation 0°: horizontal, terminals at left and right
- At rotation 90°: vertical, terminals at top and bottom

### Speaker (2-terminal, vertical orientation)

- Terminal 0: `{ x: -1, y: -1 }` (top, positive)
- Terminal 1: `{ x: -1, y: 1 }` (bottom, negative)
- Speakers are typically placed at the right side of a branch with terminals facing left

### Ground (1-terminal)

- Terminal 0: `{ x: 0, y: 0 }` (at center)
- Ground connects directly at its center point
- Typically placed below a node to terminate a shunt branch

### Voltage Source (2-terminal, vertical)

- Terminal 0: `{ x: 3, y: -2 }` (top, positive)
- Terminal 1: `{ x: 3, y: 2 }` (bottom, negative)
- The source is the power amplifier; typically placed at the far left of the circuit

### PEQ / Filter / OpAmp (4-terminal, differential)

- Terminal 0: `{ x: -3, y: -2 }` (+in, top-left)
- Terminal 1: `{ x: -3, y: 2 }` (-in, bottom-left)
- Terminal 2: `{ x: 3, y: -2 }` (+out, top-right)
- Terminal 3: `{ x: 3, y: 2 }` (-out, bottom-right)
- These are active components with input and output differential pairs

### Wire Segment (2-terminal, variable length)

- Terminal 0: `{ x: -length/2, y: 0 }` (left end)
- Terminal 1: `{ x: length/2, y: 0 }` (right end)
- Default length is 6 grid units
- Wire segments are used to extend connections between components
- They can be rotated to run vertically

### Wiring Rules

- **Components auto-connect when their terminals overlap on the grid.** The app automatically detects terminal position overlap and creates implicit wire connections. You do NOT need to manually add wire objects.
- Simply place components so their terminals align on the same grid position, and they will be electrically connected.
- Wire segments (type `wire-segment`) are visible conductor components used to extend connections between distant terminals. They also auto-connect at their endpoints.
- For series connections: place components end-to-end so terminal 1 of one component occupies the same grid position as terminal 0 of the next.
- For shunt/parallel branches: use wire segments rotated 90° to bridge from the main horizontal bus down to the shunt component.
- **You do NOT need to use the `add_wire` tool for basic connections.** Just position components correctly and the connections happen automatically.

### Layout Conventions

- The circuit flows left-to-right from the voltage source to the speakers
- Main signal path runs horizontally
- Shunt components (to ground) branch downward from the main path
- Standard spacing: 6 grid units between component centers for series components
- Vertical shunt branches typically drop 4-6 grid units below the main path
- Ground symbols are placed at the bottom of shunt branches
