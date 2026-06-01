const { shell } = require('electron');
const openChatgptConversation = require('../../../src/main/chatgpt-open-conversation');

jest.mock('electron', () => ({
	shell: {
		openExternal: jest.fn(),
	},
}));

describe('openChatgptConversation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call shell.openExternal with the provided conversation URL', () => {
		const conversationUrl = 'https://chatgpt.com';

		openChatgptConversation(conversationUrl);

		expect(shell.openExternal).toHaveBeenCalledWith('https://chatgpt.com');
	});

	it('should pass through any URL value from config', () => {
		const customUrl = 'https://chatgpt.com/g/custom-gpt-id';

		openChatgptConversation(customUrl);

		expect(shell.openExternal).toHaveBeenCalledWith('https://chatgpt.com/g/custom-gpt-id');
	});
});
