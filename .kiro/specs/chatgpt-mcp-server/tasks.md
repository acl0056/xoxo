# Implementation Plan: ChatGPT MCP Server

## Overview

This plan implements a remote MCP server that bridges the xoxo Electron app with ChatGPT. The server is a Node.js process managed by pm2 that accepts state from the Electron app over WebSocket and exposes it to ChatGPT via MCP tools over Streamable HTTP. Implementation follows a schema-first approach, building from infrastructure outward to integration.

## Tasks

- [ ] 1. Set up server project structure and configuration
  - [ ] 1.1 Create server directory with package.json and dependencies
    - Create `server/package.json` with dependencies: `@modelcontextprotocol/sdk`, `ws`, `ajv`, `ajv-formats`, `jsonwebtoken`, `jwks-rsa`, `express`
    - Create `server/pm2-config.json` for pm2 process management
    - Create `server/config.js` centralizing all configuration (port, host, OAuth settings, WebSocket settings, chatgptConversationUrl, schemasPath)
    - _Requirements: 1.6, 1.7, 10.6_

  - [ ] 1.2 Create server entry point with HTTP and WebSocket servers
    - Create `server/index.js` that starts an HTTP server, mounts the MCP handler at `/mcp`, and attaches a WebSocket server at `/ws`
    - Load configuration from `config.js`
    - _Requirements: 1.1, 1.2, 1.6_

- [ ] 2. Implement schema validation layer
  - [ ] 2.1 Create AJV schema validation wrapper
    - Create `server/validation/validator.js` that imports schemas from `../src/schemas/` (circuit.schema.json, simulation-results.schema.json, frd-data.schema.json)
    - Compile validators using AJV with `allErrors: true` and ajv-formats
    - Export validation functions: `validateCircuitLayout`, `validateSimulationResults`, `validateFrdData`
    - _Requirements: 3.4, 3.5, 4.2, 5.3, 6.2, 7.3_

  - [ ]* 2.2 Write property test for circuit layout schema conformance
    - **Property 4: Circuit Layout Schema Conformance**
    - **Validates: Requirements 3.4, 4.1, 4.2, 4.3**

  - [ ]* 2.3 Write property test for simulation results round-trip with array length invariant
    - **Property 5: Simulation Results Round-Trip with Array Length Invariant**
    - **Validates: Requirements 3.5, 5.1, 5.2, 5.3**

  - [ ]* 2.4 Write property test for impedance response round-trip with array length invariant
    - **Property 6: Impedance Response Round-Trip with Array Length Invariant**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 3. Implement session management
  - [ ] 3.1 Create in-memory session store
    - Create `server/session/store.js` with a Map keyed by userId
    - SessionData structure: `{ userId, circuitLayout, simulationResults, frdData, wsConnection, mcpSessionId, connectedAt }`
    - Implement `get`, `set`, `delete`, `has`, `size` operations
    - _Requirements: 1.7, 10.3_

  - [ ] 3.2 Create session manager with CRUD operations
    - Create `server/session/manager.js` with methods: `getSession(userId)`, `createSession(userId)`, `updateCircuitLayout(userId, layout)`, `updateSimulationResults(userId, results)`, `updateFrdData(userId, speakerId, angle, data)`, `getElectronConnection(userId)`, `destroySession(userId)`
    - Validate incoming data against schemas before storing
    - _Requirements: 1.7, 2.4, 10.3, 10.4_

  - [ ]* 3.3 Write property test for per-session data isolation
    - **Property 3: Per-Session Data Isolation**
    - **Validates: Requirements 2.4, 10.4**

