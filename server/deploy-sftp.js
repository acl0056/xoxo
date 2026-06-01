#!/usr/bin/env node
/* eslint-disable consistent-return, import/no-dynamic-require, no-await-in-loop */

/**
 * SFTP Deployment Script
 *
 * This script deploys changed files to a remote server via SFTP.
 * It compares file modification times to detect changes since the last deployment.
 *
 * Usage: node deploy-sftp.js [environment]
 *
 * Configuration is loaded from config.js.
 */

const SftpClient = require('ssh2-sftp-client');
const { Client: SshClient } = require('ssh2');
const fs = require('fs');
const path = require('path');

class SftpDeployer {
	constructor(environment = 'adam') {
		this.environment = environment;
		this.config = this.loadConfig();
		this.sftp = new SftpClient();
		this.deployStateFile = path.join(__dirname, `.deploy-state-${environment}.json`);
	}

	loadConfig() {
		try {
			const envConfigPath = path.join(__dirname, 'config.js');
			if (fs.existsSync(envConfigPath)) {
				return require(envConfigPath);
			}
		} catch (error) {
			console.error('❌ Error loading config:', error.message);
			process.exit(1);
		}
	}

	async deploy() {
		try {
			console.log(`🚀 Starting SFTP deployment to ${this.environment}...`);

			const dependencyChanges = await this.checkDependencyChanges();
			const changedFiles = await this.getChangedFiles();

			if (changedFiles.length === 0 && !dependencyChanges) {
				console.log('✅ No files to deploy and no dependency changes - everything is up to date');
				return;
			}

			console.log(`📁 Found ${changedFiles.length} files to deploy`);

			await this.connect();
			await this.deployFiles(changedFiles);

			if (dependencyChanges) {
				try {
					await this.handleDependencyInstallation();
				} catch (error) {
					console.warn('⚠️  Installation failed:', error.message);
					console.warn('⚠️  You may need to SSH in and run the commands manually');
				}
			}

			await this.updateDeploymentState();

			console.log('✅ Deployment completed successfully');
		} catch (error) {
			console.error('❌ Deployment failed:', error.message);
			throw error;
		} finally {
			await this.disconnect();
		}
	}

	async getChangedFiles() {
		const deployState = this.loadDeploymentState();
		const lastDeployment = deployState.lastDeployment ? new Date(deployState.lastDeployment) : null;

		try {
			const serverDir = path.resolve(__dirname);
			const allFiles = this.getAllFiles(serverDir);
			const filteredFiles = this.filterFiles(allFiles);

			// Make paths relative to the server directory
			const relativeFiles = filteredFiles.map((file) => path.relative(serverDir, file).replace(/\\/g, '/'));

			if (!lastDeployment) {
				console.log('📋 First deployment - all files will be uploaded:');
				relativeFiles.forEach((file) => console.log(`   ${file}`));
				return relativeFiles;
			}

			const changedFiles = relativeFiles.filter((file) => {
				try {
					const absolutePath = path.join(serverDir, file);
					const stats = fs.statSync(absolutePath);
					return stats.mtime > lastDeployment;
				} catch (error) {
					return false;
				}
			});

			console.log(`📋 Files changed since ${lastDeployment.toISOString()}:`);
			changedFiles.forEach((file) => console.log(`   ${file}`));

			return changedFiles;
		} catch (error) {
			console.error('❌ Error getting changed files:', error.message);
			throw error;
		}
	}

	getAllFiles(dir, fileList = []) {
		const files = fs.readdirSync(dir);

		files.forEach((file) => {
			const filePath = path.join(dir, file);
			const stats = fs.statSync(filePath);

			if (stats.isDirectory()) {
				this.getAllFiles(filePath, fileList);
			} else {
				fileList.push(filePath.replace(/\\/g, '/'));
			}
		});

		return fileList;
	}

	filterFiles(files) {
		return files.filter((file) => {
			const relativePath = path.relative(path.resolve(__dirname), file).replace(/\\/g, '/');
			const skipPatterns = [
				/^\.git\//,
				/node_modules\//,
				// /^\.env/,
				/\.log$/,
				/^\.deploy-state/,
				/package-lock\.json$/,
				/^\.kiro\//,
				/^\.DS_Store$/,
				/\.tmp$/,
				/\.temp$/,
				/^deploy-sftp\.js$/,
			];

			return !skipPatterns.some((pattern) => pattern.test(relativePath));
		});
	}

	async connect() {
		if (!this.config.sftp) {
			throw new Error('SFTP configuration not found in config file');
		}

		const {
			host, port = 22, username, password, privateKey,
		} = this.config.sftp;

		console.log(`🔌 Connecting to ${host}:${port}...`);

		const connectConfig = {
			host,
			port,
			username,
		};

		if (privateKey) {
			connectConfig.privateKey = fs.readFileSync(privateKey);
		} else if (password) {
			connectConfig.password = password;
		} else {
			throw new Error('Either password or privateKey must be provided in SFTP config');
		}

		await this.sftp.connect(connectConfig);
		console.log('✅ Connected to SFTP server');
	}

