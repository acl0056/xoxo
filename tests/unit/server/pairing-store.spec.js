const pairingStore = require('../../../server/pairing/store');

describe('server/pairing/store', () => {
	beforeEach(() => {
		// Clean up any leftover entries between tests
		pairingStore.cleanup();
	});

	describe('create', () => {
		it('stores a pairing code entry', () => {
			const expiresAt = Date.now() + 300000;
			pairingStore.create('XOXO-A2B3', 'session-1', expiresAt);

			const entry = pairingStore.get('XOXO-A2B3');
			expect(entry).toEqual({ sessionId: 'session-1', expiresAt });
		});
	});

	describe('get', () => {
		it('returns the entry for a valid, unexpired code', () => {
			const expiresAt = Date.now() + 300000;
			pairingStore.create('XOXO-XY23', 'session-2', expiresAt);

			const entry = pairingStore.get('XOXO-XY23');
			expect(entry).toEqual({ sessionId: 'session-2', expiresAt });
		});

		it('returns null for a non-existent code', () => {
			expect(pairingStore.get('XOXO-NOPE')).toBeNull();
		});

		it('returns null for an expired code', () => {
			const expiresAt = Date.now() - 1000;
			pairingStore.create('XOXO-EXPR', 'session-3', expiresAt);

			expect(pairingStore.get('XOXO-EXPR')).toBeNull();
		});
	});

	describe('consume', () => {
		it('returns sessionId and removes the entry (single-use)', () => {
			const expiresAt = Date.now() + 300000;
			pairingStore.create('XOXO-USE1', 'session-4', expiresAt);

			const result = pairingStore.consume('XOXO-USE1');
			expect(result).toEqual({ sessionId: 'session-4' });

			// Second consume returns null
			expect(pairingStore.consume('XOXO-USE1')).toBeNull();
		});

		it('returns null for a non-existent code', () => {
			expect(pairingStore.consume('XOXO-GONE')).toBeNull();
		});

		it('returns null for an expired code', () => {
			const expiresAt = Date.now() - 1000;
			pairingStore.create('XOXO-OLD1', 'session-5', expiresAt);

			expect(pairingStore.consume('XOXO-OLD1')).toBeNull();
		});
	});

	describe('isExpired', () => {
		it('returns false for a valid, unexpired code', () => {
			const expiresAt = Date.now() + 300000;
			pairingStore.create('XOXO-LIVE', 'session-6', expiresAt);

			expect(pairingStore.isExpired('XOXO-LIVE')).toBe(false);
		});

		it('returns true for an expired code', () => {
			const expiresAt = Date.now() - 1000;
			pairingStore.create('XOXO-DEAD', 'session-7', expiresAt);

			expect(pairingStore.isExpired('XOXO-DEAD')).toBe(true);
		});

		it('returns true for a non-existent code', () => {
			expect(pairingStore.isExpired('XOXO-NONE')).toBe(true);
		});
	});

	describe('cleanup', () => {
		it('removes all expired entries', () => {
			const pastExpiry = Date.now() - 1000;
			const futureExpiry = Date.now() + 300000;

			pairingStore.create('XOXO-EXP1', 'session-8', pastExpiry);
			pairingStore.create('XOXO-EXP2', 'session-9', pastExpiry);
			pairingStore.create('XOXO-KEEP', 'session-10', futureExpiry);

			pairingStore.cleanup();

			expect(pairingStore.get('XOXO-EXP1')).toBeNull();
			expect(pairingStore.get('XOXO-EXP2')).toBeNull();
			expect(pairingStore.get('XOXO-KEEP')).toEqual({
				sessionId: 'session-10',
				expiresAt: futureExpiry,
			});
		});

		it('handles an empty store without errors', () => {
			expect(() => pairingStore.cleanup()).not.toThrow();
		});
	});
});
