# Requirements Document

## Introduction

Session Analytics provides lightweight usage tracking for the xoxo MCP server. It logs MCP session events to daily NDJSON files, generates monthly summary reports, serves an internal dashboard for visualization, and cleans up old log files automatically. No database is required — all state lives in flat files on disk.

## Glossary

- **SessionLogger**: The component responsible for appending session event records to daily log files
- **SummaryGenerator**: The component that reads daily log files for a given month and produces an aggregated monthly summary JSON file
- **Scheduler**: The component that triggers monthly summary generation and cleanup on a cron schedule and at server startup
- **FileCleanup**: The component that deletes daily log files older than 60 days
- **Dashboard**: The static HTML page served at an obscure URL that visualizes analytics data using Chart.js
- **API_Layer**: The set of Express route handlers that serve aggregated analytics data to the Dashboard
- **Daily_Log_File**: An NDJSON file named `YYYY-MM-DD.log` stored in the `logs/` directory, containing one JSON line per session event
- **Monthly_Summary**: A JSON file named `YYYY-MM.json` stored in the `summaries/` directory, containing aggregated statistics for a calendar month
- **NDJSON**: Newline-delimited JSON format where each line is a complete JSON object
- **Central_Time**: The America/Chicago timezone used for all timestamp formatting and date bucketing

## Requirements

### Requirement 1: Log Session Events

**User Story:** As a server operator, I want each MCP session initialization to be logged to a daily file, so that I have a record of all session activity.

#### Acceptance Criteria

1. WHEN an MCP session is initialized, THE SessionLogger SHALL append a single NDJSON line to the Daily_Log_File for the current Central_Time date
2. WHEN a session event is logged, THE SessionLogger SHALL include exactly three fields in the NDJSON line: `timestamp` (ISO 8601 with Central_Time offset), `ip` (the first IP from x-forwarded-for if present, otherwise the direct request IP), and `userId` (authenticated user ID from `req.auth.sub`)
3. WHEN the `logs/` directory does not exist, THE SessionLogger SHALL create the directory before writing
4. IF a file system error occurs during logging, OR the userId is undefined or null, THEN THE SessionLogger SHALL skip logging the event and log the error to console, so that MCP session initialization is not blocked
5. WHEN determining which Daily_Log_File to write to, THE SessionLogger SHALL use the Central_Time date of the event timestamp, not the UTC date
6. THE SessionLogger SHALL execute asynchronously (fire-and-forget) such that it does not add latency to the MCP session initialization response

### Requirement 2: Generate Monthly Summaries

**User Story:** As a server operator, I want monthly summary reports generated automatically, so that I can review aggregated usage data without manual effort.

#### Acceptance Criteria

1. WHEN summary generation is triggered for a given month, THE SummaryGenerator SHALL read all Daily_Log_Files whose filenames match that month
2. WHEN generating a summary, THE SummaryGenerator SHALL compute `totalSessions` as the count of all valid log entries across all daily files for the month
3. WHEN generating a summary, THE SummaryGenerator SHALL compute `uniqueIps` as the count of distinct IP addresses and populate `uniqueIpList` with those addresses
4. WHEN generating a summary, THE SummaryGenerator SHALL produce a `dailyBreakdown` array with one entry per day containing the date, session count, and unique IP count for that day
5. WHEN generating a summary, THE SummaryGenerator SHALL produce an `hourlyDistribution` object with keys "0" through "23" representing session counts per Central_Time hour
6. WHEN generating a summary, THE SummaryGenerator SHALL compute `returningIps` and `newIps` by reading the `uniqueIpList` arrays from all existing prior Monthly_Summary files in the `summaries/` directory to determine which IPs have been seen before. Their sum SHALL equal `uniqueIps`.
7. WHEN a Daily_Log_File contains invalid JSON lines, THE SummaryGenerator SHALL skip those lines and continue processing valid entries
8. WHEN the `summaries/` directory does not exist, THE SummaryGenerator SHALL create the directory before writing
9. WHEN a summary file already exists for the target month, THE SummaryGenerator SHALL overwrite the existing file with freshly computed data
10. WHEN no Daily_Log_Files exist for the target month, THE SummaryGenerator SHALL produce a zero-value summary with `totalSessions: 0`, empty `uniqueIpList`, empty `dailyBreakdown`, all-zero `hourlyDistribution`, and zero for `returningIps` and `newIps`

### Requirement 3: Schedule Summary Generation and Cleanup