	async deployFiles(files) {
		const { remotePath } = this.config.sftp;
		const serverDir = path.resolve(__dirname);

		for (const file of files) {
			try {
				const localPath = path.join(serverDir, file);
				const remoteFilePath = path.posix.join(remotePath, file);
				const remoteDir = path.posix.dirname(remoteFilePath);

				await this.ensureRemoteDir(remoteDir);

				console.log(`📤 Uploading ${file} -> ${remoteFilePath}`);
				await this.sftp.put(localPath, remoteFilePath);
			} catch (error) {
				console.error(`❌ Error uploading ${file}:`, error.message);
				throw error;
			}
		}
	}

	async ensureRemoteDir(dir) {
		try {
			await this.sftp.mkdir(dir, true);
		} catch (error) {
			if (!error.message.includes('File exists')) {
				throw error;
			}
		}
	}

	loadDeploymentState() {
		try {
			if (fs.existsSync(this.deployStateFile)) {
				return JSON.parse(fs.readFileSync(this.deployStateFile, 'utf8'));
			}
		} catch (error) {
			console.warn('⚠️  Could not load deployment state:', error.message);
		}
		return {};
	}

	getDependencies(packageJsonPath) {
		try {
			const absolutePath = path.resolve(__dirname, packageJsonPath);
			const packageJson = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
			return packageJson.dependencies || {};
		} catch (error) {
			console.warn(`⚠️  Could not read ${packageJsonPath}:`, error.message);
			return {};
		}
	}

	async checkDependencyChanges() {
		const deployState = this.loadDeploymentState();

		const currentDeps = this.getDependencies('package.json');
		const previousDeps = deployState.dependencies || {};

		if (JSON.stringify(currentDeps) !== JSON.stringify(previousDeps)) {
			console.log('📦 Dependencies have changed');
			return true;
		}

		return false;
	}

	/**
	 * Execute multiple SSH commands in a single persistent shell session
	 */
	async executeSSHCommands(commands) {
		return new Promise((resolve, reject) => {
			const {
				host, port = 22, username, password, privateKey,
			} = this.config.sftp;

			const connectConfig = {
				host,
				port,
				username,
			};

			if (privateKey) {
				connectConfig.privateKey = fs.readFileSync(privateKey);
			} else if (password) {
				connectConfig.password = password;
			}

			const sshClient = new SshClient();

			sshClient.on('ready', () => {
				sshClient.shell((err, stream) => {
					if (err) {
						sshClient.end();
						reject(err);
						return;
					}

					let output = '';
					let errorOutput = '';

					const setupCommands = [
						'export NVM_DIR="$HOME/.nvm"',
						'[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
						...commands,
						'exit',
					];

					stream.on('close', () => {
						sshClient.end();
						if (errorOutput.includes('error') || errorOutput.includes('Error')) {
							reject(new Error(`Commands failed: ${errorOutput}`));
						} else {
							resolve(output);
						}
					});

					stream.on('data', (data) => {
						const text = data.toString();
						output += text;
						process.stdout.write(text);
					});

					stream.stderr.on('data', (data) => {
						const text = data.toString();
						errorOutput += text;
						process.stderr.write(text);
					});

					setupCommands.forEach((cmd) => {
						stream.write(`${cmd}\n`);
					});
				});
			});

			sshClient.on('error', (err) => {
				reject(err);
			});

			sshClient.connect(connectConfig);
		});
	}

	/**
	 * Install dependencies and restart pm2 on remote server
	 */
	async handleDependencyInstallation() {
		const { remotePath, pm2AppName } = this.config.sftp;
		const commands = [];

		console.log('📦 Installing dependencies on remote server...');
		commands.push(`cd ${remotePath} && npm ci --no-optional`);

		if (pm2AppName) {
			console.log(`🔄 Restarting PM2 app: ${pm2AppName}...`);
			commands.push(`pm2 restart ${pm2AppName}`);
		}

		await this.executeSSHCommands(commands);
		console.log('✅ Installation and restart completed');
	}

	async updateDeploymentState() {
		try {
			const currentDeps = this.getDependencies('package.json');

			const deployState = {
				lastDeployment: new Date().toISOString(),
				environment: this.environment,
				dependencies: currentDeps,
			};

			fs.writeFileSync(this.deployStateFile, JSON.stringify(deployState, null, 2));
			console.log(`📝 Updated deployment state: ${deployState.lastDeployment}`);
		} catch (error) {
			console.warn('⚠️  Could not update deployment state:', error.message);
		}
	}

	async disconnect() {
		try {
			await this.sftp.end();
			console.log('🔌 Disconnected from SFTP server');
		} catch (error) {
			// Ignore disconnect errors
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const environment = args[0] || 'adam';

	console.log('SFTP Deployment Tool');
	console.log('===================');
	console.log(`Environment: ${environment}`);
	console.log('');

	const deployer = new SftpDeployer(environment);
	await deployer.deploy();
}

if (require.main === module) {
	main().catch((error) => {
		console.error('❌ Unexpected error:', error);
		process.exit(1);
	});
}

module.exports = SftpDeployer;
