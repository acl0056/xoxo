/**
 * Client-side configuration for the ChatGPT MCP server connection.
 *
 * All values can be overridden via environment variables.
 */

const chatgptConfig = {
	serverUrl: 'https://xoxo.practicube.com',

	oauth: {
		issuer: 'https://xoxo.practicube.com',
		audience: 'https://xoxo.practicube.com/mcp',
	},

	conversationUrl: 'https://chatgpt.com',
};

module.exports = chatgptConfig;
