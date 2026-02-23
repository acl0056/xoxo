<template>
	<div class="app-container">
		<ComponentPalette />
		<CircuitEditor />
	</div>
</template>

<script>
import ComponentPalette from './components/ComponentPalette.vue';
import CircuitEditor from './components/CircuitEditor.vue';

export default {
	name: 'App',
	components: {
		ComponentPalette,
		CircuitEditor,
	},
	mounted() {
		console.log('Crossover Network Simulator initialized');
	},
};
</script>

<style scoped>
.app-container {
	display: flex;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background-color: #f5f5f5;
}
</style>
