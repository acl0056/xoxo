export default {
	namespaced: true,
	state: {
		components: [],
		wires: [],
		nodes: [],
		annotations: [],
		metadata: {
			name: '',
			created: null,
			modified: null,
			version: '1.0',
		},
	},
	mutations: {
		// Component mutations
		addComponent(state, component) {
			state.components.push(component);
		},
		removeComponent(state, componentId) {
			state.components = state.components.filter((component) => component.id !== componentId);
		},
		updateComponent(state, { componentId, updates }) {
			const component = state.components.find((c) => c.id === componentId);
			if (component) {
				Object.assign(component, updates);
			}
		},
		// Wire mutations
		addWire(state, wire) {
			state.wires.push(wire);
		},
		removeWire(state, wireId) {
			state.wires = state.wires.filter((wire) => wire.id !== wireId);
		},
		// Annotation mutations
		addAnnotation(state, annotation) {
			state.annotations.push(annotation);
		},
		removeAnnotation(state, annotationId) {
			state.annotations = state.annotations.filter((annotation) => annotation.id !== annotationId);
		},
		updateAnnotation(state, { annotationId, updates }) {
			const annotation = state.annotations.find((a) => a.id === annotationId);
			if (annotation) {
				Object.assign(annotation, updates);
			}
		},
		// Metadata mutations
		updateMetadata(state, metadata) {
			state.metadata = { ...state.metadata, ...metadata };
		},
	},
	actions: {
		// File operations will be added in later tasks
	},
	getters: {
		getComponentById: (state) => (componentId) => state.components.find((c) => c.id === componentId),
		getWireById: (state) => (wireId) => state.wires.find((w) => w.id === wireId),
	},
};
