<template>
	<div
		v-if="visible"
		class="about-dialog-overlay"
		@click.self="close"
	>
		<div class="about-dialog">
			<h2>Crossover Network Simulator</h2>
			<div class="about-content">
				<p class="version">
					Version {{ version }}
				</p>
				<p class="description">
					A cross-platform loudspeaker crossover network modeling application
					for designing and analyzing passive crossover networks.
				</p>
				<div class="credits">
					<h3>Credits</h3>
					<p>Developed by {{ author }}</p>
					<p>Licensed under {{ license }}</p>
				</div>
				<div class="technologies">
					<h3>Built With</h3>
					<ul>
						<li>Electron - Cross-platform desktop framework</li>
						<li>Vue 3 - Progressive JavaScript framework</li>
						<li>Vuex - State management</li>
						<li>complex.js - Complex number arithmetic</li>
						<li>mathjs - Mathematics library</li>
					</ul>
				</div>
				<div class="links">
					<button @click="openRepository">
						View on GitHub
					</button>
					<button @click="openDocumentation">
						Documentation
					</button>
				</div>
			</div>
			<button
				class="close-button"
				@click="close"
			>
				Close
			</button>
		</div>
	</div>
</template>

<script>
export default {
	name: 'AboutDialog',
	props: {
		visible: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['close'],
	data() {
		return {
			version: '1.0.0',
			author: 'Adam Lockhart',
			license: 'MIT',
		};
	},
	mounted() {
		// Get version from package.json via IPC if needed
		this.loadVersionInfo();
	},
	methods: {
		/**
		 * Load version information
		 */
		async loadVersionInfo() {
			try {
				const { ipcRenderer } = require('electron');
				const appVersion = await ipcRenderer.invoke('get-app-version');
				if (appVersion) {
					this.version = appVersion;
				}
			} catch (error) {
				console.error('Error loading version info:', error);
			}
		},

		/**
		 * Close the about dialog
		 */
		close() {
			this.$emit('close');
		},

		/**
		 * Open repository in browser
		 */
		openRepository() {
			const { shell } = require('electron');
			shell.openExternal('https://github.com/yourusername/xoxo');
		},

		/**
		 * Open documentation in browser
		 */
		openDocumentation() {
			const { shell } = require('electron');
			shell.openExternal('https://github.com/yourusername/xoxo/blob/main/README.md');
		},
	},
};
</script>

<style scoped>
.about-dialog-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
}

.about-dialog {
	background-color: white;
	border-radius: 8px;
	padding: 24px;
	max-width: 500px;
	width: 90%;
	max-height: 80vh;
	overflow-y: auto;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.about-dialog h2 {
	margin: 0 0 16px 0;
	font-size: 24px;
	color: #333;
	text-align: center;
}

.about-content {
	margin-bottom: 20px;
}

.version {
	text-align: center;
	color: #666;
	font-size: 14px;
	margin-bottom: 16px;
}

.description {
	color: #555;
	line-height: 1.6;
	margin-bottom: 20px;
}

.credits,
.technologies {
	margin-bottom: 20px;
}

.credits h3,
.technologies h3 {
	font-size: 16px;
	color: #333;
	margin: 0 0 8px 0;
}

.credits p {
	color: #555;
	margin: 4px 0;
}

.technologies ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.technologies li {
	color: #555;
	padding: 4px 0;
	border-bottom: 1px solid #eee;
}

.technologies li:last-child {
	border-bottom: none;
}

.links {
	display: flex;
	gap: 12px;
	justify-content: center;
	margin-top: 20px;
}

.links button {
	padding: 8px 16px;
	background-color: #007bff;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.links button:hover {
	background-color: #0056b3;
}

.close-button {
	width: 100%;
	padding: 10px;
	background-color: #6c757d;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 16px;
	margin-top: 16px;
}

.close-button:hover {
	background-color: #5a6268;
}
</style>
