# Bugfix Requirements Document

## Introduction

The crossover network simulation takes too long — hundreds of milliseconds per run when the target is tens of milliseconds. This makes real-time parameter tuning feel sluggish. Previous ad-hoc optimization attempts broke correctness, so this spec takes a structured approach: diagnose first, then fix with correctness verification, then clean up diagnostic instrumentation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the simulation runs on a typical crossover circuit (2-way or 3-way with FRD/ZMA data loaded) THEN the system takes hundreds of milliseconds to complete, exceeding the target of tens of milliseconds

1.2 WHEN previous optimization attempts were applied without structured diagnosis THEN the system produced incorrect simulation results (correctness was broken)

### Expected Behavior (Correct)

2.1 WHEN the simulation runs on a typical crossover circuit (2-way or 3-way with FRD/ZMA data loaded) THEN the system SHALL complete the full simulation pipeline in tens of milliseconds (under ~80ms target)

2.2 WHEN performance optimizations are applied THEN the system SHALL produce numerically identical results (within floating-point tolerance of ±0.01 dB magnitude, ±0.1° phase) to the pre-optimization simulation output

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the simulation runs on any valid circuit THEN the system SHALL CONTINUE TO produce correct frequency response curves matching the existing solver output within ±0.01 dB magnitude and ±0.1° phase

3.2 WHEN the simulation runs on any valid circuit THEN the system SHALL CONTINUE TO produce correct impedance response curves matching the existing solver output within ±0.01 Ω impedance magnitude and ±0.1° phase

3.3 WHEN a component parameter changes with auto-simulate enabled THEN the system SHALL CONTINUE TO trigger re-simulation and update graphs

3.4 WHEN the circuit contains muted speakers, open/short components, or disconnected components THEN the system SHALL CONTINUE TO handle these edge cases correctly

3.5 WHEN simulation results are sent via IPC to graph windows THEN the system SHALL CONTINUE TO pass schema validation
