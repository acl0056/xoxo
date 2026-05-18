const sessionStore = require('../../../server/session/store');
const sessionManager = require('../../../server/session/manager');

describe('server/session/manager', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
	});

	describe('getSession', () => {
		it('should return the session for an existing user', () => {
			sessionStore.create('auth0|user1');
			const session = sessionManager.getSession('auth0|user1');

			expect(session).toBeDefined();
			expect(session.userId).toBe('auth0|user1');
		});

		it('should return undefined for a non-existent user', () => {
			const session = sessionManager.getSession('auth0|nonexistent');

			expect(session).toBeUndefined();
		});
	});

	describe('updateCircuitLayout', () => {
		const validLayout = {
			version: '1.0',
			metadata: {
				name: 'Test Circuit',
				created: '2025-01-15T10:00:00Z',
				modified: '2025-01-15T10:00:00Z',
			},
			components: [],
			wires: [],
		};

		beforeEach(() => {
			sessionStore.create('auth0|circuit-user');
		});

		it('should store a valid circuit layout', () => {
			const result = sessionManager.updateCircuitLayout('auth0|circuit-user', validLayout);

			expect(result.success).toBe(true);
			const session = sessionStore.get('auth0|circuit-user');
			expect(session.circuitLayout).toEqual(validLayout);
		});

		it('should return an error for an invalid circuit layout', () => {
			const invalidLayout = { notAValidField: true };

			const result = sessionManager.updateCircuitLayout('auth0|circuit-user', invalidLayout);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should not modify the session when validation fails', () => {
			const invalidLayout = { notAValidField: true };

			sessionManager.updateCircuitLayout('auth0|circuit-user', invalidLayout);

			const session = sessionStore.get('auth0|circuit-user');
			expect(session.circuitLayout).toBeNull();
		});

		it('should return an error when the session does not exist', () => {
			const result = sessionManager.updateCircuitLayout('auth0|ghost', validLayout);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Session not found for the specified user');
		});
	});

	describe('updateSimulationResults', () => {
		const validResults = {
			frequencyResponse: {
				frequencies: [100, 1000, 10000],
				spl: [80, 85, 82],
				phase: [0, -45, -90],
				speakerResponses: {},
			},
			impedanceResponse: {
				frequencies: [100, 1000, 10000],
				impedances: [8, 6.5, 12],
				phases: [0, -10, 20],
			},
			timestamp: '2025-01-15T10:00:00Z',
		};

		beforeEach(() => {
			sessionStore.create('auth0|sim-user');
		});

		it('should store valid simulation results', () => {
			const result = sessionManager.updateSimulationResults('auth0|sim-user', validResults);

			expect(result.success).toBe(true);
			const session = sessionStore.get('auth0|sim-user');
			expect(session.simulationResults).toEqual(validResults);
		});

		it('should return an error for invalid simulation results', () => {
			const invalidResults = { badField: 'not valid' };

			const result = sessionManager.updateSimulationResults('auth0|sim-user', invalidResults);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should return an error when the session does not exist', () => {
			const result = sessionManager.updateSimulationResults('auth0|ghost', validResults);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Session not found for the specified user');
		});
	});

	describe('getElectronConnection', () => {
		it('should return the WebSocket connection for a connected user', () => {
			const fakeConnection = { id: 'socket-456', emit: jest.fn() };
			sessionStore.create('auth0|ws-user', { wsConnection: fakeConnection });

			const connection = sessionManager.getElectronConnection('auth0|ws-user');

			expect(connection).toBe(fakeConnection);
		});

		it('should return null when the user has no WebSocket connection', () => {
			sessionStore.create('auth0|no-ws-user');

			const connection = sessionManager.getElectronConnection('auth0|no-ws-user');

			expect(connection).toBeNull();
		});

		it('should return null when the session does not exist', () => {
			const connection = sessionManager.getElectronConnection('auth0|nonexistent');

			expect(connection).toBeNull();
		});
	});

	describe('beginEditGroup', () => {
		beforeEach(() => {
			sessionStore.create('auth0|edit-user');
		});

		it('should mark the edit group as active with a timestamp', () => {
			const result = sessionManager.beginEditGroup('auth0|edit-user', 'Batch optimization');

			expect(result.success).toBe(true);
			const session = sessionStore.get('auth0|edit-user');
			expect(session.editGroup.active).toBe(true);
			expect(session.editGroup.startedAt).toBeDefined();
			expect(session.editGroup.description).toBe('Batch optimization');
		});

		it('should set description to null when not provided', () => {
			sessionManager.beginEditGroup('auth0|edit-user');

			const session = sessionStore.get('auth0|edit-user');
			expect(session.editGroup.description).toBeNull();
		});

		it('should return an error when the session does not exist', () => {
			const result = sessionManager.beginEditGroup('auth0|ghost', 'Test');

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Session not found for the specified user');
		});
	});

	describe('endEditGroup', () => {
		beforeEach(() => {
			sessionStore.create('auth0|end-edit-user');
			sessionManager.beginEditGroup('auth0|end-edit-user', 'Test group');
		});

		it('should mark the edit group as inactive', () => {
			const result = sessionManager.endEditGroup('auth0|end-edit-user');

			expect(result.success).toBe(true);
			const session = sessionStore.get('auth0|end-edit-user');
			expect(session.editGroup.active).toBe(false);
			expect(session.editGroup.startedAt).toBeNull();
			expect(session.editGroup.description).toBeNull();
		});

		it('should return an error when the session does not exist', () => {
			const result = sessionManager.endEditGroup('auth0|ghost');

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Session not found for the specified user');
		});
	});

	describe('isEditGroupActive', () => {
		it('should return true when an edit group is active', () => {
			sessionStore.create('auth0|active-edit');
			sessionManager.beginEditGroup('auth0|active-edit', 'Active group');

			expect(sessionManager.isEditGroupActive('auth0|active-edit')).toBe(true);
		});

		it('should return false when no edit group is active', () => {
			sessionStore.create('auth0|inactive-edit');

			expect(sessionManager.isEditGroupActive('auth0|inactive-edit')).toBe(false);
		});

		it('should return false when the session does not exist', () => {
			expect(sessionManager.isEditGroupActive('auth0|nonexistent')).toBe(false);
		});

		it('should return false after ending an edit group', () => {
			sessionStore.create('auth0|ended-edit');
			sessionManager.beginEditGroup('auth0|ended-edit', 'Will end');
			sessionManager.endEditGroup('auth0|ended-edit');

			expect(sessionManager.isEditGroupActive('auth0|ended-edit')).toBe(false);
		});
	});

	describe('checkEditGroupTimeout', () => {
		it('should return timedOut false when no edit group is active', () => {
			sessionStore.create('auth0|no-timeout');

			const result = sessionManager.checkEditGroupTimeout('auth0|no-timeout');

			expect(result.timedOut).toBe(false);
		});

		it('should return timedOut false when the session does not exist', () => {
			const result = sessionManager.checkEditGroupTimeout('auth0|nonexistent');

			expect(result.timedOut).toBe(false);
		});

		it('should return timedOut false when edit group is within timeout', () => {
			sessionStore.create('auth0|within-timeout');
			sessionManager.beginEditGroup('auth0|within-timeout', 'Recent group');

			const result = sessionManager.checkEditGroupTimeout('auth0|within-timeout');

			expect(result.timedOut).toBe(false);
			expect(sessionManager.isEditGroupActive('auth0|within-timeout')).toBe(true);
		});

		it('should auto-close and return timedOut true when 60 seconds have elapsed', () => {
			sessionStore.create('auth0|timed-out');
			// Manually set a startedAt timestamp that is 61 seconds in the past
			const pastTimestamp = new Date(Date.now() - 61000).toISOString();
			sessionStore.update('auth0|timed-out', {
				editGroup: {
					active: true,
					startedAt: pastTimestamp,
					description: 'Old group',
				},
			});

			const result = sessionManager.checkEditGroupTimeout('auth0|timed-out');

			expect(result.timedOut).toBe(true);
			expect(sessionManager.isEditGroupActive('auth0|timed-out')).toBe(false);
		});

		it('should not auto-close when exactly at the timeout boundary', () => {
			sessionStore.create('auth0|boundary');
			// Set startedAt to exactly 59 seconds ago (just under the 60s threshold)
			const pastTimestamp = new Date(Date.now() - 59000).toISOString();
			sessionStore.update('auth0|boundary', {
				editGroup: {
					active: true,
					startedAt: pastTimestamp,
					description: 'Boundary group',
				},
			});

			const result = sessionManager.checkEditGroupTimeout('auth0|boundary');

			expect(result.timedOut).toBe(false);
			expect(sessionManager.isEditGroupActive('auth0|boundary')).toBe(true);
		});
	});
});
