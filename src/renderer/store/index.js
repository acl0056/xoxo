import { createStore } from 'vuex';
import circuit from './circuit';
import simulation from './simulation';
import ui from './ui';

export default createStore({
	state: {
		circuit: {
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
	},
	modules: {
		circuit,
		simulation,
		ui,
	},
});
