<template>
	<div
		v-if="visible"
		class="annotation-dialog-overlay"
		@click.self="close"
	>
		<div class="annotation-dialog">
			<h3>Edit Annotation</h3>

			<div class="form-group">
				<label for="annotation-text">Text:</label>
				<textarea
					id="annotation-text"
					v-model="localText"
					rows="4"
					@keydown.enter.ctrl="save"
				/>
			</div>

			<div class="form-group">
				<label for="annotation-font-size">Font Size:</label>
				<input
					id="annotation-font-size"
					v-model.number="localFontSize"
					type="number"
					min="8"
					max="72"
					step="1"
				>
				<span>px</span>
			</div>

			<div class="button-group">
				<button
					class="primary-button"
					@click="save"
				>
					Save
				</button>
				<button
					class="secondary-button"
					@click="close"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'AnnotationDialog',
	props: {
		visible: {
			type: Boolean,
			required: true,
		},
		annotation: {
			type: Object,
			default: null,
		},
	},
	emits: ['close', 'update'],
	data() {
		return {
			localText: '',
			localFontSize: 12,
		};
	},
	watch: {
		annotation: {
			immediate: true,
			handler(newAnnotation) {
				if (newAnnotation) {
					this.localText = newAnnotation.text || '';
					this.localFontSize = newAnnotation.fontSize || 12;
				}
			},
		},
	},
	methods: {
		save() {
			if (!this.annotation) return;

			// Validate inputs
			if (!this.localText.trim()) {
				this.$toast.error('Annotation text cannot be empty');
				return;
			}

			if (this.localFontSize < 8 || this.localFontSize > 72) {
				this.$toast.error('Font size must be between 8 and 72');
				return;
			}

			// Emit update event with changes
			this.$emit('update', {
				annotationId: this.annotation.id,
				text: this.localText,
				fontSize: this.localFontSize,
			});

			this.close();
		},
		close() {
			this.$emit('close');
		},
	},
};
</script>

<style scoped>
.annotation-dialog-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.annotation-dialog {
	background-color: white;
	border-radius: 8px;
	padding: 24px;
	min-width: 400px;
	max-width: 600px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.annotation-dialog h3 {
	margin: 0 0 20px 0;
	font-size: 18px;
	font-weight: 600;
	color: #333;
}

.form-group {
	margin-bottom: 16px;
}

.form-group label {
	display: block;
	margin-bottom: 6px;
	font-weight: 500;
	color: #555;
}

.form-group textarea {
	width: 100%;
	padding: 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-family: Arial, sans-serif;
	font-size: 14px;
	resize: vertical;
}

.form-group textarea:focus {
	outline: none;
	border-color: #0066cc;
}

.form-group input[type="number"] {
	width: 80px;
	padding: 6px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
}

.form-group input[type="number"]:focus {
	outline: none;
	border-color: #0066cc;
}

.form-group span {
	margin-left: 8px;
	color: #666;
}

.button-group {
	display: flex;
	gap: 12px;
	justify-content: flex-end;
	margin-top: 24px;
}

.primary-button,
.secondary-button {
	padding: 8px 20px;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: background-color 0.2s;
}

.primary-button {
	background-color: #0066cc;
	color: white;
}

.primary-button:hover {
	background-color: #0052a3;
}

.secondary-button {
	background-color: #e0e0e0;
	color: #333;
}

.secondary-button:hover {
	background-color: #d0d0d0;
}
</style>
