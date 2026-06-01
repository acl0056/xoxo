<template>
	<div
		v-if="visible"
		class="about-dialog-overlay"
		@click.self="close"
	>
		<div class="about-dialog">
			<canvas
				ref="backgroundCanvas"
				class="about-background"
			/>
			<div class="dialog-header">
				<h2>xoxo</h2>
				<button
					class="close-x-button"
					@click="close"
				>
					×
				</button>
			</div>
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
				<div class="acknowledgements">
					<h3>Acknowledgements</h3>
					<p class="acknowledgement-primary">
						Bill Waslo — for XSim, the free-form loudspeaker crossover and circuit simulator
						that inspired this project
					</p>
					<p class="acknowledgement-primary">
						Javad Shadzi — who taught me how to use Xsim
					</p>
					<p class="acknowledgement-primary">
						The DIY loudspeaker community — for sharing knowledge and making DIY accessible
					</p>
					<h4>XSim Acknowledgements</h4>
					<ul>
						<li>Jeff Bagby — for his PCD Xcel-based simulator and inspiration</li>
						<li>Stewart Hyde — for RFSim99 (basic schematic entry concept)</li>
						<li>Mark Horridge — for SparSolv (structure of the linear matrix solver)</li>
						<li>Suavi Ali Demir — for TbcParser (math interpreter used in CircuitBlocks)</li>
					</ul>
				</div>
				<div class="technologies">
					<h3>Built With</h3>
					<ul>
						<li>Electron - Cross-platform desktop framework</li>
						<li>Vue 3 - Progressive JavaScript framework</li>
						<li>Vuex - State management</li>
						<li>complex.js - Complex number arithmetic</li>
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
			animationFrameId: null,
			backgroundCleanup: null,
		};
	},
	watch: {
		visible(isVisible) {
			if (isVisible) {
				this.$nextTick(this.startBackground);
			} else {
				this.stopBackground();
			}
		},
	},
	mounted() {
		// Get version from package.json via IPC if needed
		this.loadVersionInfo();
		if (this.visible) {
			this.$nextTick(this.startBackground);
		}
	},
	beforeUnmount() {
		this.stopBackground();
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
			shell.openExternal('https://github.com/acl0056/xoxo');
		},

		/**
		 * Open documentation in browser
		 */
		openDocumentation() {
			const { shell } = require('electron');
			shell.openExternal('https://github.com/acl0056/xoxo/blob/main/README.md');
		},

		startBackground() {
			this.stopBackground();

			const canvas = this.$refs.backgroundCanvas;
			if (!canvas) {
				return;
			}

			const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
			if (!gl) {
				return;
			}

			const vertexShader = `
				attribute vec2 position;
				varying vec2 vUv;
				void main() {
					vUv = position * 0.5 + 0.5;
					gl_Position = vec4(position, 0.0, 1.0);
				}
			`;

			const fragmentShader = `
				precision highp float;

				uniform vec2 uResolution;
				uniform vec2 uMouse;
				uniform float uTime;
				varying vec2 vUv;

				mat2 rot(float a) {
					float s = sin(a), c = cos(a);
					return mat2(c, -s, s, c);
				}

				float hash(vec2 p) {
					return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
				}

				float noise(vec2 p) {
					vec2 i = floor(p);
					vec2 f = fract(p);
					vec2 u = f*f*(3.0-2.0*f);
					return mix(
						mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
						mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
						u.y
					);
				}

				float fbm(vec2 p) {
					float v = 0.0;
					float a = 0.5;
					for (int i = 0; i < 6; i++) {
						v += a * noise(p);
						p = rot(0.58) * p * 2.02 + 13.7;
						a *= 0.5;
					}
					return v;
				}

				float glyphXOXO(vec2 p) {
						vec2 cell = floor(p);
						vec2 f = fract(p) - 0.5;
						float selector = mod(cell.x + cell.y, 2.0);
						float lineW = 0.055;

					float x1 = smoothstep(lineW, 0.0, abs(f.x - f.y));
					float x2 = smoothstep(lineW, 0.0, abs(f.x + f.y));
					float xGlyph = max(x1, x2) * smoothstep(0.52, 0.38, length(f));

					float r = length(f);
					float oGlyph = smoothstep(0.055, 0.0, abs(r - 0.31));

						return selector < 1.0 ? xGlyph : oGlyph;
					}

				void main() {
					vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
					vec2 mouse = (uMouse - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);

					float t = uTime * 0.13;
					float distMouse = distance(p, mouse);
					float mouseGlow = exp(-distMouse * 5.8);

					vec2 q = p;
					q += vec2(fbm(p * 2.1 + t), fbm(p * 2.0 - t + 4.7)) * 0.42;
					q += mouseGlow * 0.16 * normalize(p - mouse + 0.001);

					float cloud = fbm(q * 2.2 + vec2(t * 0.7, -t * 0.35));
					float mist = fbm(q * 4.7 - vec2(t * 0.2, t * 0.55));
					float veins = sin((q.x * 4.4 + q.y * 3.1 + cloud * 3.8 + uTime * 0.12) * 3.14159);
					veins = smoothstep(0.02, 0.92, veins * 0.5 + 0.5);

					vec3 indigo = vec3(0.055, 0.075, 0.32);
					vec3 blueGreen = vec3(0.00, 0.63, 0.58);
					vec3 cloudWhite = vec3(0.88, 0.94, 0.94);
					vec3 deep = vec3(0.015, 0.025, 0.08);

					vec3 col = mix(deep, indigo, 0.78 + 0.22 * cloud);
					col = mix(col, blueGreen, smoothstep(0.34, 0.88, cloud) * 0.72);
					col = mix(col, cloudWhite, smoothstep(0.55, 0.95, mist) * smoothstep(0.18, 0.9, cloud) * 0.58);
					col += blueGreen * veins * 0.13;
					col += cloudWhite * mouseGlow * 0.18;

					float vignette = smoothstep(0.95, 0.15, length(p));
					col *= 0.7 + vignette * 0.55;

					vec2 gp = p * 18.0;
					gp += vec2(sin(uTime * 0.42 + p.y * 4.0), cos(uTime * 0.35 + p.x * 3.0)) * 0.13;
					float glyph = glyphXOXO(gp);
					float reveal = smoothstep(0.46, 0.0, distMouse);
					float ripple = 0.72 + 0.28 * sin(36.0 * distMouse - uTime * 4.0);
					float ink = glyph * reveal * ripple;
					col = mix(col, vec3(0.0), ink * 0.92);

					float grain = hash(gl_FragCoord.xy + fract(uTime) * 101.0) - 0.5;
					col += grain * 0.018;

					gl_FragColor = vec4(col, 1.0);
				}
			`;

			const compileShader = (type, source) => {
				const shader = gl.createShader(type);
				gl.shaderSource(shader, source);
				gl.compileShader(shader);
				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
					throw new Error(gl.getShaderInfoLog(shader));
				}
				return shader;
			};

			const vs = compileShader(gl.VERTEX_SHADER, vertexShader);
			const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShader);
			const program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			gl.useProgram(program);

			const buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				-1, -1, 1, -1, -1, 1,
				-1, 1, 1, -1, 1, 1,
			]), gl.STATIC_DRAW);

			const position = gl.getAttribLocation(program, 'position');
			gl.enableVertexAttribArray(position);
			gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

			const uResolution = gl.getUniformLocation(program, 'uResolution');
			const uMouse = gl.getUniformLocation(program, 'uMouse');
			const uTime = gl.getUniformLocation(program, 'uTime');
			const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
			const mouse = { x: 0, y: 0 };
			const target = { x: 0, y: 0 };

			const setTargetFromEvent = (event) => {
				const rect = canvas.getBoundingClientRect();
				target.x = (event.clientX - rect.left) * dpr();
				target.y = (rect.bottom - event.clientY) * dpr();
			};

			const resize = () => {
				const rect = canvas.getBoundingClientRect();
				canvas.width = Math.max(1, Math.floor(rect.width * dpr()));
				canvas.height = Math.max(1, Math.floor(rect.height * dpr()));
				mouse.x = mouse.x || canvas.width / 2;
				mouse.y = mouse.y || canvas.height / 2;
				target.x = target.x || mouse.x;
				target.y = target.y || mouse.y;
				gl.viewport(0, 0, canvas.width, canvas.height);
			};

			window.addEventListener('mousemove', setTargetFromEvent, { passive: true });
			window.addEventListener('resize', resize);
			resize();

			const start = performance.now();
			const frame = (now) => {
				mouse.x += (target.x - mouse.x) * 0.12;
				mouse.y += (target.y - mouse.y) * 0.12;
				gl.uniform2f(uResolution, canvas.width, canvas.height);
				gl.uniform2f(uMouse, mouse.x, mouse.y);
				gl.uniform1f(uTime, (now - start) / 1000);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
				this.animationFrameId = requestAnimationFrame(frame);
			};
			this.animationFrameId = requestAnimationFrame(frame);

			this.backgroundCleanup = () => {
				window.removeEventListener('mousemove', setTargetFromEvent);
				window.removeEventListener('resize', resize);
				gl.deleteBuffer(buffer);
				gl.deleteProgram(program);
				gl.deleteShader(vs);
				gl.deleteShader(fs);
			};
		},

		stopBackground() {
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			if (this.backgroundCleanup) {
				this.backgroundCleanup();
				this.backgroundCleanup = null;
			}
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
	position: relative;
	background-color: #07101f;
	border-radius: 8px;
	padding: 24px;
	max-width: 500px;
	width: 90%;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.about-dialog::before {
	content: '';
	position: absolute;
	inset: 0;
	background: rgba(255, 255, 255, 0.6);
	z-index: 1;
}

.about-background {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: block;
	pointer-events: none;
	z-index: 0;
}

.dialog-header,
.about-content {
	position: relative;
	z-index: 2;
}

.about-dialog h2 {
	margin: 0;
	font-size: 24px;
	color: #333;
}

.dialog-header {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 16px;
}

.close-x-button {
	position: absolute;
	right: 0;
	background: none;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	color: #666666;
	padding: 0 4px;
}

.close-x-button:hover {
	color: #000000;
	background-color: #f0f0f0;
}

.about-content {
	margin-bottom: 20px;
	min-height: 0;
	overflow-y: auto;
	padding-right: 4px;
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
.technologies,
.acknowledgements {
	margin-bottom: 20px;
}

.credits h3,
.technologies h3,
.acknowledgements h3 {
	font-size: 16px;
	color: #333;
	margin: 0 0 8px 0;
}

.acknowledgements h4 {
	font-size: 13px;
	color: #555;
	margin: 12px 0 6px 0;
}

.acknowledgement-primary {
	color: #333;
	font-weight: 500;
	margin: 4px 0 8px 0;
}

.acknowledgements ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.acknowledgements li {
	color: #555;
	padding: 3px 0;
	font-size: 13px;
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
</style>
