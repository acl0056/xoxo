const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const logger = require('../logger');

const logsDirectory = path.resolve(__dirname, '../logs/');
const summariesDirectory = path.resolve(__dirname, '../summaries/');
const summarySchema = require('../schemas/monthly-summary.schema.json');

const ajv = new Ajv();
addFormats(ajv);
const validateSummary = ajv.compile(summarySchema);

/**
 * Build an empty hourly distribution object with all 24 hours set to zero.
 *
 * @returns {object} Object with keys "0" through "23", all set to 0
 */
function buildEmptyHourlyDistribution() {
	const distribution = {};
	for (let hour = 0; hour < 24; hour++) {
		distribution[String(hour)] = 0;
	}
	return distribution;
}

/**
 * Read and parse all valid log entries from a single daily log file.
 * Invalid JSON lines are skipped with a console warning.
 *
 * @param {string} filePath - Absolute path to the daily log file
 * @returns {Array} Array of parsed log entry objects
 */
function parseLogFile(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split('\n');
	const entries = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === '') continue;

		try {
			const entry = JSON.parse(trimmed);
			if (entry.timestamp && entry.ip && entry.userId) {
				entries.push(entry);
			}
		} catch (error) {
			logger.warn(`SummaryGenerator: skipping invalid JSON line in ${filePath}: ${trimmed}`);
		}
	}

	return entries;
}

/**
 * Extract the Central Time hour from an ISO 8601 timestamp string.
 * The timestamp is expected to already be in Central Time with an offset.
 *
 * @param {string} timestamp - ISO 8601 timestamp (e.g. "2025-01-15T14:23:07-06:00")
 * @returns {number} Hour of the day (0-23)
 */
function extractCentralTimeHour(timestamp) {
	const hourMatch = timestamp.match(/T(\d{2}):/);
	if (hourMatch) {
		return parseInt(hourMatch[1], 10);
	}
	return 0;
}

/**
 * Collect all unique IPs from prior monthly summary files.
 * A "prior" month is any month string lexicographically less than the target month.
 *
 * @param {string} targetMonth - The target month in "YYYY-MM" format
 * @returns {Set<string>} Set of all IPs seen in prior months
 */
function collectPriorMonthIps(targetMonth) {
	const priorIps = new Set();

	if (!fs.existsSync(summariesDirectory)) {
		return priorIps;
	}

	const summaryFiles = fs.readdirSync(summariesDirectory)
		.filter((file) => file.endsWith('.json'));

	for (const file of summaryFiles) {
		const monthFromFile = file.replace('.json', '');
		if (monthFromFile < targetMonth) {
			try {
				const filePath = path.resolve(summariesDirectory, file);
				const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
				if (Array.isArray(content.uniqueIpList)) {
					for (const ip of content.uniqueIpList) {
						priorIps.add(ip);
					}
				}
			} catch (error) {
				logger.warn(`SummaryGenerator: failed to read prior summary ${file}:`, error.message);
			}
		}
	}

	return priorIps;
}

/**
 * Generate a monthly summary from daily log files for the specified year and month.
 * Reads all matching YYYY-MM-DD.log files, aggregates statistics, validates against
 * the monthly-summary schema, and writes the result to summaries/YYYY-MM.json.
 *
 * @param {number} year - The target year (e.g. 2025)
 * @param {number} month - The target month (1-12)
 * @returns {Promise<void>}
 */
async function generate(year, month) {
	const monthString = `${year}-${String(month).padStart(2, '0')}`;
	const filePrefix = `${monthString}-`;

	// Read all daily log files matching the target month
	let dailyFiles = [];
	if (fs.existsSync(logsDirectory)) {
		dailyFiles = fs.readdirSync(logsDirectory)
			.filter((file) => file.startsWith(filePrefix) && file.endsWith('.log'))
			.sort();
	}

	// Aggregate data
	const allIps = new Set();
	const dailyData = new Map();
	const hourlyDistribution = buildEmptyHourlyDistribution();
	let totalSessions = 0;

	for (const file of dailyFiles) {
		const filePath = path.resolve(logsDirectory, file);
		const entries = parseLogFile(filePath);
		const date = file.replace('.log', '');
		const dayIps = new Set();

		for (const entry of entries) {
			totalSessions++;
			allIps.add(entry.ip);
			dayIps.add(entry.ip);

			const hour = extractCentralTimeHour(entry.timestamp);
			hourlyDistribution[String(hour)]++;
		}

		if (entries.length > 0) {
			dailyData.set(date, {
				date,
				sessions: entries.length,
				uniqueIps: dayIps.size,
			});
		}
	}

	// Build sorted unique IP list
	const uniqueIpList = Array.from(allIps).sort();
	const uniqueIps = uniqueIpList.length;

	// Build daily breakdown sorted by date
	const dailyBreakdown = Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));

	// Compute returning vs new IPs
	const priorIps = collectPriorMonthIps(monthString);
	let returningIps = 0;
	let newIps = 0;

	for (const ip of uniqueIpList) {
		if (priorIps.has(ip)) {
			returningIps++;
		} else {
			newIps++;
		}
	}

	// Build the summary object
	const summary = {
		month: monthString,
		generatedAt: new Date().toISOString(),
		totalSessions,
		uniqueIps,
		uniqueIpList,
		dailyBreakdown,
		hourlyDistribution,
		returningIps,
		newIps,
	};

	// Validate against schema
	if (!validateSummary(summary)) {
		throw new Error(`SummaryGenerator: generated summary failed schema validation: ${JSON.stringify(validateSummary.errors)}`);
	}

	// Ensure summaries directory exists and write the file
	fs.mkdirSync(summariesDirectory, { recursive: true });
	const outputPath = path.resolve(summariesDirectory, `${monthString}.json`);
	fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
}

module.exports = {
	generate,
};
