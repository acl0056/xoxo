const fs = require('fs');
const path = require('path');

const logsDirectory = path.resolve(__dirname, '../logs/');

/**
 * Format a Date object as an ISO 8601 string with Central Time offset.
 *
 * @param {Date} date - The date to format
 * @returns {string} ISO 8601 timestamp with Central Time offset
 */
function formatCentralTimeTimestamp(date) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Chicago',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});

	const parts = formatter.formatToParts(date);
	const partValues = {};
	for (const part of parts) {
		partValues[part.type] = part.value;
	}

	const year = partValues.year;
	const month = partValues.month;
	const day = partValues.day;
	let hour = partValues.hour;
	const minute = partValues.minute;
	const second = partValues.second;

	// Some environments return hour "24" for midnight; normalize to "00"
	if (hour === '24') {
		hour = '00';
	}

	const utcTime = date.getTime();
	const centralDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
	const offsetMinutes = Math.round((centralDate.getTime() - utcTime) / 60000);
	const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
	const offsetMins = Math.abs(offsetMinutes) % 60;
	const offsetSign = offsetMinutes >= 0 ? '+' : '-';
	const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

	return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetString}`;
}

/**
 * Extract the YYYY-MM-DD date portion from a Central Time timestamp.
 *
 * @param {string} timestamp - ISO 8601 timestamp string
 * @returns {string} Date in YYYY-MM-DD format
 */
function extractDateFromTimestamp(timestamp) {
	return timestamp.slice(0, 10);
}

/**
 * Log an MCP session initialization event to a daily NDJSON file.
 * Executes asynchronously (fire-and-forget) and never throws.
 * Skips logging silently if userId is undefined or null.
 *
 * @param {object} request - The Express request object
 */
function log(request) {
	try {
		const userId = request.auth && request.auth.sub;
		if (userId == null) {
			return;
		}

		const timestamp = formatCentralTimeTimestamp(new Date());
		const date = extractDateFromTimestamp(timestamp);

		const forwardedFor = request.headers && request.headers['x-forwarded-for'];
		const ip = forwardedFor
			? forwardedFor.split(',')[0].trim()
			: request.ip;

		const logEntry = JSON.stringify({ timestamp, ip, userId });
		const logFilePath = path.resolve(logsDirectory, `${date}.log`);

		setImmediate(() => {
			try {
				fs.mkdirSync(logsDirectory, { recursive: true });
				fs.appendFileSync(logFilePath, `${logEntry}\n`);
			} catch (error) {
				console.error('SessionLogger: failed to write log entry', error);
			}
		});
	} catch (error) {
		console.error('SessionLogger: unexpected error during log preparation', error);
	}
}

module.exports = {
	log,
};
