---
inclusion: auto
---

# Task Execution Quality Gates

## Overview

When executing spec tasks (individually or in "run all" mode), each task group must pass quality gates before being considered complete. This prevents accumulating lint errors, broken tests, or stale test code.

## Quality Gate: Lint Before Tests

Before running the test suite at the end of a task or task group, always run the linter first:

```bash
npm run lint
```

If lint errors are found:
1. Fix all lint errors before proceeding to tests
2. Do not skip or disable lint rules to make code pass
3. If a lint rule conflicts with the implementation approach, discuss with the user before suppressing

## Quality Gate: All Tests Must Pass

After completing a task or task group, run the full test suite:

```bash
npm test
```

**Rules:**
- All tests must pass. Zero failing tests is the only acceptable state.
- Do NOT leave failing tests in place with a plan to "fix them later"
- Do NOT skip or `.skip()` tests to make the suite green
- Do NOT delete tests that were passing before your changes unless the tested behavior has been intentionally removed or redesigned

## Handling Test Failures After Implementation

If tests fail after implementing a task:

1. **Tests you wrote that fail** — Fix the implementation or fix the test. The code and test must agree.
2. **Pre-existing tests that now fail** — Your implementation broke something. Fix the implementation to not break existing behavior, OR if the existing test is testing behavior that was intentionally changed by the spec, update the test to match the new expected behavior.
3. **Tests that are no longer relevant** — If a spec task explicitly removes or replaces functionality, the corresponding tests should be removed in the same task. Document why in the commit.

## Handling Stale or Redundant Tests

If you discover tests that:
- Test code that no longer exists
- Duplicate other tests exactly
- Test internal implementation details that have been refactored away

Then remove them, but only if you can confirm the behavior they tested is either:
- Covered by other tests, OR
- No longer part of the system's behavior

Never silently delete tests. Note what was removed and why.

## Task Completion Checklist

Before marking any task as complete:

1. ✅ Code compiles/loads without errors
2. ✅ `npm run lint` passes with zero errors
3. ✅ `npm test` passes with zero failures
4. ✅ No `.skip()` or `.only()` left in test files
5. ✅ No `console.log` debugging statements left in production code (existing `console.warn`/`console.error` for legitimate warnings are fine)

## Order of Operations

When finishing a task:

```
1. Implementation complete
2. Run linter → fix any errors
3. Run tests → fix any failures
4. Verify no skipped/focused tests
5. Mark task complete
```

This order matters because lint errors can mask test failures (e.g., undefined variables), and fixing lint first often reveals the real issues.