**User Story:** As a server operator, I want summary generation and log cleanup to happen automatically, so that I do not need to run manual maintenance tasks.

#### Acceptance Criteria

1. THE Scheduler SHALL use node-schedule to trigger summary generation at midnight Central_Time on the 1st of each month for the previous month
2. WHEN the server starts, THE Scheduler SHALL check if the previous month's Monthly_Summary file exists, and generate it if missing
3. WHEN summary generation completes, THE Scheduler SHALL trigger FileCleanup to remove old log files

### Requirement 4: Clean Up Old Log Files

**User Story:** As a server operator, I want old daily log files automatically deleted, so that disk space is not consumed indefinitely.

#### Acceptance Criteria

1. WHEN FileCleanup runs, THE FileCleanup SHALL delete Daily_Log_Files whose date (parsed from the `YYYY-MM-DD.log` filename) is more than 60 days in the past
2. WHEN FileCleanup runs, THE FileCleanup SHALL only consider files in the `logs/` directory that match the `YYYY-MM-DD.log` naming pattern
3. WHEN FileCleanup runs, THE FileCleanup SHALL preserve all Daily_Log_Files that are 60 days old or less

### Requirement 5: Serve Dashboard

**User Story:** As a server operator, I want a web dashboard to visualize session analytics, so that I can quickly understand usage patterns.

#### Acceptance Criteria

1. WHEN a GET request is made to `/adam/dashboard.html`, THE Dashboard SHALL serve a static HTML page that uses Chart.js from CDN for visualization
2. THE Dashboard SHALL fetch data from the API_Layer endpoints to render charts and statistics

### Requirement 6: Provide Analytics API

**User Story:** As a dashboard consumer, I want API endpoints that return analytics data, so that the dashboard can display current and historical usage.

#### Acceptance Criteria

1. WHEN a GET request is made to `/adam/api/current-month`, THE API_Layer SHALL read all Daily_Log_Files for the current month and return aggregated data in the same shape as a Monthly_Summary, computing `returningIps` and `newIps` by reading existing prior Monthly_Summary files
2. WHEN a GET request is made to `/adam/api/month/:yearMonth`, THE API_Layer SHALL return the contents of the corresponding Monthly_Summary file
3. IF a GET request is made to `/adam/api/month/:yearMonth` and no summary file exists for that month, THEN THE API_Layer SHALL return HTTP status 404
4. WHEN a GET request is made to `/adam/api/available-months`, THE API_Layer SHALL return a list of months that have summary files, sorted in descending order
5. WHEN there are no Daily_Log_Files for the current month, THE API_Layer SHALL return HTTP status 200 with zero-value aggregated data
6. IF the `logs/` or `summaries/` directory does not exist when an API endpoint is called, THEN THE API_Layer SHALL treat it as empty (no files) and respond accordingly without error

### Requirement 7: Ensure Summary Data Integrity

**User Story:** As a server operator, I want summary data to be internally consistent, so that I can trust the accuracy of the analytics.

#### Acceptance Criteria

1. THE SummaryGenerator SHALL ensure `totalSessions` equals the sum of all `sessions` values in the `dailyBreakdown` array
2. THE SummaryGenerator SHALL ensure `uniqueIps` equals the length of `uniqueIpList`
3. THE SummaryGenerator SHALL ensure `uniqueIps` equals `returningIps` plus `newIps`
4. THE SummaryGenerator SHALL ensure the `hourlyDistribution` object contains exactly 24 keys ("0" through "23") and the sum of all values equals `totalSessions`
5. WHEN summary generation is run multiple times for the same month with the same input log files, THE SummaryGenerator SHALL produce identical output

### Requirement 8: Schema Definitions

**User Story:** As a developer, I want JSON Schemas for the analytics data structures, so that data is validated consistently per the project's schema-first methodology.

#### Acceptance Criteria

1. THE project SHALL define a JSON Schema for the Daily Log Entry at `server/schemas/session-log-entry.schema.json` specifying `timestamp` (string, format date-time), `ip` (string), and `userId` (string), all required
2. THE project SHALL define a JSON Schema for the Monthly Summary at `server/schemas/monthly-summary.schema.json` specifying all fields from the data model including `month`, `generatedAt`, `totalSessions`, `uniqueIps`, `uniqueIpList`, `dailyBreakdown`, `hourlyDistribution`, `returningIps`, and `newIps`
3. THE SummaryGenerator SHALL validate generated summaries against the monthly-summary schema before writing to disk
