const fs = require('fs');
const path = require('path');

const domainKnowledgeResource = {
	uri: 'resource://crossover-domain-knowledge',
	name: 'Crossover Domain Knowledge',
	description: 'Loudspeaker crossover design guidance including delays, component values, and measurement workflows',
	mimeType: 'text/markdown',
	getContent() {
		const filePath = path.resolve(__dirname, '../../domain-knowledge.md');
		return fs.readFileSync(filePath, 'utf8');
	},
};

module.exports = domainKnowledgeResource;
