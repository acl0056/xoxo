/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 10: Available Months Sorted Descending
 *
 * **Validates: Requirements 6.4**
 *
 * For any set of monthly summary files in the summaries directory, the
 * /adam/api/available-months endpoint returns them sorted in descending
 * chronological order.
 */

jest.mock('fs');

describe('Property 10: Available Months Sorted Descending', () => {
	let register;
	let mockFs;

	beforeEach(() => {
		jest.resetModules();
		jest.mock('fs');
		mockFs = require('fs');
		register = require('../../../server/analytics/routes').register;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	/**
	 * Generate an arbitrary valid YYYY-MM string.
	 * Year range: 2020-2035, month range: 01-12.
	 */
	function yearMonthArbitrary() {
		return fc.record({
			year: fc.integer({ min: 2020, max: 2035 }),
			month: fc.integer({ min: 1, max: 12 }),
		}).map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);
	}

	/**
	 * Register routes on a fake Express app and capture the handler for a given path.
	 */
	function captureRouteHandlers() {
		const handlers = {};
		const fakeApp = {
			get: (routePath, handler) => {
				handlers[routePath] = handler;
			},
		};
		register(fakeApp);
		return handlers;
	}

	it('available months should be returned in descending chronological order', () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(yearMonthArbitrary(), { minLength: 0, maxLength: 20 }),
				(monthStrings) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					register = require('../../../server/analytics/routes').register;

					const summaryFilenames = monthStrings.map((m) => `${m}.json`);

					mockFs.readdirSync.mockImplementation(() => summaryFilenames);

					const handlers = captureRouteHandlers();

					const req = {};
					const res = { json: jest.fn(), status: jest.fn(() => res) };

					handlers['/adam/api/available-months'](req, res);

					expect(res.json).toHaveBeenCalledTimes(1);
					const { months } = res.json.mock.calls[0][0];

					// Verify the array is sorted in descending order
					for (let i = 0; i < months.length - 1; i++) {
						expect(months[i] >= months[i + 1]).toBe(true);
					}

					// Verify all input months are present (no data lost)
					expect(months.length).toBe(monthStrings.length);
					for (const monthString of monthStrings) {
						expect(months).toContain(monthString);
					}
				},
			),
		);
	});

	it('empty summaries directory returns an empty months array', () => {
		mockFs.readdirSync.mockImplementation(() => []);

		const handlers = captureRouteHandlers();

		const req = {};
		const res = { json: jest.fn(), status: jest.fn(() => res) };

		handlers['/adam/api/available-months'](req, res);

		expect(res.json).toHaveBeenCalledWith({ months: [] });
	});

	it('missing summaries directory (ENOENT) returns an empty months array', () => {
		const enoentError = new Error('ENOENT');
		enoentError.code = 'ENOENT';
		mockFs.readdirSync.mockImplementation(() => { throw enoentError; });

		const handlers = captureRouteHandlers();

		const req = {};
		const res = { json: jest.fn(), status: jest.fn(() => res) };

		handlers['/adam/api/available-months'](req, res);

		expect(res.json).toHaveBeenCalledWith({ months: [] });
	});
});
