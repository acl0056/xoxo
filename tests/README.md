# Testing Guide

## Overview

This project uses Jest as the testing framework with Vue 3 support via `@vue/test-utils` and `@vue/vue3-jest`.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/              # Unit tests
│   └── *.spec.js     # Test files
└── setup.js          # Global test setup
```

## Writing Tests

### Unit Tests

Unit tests should be placed in `tests/unit/` with the `.spec.js` extension.

Example:
```javascript
describe('MyComponent', () => {
	it('should render correctly', () => {
		// Test implementation
	});
});
```

### Vue Component Tests

Use `@vue/test-utils` to test Vue components:

```javascript
import { mount } from '@vue/test-utils';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
	it('should mount', () => {
		const wrapper = mount(MyComponent);
		expect(wrapper.exists()).toBe(true);
	});
});
```

## Configuration

- **Jest Config**: `jest.config.js`
- **Babel Config**: `babel.config.js`
- **Setup File**: `tests/setup.js`

## Path Aliases

The `@` alias is configured to point to the `src/` directory, matching the project's path resolution.

## Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

Target coverage goals:
- Model classes: 80%+
- Simulation engine: 80%+
- UI components: 70%+
