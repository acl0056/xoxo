/**
 * Generate a unique identifier for components, wires, and annotations
 * Uses a combination of timestamp and random string for uniqueness
 * @returns {string} A unique identifier
 */
export function generateUniqueId() {
	const timestamp = Date.now().toString(36);
	const randomPart = Math.random().toString(36).substring(2, 9);
	return `${timestamp}-${randomPart}`;
}
