<template>
	<div class="app-container">
		<h1>Crossover Network Simulator</h1>
		<p>Application initialized successfully</p>
	</div>
</template>

<script>
export default {
	name: 'App',
	mounted() {
		console.log('Crossover Network Simulator initialized');
	},
};
</script>

<style scoped>
.app-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background-color: #f5f5f5;
}

h1 {
	color: #333;
	margin-bottom: 1rem;
}

p {
	color: #666;
}
</style>
