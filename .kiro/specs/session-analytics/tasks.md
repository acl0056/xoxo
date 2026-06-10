# Implementation Plan: Session Analytics

## Overview

Implement lightweight session analytics for the xoxo MCP server. The system logs MCP session events to daily NDJSON files, generates monthly summary reports, serves an internal dashboard, and cleans up old logs automatically. All state lives in flat files on disk with no database required.

## Tasks

- [x] 1. Define JSON schemas and set up project structure
  - [x] 1.1 Create JSON Schema for Daily Log Entry
    - Create `server/schemas/session-log-entry.schema.json` specifying `timestamp` (string, format date-time), `ip` (string), and `userId` (string), all required, with no additional properties allowed
    - _Requirements: 8.1, 1.2_

  - [x] 1.2 Create JSON Schema for Monthly Summary
    - Create `server/schemas/monthly-summary.schema.json` specifying all fields: `month`, `generatedAt`, `totalSessions`, `uniqueIps`, `uniqueIpList`, `dailyBreakdown` (array of objects with `date`, `sessions`, `uniqueIps`), `hourlyDistribution` (object with keys "0"-"23"), `returningIps`, and `newIps`
    - _Requirements: 8.2_

  - [x] 1.3 Create the `server/analytics/` directory structure
    - Create placeholder files: `logger.js`, `summary.js`, `scheduler.js`, `cleanup.js`, `routes.js`
    - Add `server/logs/` and `server/summaries/` to `.gitignore`
    - _Requirements: 1.3, 2.8_

- [x] 2. Implement SessionLogger
  - [x] 2.1 Implement `server/analytics/logger.js`
    - Export a `log(req)` function that extracts timestamp (Central Time ISO 8601), IP (first from x-forwarded-for or direct), and userId (from `req.auth.sub`)
    - Create `logs/` directory if missing using `fs.mkdirSync` with `recursive: true`
    - Append a single NDJSON line to `logs/YYYY-MM-DD.log` where the date is derived from the Central Time timestamp
    - Execute asynchronously (fire-and-forget) — catch all errors and log to console, never throw
    - Skip logging if userId is undefined or null
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write property test for Log Entry Completeness
    - **Property 1: Log Entry Completeness**
    - **Validates: Requirements 1.2**
    - For any valid timestamp, IP, and userId inputs, verify the NDJSON line contains exactly three fields (`timestamp`, `ip`, `userId`), all non-empty strings

  - [x] 2.3 Write property test for File Naming by Central Time
    - **Property 2: File Naming by Central Time**
    - **Validates: Requirements 1.1, 1.5**
    - For any session event timestamp, verify the daily log filename corresponds to the Central_Time date, not the UTC date

  - [x] 2.4 Write property test for Non-blocking Logging
    - **Property 8: Non-blocking Logging**
    - **Validates: Requirements 1.4**
    - For any file system error condition during logging, verify `log()` never throws an exception that propagates to the caller

