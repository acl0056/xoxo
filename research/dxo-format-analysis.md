# XSim .dxo File Format Analysis

## Overview

The .dxo file format is a text-based format used by XSim for storing crossover network designs. It uses a line-by-line structure with comments indicating the data type.

## File Structure

### 1. Voltage Source Section
```
//VoltageSource
7 //Lines
<vrms> //Vrms
<inverted> //Inverted (T/F)
<x> //position X
<y> //position Y
<delay> //overall delay
<power> //Power
<impedance> //Ohms for Power level
```

### 2. Subcircuits Section
```
0 //Subckts
27 //Lines Per Subckt
```
(Not used in MVP - subcircuits are future feature)

### 3. Passive Components Section
```
<count> //Passives
20 //Lines Per Passive
```

Each passive component has 20 lines:
```
<partType> //PartType (0=Resistor, 1=Capacitor, 2=Inductor)
<refDes> //RefDes (component number)
<partNumber> //Part#
<value> //Value
<esr> //ESR
<rating> //Rating
<x> //position X
<y> //position Y
<isHorizontal> //Is Horizontal (T/F)
<stepMode> //StepMode
<state> //0short/1val/2open
<subckt> //Subckt#,-1 if none
<equation1> //No Subckt equation1
<equation2> //No Subckt equation2
<isHighSpec> //Is HighSpec (T/F)
<tolerance> //Specd component manuf tolerance
<searchTol> //Search tolerance for nom values
<esrTol> //ESR tolerance for search
<partTol> //Tolerance of chosen part tol
<vendor> //vendor of part number
```

### 4. Ground Nodes Section
```
<count> //Grounds
3 //Lines Per Ground
```

Each ground has 3 lines:
```
<x> //position X
<y> //position Y
<subckt> //Subckt#,-1 if none
```

### 5. Wires Section
```
<count> //Wires
5 //Lines Per Wire
```

Each wire has 5 lines:
```
<x1> //End1 X
<y1> //End1 Y
<x2> //End2 X
<y2> //End2 Y
<subckt> //Subckt#,-1 if none
```

### 6. Text Annotations Section
```
<count> //Texts
6 //Lines Per Text
```

### 7. Drivers (Speakers) Section
```
<count> //drivers
39 //Lines Per driver
```

Each driver has 39 lines followed by embedded FRD and ZMA data:
```
!driver <index>
<refDes> //RefDes
<name> //Name
<partNumber> //PartNumber
<x> //position X
<y> //position Y
<inverted> //Inverted (T/F)
<muted> //Muted (T/F)
<rating> //Rating
<dbGain> //dBGain (sensitivity adjustment)
<delay> //Delay
<xoffs> //Xoffs
<yoffs> //Yoffs
<zoffs> //Zoffs
<htilt> //Htilt
<vtilt> //Vtilt
<dia> //dia
<frdFile> //FRD filename
<zmaFile> //ZMA filename
<useHilbert> //use Phase from Hilbert transform (T/F)
<lowerFreq> //Lower Hilbert extrapolation frequency
<upperFreq> //Upper Hilbert extrapolation frequency
<lowerSlope> //Lower Extrapolation slope
<upperSlope> //Upper Extrapolation slope
<invertPhase> //Invert Hilbert phase if used (T/F)
<hilbertDelay> //Hilbert Delay to add
<useModel> //get acoust info from a model (T/F)
<acoustFile> //ACOUstic FRD filename
<vendor> //Vendor name
<spare> //SPARE double (not used)
<rectHeight> //rectang. Ht
<rectWidth> //rectang. Wt
<empty> //
<zPhaseHilbert> //Z Phase from Hilbert transform (T/F)
<baffleThickness> //baffle thickness for open baffle
<baffleType> //Baffle type for this driver
<offAxisFromFile> //OffAxis data from file? (T/F)
<includeBaffle> //Include baffle effect? (T/F)
<driverDepth> //driver depth behind nominal baffle

**FRD 1 for driver <index>
<frdFilename> //frd filename
<freq1>\t<mag1>\t<phase1>
<freq2>\t<mag2>\t<phase2>
...
**END FRD 1 for driver <index>

**ZMA Data for driver <index>
<freq1>\t<impedance1>\t<phase1>
<freq2>\t<impedance2>\t<phase2>
...
**END ZMA Data for driver <index>
```

### 8. Setup Section
```
1 //Setup
0 //Lines for Setup
```

### 9. Baffle Section
```
1 //Baffle
28 //Lines for each Baffle
```
(Contains baffle geometry and room acoustics - not needed for MVP)

### 10. Active Blocks Section
```
0 //# of Active blocks
68 //Lines Per Active block
```
(Not used in MVP - active components are future feature)

## Key Observations

1. **Component Types**: PartType 0=Resistor, 1=Capacitor, 2=Inductor
2. **Component State**: 0=short, 1=normal, 2=open
3. **Boolean Values**: T=true, F=false
4. **Coordinates**: Grid positions (X, Y)
5. **Orientation**: T=horizontal, F=vertical
6. **RefDes**: Component numbering (R1, R2, C1, C2, L1, L2, etc.)
7. **Embedded Data**: FRD and ZMA data are embedded directly in the file
8. **Tab-separated**: Measurement data uses tabs as delimiters

## Mapping to Internal Format

### Component Mapping
- PartType 0 → Resistor
- PartType 1 → Capacitor
- PartType 2 → Inductor
- Driver → Speaker
- Ground → Ground
- VoltageSource → VoltageSource

### State Mapping
- 0 (short) → 'short'
- 1 (normal) → 'normal'
- 2 (open) → 'open'

### Orientation Mapping
- T (horizontal) → rotation: 90
- F (vertical) → rotation: 0

### Wire Mapping
- Each wire becomes a Wire object with two endpoints
- Multi-segment wires are not directly supported in .dxo format
- Wires connect grid positions, need to map to component terminals

## Challenges

1. **Wire-to-Terminal Mapping**: .dxo stores wire endpoints as grid coordinates, but internal format uses component terminal references
2. **Grid Coordinate System**: Need to understand XSim's grid spacing (appears to be 1 unit per grid dot)
3. **Component Terminal Positions**: Need to calculate which terminal a wire connects to based on position and orientation
4. **Embedded FRD/ZMA Data**: Need to extract and save to separate files or store inline
5. **Unsupported Features**: Subcircuits, active blocks, baffle effects, room acoustics

## Implementation Strategy

1. Parse line-by-line with state machine
2. Extract voltage source parameters
3. Parse passive components and create Component instances
4. Parse grounds and create Ground instances
5. Parse drivers and extract embedded FRD/ZMA data
6. Parse wires and map to component terminals
7. Skip unsupported sections (subcircuits, active blocks, baffle)
8. Warn about unsupported features
