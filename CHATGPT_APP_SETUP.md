# xoxo ChatGPT App Setup

This guide is for beta testers who want to connect ChatGPT to the xoxo desktop app before the official xoxo ChatGPT app is approved.

xoxo is exposed to ChatGPT through an MCP server at:

```text
https://xoxo.practicube.com/mcp
```

## What Developer Mode Means

ChatGPT developer mode lets a user create a private app/connector from an MCP server URL. A developer-mode app is private to the user or workspace that created it. It is not a public app listing, and there is no general share link that makes another user's ChatGPT account see the app automatically.

For beta testing outside a shared ChatGPT workspace, each tester must create their own private developer-mode app using the settings below. This is required for the beta because xoxo is not yet available as an approved app in ChatGPT.

Once the official xoxo app is approved and listed in ChatGPT, testers should no longer need to create a developer-mode app manually. They will be able to use the official app from ChatGPT instead.

Developer mode should be treated as elevated trust. xoxo exposes tools that can read and modify the currently connected crossover project, so testers should only connect to the official xoxo MCP endpoint and only while they intend ChatGPT to interact with their desktop app.

## Prerequisites

- The xoxo desktop app installed and running
- A ChatGPT account/workspace with Apps developer mode/custom app support
- Network access to `https://xoxo.practicube.com`

## ChatGPT App Fields

Use these values when creating the app in ChatGPT developer mode. The ChatGPT UI may not ask for every field; if a field is not shown, skip it.

| Field | Value |
| --- | --- |
| App name | `xoxo` |
| Description | `Loudspeaker crossover design and simulation tool` |
| MCP server URL | `https://xoxo.practicube.com/mcp` |
| Authentication type | `OAuth` |
| Client ID | `chatgpt` |
| Client secret | Leave blank / none |
| OAuth issuer | `https://xoxo.practicube.com` |
| Authorization URL | `https://xoxo.practicube.com/oauth/authorize` |
| Token URL | `https://xoxo.practicube.com/oauth/token` |
| Resource / audience | `https://xoxo.practicube.com/mcp` |
| Scopes | Leave blank |
| PKCE | Enabled, `S256` |
| Authorization server metadata | `https://xoxo.practicube.com/.well-known/oauth-authorization-server` |
| Protected resource metadata | `https://xoxo.practicube.com/.well-known/oauth-protected-resource` |

If ChatGPT provides or displays a redirect URI, use the ChatGPT-provided redirect URI. Do not replace it with a xoxo URL.

## Setup Steps

1. Open the xoxo desktop app.
2. In xoxo, choose the ChatGPT connection option and generate a pairing code.
3. In ChatGPT, open Settings, then Apps.
4. Open Advanced settings and enable Developer mode.
5. Create a new app.
6. Enter the fields from the table above.
7. Save or connect the app.
8. When ChatGPT opens the xoxo authorization page, enter the pairing code shown in the desktop app.
9. Start a new ChatGPT conversation and ask it to use xoxo.

A simple first test:

```text
Use xoxo. Read the current circuit layout and list the available graph angles.
```

Then try:

```text
Select graph angle 30, then read the frequency response at 30 degrees.
```

## Important Behavior

- The desktop app must be running and connected for write tools to work.
- If the desktop app is restarted, reconnect it to ChatGPT before asking ChatGPT to edit the circuit.
- The OAuth pairing code expires quickly. Generate a new code if the authorization page says the code is invalid or expired.
- The `select_graph_angle` tool runs the simulation for the selected angle before returning success when auto-simulation is enabled.

## Troubleshooting

### ChatGPT says the app already exists

The app may already exist as a private developer-mode app in ChatGPT settings. Check Settings > Apps and look under private or developer-mode apps.

### ChatGPT gets a 502 error

For xoxo write tools, a 502 usually means ChatGPT has an app connection but the desktop app is not currently connected to the MCP server. Relaunch xoxo if needed, reconnect to ChatGPT from the desktop app, then try again in a fresh ChatGPT message.

### The authorization page rejects the pairing code

Generate a fresh pairing code in the desktop app and retry the connection flow. Pairing codes are single-use and expire quickly.

### The conversation gets stuck after a failed tool call

Start a new ChatGPT conversation after reconnecting the desktop app. A fresh chat is often cleaner than continuing a thread that was interrupted during tool discovery or authorization.

## Notes for Beta Testers

During beta testing, please include these details when reporting issues:

- The xoxo desktop app version
- Whether the desktop app was connected before the ChatGPT request
- The exact ChatGPT request that failed
- Any visible error message, especially `desktop_disconnected`, `session_not_found`, `invalid or expired pairing code`, or `object could not be cloned`
- Whether restarting the desktop app or starting a new ChatGPT conversation changed the behavior
