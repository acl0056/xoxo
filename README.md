# Crossover Network Simulator

[![Tests](https://github.com/acl0056/xoxo/actions/workflows/test.yml/badge.svg)](https://github.com/acl0056/xoxo/actions/workflows/test.yml)
[![CodeQL](https://github.com/acl0056/xoxo/actions/workflows/codeql.yml/badge.svg)](https://github.com/acl0056/xoxo/actions/workflows/codeql.yml)
[![Release](https://github.com/acl0056/xoxo/actions/workflows/release.yml/badge.svg)](https://github.com/acl0056/xoxo/actions/workflows/release.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/acl0056/xoxo/badge)](https://scorecard.dev/viewer/?uri=github.com/acl0056/xoxo)

A cross-platform desktop application for simulating, designing and analyzing loudspeaker crossover networks.

## Project Structure

```
src/
├── main/                    # Electron main process
│   └── index.js            # Application entry point
├── renderer/               # Electron renderer process (UI)
│   ├── index.html         # HTML entry point
│   ├── main.js            # Vue app initialization
│   ├── App.vue            # Root Vue component
│   ├── components/        # Vue components
│   ├── store/             # Vuex state management
│   │   ├── index.js       # Store configuration
│   │   ├── circuit.js     # Circuit state module
│   │   ├── simulation.js  # Simulation state module
│   │   └── ui.js          # UI state module
│   └── utils/             # Utility functions
├── models/                # Data models
├── simulation/            # Simulation engine
├── io/                    # File I/O
└── lib/                   # Third-party libraries
server/
├── schemas/               # JSON Schema definitions shared by app and MCP server
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
npm install
```

### Running the Application

Development mode with hot module replacement:

```bash
npm run dev
```

### Building for Production

Build the application:

```bash
npm run build
```

Build platform-specific installers:

```bash
npm run build:win    # Windows (NSIS + portable)
npm run build:mac    # macOS (DMG + ZIP)
npm run build:linux  # Linux (AppImage + DEB)
```

### Linting

```bash
npm run lint
```

For detailed build system documentation, see [BUILD.md](BUILD.md).

## Technology Stack

- **Electron**: Cross-platform desktop framework
- **Vue 3**: Progressive JavaScript framework for UI
- **Vuex 4**: State management for Vue 3
- **Vite**: Fast build tool and dev server
- **HTML5 Canvas**: High-performance circuit rendering
- **ESLint**: Code quality and style enforcement

## License

MIT
