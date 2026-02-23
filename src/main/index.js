const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	// Load the renderer
	if (process.env.NODE_ENV === 'development') {
		// In development, load from Vite dev server
		mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		// In production, load from built files
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
