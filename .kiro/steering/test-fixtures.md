---
inclusion: fileMatch
fileMatchPattern: '**/*{.dxo,.frd,.zma,DxoImporter,FrdParser,ZmaParser}*'
---

# Test Fixtures Guidelines

## Real Measurement Data Available

The project has **real FRD and ZMA measurement files** extracted from actual XSim crossover designs located in:

```
tests/fixtures/projects/
├── vivace/     (3-way crossover with 3 FRD + 3 ZMA files)
├── tonic/      (2-way crossover with 2 FRD + 2 ZMA files)
└── center/     (2-way crossover with 2 FRD + 2 ZMA files)
```

## Critical Rules for Test Implementation

### DO NOT Create Fake Test Data

1. **NEVER generate synthetic FRD/ZMA data** - real measurement files already exist
2. **ALWAYS use the existing files** in `tests/fixtures/projects/` for testing
3. **CHECK for existing files first** before considering creating any test data

### When Writing Tests for FRD/ZMA Parsers (Task 7)

```javascript
// ✅ CORRECT - Use real files
const frdPath = 'tests/fixtures/projects/center/1m tweeter 0.frd';
const result = FrdParser.parse(frdPath);

// ❌ WRONG - Don't create fake data
const fakeFrd = { frequencies: [100, 200], magnitudes: [85, 86], phases: [0, -10] };
```

### When Writing Tests for DXO Importer (Task 8)

```javascript
// ✅ CORRECT - Use real DXO files
const dxoPath = 'tests/fixtures/projects/vivace/vivace 1_0_3.dxo';
const circuit = DxoImporter.import(dxoPath);

// ❌ WRONG - Don't create fake DXO content
const fakeDxo = '//VoltageSource\n7 //Lines\n...';
```

### Available Test Files

**Vivace (3-way):**
- `vivace 1_0_3.dxo`
- `tweeter.frd`, `coax tweeter.zma`
- `mid.frd`, `coax 4 inch woofer.zma`
- `woofers.frd`, `dual 6 inch ceramic woofers.zma`

**Tonic (2-way):**
- `tonic xo 0_1_1.dxo`
- `tweeter 0.frd`, `tweeter.zma`
- `woofer 0.frd`, `woofer.zma`

**Center (2-way):**
- `center 1_0_2.dxo`
- `1m tweeter 0.frd`, `tweeter.zma`
- `1m woofers 0.frd`, `woofers.zma`

### Test Coverage Strategy

Use the real files for:
- **Valid file parsing tests** - Use any of the existing FRD/ZMA files
- **Integration tests** - Use complete project folders with DXO + FRD + ZMA
- **Edge case tests** - Use different files (tweeter vs woofer, different point counts)

For **invalid file tests** (malformed data, errors), you can:
- Create small invalid snippets in test code as strings
- Write temporary invalid files during test execution
- But NEVER replace or ignore the real measurement files

### File Characteristics

All FRD files have:
- 624-625 data points
- Frequency range: ~5 Hz to ~40 kHz
- Tab-separated values
- Real measurement noise and characteristics

All ZMA files have:
- 344 data points
- Frequency range: ~1 Hz to ~1 kHz
- Tab-separated values
- Real impedance curves with resonances

## Summary

**The user provided real measurement data. Use it. Don't create fake data.**