- [ ] 4. Implement authentication layer
  - [ ] 4.1 Create token validation middleware
    - Create `server/auth/middleware.js` that validates Bearer tokens from the Authorization header
    - Verify JWT signature against JWKS endpoint, check expiry, validate issuer and audience claims
    - Return categorized errors: malformed (invalid JWT structure), expired (past expiry), unrecognized (wrong issuer/audience), missing_token
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [ ] 4.2 Create OAuth 2.1 flow helpers
    - Create `server/auth/oauth.js` with helpers for token introspection and refresh token support
    - Support token refresh without re-authentication (up to 30-day refresh token lifetime)
    - Access tokens limited to 60-minute lifetime
    - _Requirements: 2.1, 2.3, 2.6_

  - [ ]* 4.3 Write property test for token validation and error categorization
    - **Property 2: Token Validation and Error Categorization**
    - **Validates: Requirements 2.2, 2.5**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement MCP tools
  - [ ] 6.1 Create MCP server setup with tool and resource registration
    - Create `server/mcp/server.js` using `@modelcontextprotocol/sdk`
    - Register all five tools and three schema resources
    - Configure Streamable HTTP transport on `/mcp` endpoint
    - Handle MCP session management (Mcp-Session-Id header)
    - _Requirements: 1.2, 1.3, 10.1, 10.2_

  - [ ] 6.2 Implement get_circuit_layout tool
    - Create `server/mcp/tools/getCircuitLayout.js`
    - Extract user identity from authenticated MCP session, retrieve circuit layout from session manager
    - Return error if no circuit data is loaded (not a partial/empty object)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.3 Implement get_frequency_response tool
    - Create `server/mcp/tools/getFrequencyResponse.js`
    - Return frequencyResponse object with frequencies, spl, phase arrays and speakerResponses keyed by component ID
    - Validate all arrays have the same length before returning
    - Return error if no simulation results available or if authentication fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 6.4 Implement get_impedance_response tool
    - Create `server/mcp/tools/getImpedanceResponse.js`
    - Return impedance response with frequencies, impedances, and phases as equal-length arrays
    - Return error if no simulation results or if not authenticated
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.5 Implement get_off_axis_frd tool
    - Create `server/mcp/tools/getOffAxisFrd.js`
    - Accept speakerId (required) and angle (optional, 0-180) parameters
    - If angle provided: return FRD data for that speaker/angle, or error listing available angles
    - If angle omitted: return list of available angles for that speaker
    - Validate angle is numeric and within [0, 180]
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 6.6 Implement optimize_component tool
    - Create `server/mcp/tools/optimizeComponent.js`
    - Validate component ID exists in current circuit layout before forwarding
    - Validate parameter values against circuit.schema.json constraints for the component type
    - Forward valid requests to Electron app via WebSocket, wait for response (30-second timeout)
    - Return full updated component object on success, or descriptive error on failure
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 6.7 Write property test for FRD data lookup correctness
    - **Property 8: FRD Data Lookup Correctness**
    - **Validates: Requirements 7.1, 7.3**

  - [ ]* 6.8 Write property test for angle parameter validation
    - **Property 9: Angle Parameter Validation**
    - **Validates: Requirements 7.2, 7.7**

  - [ ]* 6.9 Write property test for available angles listing
    - **Property 10: Available Angles Listing**
    - **Validates: Requirements 7.5**

  - [ ]* 6.10 Write property test for optimize component input validation
    - **Property 11: Optimize Component Input Validation**
    - **Validates: Requirements 8.2, 8.3, 8.6, 8.7**

  - [ ]* 6.11 Write property test for optimize component success response
    - **Property 12: Optimize Component Success Response**
    - **Validates: Requirements 8.5**

- [ ] 7. Implement schema resources and manifest
  - [ ] 7.1 Create schema resource definitions
    - Create `server/mcp/resources/schemas.js`
    - Expose circuit.schema.json, simulation-results.schema.json, and frd-data.schema.json as MCP resources
    - Each resource has a unique URI including the schema filename, MIME type application/json, and a description of at least 20 characters referencing the crossover design domain
    - Return error if schema file cannot be read from disk
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 7.2 Implement manifest endpoint
    - Add manifest endpoint that returns all available MCP tools (names, descriptions, input schemas) and resources (URIs, descriptions)
    - Return MCP error if manifest encounters an internal error
    - _Requirements: 10.2, 10.5_

  - [ ]* 7.3 Write property test for schema resource content fidelity
    - **Property 13: Schema Resource Content Fidelity**
    - **Validates: Requirements 9.4**

