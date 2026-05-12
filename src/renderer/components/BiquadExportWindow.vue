<template>
	<div
		v-if="visible"
		class="biquad-export-overlay"
		@click.self="close"
	>
		<div class="biquad-export-window">
			<div class="export-header">
				<h3>Export EQ BiQuad Parameters</h3>
				<button
					class="close-x-button"
					@click="close"
				>
					×
				</button>
			</div>
			<div class="export-actions">
				<button @click="saveToFile">
					Save to File
				</button>
				<button @click="selectAll">
					Select All
				</button>
				<button @click="copyToClipboard">
					Copy to Clipboard
				</button>
			</div>
			<textarea
				ref="exportTextarea"
				class="export-textarea"
				readonly
				:value="exportText"
			/>
		</div>
	</div>
</template>

<script>
import { useToast } from 'vue-toastification';
import BiquadCalculator from '@/simulation/BiquadCalculator';

export default {
	name: 'BiquadExportWindow',
	props: {
		visible: {
			type: Boolean,
			default: false,
		},
		parameters: {
			type: Object,
			default: null,
		},
	},
	emits: ['close'],
	setup() {
		const toast = useToast();
		return { toast };
	},
	computed: {
		exportText() {
			if (!this.parameters) return '';
			return BiquadCalculator.formatBiquadExport(this.parameters);
		},
	},
	methods: {
		close() {
			this.$emit('close');
		},
		async saveToFile() {
			try {
				const { ipcRenderer } = window.require('electron');
				const filePath = await ipcRenderer.invoke('show-save-dialog', 'biquad-export.txt');

				if (!filePath) {
					return; // User cancelled
				}

				const fs = window.require('fs');
				fs.writeFileSync(filePath, this.exportText, 'utf8');

				this.toast.success(`Biquad coefficients saved to ${filePath}`);
			} catch (error) {
				console.error('Error saving biquad export file:', error);
				this.toast.error('Failed to save biquad export file');
			}
		},
		selectAll() {
			const textarea = this.$refs.exportTextarea;
			if (textarea) {
				textarea.select();
			}
		},
		async copyToClipboard() {
			try {
				await navigator.clipboard.writeText(this.exportText);
				this.toast.success('Copied to clipboard');
			} catch (error) {
				// Fallback to electron clipboard if navigator.clipboard is unavailable
				try {
					const { clipboard } = window.require('electron');
					clipboard.writeText(this.exportText);
					this.toast.success('Copied to clipboard');
				} catch (fallbackError) {
					console.error('Error copying to clipboard:', fallbackError);
					this.toast.error('Failed to copy to clipboard');
				}
			}
		},
	},
};
</script>

<style scoped>
.biquad-export-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1100;
}

.biquad-export-window {
	background-color: white;
	border-radius: 8px;
	padding: 20px;
	min-width: 500px;
	max-width: 600px;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.export-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.export-header h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
}

.close-x-button {
	background: none;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	color: #666666;
	padding: 0 4px;
}

.close-x-button:hover {
	color: #000000;
	background-color: #f0f0f0;
}

.export-actions {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.export-actions button {
	padding: 6px 14px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 13px;
}

.export-actions button:hover {
	background-color: #e0e0e0;
}

.export-textarea {
	width: 100%;
	min-height: 300px;
	max-height: 50vh;
	font-family: 'Courier New', Courier, monospace;
	font-size: 13px;
	line-height: 1.4;
	padding: 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	resize: vertical;
	background-color: #fafafa;
	box-sizing: border-box;
}
</style>
