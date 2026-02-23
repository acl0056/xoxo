# Jest Testing Guide

This project uses **Jest** as the test runner, not Vitest.

## Important: Jest Command Syntax

Jest does NOT support the `--run` flag. That flag is for Vitest only.

## Correct Jest Commands

### Run specific test file
```bash
npm test -- <filename>
```

Example:
```bash
npm test -- Resistor.spec.js
npm test -- Circuit.spec.js
```

### Run multiple test files
```bash
npm test -- <file1> <file2> <file3>
```

Example:
```bash
npm test -- Resistor.spec.js Capacitor.spec.js Inductor.spec.js
```

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should validate"
```

## What NOT to Do

❌ **NEVER use `--run` flag with Jest:**
```bash
npm test -- --run Resistor.spec.js  # This will ERROR
```

The `--run` flag is for Vitest to disable watch mode. Jest runs once and exits by default, so this flag doesn't exist and will cause an error.

## Watch Mode (Avoid in Automation)

Jest does have a watch mode, but it should NOT be used in automated tasks:
```bash
npm test -- --watch  # Only for manual development
```

## Test Configuration

- Test framework: Jest
- Test location: `tests/unit/**/*.spec.js`
- Configuration: `jest.config.js`
- Coverage reports: `coverage/` directory

## When Running Tests in Tasks

Always use the simple Jest syntax without `--run`:
- ✅ `npm test -- <filename>`
- ❌ `npm test -- --run <filename>`
