# Build System Documentation

## Overview

This project uses Vite as the build system for both development and production modes. Vite provides fast hot module replacement (HMR) during development and optimized builds for production.

## Build Configuration

The build system is configured in `vite.config.js` with the following key features:

- **Development Mode**: Fast HMR with source maps enabled
- **Production Mode**: Minified output with optimized bundles
- **Electron Integration**: Separate builds for main and renderer processes
- **Vue 3 Support**: Full Vue 3 single-file component support
- **Path Aliases**: `@` alias points to `./src` directory

## Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server on port 5173 and launches Electron with hot module replacement enabled. The main process will load the renderer from the dev server.

### Production Build

```bash
npm run build
```

Builds the application for production:
- Renderer process → `dist/renderer/`
- Main process → `dist/main/`
- Minification enabled
- Source maps disabled

### Platform-Specific Builds

```bash
npm run build:win    # Build for Windows (NSIS installer + portable)
npm run build:mac    # Build for macOS (DMG + ZIP)
npm run build:linux  # Build for Linux (AppImage + DEB)
```

These commands first run the production build, then package the application using electron-builder.

### Preview

```bash
npm run preview
```

Starts a local server to preview the production build.

### Linting

```bash
npm run lint
```

Runs ESLint on all JavaScript and Vue files in the `src` directory.

## Build Output Structure

```
dist/
├── main/
│   └── index.js          # Main process bundle
└── renderer/
    ├── index.html        # Entry HTML file
    └── assets/
        ├── index-*.js    # Renderer JavaScript bundle
        └── index-*.css   # Renderer CSS bundle
```

## Environment Variables

The build system automatically sets `process.env.NODE_ENV`:
- `development` - When running `npm run dev`
- `production` - When running `npm run build`

## Development vs Production

### Development Mode
- Source maps enabled for debugging
- No minification for faster builds
- DevTools automatically opened
- Renderer loaded from Vite dev server (http://localhost:5173)

### Production Mode
- Minification enabled (esbuild)
- Source maps disabled
- Optimized bundle sizes
- Renderer loaded from built files

## Electron Builder Configuration

The `package.json` includes electron-builder configuration for packaging:

- **App ID**: `com.xoxo.crossover-simulator`
- **Output Directory**: `release/`
- **Supported Platforms**: Windows, macOS, Linux

## Dependencies

### Build Dependencies
- `vite` - Build tool and dev server
- `@vitejs/plugin-vue` - Vue 3 plugin for Vite
- `vite-plugin-electron` - Electron integration for Vite
- `vite-plugin-electron-renderer` - Renderer process support
- `cross-env` - Cross-platform environment variables
- `electron-builder` - Application packaging

### Runtime Dependencies
- `electron` - Electron framework
- `vue` - Vue 3 framework
- `vuex` - State management

## Troubleshooting

### Port 5173 Already in Use

If port 5173 is already in use, you can change it in `vite.config.js`:

```javascript
server: {
	port: 5174,  // Change to any available port
	strictPort: true,
}
```

### Build Fails

1. Clean the dist directory: `rm -rf dist`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Try building again: `npm run build`

### DevTools Not Opening

Check that `NODE_ENV` is set to `development` in `src/main/index.js`.

## Notes

- The main process uses CommonJS (`require`) for Electron compatibility
- The renderer process uses ES modules (`import/export`)
- Path aliases (`@/`) work in both main and renderer processes
- All builds respect the ESLint configuration in `.eslintrc.cjs`
