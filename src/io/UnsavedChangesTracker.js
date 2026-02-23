/**
 * UnsavedChangesTracker class manages the dirty flag for circuit modifications
 * Tracks whether the circuit has unsaved changes
 */
export class UnsavedChangesTracker {
	constructor() {
		this.isDirty = false;
		this.lastSavedState = null;
		this.currentFilePath = null;
	}

	/**
	 * Mark the circuit as having unsaved changes
	 */
	markDirty() {
		this.isDirty = true;
	}

	/**
	 * Mark the circuit as saved (no unsaved changes)
	 * @param {string} filePath - The file path where the circuit was saved
	 */
	markClean(filePath = null) {
		this.isDirty = false;
		if (filePath) {
			this.currentFilePath = filePath;
		}
	}

	/**
	 * Check if the circuit has unsaved changes
	 * @returns {boolean} True if there are unsaved changes
	 */
	hasUnsavedChanges() {
		return this.isDirty;
	}

	/**
	 * Get the current file path
	 * @returns {string|null} The current file path or null if not saved yet
	 */
	getCurrentFilePath() {
		return this.currentFilePath;
	}

	/**
	 * Set the current file path
	 * @param {string} filePath - The file path to set
	 */
	setCurrentFilePath(filePath) {
		this.currentFilePath = filePath;
	}

	/**
	 * Reset the tracker (for new circuit)
	 */
	reset() {
		this.isDirty = false;
		this.lastSavedState = null;
		this.currentFilePath = null;
	}

	/**
	 * Save the current state as a snapshot
	 * @param {Circuit} circuit - The circuit to snapshot
	 */
	saveSnapshot(circuit) {
		if (circuit && circuit.toJSON) {
			this.lastSavedState = JSON.stringify(circuit.toJSON());
		}
	}

	/**
	 * Check if the circuit has changed since the last snapshot
	 * @param {Circuit} circuit - The circuit to check
	 * @returns {boolean} True if the circuit has changed
	 */
	hasChangedSinceSnapshot(circuit) {
		if (!this.lastSavedState || !circuit) {
			return true;
		}

		try {
			const currentState = JSON.stringify(circuit.toJSON());
			return currentState !== this.lastSavedState;
		} catch (error) {
			return true;
		}
	}
}
