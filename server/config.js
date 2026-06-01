module.exports = {
	port: process.env.PORT || 3000,
	host: '127.0.0.1', // process.env.HOST || '0.0.0.0',
	oauth: {
		issuer: 'https://xoxo.practicube.com',
		audience: 'https://xoxo.practicube.com/mcp',
		jwtSecret: process.env.JWT_SECRET,
		tokenLifetimeSeconds: 3600,
	},
	ws: {
		heartbeatIntervalMs: 30000,
		requestTimeoutMs: 30000,
	},
	editGroup: {
		timeoutMs: 60000,
	},
	chatgptConversationUrl: 'https://chatgpt.com',
	schemasPath: './schemas',
	domainKnowledgePath: './domain-knowledge.md',
	sftp: {
		host: 'xoxo.practicube.com',
		port: 22,
		username: 'ubuntu',
		privateKey: '/Users/adamlockhart/xoxo.pem',

		// Remote path where files should be deployed
		remotePath: '/home/ubuntu/xoxo-mcp',

		// PM2 app name for restarting after deployment
		pm2AppName: 'xoxo-mcp',
	},
};
