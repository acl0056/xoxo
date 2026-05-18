const sessionStore = require('../../../server/session/store');

describe('server/session/store', () => {
	beforeEach(() => {
		// Clear all sessions between tests
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
	});

	describe('create', () => {
		it('should create a session with default values', () => {
			const session = sessionStore.create('auth0|user1');

			expect(session.userId).toBe('auth0|user1');
			expect(session.circuitLayout).toBeNull();
			expect(session.simulationResults).toBeNull();
			expect(session.userLoadedFrds).toEqual([]);
			expect(session.wsConnection).toBeNull();
			expect(session.mcpSessionId).toBeNull();
			expect(session.connectedAt).toBeDefined();
			expect(session.editGroup).toEqual({
				active: false,
				startedAt: null,
				description: null,
			});
		});

		it('should accept optional wsConnection and mcpSessionId', () => {
			const fakeConnection = { id: 'socket-123' };
			const session = sessionStore.create('auth0|user2', {
				wsConnection: fakeConnection,
				mcpSessionId: 'mcp-session-abc',
			});

			expect(session.wsConnection).toBe(fakeConnection);
			expect(session.mcpSessionId).toBe('mcp-session-abc');
		});

		it('should store the session in the map', () => {
			sessionStore.create('auth0|user3');
			const retrieved = sessionStore.get('auth0|user3');

			expect(retrieved).toBeDefined();
			expect(retrieved.userId).toBe('auth0|user3');
		});

		it('should set connectedAt to a valid ISO timestamp', () => {
			const session = sessionStore.create('auth0|user4');
			const parsedDate = new Date(session.connectedAt);

			expect(parsedDate.toISOString()).toBe(session.connectedAt);
		});
	});

	describe('get', () => {
		it('should return the session for an existing user', () => {
			sessionStore.create('auth0|existing');
			const session = sessionStore.get('auth0|existing');

			expect(session).toBeDefined();
			expect(session.userId).toBe('auth0|existing');
		});

		it('should return undefined for a non-existent user', () => {
			const session = sessionStore.get('auth0|nonexistent');

			expect(session).toBeUndefined();
		});
	});

	describe('update', () => {
		it('should merge updates into the existing session', () => {
			sessionStore.create('auth0|updatable');
			const circuitLayout = { version: '1.0', components: [] };
			const updated = sessionStore.update('auth0|updatable', { circuitLayout });

			expect(updated.circuitLayout).toEqual(circuitLayout);
			expect(updated.userId).toBe('auth0|updatable');
			expect(updated.simulationResults).toBeNull();
		});

		it('should return undefined when updating a non-existent session', () => {
			const result = sessionStore.update('auth0|ghost', { circuitLayout: {} });

			expect(result).toBeUndefined();
		});

		it('should update the edit group state', () => {
			sessionStore.create('auth0|edituser');
			const updated = sessionStore.update('auth0|edituser', {
				editGroup: {
					active: true,
					startedAt: '2025-01-15T10:00:00Z',
					description: 'Batch optimization',
				},
			});

			expect(updated.editGroup.active).toBe(true);
			expect(updated.editGroup.startedAt).toBe('2025-01-15T10:00:00Z');
			expect(updated.editGroup.description).toBe('Batch optimization');
		});

		it('should persist the update for subsequent get calls', () => {
			sessionStore.create('auth0|persistent');
			sessionStore.update('auth0|persistent', { mcpSessionId: 'new-id' });
			const retrieved = sessionStore.get('auth0|persistent');

			expect(retrieved.mcpSessionId).toBe('new-id');
		});
	});

	describe('delete', () => {
		it('should remove an existing session and return true', () => {
			sessionStore.create('auth0|deletable');
			const result = sessionStore.delete('auth0|deletable');

			expect(result).toBe(true);
			expect(sessionStore.get('auth0|deletable')).toBeUndefined();
		});

		it('should return false when deleting a non-existent session', () => {
			const result = sessionStore.delete('auth0|never-existed');

			expect(result).toBe(false);
		});
	});

	describe('getAll', () => {
		it('should return an empty map when no sessions exist', () => {
			const allSessions = sessionStore.getAll();

			expect(allSessions.size).toBe(0);
		});

		it('should return all created sessions', () => {
			sessionStore.create('auth0|first');
			sessionStore.create('auth0|second');
			sessionStore.create('auth0|third');

			const allSessions = sessionStore.getAll();

			expect(allSessions.size).toBe(3);
			expect(allSessions.has('auth0|first')).toBe(true);
			expect(allSessions.has('auth0|second')).toBe(true);
			expect(allSessions.has('auth0|third')).toBe(true);
		});

		it('should reflect deletions', () => {
			sessionStore.create('auth0|alpha');
			sessionStore.create('auth0|beta');
			sessionStore.delete('auth0|alpha');

			const allSessions = sessionStore.getAll();

			expect(allSessions.size).toBe(1);
			expect(allSessions.has('auth0|beta')).toBe(true);
		});
	});
});
