import { createStore } from 'vuex';
import circuit from './circuit';
import simulation from './simulation';
import ui from './ui';

export default createStore({
	modules: {
		circuit,
		simulation,
		ui,
	},
});
