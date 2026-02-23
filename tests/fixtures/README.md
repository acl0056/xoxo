# Test Fixtures

This directory contains test data files for the crossover network simulator.

## Directory Structure

```
tests/fixtures/
└── projects/
    ├── vivace/
    │   ├── vivace 1_0_3.dxo
    │   ├── tweeter.frd (extracted from DXO)
    │   ├── coax tweeter.zma (extracted from DXO)
    │   ├── mid.frd (extracted from DXO)
    │   ├── coax 4 inch woofer.zma (extracted from DXO)
    │   ├── woofers.frd (extracted from DXO)
    │   └── dual 6 inch ceramic woofers.zma (extracted from DXO)
    ├── tonic/
    │   ├── tonic xo 0_1_1.dxo
    │   ├── tweeter 0.frd (extracted from DXO)
    │   ├── tweeter.zma (extracted from DXO)
    │   ├── woofer 0.frd (extracted from DXO)
    │   └── woofer.zma (extracted from DXO)
    └── center/
        ├── center 1_0_2.dxo
        ├── 1m tweeter 0.frd (extracted from DXO)
        ├── tweeter.zma (extracted from DXO)
        ├── 1m woofers 0.frd (extracted from DXO)
        └── woofers.zma (extracted from DXO)
```

## File Formats

### DXO Files
XSim crossover design files containing:
- Circuit topology (components, wires, connections)
- Component parameters (resistors, capacitors, inductors, speakers)
- Embedded FRD and ZMA data for each driver
- Design metadata

### FRD Files
Format: `Frequency(Hz) Magnitude(dB) Phase(degrees)`
- One measurement per line
- Frequencies must be monotonically increasing
- Used for speaker frequency response measurements
- Extracted from DXO files by the DXO importer

### ZMA Files
Format: `Frequency(Hz) Impedance(Ohms) Phase(degrees)`
- One measurement per line
- Frequencies must be monotonically increasing
- Used for speaker impedance measurements
- Extracted from DXO files by the DXO importer

## Workflow

1. **Place DXO files**: Copy your `.dxo` files from XSim into the appropriate project folders
   - `vivace 1_0_3.dxo` → `projects/vivace/`
   - `tonic xo 0_1_1.dxo` → `projects/tonic/`
   - `center 1_0_2.dxo` → `projects/center/`

2. **Extract FRD/ZMA files**: The DXO importer (task 8.2) will automatically extract embedded FRD and ZMA data from the DXO files and create the individual measurement files in the same directory

3. **Testing**: These files are used by:
   - FRD/ZMA parser tests (tasks 7.1-7.7)
   - DXO import tests (tasks 8.1-8.6)
   - Validation tests comparing simulation results against XSim (task 42)

## Notes

- Each project folder contains one complete crossover design
- FRD/ZMA files are extracted automatically - you don't need to provide them separately
- The DXO file references FRD/ZMA files by simple filename (no path)
- All referenced files must be in the same directory as the DXO file
