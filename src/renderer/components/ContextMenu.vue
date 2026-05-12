<template>
	<div
		v-if="visible"
		class="context-menu"
		:style="{ left: `${x - 15}px`, top: `${y - 15}px` }"
		@click.stop
	>
		<div
			v-for="item in menuItems"
			:key="item.label"
			class="menu-item"
			:class="{ disabled: item.disabled }"
			@click="handleItemClick(item)"
		>
			{{ item.label }}
		</div>
	</div>
</template>

<script>
export default {
	name: 'ContextMenu',
	props: {
		visible: {
			type: Boolean,
			default: false,
		},
		x: {
			type: Number,
			default: 0,
		},
		y: {
			type: Number,
			default: 0,
		},
		menuItems: {
			type: Array,
			default: () => [],
		},
	},
	emits: ['item-click', 'close'],
	methods: {
		handleItemClick(item) {
			if (!item.disabled) {
				this.$emit('item-click', item.action);
				this.$emit('close');
			}
		},
	},
};
</script>

<style scoped>
.context-menu {
	position: fixed;
	background-color: white;
	border: 1px solid #ccc;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	min-width: 150px;
	padding: 4px 0;
}

.menu-item {
	padding: 8px 16px;
	cursor: pointer;
	user-select: none;
}

.menu-item:hover:not(.disabled) {
	background-color: #e6f2ff;
}

.menu-item.disabled {
	color: #999;
	cursor: not-allowed;
}
</style>
