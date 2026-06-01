# Implementation Plan: ChatGPT MCP Server

## Overview

This plan implements a remote MCP server bridging the xoxo Electron app with ChatGPT. The server is a Node.js process (plain JavaScript, Express HTTP, socket.io WebSocket) deployed on EC2 with pm2. It exposes MCP tools for reading/writing circuit data, authenticates via OAuth 2.1, and syncs state with the Electron app over WebSocket. The Electron app gains a ChatGPT menu for connecting, disconnecting, and opening conversations.

Implementation proceeds bottom-up: shared infrastructure first (config, validation, session), then MCP tools, then WebSocket handler, then Electron app integration, and finally wiring everything together.

## Tasks

- [x] 1. Set up server project structure and dependencies
  - [x] 1.1 Create server directory with package.json and install dependencies
    - Create `server/package.json` with dependencies: `@modelcontextprotocol/sdk`, `express`, `socket.io`, `ajv`, `ajv-formats`, `jsonwebtoken`, `jwks-rsa`
    - Create `server/pm2-config.json` for pm2 process management
    - Create `server/index.js` entry point (placeholder)
    - _Requirements: 1.6, 10.6_

  - [x] 1.2 Create server/config.js with all configuration values
    - Sensitive values (OAuth secrets, JWKS URI) read from `process.env`
    - Non-sensitive values hardcoded: port, host, timeouts, `chatgptConversationUrl`, schema paths, domain knowledge path
    - Follow the config structure from the design document
    - _Requirements: 1.6, 11.8_

  - [x] 1.3 Create server/validation/validator.js — AJV schema validation wrapper
    - Import and compile circuit.schema.json, simulation-results.schema.json, frd-data.schema.json from `server/schemas/`
    - Export validation functions: `validateCircuitLayout`, `validateSimulationResults`, `validateFrdData`, `validateComponent`, `validateWire`
    - Use `allErrors: true` for descriptive error messages
    - _Requirements: 1.3, 4.2, 13.1, 14.6_

  - [ ]* 1.4 Write property tests for schema validation (Properties 4, 11, 12)
    - **Property 4: Circuit Layout Round-Trip** — any valid circuit layout stored and retrieved is deeply equal and schema-valid
    - **Property 11: Set Circuit Layout Validation** — valid layouts pass, invalid layouts produce descriptive errors
    - **Property 12: Granular Tool Input Validation** — valid component/wire inputs pass, invalid inputs produce errors
    - **Validates: Requirements 4.1, 4.2, 4.3, 13.1, 13.2, 14.1, 14.3, 14.4, 14.5, 14.6, 14.7**

- [x] 2. Implement session management
  - [x] 2.1 Create server/session/store.js — in-memory session store
    - Map keyed by userId storing: circuitLayout, simulationResults, wsConnection, editGroup state, mcpSessionId, connectedAt
    - Methods: `create`, `get`, `update`, `delete`, `getAll` (for concurrency count)
    - _Requirements: 1.7, 10.3, 10.4_

  - [x] 2.2 Create server/session/manager.js — session manager interface
    - `getSession(userId)`, `updateCircuitLayout(userId, layout)`, `updateSimulationResults(userId, results)`
    - `getElectronConnection(userId)`, `beginEditGroup(userId, description)`, `endEditGroup(userId)`
    - `isEditGroupActive(userId)`, `checkEditGroupTimeout(userId)`
    - Validate data against schemas before storing
    - _Requirements: 1.7, 2.4, 10.3, 10.4, 15.1, 15.2, 15.6_

  - [ ]* 2.3 Write property test for per-session data isolation (Property 3)
    - **Property 3: Per-Session Data Isolation**
    - For any two distinct user IDs, data stored in one session is not accessible from the other
    - **Validates: Requirements 2.4, 10.4**

  - [ ]* 2.4 Write property test for edit group timeout (Property 18)
    - **Property 18: Edit Group Timeout Auto-Close**
    - For any begin_edit_group not followed by end_edit_group within 60 seconds, the group auto-closes
    - **Validates: Requirements 15.6**

