const sessionStore = require('../../../server/session/store');
const handleGetUserLoadedFrds = require('../../../server/mcp/tools/getUserLoadedFrds');

describe('server/mcp/tools/getUserLoadedFrds', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
	});

	it('should return an error when no session exists for the user', async () => {
		const result = await handleGetUserLoadedFrds({ userId: 'auth0|nonexistent' });

		expect(result).toEqual({ error: 'No active session found for this user' });
	});

	it('should return an empty list when session exists but no FRD files are loaded', async () => {
		sessionStore.create('auth0|user1');

		const result = await handleGetUserLoadedFrds({ userId: 'auth0|user1' });

		expect(result).toEqual({ result: [] });
	});

	it('should return all user-loaded FRD data when files are loaded', async () => {
		const userFrds = [
			{
				label: 'on-axis-measurement.frd',
				angle: 0,
				description: 'On-axis measurement',
				frequencies: [100, 200, 500, 1000, 2000],
				magnitudes: [85.2, 86.1, 88.0, 87.5, 86.8],
				phases: [-10, -20, -45, -90, -120],
			},
			{
				label: '30deg-measurement.frd',
				angle: 30,
				description: '30 degree off-axis',
				frequencies: [100, 200, 500, 1000, 2000],
				magnitudes: [83.0, 84.1, 85.5, 82.0, 78.3],
				phases: [-12, -25, -50, -95, -130],
			},
		];
		sessionStore.create('auth0|user2');
		sessionStore.update('auth0|user2', { userLoadedFrds: userFrds });

		const result = await handleGetUserLoadedFrds({ userId: 'auth0|user2' });

		expect(result).toEqual({ result: userFrds });
		expect(result.result).toHaveLength(2);
		expect(result.result[0].label).toBe('on-axis-measurement.frd');
		expect(result.result[1].angle).toBe(30);
	});

	it('should return the FRD data without modification', async () => {
		const userFrds = [
			{
				label: 'tweeter-measurement.frd',
				angle: 0,
				description: 'Tweeter on-axis',
				frequencies: [1000, 2000, 5000, 10000, 20000],
				magnitudes: [90.0, 91.2, 89.5, 88.0, 85.0],
				phases: [-5, -15, -30, -60, -120],
			},
		];
		sessionStore.create('auth0|user3');
		sessionStore.update('auth0|user3', { userLoadedFrds: userFrds });

		const result = await handleGetUserLoadedFrds({ userId: 'auth0|user3' });

		expect(result.result[0].frequencies).toEqual([1000, 2000, 5000, 10000, 20000]);
		expect(result.result[0].magnitudes).toEqual([90.0, 91.2, 89.5, 88.0, 85.0]);
		expect(result.result[0].phases).toEqual([-5, -15, -30, -60, -120]);
	});
});
