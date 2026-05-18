/**
 * Client-side configuration for the ChatGPT MCP server connection.
 *
 * All values can be overridden via environment variables.
 */

const chatgptConfig = {
	serverUrl: 'https://aix.reflect.systems',

	oauth: {
		issuer: 'https://aix.reflect.systems',
		audience: 'https://aix.reflect.systems/mcp',
	},

	conversationUrl: 'https://chatgpt.com',
};

module.exports = chatgptConfig;