- [x] 3. Implement authentication
  - [x] 3.1 Create server/auth/middleware.js — token validation middleware
    - Verify JWT signature against JWKS endpoint
    - Check token expiry (max 60 minutes)
    - Validate issuer and audience claims
    - Return categorized errors: malformed, expired, unrecognized
    - _Requirements: 2.2, 2.5, 2.6_

  - [x] 3.2 Create server/auth/oauth.js — OAuth 2.1 flow helpers
    - Token exchange (authorization code → access token)
    - Token refresh support (within 30-day refresh token lifetime)
    - PKCE support
    - _Requirements: 2.1, 2.3_

  - [ ]* 3.3 Write property test for token validation and error categorization (Property 2)
    - **Property 2: Token Validation and Error Categorization**
    - Valid tokens are accepted; invalid tokens produce correctly categorized 401 responses (malformed, expired, unrecognized)
    - **Validates: Requirements 2.2, 2.5**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement MCP read tools
  - [x] 5.1 Create server/mcp/tools/getCircuitLayout.js
    - Extract userId from authenticated MCP session
    - Retrieve circuit layout from session manager
    - Return full layout or error if no data available
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Create server/mcp/tools/getFrequencyResponse.js
    - Handle no-parameter (on-axis), `angle` parameter (off-axis), and `listAngles: true` (list available angles)
    - Compute available angles as intersection of all speakers' FRD angles
    - Return error listing available angles if requested angle unavailable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 5.3 Create server/mcp/tools/getImpedanceResponse.js
    - Return impedance response (frequencies, impedances, phases as equal-length arrays)
    - Return error if no simulation results available
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 5.4 Write property test for frequency response array length invariant (Property 5)
    - **Property 5: Frequency Response Retrieval with Array Length Invariant**
    - All arrays (frequencies, spl, phase, each speaker's spl/phase) have the same length
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 5.5 Write property test for available angles intersection (Property 6)
    - **Property 6: Available Angles Intersection**
    - listAngles returns exactly the intersection of angles common to all speakers with FRD data
    - **Validates: Requirements 5.5**

  - [ ]* 5.6 Write property test for unavailable angle error (Property 7)
    - **Property 7: Unavailable Angle Error Lists Available Angles**
    - Requesting an unavailable angle returns an error that includes the list of available angles
    - **Validates: Requirements 5.6**

  - [ ]* 5.7 Write property test for impedance response array length invariant (Property 8)
    - **Property 8: Impedance Response Array Length Invariant**
    - frequencies, impedances, and phases arrays all have the same length
    - **Validates: Requirements 6.1, 6.2**

  - [x] 5.8 Create server/mcp/tools/getUserLoadedFrds.js
    - Return all user-loaded FRD measurement data currently in the graph
    - Each entry includes label, frequency/magnitude/phase arrays conforming to frd-data.schema.json, and metadata (angle, description)
    - Return empty list (not error) if no FRD files loaded
    - Electron app pushes user-loaded FRD data via `state:userFrds` message when files are loaded or removed
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 6. Implement MCP write tools
  - [x] 6.1 Create server/mcp/tools/optimizeComponent.js
    - Validate component ID exists in current layout
    - Validate new parameters against schema constraints for the component type
    - Forward to Electron app via WebSocket, wait for response (30s timeout)
    - Return full updated component object on success
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8_

  - [x] 6.2 Create server/mcp/tools/setCircuitLayout.js
    - Validate full layout against circuit.schema.json
    - Forward to Electron app, wait for response (30s timeout)
    - Return applied layout on success
    - _Requirements: 13.1, 13.2, 13.5, 13.6_

  - [x] 6.3 Create server/mcp/tools/addComponent.js
    - Validate component object against circuit.schema.json component definition
    - Forward to Electron app, return added component on success
    - _Requirements: 14.1, 14.6, 14.7, 14.9_

  - [x] 6.4 Create server/mcp/tools/removeComponent.js
    - Validate component ID exists in current layout
    - Forward to Electron app, return removed component ID and affected wire IDs
    - _Requirements: 14.2, 14.6, 14.7, 14.9_

  - [x] 6.5 Create server/mcp/tools/addWire.js
    - Validate wire object against circuit.schema.json wire definition
    - Forward to Electron app, return added wire on success
    - _Requirements: 14.3, 14.6, 14.7, 14.9_

  - [x] 6.6 Create server/mcp/tools/removeWire.js
    - Validate wire ID exists in current layout
    - Forward to Electron app, return removed wire ID on success
    - _Requirements: 14.4, 14.6, 14.7, 14.9_

  - [x] 6.7 Create server/mcp/tools/moveComponent.js
    - Validate component ID exists and coordinates are integers
    - Forward to Electron app, return updated component on success
    - _Requirements: 14.5, 14.6, 14.7, 14.9_

  - [x] 6.8 Create server/mcp/tools/beginEditGroup.js and endEditGroup.js
    - beginEditGroup: accept optional description, signal Electron app, mark session in-edit-group with timestamp
    - endEditGroup: signal Electron app, mark session not-in-edit-group
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 6.9 Write property test for optimize component input validation (Property 9)
    - **Property 9: Optimize Component Input Validation**
    - Invalid component IDs or constraint-violating parameters are rejected with descriptive errors, never forwarded
    - **Validates: Requirements 8.2, 8.3, 8.6, 8.7**

  - [ ]* 6.10 Write property test for optimize component success response (Property 10)
    - **Property 10: Optimize Component Success Response Completeness**
    - Successful updates return full component object with all required fields: id, type, label, x, y, rotation, parameters
    - **Validates: Requirements 8.5**

  - [ ]* 6.11 Write property test for remove component wire disconnection (Property 13)
    - **Property 13: Remove Component Wire Disconnection**
    - Removing a component returns exactly the wire IDs whose startNode or endNode references the removed component
    - **Validates: Requirements 14.2**

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement MCP resources and server setup
  - [x] 8.1 Create server/mcp/resources/schemas.js — schema resource definitions
    - Expose circuit.schema.json, simulation-results.schema.json, frd-data.schema.json as MCP resources
    - URIs: `resource://schema/circuit.schema.json`, `resource://schema/simulation-results.schema.json`, `resource://schema/frd-data.schema.json`
    - MIME type: application/json
    - Descriptions: ≥20 characters, referencing crossover design domain concepts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 8.2 Create server/domain-knowledge.md — versioned domain knowledge resource
    - Semver version at top of document
    - Guidance: delays in multi-way systems, standard component value series (E12/E24/E48), empty document state, edit group wrapping instruction
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_

  - [x] 8.3 Create server/mcp/resources/domainKnowledge.js — domain knowledge resource handler
    - Serve domain-knowledge.md as MCP resource at `resource://crossover-domain-knowledge`
    - MIME type: text/markdown
    - Description referencing loudspeaker crossover design guidance
    - _Requirements: 12.1, 12.3, 12.4_

  - [x] 8.4 Create server/mcp/server.js — MCP server setup
    - Use `@modelcontextprotocol/sdk` to create MCP server instance
    - Register all 12 tools with input schemas
    - Register all 4 resources
    - Configure Streamable HTTP transport on `/mcp` endpoint
    - Handle MCP session management (Mcp-Session-Id header)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 10.1, 10.2_

  - [ ]* 8.5 Write property test for schema resource content fidelity (Property 15)
    - **Property 15: Schema Resource Content Fidelity**
    - Each schema resource returns content identical to the corresponding file in `server/schemas/`, with MIME type application/json
    - **Validates: Requirements 9.4**

  - [ ]* 8.6 Write property test for MCP request validation (Property 1)
    - **Property 1: MCP Request Validation**
    - Valid JSON-RPC 2.0 MCP messages are processed; malformed/non-conforming messages return appropriate error codes
    - **Validates: Requirements 1.3, 1.4**

- [x] 9. Implement WebSocket handler
  - [x] 9.1 Create server/ws/messages.js — message type definitions
    - Define all message types: `state:circuit`, `state:simulation`, `request:*`, `response:*`, `error:validation`
    - Define message envelope structure: `{ type, payload, requestId }`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.2 Create server/ws/handler.js — WebSocket connection handler using socket.io
    - Authenticate on connection (validate token)
    - Handle incoming state pushes (circuit layout, simulation results) with schema validation
    - Forward tool requests to connected Electron app with 30s timeout and requestId correlation
    - Implement heartbeat for connection health
    - Handle disconnection cleanup
    - Send `error:validation` on invalid state pushes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 8.1, 8.8, 13.6, 14.9_

- [x] 10. Wire server entry point together
  - [x] 10.1 Complete server/index.js — HTTP + WebSocket server startup
    - Create Express HTTP server
    - Mount MCP Streamable HTTP handler at `/mcp`
    - Attach socket.io WebSocket server at `/ws`
    - Apply auth middleware to MCP endpoint
    - Load configuration from config.js
    - _Requirements: 1.1, 1.2, 1.6_

  - [ ]* 10.2 Write unit tests for server startup and routing
    - Verify `/mcp` endpoint accepts POST and GET
    - Verify `/ws` accepts WebSocket upgrades
    - Verify auth middleware is applied
    - _Requirements: 1.1, 1.2_

- [x] 11. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Electron app ChatGPT menu and connection
  - [x] 12.1 Add ChatGPT menu to src/main/menu.js
    - Position after "Circuit Blocks" menu (before "View")
    - "Connect..." item (initiates OAuth flow)
    - "Open Conversation..." item (disabled by default)
    - Menu state machine: disconnected ↔ connected
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6, 11.7_

  - [x] 12.2 Create src/main/chatgpt-client.js — WebSocket client module
    - Connect after OAuth authentication using socket.io-client
    - Push full state on connect and reconnect
    - Push incremental updates on circuit/simulation changes (within 2 seconds)
    - Exponential backoff reconnection: 1s, 2s, 4s, 8s, 16s, 30s cap, max 10 attempts
    - Handle incoming edit requests from server (optimize, set layout, granular edits, edit groups)
    - On unexpected disconnect: trigger toast notification, revert menu to disconnected state
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 11.10, 11.11_

  - [x] 12.3 Implement OAuth connect flow in Electron app
    - Open OAuth authorization URL in default browser via `shell.openExternal`
    - Listen for authorization code callback (local redirect URI)
    - Exchange authorization code for access token
    - On success: establish WebSocket, rebuild menu to connected state, send initial state sync
    - On failure: display toast error notification with failure reason
    - _Requirements: 11.3, 11.12_

  - [x] 12.4 Implement "Open Conversation..." handler
    - Use `shell.openExternal` to open `chatgptConversationUrl` from config.js in default browser
    - _Requirements: 11.5, 11.8, 11.9_

  - [x] 12.5 Implement edit request handling in Electron app
    - Handle `request:optimize` — push undo, apply parameters, re-simulate, revert on failure
    - Handle `request:setCircuitLayout` — push undo, replace layout, re-render, re-simulate
    - Handle `request:addComponent`, `request:removeComponent`, `request:addWire`, `request:removeWire`, `request:moveComponent`
    - Handle `request:beginEditGroup` — save undo checkpoint, suppress individual undo entries
    - Handle `request:endEditGroup` — finalize undo group
    - Implement 60-second edit group timeout auto-close
    - _Requirements: 8.4, 8.9, 8.10, 13.3, 13.4, 13.7, 14.8, 14.10, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 12.6 Implement toast error notifications via IPC
    - Main process sends IPC message to renderer on connection drop, auth failure, sync validation failure
    - Renderer calls `toast.error(message)` via vue-toastification
    - _Requirements: 11.11, 11.12, 3.8_

  - [ ]* 12.7 Write property test for exponential backoff calculation (Property 14)
    - **Property 14: Exponential Backoff Calculation**
    - For attempt N (1 ≤ N ≤ 10), delay = min(2^(N-1) × 1000, 30000) ms
    - **Validates: Requirements 3.6**

  - [ ]* 12.8 Write property test for menu state machine consistency (Property 16)
    - **Property 16: Menu State Machine Consistency**
    - For any sequence of state transitions, menu always reflects correct state (Connect.../Disconnect labels, Open Conversation... enabled/disabled)
    - **Validates: Requirements 11.4, 11.6, 11.7, 11.10**

  - [ ]* 12.9 Write property test for edit group undo suppression (Property 17)
    - **Property 17: Edit Group Suppresses Individual Undo Entries**
    - Edits between begin/end_edit_group produce exactly one undo entry, not individual entries
    - **Validates: Requirements 15.5**

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The server uses plain JavaScript (no TypeScript), tabs for indentation, Airbnb-base ESLint
- Shared schemas are imported from `server/schemas/` — no duplication
- socket.io is used for WebSocket communication (not raw `ws`)
- nginx handles TLS — Node.js listens HTTP only
- Sensitive config values come from `process.env`, non-sensitive are hardcoded in config.js

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "8.2"] },
    { "id": 2, "tasks": ["1.4", "2.1", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.2", "3.3", "9.1"] },
    { "id": 4, "tasks": ["2.3", "2.4", "5.1", "5.2", "5.3", "9.2"] },
    { "id": 5, "tasks": ["5.4", "5.5", "5.6", "5.7", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"] },
    { "id": 6, "tasks": ["6.9", "6.10", "6.11", "8.1", "8.3"] },
    { "id": 7, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["10.2", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 10, "tasks": ["12.5", "12.6"] },
    { "id": 11, "tasks": ["12.7", "12.8", "12.9"] }
  ]
}
```
