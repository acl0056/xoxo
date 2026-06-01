const sessionManager = require('../../session/manager');

async function handleGetCircuitLayout(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	return { result: session.circuitLayout };
}

module.exports = handleGetCircuitLayout;
