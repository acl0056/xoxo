const domainKnowledgeResource = require('../resources/domainKnowledge');

/**
 * Handle the initialize_xoxo_session MCP tool invocation.
 *
 * Returns the crossover domain knowledge document containing design guidance,
 * interaction guidelines, workflow patterns, and behavioral expectations.
 * ChatGPT should call this before responding to the user for the first time.
 *
 * @returns {object} Result object with the domain knowledge content
 */
function handleInitializeXoxoSession() {
	const content = domainKnowledgeResource.getContent();
	return { result: content };
}

module.exports = handleInitializeXoxoSession;
