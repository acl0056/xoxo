<template>
	<div
		class="block-menu"
		:class="{ disabled: !hasCircuit }"
	>
		<h3 class="block-menu-title">
			Circuit Blocks
		</h3>
		<div
			v-if="!hasCircuit"
			class="block-menu-disabled"
			title="A circuit must be open"
		>
			<span class="disabled-message">Open a circuit to use blocks</span>
		</div>
		<div
			v-else
			class="block-categories"
		>
			<div
				v-for="(blocks, category) in blocksByCategory"
				:key="category"
				class="block-category"
			>
				<h4 class="category-title">
					{{ category }}
				</h4>
				<ul class="block-list">
					<li
						v-for="block in blocks"
						:key="block.identifier"
						class="block-item"
						@click="selectBlock(block)"
					>
						{{ block.title }}
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>

<script>
import path from 'path';
import { loadBlockRegistry } from '@/blocks/BlockRegistry';

/**
 * Resolve the path to the circuit-blocks data directory.
 * In development (Vite dev server), process.cwd() is the project root.
 * In production (packaged Electron app), files are in dist/.
 */
function resolveBlocksDirectory() {
	const blocksRelativePath = 'src/data/circuit-blocks';
	return path.join(process.cwd(), blocksRelativePath);
}

export default {
	name: 'BlockMenu',
	emits: ['block-selected'],
	data() {
		return {
			blocksByCategory: {},
		};
	},
	computed: {
		hasCircuit() {
			return !!this.$store.state.circuit.circuit;
		},
	},
	created() {
		this.loadBlocks();
	},
	methods: {
		loadBlocks() {
			const blocksDirectory = resolveBlocksDirectory();
			const registry = loadBlockRegistry(blocksDirectory);
			this.blocksByCategory = registry.getBlocksByCategory();
		},
		selectBlock(block) {
			this.$emit('block-selected', block);
		},
	},
};
</script>

<style scoped>
.block-menu {
	width: 160px;
	flex-shrink: 0;
	height: 100%;
	background-color: #f0f0f0;
	border-right: 1px solid #ccc;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.block-menu.disabled {
	opacity: 0.6;
	pointer-events: none;
}

.block-menu-title {
	margin: 0;
	padding: 8px;
	background-color: #e0e0e0;
	border-bottom: 1px solid #ccc;
	font-size: 12px;
	font-weight: bold;
	color: #333;
	text-align: center;
}

.block-menu-disabled {
	padding: 12px 8px;
	text-align: center;
}

.disabled-message {
	font-size: 11px;
	color: #999;
	font-style: italic;
}

.block-categories {
	display: flex;
	flex-direction: column;
	padding: 4px;
	gap: 8px;
}

.block-category {
	display: flex;
	flex-direction: column;
}

.category-title {
	margin: 0;
	padding: 4px 8px;
	font-size: 11px;
	font-weight: bold;
	color: #555;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.block-list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.block-item {
	padding: 6px 12px;
	font-size: 12px;
	color: #333;
	cursor: pointer;
	border-radius: 3px;
	transition: background-color 0.15s;
}

.block-item:hover {
	background-color: #dceaff;
}

.block-item:active {
	background-color: #b8d4ff;
}
</style>
