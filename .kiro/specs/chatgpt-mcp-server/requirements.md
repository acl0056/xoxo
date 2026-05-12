# Requirements Document

## Introduction

This feature adds a remote MCP (Model Context Protocol) server that bridges the xoxo loudspeaker crossover design application with ChatGPT. The server is hosted on AWS as a long-running process (ECS Fargate), enabling ChatGPT to read circuit layouts, simulation results, and frequency response data from the Electron app. It also allows ChatGPT to suggest component value changes and write them back. Users authenticate via OAuth 2.1 for individual logins, and the system is designed for eventual publication as a ChatGPT App.

## Architectural Decisions

- **Monorepo**: The MCP server code lives in this repository under a `server/` directory, sharing JSON Schema definitions with the Electron app to avoid duplication.
- **In-memory state, no database**: The server holds user session state (circuit layouts, simulation results, FRD data) in process memory. There is no persistent storage or database. If the server restarts, all session state is lost and Electron apps must re-sync.
- **Direct bridge**: The server acts as a stateless pass-through between the Electron app (which pushes state via WebSocket) and ChatGPT (which reads state via MCP tools). No data transformation or caching layer beyond the in-memory session map.
- **Runtime**: Node.js server running on an Ubuntu EC2 instance, managed by pm2 for process management and automatic restarts. A `pm2-config.json` file is included in the project.
- **Configuration**: All configuration values (ports, OAuth credentials, endpoints, etc.) are centralized in a `config.js` file, not embedded in application code.

## Glossary

- **MCP_Server**: The remote Node.js HTTP server implementing the Model Context Protocol, deployed on an Ubuntu EC2 instance managed by pm2, reachable by ChatGPT over HTTPS. Holds all session state in process memory with no database dependency.
- **Electron_App**: The xoxo desktop application built with Electron that provides the circuit editor, solver, and simulation graphs
- **OAuth_Provider**: The OAuth 2.1 authorization service that authenticates individual users before granting access to the MCP_Server
- **Circuit_Layout**: The JSON representation of a crossover circuit including components (resistors, capacitors, inductors, speakers, etc.), wires, and metadata, conforming to circuit.schema.json
- **Frequency_Response**: Simulation output containing SPL and phase data across a frequency range, conforming to simulation-results.schema.json
- **Impedance_Response**: Simulation output containing impedance magnitude and phase across a frequency range, conforming to simulation-results.schema.json
- **FRD_Data**: Frequency Response Data at a specific off-axis angle, conforming to frd-data.schema.json
- **MCP_Tool**: A callable function exposed by the MCP_Server that ChatGPT can invoke to read or write data
- **MCP_Resource**: A static or semi-static data artifact exposed by the MCP_Server that provides context to ChatGPT (e.g., JSON Schema definitions)
- **Session**: An authenticated connection between a specific user's Electron_App instance and the MCP_Server, established after OAuth 2.1 authorization. Session state is held in server process memory and is not persisted to any external store.
- **Component_Value**: A numeric parameter of a circuit component (e.g., resistance in ohms, capacitance in farads, inductance in henries)

## Requirements

### Requirement 1: MCP Server Hosting and Transport

**User Story:** As a user, I want the MCP server to be accessible over HTTPS, so that ChatGPT can reach it from the internet without requiring local network access.

#### Acceptance Criteria

1. THE MCP_Server SHALL accept connections over HTTPS using a valid, publicly-trusted TLS certificate on a publicly routable endpoint
2. WHEN the MCP_Server receives a request, THE MCP_Server SHALL respond using the MCP Streamable HTTP transport protocol within 30 seconds
3. THE MCP_Server SHALL validate that incoming requests conform to the MCP protocol specification before processing them
4. IF the MCP_Server receives a malformed request, THEN THE MCP_Server SHALL return an MCP error response conforming to the MCP error format with an error code that identifies the specific validation failure
5. IF the MCP_Server encounters an internal error while processing a valid request, THEN THE MCP_Server SHALL return an MCP error response indicating a server-side failure without exposing internal implementation details
6. THE MCP_Server SHALL run as a Node.js process managed by pm2 on an Ubuntu EC2 instance, capable of maintaining persistent WebSocket connections from Electron_App instances while simultaneously serving HTTPS MCP requests from ChatGPT
7. THE MCP_Server SHALL store all session state in process memory without requiring any external database or persistent storage

### Requirement 2: OAuth 2.1 Authentication

**User Story:** As a user, I want to log in with my own credentials, so that my circuit data is private and only accessible through my authenticated session.

#### Acceptance Criteria