- [ ] 8. Implement MCP request validation
  - [ ] 8.1 Add MCP protocol request validation
    - Validate incoming requests conform to MCP protocol (valid JSON-RPC 2.0 messages)
    - Return MCP error with code -32700 for parse errors, -32601 for invalid methods
    - Return MCP error with appropriate code identifying specific validation failure for malformed requests
    - Ensure internal errors return code -32603 without exposing implementation details
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 8.2 Write property test for MCP request validation
    - **Property 1: MCP Request Validation**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement WebSocket handler for Electron app communication
  - [ ] 10.1 Create WebSocket message type definitions
    - Create `server/ws/messages.js` defining message types and envelope structure
    - Electron → Server: `state:circuit`, `state:simulation`, `state:frd`, `response:optimize`
    - Server → Electron: `request:optimize`, `error:validation`
    - Each message has `type`, `payload`, and optional `requestId`
    - _Requirements: 3.1, 3.2, 3.3, 8.1_

  - [ ] 10.2 Create WebSocket connection handler
    - Create `server/ws/handler.js` managing persistent connections from Electron apps
    - Authenticate on connection (validate token from query param or first message)
    - Handle incoming state pushes: validate against schemas, store in session
    - Forward optimize_component requests to connected Electron app
    - Implement heartbeat/ping-pong for connection health (30-second interval)
    - Handle disconnection cleanup
    - Send `error:validation` message if state push fails validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 8.1, 8.4_

- [ ] 11. Implement Electron app WebSocket client
  - [ ] 11.1 Create WebSocket client module for the Electron app
    - Create `src/main/mcpClient.js` that manages the server connection
    - Connect after OAuth authentication with token
    - Push full state (circuit layout + simulation results) on connect and reconnect
    - Push incremental updates on circuit/simulation changes (debounced, within 2 seconds)
    - Handle `request:optimize` messages from server (apply values, trigger simulation)
    - Handle `error:validation` messages (notify user via IPC to renderer)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 8.4, 8.9_

  - [ ] 11.2 Implement exponential backoff reconnection logic
    - Implement reconnection with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped), max 10 attempts
    - Formula: `min(2^(N-1) * 1000, 30000)` for attempt N
    - Notify user of disconnection state
    - On reconnect, resend full current state
    - _Requirements: 3.6, 3.7_

  - [ ]* 11.3 Write property test for exponential backoff calculation
    - **Property 7: Exponential Backoff Calculation**
    - **Validates: Requirements 3.6**

- [ ] 12. Implement ChatGPT menu in Electron app
  - [ ] 12.1 Add ChatGPT menu to the application menu bar
    - Modify `src/main/menu.js` to add a "ChatGPT" menu positioned immediately after the "Circuit Blocks" menu
    - Add "Open Conversation..." menu item with id `open-chatgpt`
    - Menu item disabled by default, enabled only when WebSocket connection to MCP server is active and authenticated
    - When clicked, call `shell.openExternal(config.chatgptConversationUrl)` to open in default browser
    - Conversation URL read from `config.js`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 13. Wire components together and integrate
  - [ ] 13.1 Connect MCP server to session manager and WebSocket handler
    - Wire `server/index.js` to initialize session store, attach auth middleware to `/mcp` route, connect WebSocket handler to session manager
    - Ensure MCP tools retrieve data through session manager
    - Ensure WebSocket handler stores data through session manager
    - Ensure optimize_component tool communicates with Electron app through WebSocket handler
    - _Requirements: 1.6, 3.1, 8.1, 10.3_

  - [ ] 13.2 Connect Electron app client to menu state and store
    - Wire `src/main/mcpClient.js` into the Electron app lifecycle
    - Update menu item enabled state based on connection status
    - Subscribe to Vuex store changes for circuit layout and simulation results to trigger state pushes
    - Handle optimize_component requests by dispatching to the store and triggering re-simulation
    - _Requirements: 3.1, 3.2, 3.3, 8.4, 8.9, 11.3_

  - [ ]* 13.3 Write unit tests for menu state transitions
    - Test menu item enabled/disabled based on connection state
    - Test that openExternal is called with correct URL
    - _Requirements: 11.3, 11.4, 11.6_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The server uses shared schemas from `src/schemas/` — no duplication
- All code uses plain JavaScript (Node.js), tabs for indentation, Airbnb-base ESLint style
- Jest for testing, fast-check for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "4.2", "2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["3.3", "4.3", "6.1", "10.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "7.1", "7.2", "8.1", "10.2"] },
    { "id": 5, "tasks": ["6.7", "6.8", "6.9", "6.10", "6.11", "7.3", "8.2"] },
    { "id": 6, "tasks": ["11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3", "12.1"] },
    { "id": 8, "tasks": ["13.1", "13.2"] },
    { "id": 9, "tasks": ["13.3"] }
  ]
}
```
