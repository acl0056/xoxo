const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');
const { generate } = require('./summary');
const { cleanOldLogs } = require('./cleanup');
const logger = require('../logger');

const summariesDirectory = path.resolve(__dirname, '../summaries/');

/**
 * Compute the previous month's year and month (1-12) relative to the current date.
 *
 * @returns {{ year: number, month: number }}
 */
function getPreviousMonth() {
	const now = new Date();
	let year = now.getFullYear();
	let month = now.getMonth(); // 0-indexed current month

	if (month === 0) {
		// Current month is January, so previous month is December of last year
		year -= 1;
		month = 12;
	}
	// Otherwise month is already the 1-indexed previous month (e.g. current March=2 → previous=2=February)

	return { year, month };
}

/**
 * Build the expected summary filename for a given year and month.
 *
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {string} Filename like "2025-01.json"
 */
function buildSummaryFilename(year, month) {
	return `${year}-${String(month).padStart(2, '0')}.json`;
}

/**
 * Generate the monthly summary and then clean old logs.
 * Wraps both operations in try/catch so the scheduler never crashes the server.
 *
 * @param {number} year
 * @param {number} month - 1-12
 */
async function generateAndClean(year, month) {
	try {
		await generate(year, month);
		logger.log(`Scheduler: generated summary for ${year}-${String(month).padStart(2, '0')}`);
	} catch (error) {
		logger.error(`Scheduler: failed to generate summary for ${year}-${String(month).padStart(2, '0')}:`, error);
	}

	try {
		await cleanOldLogs();
		logger.log('Scheduler: completed old log cleanup');
	} catch (error) {
		logger.error('Scheduler: failed to clean old logs:', error);
	}
}

/**
 * Start the analytics scheduler.
 *
 * 1. Schedules monthly summary generation at midnight Central Time on the 1st of each month.
 * 2. On startup, checks if the previous month's summary exists — generates it if missing.
 */
function start() {
	// Schedule summary generation at midnight Central Time on the 1st of each month
	const rule = new schedule.RecurrenceRule();
	rule.month = null; // every month
	rule.date = 1;
	rule.hour = 0;
	rule.minute = 0;
	rule.second = 0;
	rule.tz = 'America/Chicago';

	schedule.scheduleJob(rule, async () => {
		const { year, month } = getPreviousMonth();
		await generateAndClean(year, month);
	});

	logger.log('Scheduler: monthly summary job scheduled (midnight CT on the 1st)');

	// Startup check: generate previous month's summary if missing
	const { year, month } = getPreviousMonth();
	const summaryFilename = buildSummaryFilename(year, month);
	const summaryPath = path.resolve(summariesDirectory, summaryFilename);

	if (!fs.existsSync(summaryPath)) {
		logger.log(`Scheduler: previous month summary missing (${summaryFilename}), generating...`);
		generateAndClean(year, month);
	}
}

module.exports = { start };