1. WHEN a user initiates a connection from ChatGPT, THE OAuth_Provider SHALL present an authorization flow compliant with OAuth 2.1
2. IF an MCP tool or resource request does not include an access token that is unexpired, correctly signed, and issued by the OAuth_Provider, THEN THE MCP_Server SHALL reject the request
3. WHEN an access token expires, THE OAuth_Provider SHALL support token refresh without requiring the user to re-authenticate, provided the refresh token has not exceeded a maximum lifetime of 30 days since original authentication
4. THE MCP_Server SHALL associate each authenticated session with exactly one user identity
5. IF an invalid or expired token is presented, THEN THE MCP_Server SHALL return a 401 Unauthorized response with an error indication specifying whether the token was malformed, expired, or unrecognized
6. THE MCP_Server SHALL issue access tokens with a lifetime no greater than 60 minutes

### Requirement 3: Electron App to MCP Server Communication

**User Story:** As a user, I want my desktop app to sync its current state with the MCP server, so that ChatGPT can access my live circuit data.

#### Acceptance Criteria

1. WHEN the user authenticates, THE Electron_App SHALL establish a persistent connection to the MCP_Server and send the full current Circuit_Layout and simulation results as an initial state synchronization
2. WHEN the Circuit_Layout changes in the Electron_App, THE Electron_App SHALL send the updated Circuit_Layout to the MCP_Server within 2 seconds
3. WHEN simulation results are recalculated, THE Electron_App SHALL send the updated Frequency_Response and Impedance_Response to the MCP_Server within 2 seconds
4. THE Electron_App SHALL transmit Circuit_Layout data conforming to circuit.schema.json
5. THE Electron_App SHALL transmit simulation results conforming to simulation-results.schema.json
6. IF the connection to the MCP_Server is lost, THEN THE Electron_App SHALL attempt reconnection with exponential backoff starting at 1 second, doubling up to a maximum interval of 30 seconds, for a maximum of 10 attempts, and notify the user of the disconnection
7. WHEN the connection to the MCP_Server is re-established after a disconnection, THE Electron_App SHALL send the full current Circuit_Layout and simulation results to resynchronize state
8. IF the MCP_Server rejects a state update due to a validation error, THEN THE Electron_App SHALL notify the user that synchronization failed and include the reason provided by the server

### Requirement 4: Get Circuit Layout Tool

**User Story:** As a user, I want ChatGPT to see my current schematic, so that it can understand my crossover design and provide relevant advice.

#### Acceptance Criteria

1. WHEN ChatGPT invokes the get_circuit_layout tool, THE MCP_Server SHALL return the current Circuit_Layout for the authenticated user within 5 seconds
2. THE MCP_Server SHALL return Circuit_Layout data conforming to circuit.schema.json
3. THE get_circuit_layout tool response SHALL include all top-level properties defined in circuit.schema.json: version, metadata, components, wires, annotations, curveColors, graphSettings, and blockGroups as present in the current design
4. IF no Circuit_Layout is available for the session, THEN THE MCP_Server SHALL return an error response indicating that no circuit data is loaded, and SHALL NOT return a partial or empty Circuit_Layout object
5. IF an unexpected error occurs while retrieving the Circuit_Layout, THEN THE MCP_Server SHALL return an error response indicating a retrieval failure, and SHALL preserve the current circuit state without modification

### Requirement 5: Get Frequency Response Tool

**User Story:** As a user, I want ChatGPT to read my simulation's frequency response, so that it can analyze the SPL and phase behavior of my crossover.

#### Acceptance Criteria

