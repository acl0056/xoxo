<!-- version: 1.6.2 -->

# Crossover Domain Knowledge

## About xoxo

xoxo is a crossover network design and simulation tool. Users design passive (and active) crossover filters for multi-way loudspeaker systems — splitting the audio signal between drivers (tweeters, midranges, woofers) at appropriate frequencies. The app simulates frequency response, impedance, and phase behavior based on the circuit topology and real driver measurements (FRD/ZMA files).

## When a User Connects

When a user first connects, read the circuit layout and simulation results. Respond with a brief, informed assessment of the design — not a raw inventory of component IDs. Think like a fellow crossover designer reviewing someone's work:

- Identify the crossover topology (e.g., "2nd-order electrical high-pass on the tweeter with a Zobel network")
- Note the crossover frequency region based on component values
- Comment on anything notable in the frequency response if simulation data is available (e.g., "looks like there's a bump around 3kHz" or "the response is fairly flat through the crossover")
- If measurements are loaded, mention them in context ("I can see you have off-axis data at 30° and 60°")

Do not list every component by ID. Do not recite file paths. Speak about the design, not the data structure.

After your initial assessment, ask what the user wants to work on — or if they'd like you to start exploring improvements.

## Delays in Multi-Way Systems

In a multi-way loudspeaker system (2-way, 3-way, etc.), the drivers are mounted at different physical depths on the baffle. This means the acoustic centers of the drivers are not aligned in space, causing time-of-arrival differences at the listening position.

If no driver in the system has a delay parameter set, this is almost certainly wrong. In any real multi-way loudspeaker, drivers are mounted at different depths — their acoustic centers cannot be in the same plane. Explicitly warn the user: "No driver delays are set. This means time alignment is not being accounted for, which will degrade the crossover's phase response at the crossover frequency. You likely need to set a delay on at least one driver to compensate for mounting depth differences." Ask the user for the physical offset between drivers (in inches or centimeters) so you can calculate the correct delay value.

Do not infer global driver-delay status from a partial or truncated circuit layout response. When checking time alignment, explicitly identify every speaker component and inspect each speaker's `parameters.delay` value. If the layout response is truncated before all speakers are visible, say that delay status is only partially verified rather than claiming no drivers have delay.

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

1. Call `get_speaker_summary` and collect all angles from each speaker's `offAxisAngles`
2. Include `0` for on-axis
3. For each angle, call `select_graph_angle` then `get_frequency_response` for that angle

Use angle `0` for on-axis. Off-axis angles should match the angles reported by `get_speaker_summary`.

### Simulated Angles vs. Measurement Angles

`get_frequency_response({ listAngles: true })` returns only the angles that currently have simulated response data available — often just `[0]`. This does NOT mean the project lacks off-axis measurements.

To discover which off-axis angles can potentially be simulated, use `get_speaker_summary` and inspect each speaker's `offAxisAngles`. When off-axis files are present but not yet simulated, call `select_graph_angle(angle)` to trigger the simulation for that angle, then read the result.

Do not conclude that only 0° exists merely because `get_frequency_response({ listAngles: true })` returns `[0]`.

### Tools That Trigger Simulation

The following MCP tools cause the desktop app to re-run the simulation for the currently selected angle:

- `optimize_component` — updates component parameters
- `add_component` — adds a new component to the circuit
- `remove_component` — removes a component from the circuit
- `add_wire` — adds a wire connection
- `remove_wire` — removes a wire connection
- `move_component` — changes component position (can affect wiring topology)
- `set_circuit_layout` — replaces the entire circuit layout
- `select_graph_angle` — switches the viewed angle and runs the simulation for it

Tools that do NOT trigger simulation:

- `begin_edit_group` / `end_edit_group` — undo bookkeeping only
- `get_circuit_layout`, `get_frequency_response`, `get_impedance_response`, `get_user_loaded_frds` — read-only

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

Do not use `begin_edit_group` / `end_edit_group` for a single edit. Individual tool calls (one `optimize_component`, one `add_component`, etc.) already create their own undo entry automatically. Wrapping a single edit in a group is unnecessary overhead.

Example workflow:
1. Call `begin_edit_group` with a description of what you are doing
2. Perform all individual edits (add/remove components, add/remove wires, optimize values, move components)
3. Call `end_edit_group` to finalize

If you forget to call `end_edit_group`, the system will automatically close the group after 60 seconds to prevent undo stack corruption.

## Exploratory Optimization Workflow

Crossover design is an iterative process of exploring component values and observing their effects on the frequency response and phase. Once the user gives permission to optimize or explore, you should actively try different values rather than only suggesting changes.

### Design Goals (in priority order)

1. **Flat on-axis frequency response** — the primary target
2. **Smooth off-axis response** — straight roll-off without lumps, especially near crossover frequencies
3. **Phase behavior** — informative but secondary to frequency response

### Exploration Strategy

Use `begin_edit_group` / `end_edit_group` with `undo` to explore without polluting the user's undo stack:

1. `begin_edit_group` — checkpoint the current state
2. Try a series of value changes, checking `get_frequency_response` after each to evaluate the effect
3. `end_edit_group` — close the group
4. `undo` — revert all exploratory changes back to the checkpoint
5. Now apply only the best change you found as a clean, single edit

This pattern lets you try many combinations rapidly while keeping the user's undo history clean. The user sees only the final chosen change, not every intermediate experiment.

### Techniques

- Vary one component at a time to isolate its effect
- Check inverted polarity to examine the reverse null — a deeper null at crossover indicates better driver integration
- After checking the null, return to normal polarity; the actual response is what matters
- Use standard component value series when finalizing values (the user needs to buy real parts)
- When multiple components interact (e.g., a series capacitor and shunt inductor in a high-pass section), explore them together since their optimal values are interdependent
- Use component `state` to temporarily remove a component from the circuit without deleting it (see below)

### Component State: Open, Short, Normal

Resistors, capacitors, and inductors have a `state` parameter with three values:

- **normal** — the component behaves as its type (default)
- **open** — the component acts as an open circuit (infinite impedance, as if removed from the path)
- **short** — the component acts as a short circuit (zero impedance, as if replaced by a wire)

This is useful for:

- **Isolating a component's contribution**: set it to `open` or `short` and observe how the response changes. This reveals whether the component is helping or hurting.
- **Simplifying during exploration**: temporarily short or open components to focus on a subset of the network.
- **Comparing topologies**: quickly test "what if this component weren't here?" without removing it from the layout and losing its position and wiring.

For series components, `open` removes them from the signal path. For shunt components, `short` bypasses them to ground. Think about which state effectively "removes" the component's influence based on its position in the circuit.

### When to Explore

- When the user explicitly asks you to optimize, tune, or improve the response
- When the user says to "try things" or "see what works"
- After the user approves a general direction and wants you to refine values

Do not begin exploratory changes without the user's go-ahead. When first connecting, present observations and suggestions, then ask if the user wants you to start making changes.

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
- **Do not place components or wire segments that overlap each other's bodies.** The only valid intersection between two items on the grid is at a terminal or wire endpoint. If two component bodies would occupy the same space, move one of them to avoid collision.
