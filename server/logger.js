/**
 * Simple server logger that prefixes all output with a Central Time timestamp.
 * Drop-in replacement for console.log/warn/error.
 */

function formatTimestamp() {
	return new Date().toLocaleString('en-US', {
		timeZone: 'America/Chicago',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
}

function log(...args) {
	console.log(`[${formatTimestamp()}]`, ...args);
}

function warn(...args) {
	console.warn(`[${formatTimestamp()}]`, ...args);
}

function error(...args) {
	console.error(`[${formatTimestamp()}]`, ...args);
}

module.exports = { log, warn, error };
