const { shell } = require('electron');

function openChatgptConversation(conversationUrl) {
	shell.openExternal(conversationUrl);
}

module.exports = openChatgptConversation;