- [x] 3. Implement SummaryGenerator
  - [x] 3.1 Implement `server/analytics/summary.js`
    - Export a `generate(year, month)` function that reads all daily log files matching the target month from `logs/`
    - Compute `totalSessions`, `uniqueIps`, `uniqueIpList`, `dailyBreakdown`, `hourlyDistribution`
    - Compute `returningIps` and `newIps` by reading `uniqueIpList` from all existing prior monthly summary files
    - Skip invalid JSON lines gracefully
    - Create `summaries/` directory if missing
    - Overwrite existing summary file if present
    - Produce zero-value summary when no daily log files exist for the target month
    - Validate generated summary against `monthly-summary.schema.json` before writing to disk
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3_

  - [x] 3.2 Write property test for Summary Totals Consistency
    - **Property 3: Summary Totals Consistency**
    - **Validates: Requirements 2.2, 2.4, 7.1**
    - For any set of valid daily log entries, verify `totalSessions` equals the sum of all `sessions` values in `dailyBreakdown`

  - [x] 3.3 Write property test for Unique IP Consistency
    - **Property 4: Unique IP Consistency**
    - **Validates: Requirements 2.3, 2.6, 7.2, 7.3**
    - For any set of valid daily log entries and historical IP data, verify `uniqueIps` equals length of `uniqueIpList` and `returningIps + newIps` equals `uniqueIps`

  - [x] 3.4 Write property test for Hourly Distribution Completeness
    - **Property 5: Hourly Distribution Completeness**
    - **Validates: Requirements 2.5, 7.4**
    - For any set of valid daily log entries, verify `hourlyDistribution` contains exactly 24 keys and their sum equals `totalSessions`

  - [x] 3.5 Write property test for Idempotent Summary Generation
    - **Property 7: Idempotent Summary Generation**
    - **Validates: Requirements 2.9, 7.5**
    - For any set of daily log files, verify running summary generation twice produces identical output

  - [x] 3.6 Write property test for Invalid Line Resilience
    - **Property 9: Invalid Line Resilience**
    - **Validates: Requirements 2.7**
    - For any daily log file containing a mix of valid and invalid JSON lines, verify the summary counts only valid entries

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement FileCleanup
  - [x] 5.1 Implement `server/analytics/cleanup.js`
    - Export a `cleanOldLogs()` function that lists all files in `logs/`
    - Parse date from filenames matching `YYYY-MM-DD.log` pattern
    - Delete files whose date is more than 60 days in the past
    - Preserve all files that are 60 days old or less
    - Ignore files that don't match the naming pattern
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Write property test for Cleanup Safety
    - **Property 6: Cleanup Safety**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - For any set of files and a given current date, verify only files matching `YYYY-MM-DD.log` whose date is more than 60 days old are deleted, and all others are preserved

- [x] 6. Implement Scheduler
  - [x] 6.1 Implement `server/analytics/scheduler.js`
    - Export a `start()` function that uses `node-schedule` to schedule summary generation at midnight Central Time on the 1st of each month for the previous month
    - On startup, check if previous month's summary file exists and generate if missing
    - After summary generation completes, trigger `cleanOldLogs()`
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement Dashboard and API routes
  - [x] 7.1 Create `server/analytics/dashboard.html`
    - Build a static HTML page that uses Chart.js from CDN (`https://cdn.jsdelivr.net/npm/chart.js`)
    - Fetch data from `/adam/api/current-month`, `/adam/api/available-months`, and `/adam/api/month/:yearMonth`
    - Render charts for daily breakdown, hourly distribution, and summary statistics
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Implement `server/analytics/routes.js`
    - Export a `register(app)` function that mounts all routes
    - `GET /adam/dashboard.html` — serve the static HTML file
    - `GET /adam/api/current-month` — read daily log files for current month, aggregate on-the-fly in the same shape as a monthly summary (computing `returningIps` and `newIps` from prior summaries), return 200 with zero-value data if no logs exist
    - `GET /adam/api/month/:yearMonth` — return contents of corresponding summary file, or 404 if not found
    - `GET /adam/api/available-months` — list summary files sorted descending
    - Treat missing `logs/` or `summaries/` directories as empty without error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.3 Write property test for Available Months Sorted Descending
    - **Property 10: Available Months Sorted Descending**
    - **Validates: Requirements 6.4**
    - For any set of monthly summary files, verify the available-months endpoint returns them sorted in descending chronological order

- [x] 8. Integrate with MCP server and Express app
  - [x] 8.1 Wire SessionLogger into `server/mcp/server.js`
    - In the `onsessioninitialized` callback, call `SessionLogger.log(req)` after existing session setup logic
    - Ensure the call is fire-and-forget (no await blocking the response)
    - _Requirements: 1.1, 1.6_

  - [x] 8.2 Wire analytics routes and scheduler into `server/index.js`
    - Require `./analytics/routes` and call `register(app)` to mount dashboard and API routes
    - Require `./analytics/scheduler` and call `start()` to begin cron job and run startup check
    - Install `node-schedule` dependency in `server/package.json`
    - _Requirements: 3.1, 3.2, 5.1, 6.1_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Follows schema-first methodology: schemas are created before implementation code
- All code uses JavaScript (matching the existing project and design document)
- Tests use Jest + fast-check (already available in the project)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1", "5.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "6.1"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "8.1", "8.2"] }
  ]
}
```
