const fs = require('fs');
const path = require('path');

// Copy additional main process files to dist
const filesToCopy = ['menu.js', 'fileHandlers.js', 'logger.js'];
const srcDir = path.join(__dirname, '../src/main');
const distDir = path.join(__dirname, '../dist/main');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
	fs.mkdirSync(distDir, { recursive: true });
}

// Copy each file
filesToCopy.forEach((file) => {
	const srcPath = path.join(srcDir, file);
	const distPath = path.join(distDir, file);
	
	if (fs.existsSync(srcPath)) {
		fs.copyFileSync(srcPath, distPath);
		console.log(`Copied ${file} to dist/main/`);
	} else {
		console.warn(`Warning: ${file} not found in src/main/`);
	}
});

console.log('Main process files copied successfully');
