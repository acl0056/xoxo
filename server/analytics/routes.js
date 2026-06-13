const fs = require('fs');
const path = require('path');
const logger = require('../logger');

const logsDirectory = path.resolve(__dirname, '../logs/');
const summariesDirectory = path.resolve(__dirname, '../summaries/');

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
 * Invalid JSON lines are skipped.
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
			// Skip invalid JSON lines
		}
	}

	return entries;
}

/**
 * Extract the Central Time hour from an ISO 8601 timestamp string.
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
 *
 * @param {string} targetMonth - The target month in "YYYY-MM" format
 * @returns {Set<string>} Set of all IPs seen in prior months
 */
function collectPriorMonthIps(targetMonth) {
	const priorIps = new Set();

	let summaryFiles = [];
	try {
		summaryFiles = fs.readdirSync(summariesDirectory)
			.filter((file) => file.endsWith('.json'));
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		return priorIps;
	}

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
			} catch (readError) {
				logger.warn(`Routes: failed to read prior summary ${file}:`, readError.message);
			}
		}
	}

	return priorIps;
}

/**
 * Aggregate current month data from daily log files, producing a summary-shaped object.
 *
 * @returns {object} Summary-shaped response for the current month
 */
function aggregateCurrentMonth() {
	// Determine current month in Central Time (America/Chicago)
	const nowCentral = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
	const year = nowCentral.getFullYear();
	const month = nowCentral.getMonth() + 1;
	const monthString = `${year}-${String(month).padStart(2, '0')}`;
	const filePrefix = `${monthString}-`;

	// Read all daily log files matching the target month
	let dailyFiles = [];
	try {
		dailyFiles = fs.readdirSync(logsDirectory)
			.filter((file) => file.startsWith(filePrefix) && file.endsWith('.log'))
			.sort();
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
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

	return {
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
}

/**
 * Register all analytics dashboard and API routes on the Express app.
 *
 * @param {object} app - Express application instance
 */
function register(app) {
	// Serve static dashboard HTML
	app.get('/adam/dashboard.html', (req, res) => {
		res.sendFile(path.resolve(__dirname, 'dashboard.html'));
	});

	// Current month aggregation from daily logs
	app.get('/adam/api/current-month', (req, res) => {
		try {
			const summary = aggregateCurrentMonth();
			res.json(summary);
		} catch (error) {
			logger.error('Routes: error aggregating current month:', error.message);
			res.status(500).json({ error: 'Internal server error' });
		}
	});

	// Return a specific monthly summary file
	app.get('/adam/api/month/:yearMonth', (req, res) => {
		const { yearMonth } = req.params;

		// Validate YYYY-MM format
		if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
			res.status(400).json({ error: 'Invalid yearMonth format. Expected YYYY-MM.' });
			return;
		}

		const summaryPath = path.resolve(summariesDirectory, `${yearMonth}.json`);

		try {
			const content = fs.readFileSync(summaryPath, 'utf8');
			res.json(JSON.parse(content));
		} catch (error) {
			if (error.code === 'ENOENT') {
				res.status(404).json({ error: `No summary found for ${yearMonth}` });
			} else {
				logger.error(`Routes: error reading summary for ${yearMonth}:`, error.message);
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	});

	// List available monthly summary files sorted descending
	app.get('/adam/api/available-months', (req, res) => {
		let files = [];
		try {
			files = fs.readdirSync(summariesDirectory)
				.filter((file) => file.endsWith('.json'));
		} catch (error) {
			if (error.code !== 'ENOENT') {
				logger.error('Routes: error reading summaries directory:', error.message);
				res.status(500).json({ error: 'Internal server error' });
				return;
			}
		}

		const months = files
			.map((file) => file.replace('.json', ''))
			.sort()
			.reverse();

		res.json({ months });
	});
}

module.exports = { register };
