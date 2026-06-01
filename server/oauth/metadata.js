const { Router } = require('express');

const router = Router();

const authorizationServerMetadata = {
	issuer: 'https://xoxo.practicube.com',
	authorization_endpoint: 'https://xoxo.practicube.com/oauth/authorize',
	token_endpoint: 'https://xoxo.practicube.com/oauth/token',
	response_types_supported: ['code'],
	grant_types_supported: ['authorization_code'],
	code_challenge_methods_supported: ['S256'],
};

const protectedResourceMetadata = {
	resource: 'https://xoxo.practicube.com/mcp',
	authorization_servers: ['https://xoxo.practicube.com'],
};

router.get('/.well-known/oauth-authorization-server', (req, res) => {
	res.status(200).json(authorizationServerMetadata);
});

router.get('/.well-known/oauth-protected-resource', (req, res) => {
	res.status(200).json(protectedResourceMetadata);
});

module.exports = router;
