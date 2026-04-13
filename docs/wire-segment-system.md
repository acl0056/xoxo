# Wire Segment System

## Overview

The wire segment system allows for flexible circuit wiring by treating wire segments as movable, connectable components. This enables complex circuit topologies where wires can branch and connect at arbitrary points.

## Architecture

### WireSegment Component

Wire segments are implemented as a special component type (`wire-segment`) that:
- Has two terminals (endpoints) like other components
- Can be created by dragging from any terminal (component or wire segment)
- Can be selected, moved, and rotated
- Automatically orients based on drag direction (horizontal or vertical)
- Has a configurable length in grid units

### Key Features

1. **Creation**: Drag from any terminal to create a wire segment
2. **Chaining**: Drag from wire segment terminals to create more segments
3. **Movement**: Select and drag wire segments to reposition them
4. **Rotation**: Right-click and rotate to change orientation (horizontal ↔ vertical)
5. **Deletion**: Right-click and delete to remove segments

## Usage

### Creating Wire Segments

1. Click on any component terminal (the connection dot)
2. Drag to the desired endpoint location
3. Release the mouse
4. A wire segment appears connecting the start and end points

The wire segment will automatically be:
- **Horizontal** if the drag distance is greater horizontally
- **Vertical** if the drag distance is greater vertically

### Connecting Wire Segments

Wire segments have terminals at both ends (the blue dots). You can:
- Drag from a wire segment terminal to create another wire segment
- Build complex wire networks by chaining segments together
- Create branches by connecting multiple segments to the same point

### Moving Wire Segments

1. Click on a wire segment to select it (orange dashed outline appears)
2. Drag the segment to a new position
3. The segment maintains its length and orientation

### Rotating Wire Segments

1. Right-click on a wire segment
2. Select "Rotate" from the context menu
3. The segment rotates 90° clockwise
4. Terminals update to match the new orientation

## Implementation Details

### Model: `src/models/WireSegment.js`

```javascript
class WireSegment extends Component {
  constructor(x, y, length = 5, rotation = 0)
  parameters: { length }
  terminals: [{ x, y }, { x, y }]  // Two endpoints
}
```

### Rendering

Wire segments are rendered as:
- Blue line connecting the two terminals
- Blue dots at each terminal (connection points)
- Orange dashed selection box when selected

### Serialization

Wire segments are saved in the circuit JSON as components:

```json
{
  "type": "wire-segment",
  "id": "unique-id",
  "x": 50,
  "y": 30,
  "rotation": 0,
  "parameters": {
    "length": 10
  }
}
```

### Schema

The circuit schema includes `wire-segment` as a valid component type with `wireSegmentParameters` defining the length property.

## Circuit Topology

### Current State

Wire segments are treated as components in the circuit. The existing Wire model (which connects two component terminals) can now reference wire segment terminals.

### Future Enhancements

For the circuit solver to properly handle wire segments:

1. **Node Building**: The solver needs to identify electrical nodes by:
   - Finding all components/wire segments connected through wires
   - Treating wire segment terminals as connection points
   - Building a node map that includes wire segment junctions

2. **Connectivity Analysis**: Update `findConnectedComponents()` to:
   - Traverse through wire segments
   - Identify electrical equivalence (components connected by wire segments are at the same potential)

3. **Impedance Calculation**: Wire segments should be treated as:
   - Zero impedance connections (ideal wires)
   - Or configurable impedance if wire resistance is needed

## Best Practices

1. **Keep segments straight**: Use horizontal or vertical segments for clarity
2. **Use appropriate lengths**: Longer segments for main connections, shorter for branches
3. **Avoid overlaps**: Position segments so they don't visually overlap
4. **Label junctions**: Use text annotations to mark important connection points
5. **Test connectivity**: Verify that all components are properly connected before simulation

## Troubleshooting

### Wire segment doesn't appear
- Ensure you're dragging from a terminal (the connection dot)
- Check that you're releasing at a different position than the start
- Verify the component is selected (click on it first)

### Can't connect to wire segment
- Make sure you're clicking on the terminal dot (blue circle at the end)
- The hit radius is small - click precisely on the dot
- Try zooming in for better precision

### Wire segment won't rotate
- Ensure the segment is selected first
- Right-click directly on the segment (not on empty space)
- Check that the segment isn't being moved at the same time

## Technical Notes

### Coordinate System

- **Grid coordinates**: Integer positions on the grid (e.g., x=50, y=30)
- **World coordinates**: Pixel positions (grid * gridSize, e.g., 500, 300)
- **Screen coordinates**: Canvas pixel positions (affected by zoom and scroll)

### Terminal Calculation

Terminals are calculated relative to the component center:
- **Horizontal (rotation 0°)**: `[{x: -length/2, y: 0}, {x: length/2, y: 0}]`
- **Vertical (rotation 90°)**: `[{x: 0, y: -length/2}, {x: 0, y: length/2}]`

Rotation is applied using standard 2D rotation matrix:
```
x' = x * cos(θ) - y * sin(θ)
y' = x * sin(θ) + y * cos(θ)
```

### Performance Considerations

- Wire segments are rendered as simple lines (very fast)
- Terminal hit detection uses distance calculation (O(n) where n = number of terminals)
- Large circuits with many wire segments should perform well
- Consider implementing spatial indexing if performance becomes an issue

## Future Enhancements

1. **Wire segment properties**:
   - Configurable wire resistance
   - Wire inductance and capacitance
   - Different wire types (signal, power, ground)

2. **Visual improvements**:
   - Different colors for different wire types
   - Thickness based on current capacity
   - Animated current flow visualization

3. **Smart routing**:
   - Auto-routing between components
   - Avoid overlaps automatically
   - Suggest optimal wire paths

4. **Junction nodes**:
   - Explicit junction components for multi-way connections
   - Visual indicators for connection points
   - Automatic junction creation when wires cross

5. **Wire bundling**:
   - Group related wires together
   - Bus notation for multiple signals
   - Hierarchical wire organization
