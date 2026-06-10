const fs = require('fs');
const path = require('path');
const logger = require('../logger');

const logsDirectory = path.resolve(__dirname, '../logs/');
const dailyLogPattern = /^(\d{4})-(\d{2})-(\d{2})\.log$/;
const retentionDays = 60;

async function cleanOldLogs() {
	let files;
	try {
		files = await fs.promises.readdir(logsDirectory);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return;
		}
		throw error;
	}

	const now = new Date();
	const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - retentionDays);

	const deletionPromises = [];

	for (const filename of files) {
		const match = filename.match(dailyLogPattern);
		if (!match) {
			continue;
		}

		const year = parseInt(match[1], 10);
		const month = parseInt(match[2], 10) - 1;
		const day = parseInt(match[3], 10);
		const fileDate = new Date(year, month, day);

		if (fileDate < cutoffDate) {
			const filePath = path.join(logsDirectory, filename);
			deletionPromises.push(
				fs.promises.unlink(filePath).then(() => {
					logger.log(`Deleted old log: ${filename}`);
				}),
			);
		}
	}

	await Promise.all(deletionPromises);
}

module.exports = { cleanOldLogs };
