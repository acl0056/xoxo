const { Menu } = require('electron');

/**
 * Create and return the application menu template
 * @param {Object} mainWindow - The main BrowserWindow instance
 * @param {Object} handlers - Object containing menu action handlers
 * @returns {Menu} The application menu
 */
function createApplicationMenu(mainWindow, handlers) {
	const isMac = process.platform === 'darwin';

	const template = [
		// App menu (macOS only)
		...(isMac ? [{
			label: 'xoxo',
			submenu: [
				{
					label: 'About xoxo',
					click: () => handlers.showAbout(),
				},
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' },
			],
		}] : []),

		// File menu
		{
			label: 'File',
			submenu: [
				{
					label: 'New',
					accelerator: 'CmdOrCtrl+N',
					click: () => handlers.newFile(),
				},
				{
					label: 'Open...',
					accelerator: 'CmdOrCtrl+O',
					click: () => handlers.openFile(),
				},
				{
					label: 'Save',
					accelerator: 'CmdOrCtrl+S',
					click: () => handlers.saveFile(),
				},
				{
					label: 'Save As...',
					accelerator: 'CmdOrCtrl+Shift+S',
					click: () => handlers.saveFileAs(),
				},
				{ type: 'separator' },
				{
					label: 'Recent Files',
					submenu: handlers.getRecentFilesMenu(),
				},
				{ type: 'separator' },
				{
					label: 'Import .dxo...',
					click: () => handlers.importDxo(),
				},
				{ type: 'separator' },
				...(isMac ? [] : [
					{
						label: 'Exit',
						accelerator: 'Alt+F4',
						click: () => handlers.exit(),
					},
				]),
			],
		},

		// Edit menu
		{
			label: 'Edit',
			submenu: [
				{
					id: 'undo',
					label: 'Undo',
					accelerator: 'CmdOrCtrl+Z',
					enabled: false,
					click: () => handlers.undo(),
				},
				{
					id: 'redo',
					label: 'Redo',
					accelerator: 'CmdOrCtrl+Shift+Z',
					enabled: false,
					click: () => handlers.redo(),
				},
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
			],
		},

		// View menu
		{
			label: 'View',
			submenu: [
				{
					label: 'Frequency Response',
					accelerator: 'CmdOrCtrl+1',
					click: () => handlers.openFrequencyResponseWindow(),
				},
				{
					label: 'Impedance',
					accelerator: 'CmdOrCtrl+2',
					click: () => handlers.openImpedanceWindow(),
				},
				{ type: 'separator' },
				// { role: 'reload' },
				// { role: 'forceReload' },
				// { role: 'toggleDevTools' },
				// { type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},

		// Window menu (macOS)
		...(isMac ? [{
			label: 'Window',
			submenu: [
				{ role: 'minimize' },
				{ role: 'zoom' },
				{ type: 'separator' },
				{ role: 'front' },
				{ type: 'separator' },
				{ role: 'window' },
			],
		}] : []),

		// Help menu
		{
			label: 'Help',
			submenu: [
				{
					label: 'Documentation',
					click: () => handlers.openDocumentation(),
				},
				{ type: 'separator' },
				...(!isMac ? [
					{
						label: 'About',
						click: () => handlers.showAbout(),
					},
				] : []),
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	return menu;
}

module.exports = {
	createApplicationMenu,
};
