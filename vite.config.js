import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isDevelopment = mode === 'development';
	const isProduction = mode === 'production';

	return {
		plugins: [
			vue(),
			electron([
				{
					// Main process entry point - use absolute path
					entry: path.join(__dirname, 'src/main/index.js'),
					vite: {
						build: {
							outDir: path.join(__dirname, 'dist/main'),
							sourcemap: isDevelopment,
							minify: isProduction,
							rollupOptions: {
								external: ['electron'],
							},
						},
					},
				},
			]),
			renderer(),
		],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		root: './src/renderer',
		publicDir: path.resolve(__dirname, './src/renderer/public'),
		base: './',
		build: {
			outDir: '../../dist/renderer',
			emptyOutDir: true,
			sourcemap: isDevelopment,
			minify: isProduction ? 'esbuild' : false,
		},
		server: {
			port: 5173,
			strictPort: true,
		},
		optimizeDeps: {
			exclude: ['electron'],
		},
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode),
		},
	};
});
