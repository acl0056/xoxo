const { Menu } = require('electron');
const { createApplicationMenu } = require('../../../src/main/menu');

// Mock electron Menu
jest.mock('electron', () => ({
	Menu: {
		buildFromTemplate: jest.fn(),
	},
}));

describe('createApplicationMenu', () => {
	let mockWindow;
	let mockHandlers;

	beforeEach(() => {
		mockWindow = {
			webContents: {
				send: jest.fn(),
			},
		};

		mockHandlers = {
			newFile: jest.fn(),
			openFile: jest.fn(),
			saveFile: jest.fn(),
			saveFileAs: jest.fn(),
			importDxo: jest.fn(),
			exit: jest.fn(),
			undo: jest.fn(),
			redo: jest.fn(),
			showAbout: jest.fn(),
			openDocumentation: jest.fn(),
			getRecentFilesMenu: jest.fn(() => []),
			chatgptConnect: jest.fn(),
			chatgptDisconnect: jest.fn(),
			chatgptOpenConversation: jest.fn(),
		};

		jest.clearAllMocks();
	});

	it('should create application menu with all required sections', () => {
		const mockMenu = { setApplicationMenu: jest.fn() };
		Menu.buildFromTemplate.mockReturnValue(mockMenu);

		const menu = createApplicationMenu(mockWindow, mockHandlers);

		expect(Menu.buildFromTemplate).toHaveBeenCalled();
		expect(menu).toBe(mockMenu);

		const template = Menu.buildFromTemplate.mock.calls[0][0];

		// Check for File menu
		const fileMenu = template.find((item) => item.label === 'File');
		expect(fileMenu).toBeDefined();
		expect(fileMenu.submenu).toBeDefined();

		// Check for Edit menu
		const editMenu = template.find((item) => item.label === 'Edit');
		expect(editMenu).toBeDefined();
		expect(editMenu.submenu).toBeDefined();

		// Check for View menu
		const viewMenu = template.find((item) => item.label === 'View');
		expect(viewMenu).toBeDefined();
		expect(viewMenu.submenu).toBeDefined();

		// Check for Help menu
		const helpMenu = template.find((item) => item.label === 'Help');
		expect(helpMenu).toBeDefined();
		expect(helpMenu.submenu).toBeDefined();
	});

	it('should include File menu items with correct accelerators', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');

		const newItem = fileMenu.submenu.find((item) => item.label === 'New');
		expect(newItem).toBeDefined();
		expect(newItem.accelerator).toBe('CmdOrCtrl+N');

		const openItem = fileMenu.submenu.find((item) => item.label === 'Open...');
		expect(openItem).toBeDefined();
		expect(openItem.accelerator).toBe('CmdOrCtrl+O');

		const saveItem = fileMenu.submenu.find((item) => item.label === 'Save');
		expect(saveItem).toBeDefined();
		expect(saveItem.accelerator).toBe('CmdOrCtrl+S');

		const saveAsItem = fileMenu.submenu.find((item) => item.label === 'Save As...');
		expect(saveAsItem).toBeDefined();
		expect(saveAsItem.accelerator).toBe('CmdOrCtrl+Shift+S');
	});

	it('should call handler when File > New is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const newItem = fileMenu.submenu.find((item) => item.label === 'New');

		newItem.click();

		expect(mockHandlers.newFile).toHaveBeenCalled();
	});

	it('should call handler when File > Open is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const openItem = fileMenu.submenu.find((item) => item.label === 'Open...');

		openItem.click();

		expect(mockHandlers.openFile).toHaveBeenCalled();
	});

	it('should call handler when File > Save is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const saveItem = fileMenu.submenu.find((item) => item.label === 'Save');

		saveItem.click();

		expect(mockHandlers.saveFile).toHaveBeenCalled();
	});

	it('should call handler when File > Save As is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const saveAsItem = fileMenu.submenu.find((item) => item.label === 'Save As...');

		saveAsItem.click();

		expect(mockHandlers.saveFileAs).toHaveBeenCalled();
	});

	it('should call handler when File > Import .dxo is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const importItem = fileMenu.submenu.find((item) => item.label === 'Import .dxo...');

		importItem.click();

		expect(mockHandlers.importDxo).toHaveBeenCalled();
	});

	it('should include Recent Files submenu', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const fileMenu = template.find((item) => item.label === 'File');
		const recentFilesItem = fileMenu.submenu.find((item) => item.label === 'Recent Files');

		expect(recentFilesItem).toBeDefined();
		expect(mockHandlers.getRecentFilesMenu).toHaveBeenCalled();
	});

	it('should include Edit menu items with correct accelerators', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const editMenu = template.find((item) => item.label === 'Edit');

		const undoItem = editMenu.submenu.find((item) => item.label === 'Undo');
		expect(undoItem).toBeDefined();
		expect(undoItem.accelerator).toBe('CmdOrCtrl+Z');

		const redoItem = editMenu.submenu.find((item) => item.label === 'Redo');
		expect(redoItem).toBeDefined();
		expect(redoItem.accelerator).toBe('CmdOrCtrl+Shift+Z');
	});

	it('should call handler when Edit > Undo is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const editMenu = template.find((item) => item.label === 'Edit');
		const undoItem = editMenu.submenu.find((item) => item.label === 'Undo');

		undoItem.click();

		expect(mockHandlers.undo).toHaveBeenCalled();
	});

	it('should call handler when Edit > Redo is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const editMenu = template.find((item) => item.label === 'Edit');
		const redoItem = editMenu.submenu.find((item) => item.label === 'Redo');

		redoItem.click();

		expect(mockHandlers.redo).toHaveBeenCalled();
	});

	it('should include View menu items with correct accelerators', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const viewMenu = template.find((item) => item.label === 'View');

		const frequencyResponseItem = viewMenu.submenu.find((item) => item.label === 'Frequency Response');
		expect(frequencyResponseItem).toBeDefined();
		expect(frequencyResponseItem.accelerator).toBe('CmdOrCtrl+1');

		const impedanceItem = viewMenu.submenu.find((item) => item.label === 'Impedance');
		expect(impedanceItem).toBeDefined();
		expect(impedanceItem.accelerator).toBe('CmdOrCtrl+2');
	});

	it('should include Help menu with Documentation item', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const helpMenu = template.find((item) => item.label === 'Help');

		const docItem = helpMenu.submenu.find((item) => item.label === 'Documentation');
		expect(docItem).toBeDefined();
	});

	it('should call handler when Help > Documentation is clicked', () => {
		Menu.buildFromTemplate.mockReturnValue({});

		createApplicationMenu(mockWindow, mockHandlers);

		const template = Menu.buildFromTemplate.mock.calls[0][0];
		const helpMenu = template.find((item) => item.label === 'Help');
		const docItem = helpMenu.submenu.find((item) => item.label === 'Documentation');

		docItem.click();

		expect(mockHandlers.openDocumentation).toHaveBeenCalled();
	});

	describe('ChatGPT menu', () => {
		it('should include ChatGPT menu positioned after Circuit Blocks and before View', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers);

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const labels = template.map((item) => item.label);
			const circuitBlocksIndex = labels.indexOf('Circuit Blocks');
			const chatgptIndex = labels.indexOf('ChatGPT');
			const viewIndex = labels.indexOf('View');

			expect(chatgptIndex).toBeGreaterThan(circuitBlocksIndex);
			expect(chatgptIndex).toBeLessThan(viewIndex);
		});

		it('should show "Connect..." label when disconnected', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers);

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const connectItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-connect');

			expect(connectItem.label).toBe('Connect to ChatGPT');
		});

		it('should show "Disconnect ChatGPT" label when connected', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers, { chatgptConnected: true });

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const connectItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-connect');

			expect(connectItem.label).toBe('Disconnect ChatGPT');
		});

		it('should disable "Open Conversation..." when disconnected', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers);

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const openConversationItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-open-conversation');

			expect(openConversationItem.enabled).toBe(false);
		});

		it('should enable "Open Conversation..." when connected', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers, { chatgptConnected: true });

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const openConversationItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-open-conversation');

			expect(openConversationItem.enabled).toBe(true);
		});

		it('should call chatgptConnect handler when "Connect..." is clicked', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers);

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const connectItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-connect');

			connectItem.click();

			expect(mockHandlers.chatgptConnect).toHaveBeenCalled();
		});

		it('should call chatgptDisconnect handler when "Disconnect" is clicked', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers, { chatgptConnected: true });

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const connectItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-connect');

			connectItem.click();

			expect(mockHandlers.chatgptDisconnect).toHaveBeenCalled();
		});

		it('should call chatgptOpenConversation handler when "Open Conversation..." is clicked', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers, { chatgptConnected: true });

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const openConversationItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-open-conversation');

			openConversationItem.click();

			expect(mockHandlers.chatgptOpenConversation).toHaveBeenCalled();
		});

		it('should default to disconnected state when no options provided', () => {
			Menu.buildFromTemplate.mockReturnValue({});

			createApplicationMenu(mockWindow, mockHandlers);

			const template = Menu.buildFromTemplate.mock.calls[0][0];
			const chatgptMenu = template.find((item) => item.label === 'ChatGPT');
			const connectItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-connect');
			const openConversationItem = chatgptMenu.submenu.find((item) => item.id === 'chatgpt-open-conversation');

			expect(connectItem.label).toBe('Connect to ChatGPT');
			expect(openConversationItem.enabled).toBe(false);
		});
	});
});
