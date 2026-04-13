import { createApp } from 'vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import store from './store';
import App from './App.vue';
import FrequencyResponseGraph from './components/FrequencyResponseGraph.vue';
import ImpedanceGraph from './components/ImpedanceGraph.vue';

// Determine which component to render based on URL query param
const params = new URLSearchParams(window.location.search);
const windowType = params.get('window');

let rootComponent;
if (windowType === 'frequency-response') {
	rootComponent = FrequencyResponseGraph;
} else if (windowType === 'impedance') {
	rootComponent = ImpedanceGraph;
} else {
	rootComponent = App;
}

const app = createApp(rootComponent);
app.use(store);
app.use(Toast, {
	position: 'top-right',
	timeout: 3000,
	closeOnClick: true,
	pauseOnFocusLoss: true,
	pauseOnHover: true,
	draggable: true,
	draggablePercent: 0.6,
	showCloseButtonOnHover: false,
	hideProgressBar: false,
	closeButton: 'button',
	icon: true,
	rtl: false,
});
app.mount('#app');
