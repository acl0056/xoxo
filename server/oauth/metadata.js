const { Router } = require('express');

const router = Router();

const authorizationServerMetadata = {
	issuer: 'https://aix.reflect.systems',
	authorization_endpoint: 'https://aix.reflect.systems/oauth/authorize',
	token_endpoint: 'https://aix.reflect.systems/oauth/token',
	response_types_supported: ['code'],
	grant_types_supported: ['authorization_code'],
	code_challenge_methods_supported: ['S256'],
};

const protectedResourceMetadata = {
	resource: 'https://aix.reflect.systems/mcp',
	authorization_servers: ['https://aix.reflect.systems'],
};

router.get('/.well-known/oauth-authorization-server', (req, res) => {
	res.status(200).json(authorizationServerMetadata);
});

router.get('/.well-known/oauth-protected-resource', (req, res) => {
	res.status(200).json(protectedResourceMetadata);
});

module.exports = router;
