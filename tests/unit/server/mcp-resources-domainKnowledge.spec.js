const path = require('path');
const fs = require('fs');
const domainKnowledgeResource = require('../../../server/mcp/resources/domainKnowledge');

describe('server/mcp/resources/domainKnowledge', () => {
	it('should have the correct URI', () => {
		expect(domainKnowledgeResource.uri).toBe('resource://crossover-domain-knowledge');
	});

	it('should have the correct name', () => {
		expect(domainKnowledgeResource.name).toBe('Crossover Domain Knowledge');
	});

	it('should have a description of at least 20 characters referencing loudspeaker crossover design guidance', () => {
		expect(domainKnowledgeResource.description.length).toBeGreaterThanOrEqual(20);
		expect(domainKnowledgeResource.description.toLowerCase()).toContain('crossover');
	});

	it('should have text/markdown MIME type', () => {
		expect(domainKnowledgeResource.mimeType).toBe('text/markdown');
	});

	it('should return the content of domain-knowledge.md from getContent()', () => {
		const expectedPath = path.resolve(__dirname, '../../../server/domain-knowledge.md');
		const expectedContent = fs.readFileSync(expectedPath, 'utf8');

		const content = domainKnowledgeResource.getContent();

		expect(content).toBe(expectedContent);
	});

	it('should return a non-empty string from getContent()', () => {
		const content = domainKnowledgeResource.getContent();

		expect(typeof content).toBe('string');
		expect(content.length).toBeGreaterThan(0);
	});
});