1. WHEN ChatGPT invokes the get_frequency_response tool with a valid session token, THE MCP_Server SHALL return the frequencyResponse object from the most recently completed simulation for that session
2. THE MCP_Server SHALL return the frequencyResponse object containing: a frequencies array (values in Hz), an spl array (values in dB), a phase array (values in degrees, each between -180 and 180), and a speakerResponses object keyed by component ID where each entry contains its own spl and phase arrays
3. THE get_frequency_response tool response SHALL conform to the frequencyResponse portion of simulation-results.schema.json, and all returned arrays (frequencies, spl, phase, and each speaker's spl and phase) SHALL have the same length
4. IF no simulation results are available for the session, THEN THE MCP_Server SHALL return an error response indicating that no simulation has been run, without returning partial frequency data
5. IF the session token is missing or invalid, THEN THE MCP_Server SHALL return an authentication error and SHALL NOT return any simulation data

### Requirement 6: Get Impedance Response Tool

**User Story:** As a user, I want ChatGPT to read my impedance simulation data, so that it can evaluate amplifier loading and impedance characteristics.

#### Acceptance Criteria

1. WHEN ChatGPT invokes the get_impedance_response tool, THE MCP_Server SHALL return the Impedance_Response for the authenticated user containing frequencies, impedance magnitudes, and impedance phases as equal-length arrays
2. THE get_impedance_response tool response SHALL conform to the impedanceResponse portion of simulation-results.schema.json
3. IF no simulation results are available for the authenticated user, THEN THE MCP_Server SHALL return an error indicating simulation has not been run
4. IF the user is not authenticated when the get_impedance_response tool is invoked, THEN THE MCP_Server SHALL return an error indicating authentication is required without exposing internal system details

### Requirement 7: Get Off-Axis FRD Tool

**User Story:** As a user, I want ChatGPT to access my off-axis frequency response measurements, so that it can analyze dispersion and directivity behavior.

#### Acceptance Criteria

1. WHEN ChatGPT invokes the get_off_axis_frd tool with a specified angle and speaker component ID, THE MCP_Server SHALL return the FRD_Data for that speaker at that angle
2. THE get_off_axis_frd tool SHALL accept an angle parameter specifying the off-axis angle as a numeric value in degrees between 0 and 180 inclusive, and a speaker component ID parameter identifying which speaker's measurements to retrieve
3. THE MCP_Server SHALL return FRD_Data conforming to frd-data.schema.json
4. IF the requested angle is not available for the specified speaker, THEN THE MCP_Server SHALL return an error listing the available angles for that speaker
5. WHEN ChatGPT invokes the get_off_axis_frd tool with a speaker component ID but without specifying an angle, THE MCP_Server SHALL return a list of available off-axis angles for that speaker
6. IF no FRD data is loaded for the authenticated user's session, THEN THE MCP_Server SHALL return an error indicating no off-axis measurement data is available
7. IF the angle parameter is not a numeric value between 0 and 180 inclusive, THEN THE MCP_Server SHALL return a validation error indicating the accepted range

### Requirement 8: Optimize Component Tool

**User Story:** As a user, I want ChatGPT to suggest and apply new component values to my crossover, so that I can iterate on designs with AI assistance.

#### Acceptance Criteria

1. WHEN ChatGPT invokes the optimize_component tool with a component ID and new parameter values, THE MCP_Server SHALL forward the update to the Electron_App
2. IF the specified component ID does not exist in the current Circuit_Layout, THEN THE optimize_component tool SHALL reject the request before forwarding to the Electron_App
3. IF the new parameter values violate the parameter constraints defined in circuit.schema.json for the component type, THEN THE optimize_component tool SHALL reject the request before forwarding to the Electron_App
4. WHEN the Electron_App receives a valid component update, THE Electron_App SHALL apply the new values and trigger a simulation recalculation
5. WHEN the component update has been applied and simulation recalculation completes, THE optimize_component tool SHALL return the full updated component object as defined in circuit.schema.json including id, type, label, x, y, rotation, and parameters
6. IF the specified component ID does not exist, THEN THE MCP_Server SHALL return an error indicating the invalid component ID
7. IF the new parameter values violate schema constraints, THEN THE MCP_Server SHALL return a validation error describing which parameter failed and which constraint was violated
8. IF the Electron_App does not respond within 30 seconds of receiving the component update, THEN THE MCP_Server SHALL return a timeout error to the caller
9. IF the simulation recalculation fails after applying the new values, THEN THE Electron_App SHALL revert the component to its previous parameter values and THE MCP_Server SHALL return an error indicating the simulation failure

### Requirement 9: Schema Resource Exposure

**User Story:** As a user, I want ChatGPT to understand the structure of my circuit data, so that it can interpret component types, parameters, and relationships correctly.

#### Acceptance Criteria

1. THE MCP_Server SHALL expose circuit.schema.json as an MCP resource with a unique resource URI that includes the schema filename
2. THE MCP_Server SHALL expose simulation-results.schema.json as an MCP resource with a unique resource URI that includes the schema filename
3. THE MCP_Server SHALL expose frd-data.schema.json as an MCP resource with a unique resource URI that includes the schema filename
4. WHEN a client requests a schema resource, THE MCP_Server SHALL return the full contents of the corresponding JSON Schema file with MIME type application/json within 2 seconds
5. THE MCP_Server SHALL annotate each schema resource with a non-empty description of at least 20 characters that references the crossover design domain concept the schema represents
6. IF a schema file cannot be read from disk, THEN THE MCP_Server SHALL return an error response indicating the schema is unavailable

### Requirement 10: ChatGPT App Publication Readiness

**User Story:** As a developer, I want the MCP server to be structured for eventual publication as a ChatGPT App, so that end users do not need Developer Mode to connect.

#### Acceptance Criteria

1. THE MCP_Server SHALL implement the MCP protocol in a manner compatible with OpenAI's ChatGPT App registry requirements
2. THE MCP_Server SHALL provide a manifest endpoint that returns a document listing all available MCP tools with their names, descriptions, and input schemas, and all available MCP resources with their URIs and descriptions
3. THE MCP_Server SHALL support at least 100 concurrent authenticated user sessions using in-memory state only
4. THE MCP_Server SHALL enforce per-session data isolation such that one user's Circuit_Layout, Frequency_Response, Impedance_Response, and FRD_Data are not accessible to another user's session
5. IF the manifest endpoint encounters an internal error, THEN THE MCP_Server SHALL return an MCP error response indicating the manifest is temporarily unavailable
6. THE MCP_Server source code SHALL reside in a `server/` directory within the existing xoxo repository, sharing JSON Schema files from `src/schemas/` to avoid duplication
