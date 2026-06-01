const crypto = require('crypto');

// Uppercase A-Z excluding O, I, L plus digits 2-9 (31 characters total)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const PREFIX = 'XOXO-';

function generatePairingCode() {
	const bytes = crypto.randomBytes(CODE_LENGTH);
	let code = PREFIX;
	for (let i = 0; i < CODE_LENGTH; i++) {
		if (i === 4) {
			code += '-';
		}
		code += CHARSET[bytes[i] % CHARSET.length];
	}
	return code;
}

module.exports = { generatePairingCode };
