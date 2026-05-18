const { createEditHandler, EDIT_GROUP_TIMEOUT_MS } = require('../../../src/main/chatgpt-edit-handler');

describe('ChatgptEditHandler', () => {
	let handler;
	let store;
	let mainWindow;
	let socket;
	let emittedMessages;

	beforeEach(() => {
		jest.useFakeTimers();

		emittedMessages = [];

		store = {
			commit: jest.fn(),
			dispatch: jest.fn(),
			getters: {
				'circuit/circuit': {
					getComponent: jest.fn((id) => {
						if (id === 'resistor-1') {
							return {
								id: 'resistor-1',
								type: 'resistor',
								label: 'R1',
								x: 100,
								y: 200,
								rotation: 0,
								parameters: { resistance: 8 },
								toJSON() {
									return {
										id: this.id,
										type: this.type,
										label: this.label,
										x: this.x,
										y: this.y,
										rotation: this.rotation,
										parameters: { ...this.parameters },
									};
								},
							};
						}
						return null;
					}),
					getWire: jest.fn((id) => {
						if (id === 'wire-1') {
							return {
								id: 'wire-1',
								startNode: 'resistor-1',
								endNode: 'cap-1',
								toJSON() {
									return {
										id: this.id,
										startNode: this.startNode,
										endNode: this.endNode,
									};
								},
							};
						}
						return null;
					}),
					wires: [
						{
							id: 'wire-1',
							startNode: 'resistor-1',
							endNode: 'cap-1',
							toJSON() {
								return { id: 'wire-1', startNode: 'resistor-1', endNode: 'cap-1' };
							},
						},
						{
							id: 'wire-2',
							startNode: 'cap-1',
							endNode: 'ground-1',
							toJSON() {
								return { id: 'wire-2', startNode: 'cap-1', endNode: 'ground-1' };
							},
						},
					],
					toJSON() {
						return { version: '1.0', components: [], wires: [] };
					},
				},
			},
		};

		mainWindow = {
			isDestroyed: jest.fn(() => false),
			webContents: {
				send: jest.fn(),
			},
		};

		socket = {
			isConnected: jest.fn(() => true),
			socket: {
				emit: jest.fn((event, message) => {
					emittedMessages.push({ event, message });
				}),
			},
		};

		handler = createEditHandler({ store, mainWindow, socket });
	});

	afterEach(() => {
		handler.destroy();
		jest.useRealTimers();
	});

	describe('handleEditRequest routing', () => {
		it('should route request:optimize to the optimize handler', () => {
			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-1');

			expect(store.commit).toHaveBeenCalledWith('circuit/UPDATE_COMPONENT', {
				componentId: 'resistor-1',
				updates: { parameters: { resistance: 10 } },
			});
		});

		it('should route request:addComponent to the add component handler', () => {
			const component = {
				id: 'cap-2', type: 'capacitor', label: 'C2', x: 0, y: 0, rotation: 0, parameters: { capacitance: 0.000001 },
			};
			handler.handleEditRequest('request:addComponent', { component }, 'req-2');

			expect(store.commit).toHaveBeenCalledWith('circuit/ADD_COMPONENT', component);
		});

		it('should send an error response for unknown request types', () => {
			handler.handleEditRequest('request:unknownAction', {}, 'req-99');

			expect(emittedMessages).toHaveLength(1);
			expect(emittedMessages[0].message.payload.success).toBe(false);
			expect(emittedMessages[0].message.payload.error).toContain('Unknown edit request type');
		});
	});

	describe('request:optimize', () => {
		it('should push undo with previous parameters and apply new ones', () => {
			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-1');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'updateComponent',
				payload: { componentId: 'resistor-1', updates: { parameters: { resistance: 8 } } },
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/CLEAR_REDO');
			expect(store.commit).toHaveBeenCalledWith('circuit/UPDATE_COMPONENT', {
				componentId: 'resistor-1',
				updates: { parameters: { resistance: 10 } },
			});
		});

		it('should trigger simulation after applying', () => {
			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-1');

			expect(store.dispatch).toHaveBeenCalledWith('simulation/runSimulation');
		});

		it('should send a success response with the updated component', () => {
			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-1');

			expect(emittedMessages).toHaveLength(1);
			expect(emittedMessages[0].message.type).toBe('response:optimize');
			expect(emittedMessages[0].message.requestId).toBe('req-1');
			expect(emittedMessages[0].message.payload.success).toBe(true);
			expect(emittedMessages[0].message.payload.component.id).toBe('resistor-1');
		});

		it('should return an error if the component does not exist', () => {
			handler.handleEditRequest('request:optimize', { componentId: 'nonexistent', parameters: {} }, 'req-1');

			expect(emittedMessages[0].message.payload.success).toBe(false);
			expect(emittedMessages[0].message.payload.error).toContain('nonexistent');
		});

		it('should return an error if no circuit is loaded', () => {
			store.getters['circuit/circuit'] = null;
			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: {} }, 'req-1');

			expect(emittedMessages[0].message.payload.success).toBe(false);
			expect(emittedMessages[0].message.payload.error).toContain('No active circuit');
		});
	});

	describe('request:setCircuitLayout', () => {
		it('should push undo with the previous layout and replace the circuit', () => {
			const newLayout = { version: '2.0', components: [{ id: 'new-comp' }], wires: [] };
			handler.handleEditRequest('request:setCircuitLayout', { layout: newLayout }, 'req-2');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'setCircuitLayout',
				payload: { version: '1.0', components: [], wires: [] },
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/SET_CIRCUIT', newLayout);
		});

		it('should notify the renderer to re-render', () => {
			handler.handleEditRequest('request:setCircuitLayout', { layout: {} }, 'req-2');

			expect(mainWindow.webContents.send).toHaveBeenCalledWith('circuit-layout-replaced');
		});

		it('should send a success response with the applied layout', () => {
			const newLayout = { version: '2.0', components: [], wires: [] };
			handler.handleEditRequest('request:setCircuitLayout', { layout: newLayout }, 'req-2');

			expect(emittedMessages[0].message.type).toBe('response:setCircuitLayout');
			expect(emittedMessages[0].message.payload.success).toBe(true);
			expect(emittedMessages[0].message.payload.layout).toEqual(newLayout);
		});
	});

	describe('request:addComponent', () => {
		it('should add the component and push undo', () => {
			const component = { id: 'cap-2', type: 'capacitor' };
			handler.handleEditRequest('request:addComponent', { component }, 'req-3');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'removeComponent',
				payload: 'cap-2',
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/ADD_COMPONENT', component);
		});

		it('should send a success response', () => {
			const component = { id: 'cap-2', type: 'capacitor' };
			handler.handleEditRequest('request:addComponent', { component }, 'req-3');

			expect(emittedMessages[0].message.type).toBe('response:addComponent');
			expect(emittedMessages[0].message.payload.success).toBe(true);
		});
	});

	describe('request:removeComponent', () => {
		it('should remove the component and report affected wires', () => {
			handler.handleEditRequest('request:removeComponent', { componentId: 'resistor-1' }, 'req-4');

			expect(store.commit).toHaveBeenCalledWith('circuit/REMOVE_COMPONENT', 'resistor-1');
			expect(emittedMessages[0].message.payload.affectedWireIds).toEqual(['wire-1']);
		});

		it('should return an error if the component does not exist', () => {
			handler.handleEditRequest('request:removeComponent', { componentId: 'nonexistent' }, 'req-4');

			expect(emittedMessages[0].message.payload.success).toBe(false);
		});
	});

	describe('request:addWire', () => {
		it('should add the wire and push undo', () => {
			const wire = { id: 'wire-3', startNode: 'a', endNode: 'b' };
			handler.handleEditRequest('request:addWire', { wire }, 'req-5');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'removeWire',
				payload: 'wire-3',
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/ADD_WIRE', wire);
		});
	});

	describe('request:removeWire', () => {
		it('should remove the wire and push undo', () => {
			handler.handleEditRequest('request:removeWire', { wireId: 'wire-1' }, 'req-6');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'addWire',
				payload: { id: 'wire-1', startNode: 'resistor-1', endNode: 'cap-1' },
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/REMOVE_WIRE', 'wire-1');
		});

		it('should return an error if the wire does not exist', () => {
			handler.handleEditRequest('request:removeWire', { wireId: 'nonexistent' }, 'req-6');

			expect(emittedMessages[0].message.payload.success).toBe(false);
		});
	});

	describe('request:moveComponent', () => {
		it('should update the component position and push undo', () => {
			handler.handleEditRequest('request:moveComponent', { componentId: 'resistor-1', x: 300, y: 400 }, 'req-7');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'updateComponent',
				payload: { componentId: 'resistor-1', updates: { x: 100, y: 200 } },
			});
			expect(store.commit).toHaveBeenCalledWith('circuit/UPDATE_COMPONENT', {
				componentId: 'resistor-1',
				updates: { x: 300, y: 400 },
			});
		});

		it('should send a success response with the updated component', () => {
			handler.handleEditRequest('request:moveComponent', { componentId: 'resistor-1', x: 300, y: 400 }, 'req-7');

			expect(emittedMessages[0].message.type).toBe('response:moveComponent');
			expect(emittedMessages[0].message.payload.success).toBe(true);
			expect(emittedMessages[0].message.payload.component.id).toBe('resistor-1');
		});
	});

	describe('request:beginEditGroup', () => {
		it('should save an undo checkpoint and activate the edit group', () => {
			handler.handleEditRequest('request:beginEditGroup', { description: 'Test group' }, 'req-8');

			expect(store.commit).toHaveBeenCalledWith('circuit/PUSH_UNDO', {
				type: 'setCircuitLayout',
				payload: { version: '1.0', components: [], wires: [] },
			});
			expect(handler.isEditGroupActive()).toBe(true);
		});

		it('should send a success response with the description', () => {
			handler.handleEditRequest('request:beginEditGroup', { description: 'Batch edit' }, 'req-8');

			expect(emittedMessages[0].message.type).toBe('response:beginEditGroup');
			expect(emittedMessages[0].message.payload.success).toBe(true);
			expect(emittedMessages[0].message.payload.description).toBe('Batch edit');
		});
	});

	describe('request:endEditGroup', () => {
		it('should deactivate the edit group', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			handler.handleEditRequest('request:endEditGroup', {}, 'req-9');

			expect(handler.isEditGroupActive()).toBe(false);
		});

		it('should send a success response', () => {
			handler.handleEditRequest('request:endEditGroup', {}, 'req-9');

			expect(emittedMessages[0].message.type).toBe('response:endEditGroup');
			expect(emittedMessages[0].message.payload.success).toBe(true);
		});
	});

	describe('edit group undo suppression', () => {
		it('should not push individual undo entries when edit group is active', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			store.commit.mockClear();

			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-10');

			// Should NOT have called PUSH_UNDO for the optimize
			const pushUndoCalls = store.commit.mock.calls.filter(
				(call) => call[0] === 'circuit/PUSH_UNDO',
			);
			expect(pushUndoCalls).toHaveLength(0);
		});

		it('should resume pushing undo entries after edit group ends', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			handler.handleEditRequest('request:endEditGroup', {}, 'req-9');
			store.commit.mockClear();

			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-10');

			const pushUndoCalls = store.commit.mock.calls.filter(
				(call) => call[0] === 'circuit/PUSH_UNDO',
			);
			expect(pushUndoCalls).toHaveLength(1);
		});
	});

	describe('60-second edit group timeout', () => {
		it('should auto-close the edit group after 60 seconds', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			expect(handler.isEditGroupActive()).toBe(true);

			jest.advanceTimersByTime(EDIT_GROUP_TIMEOUT_MS);

			expect(handler.isEditGroupActive()).toBe(false);
		});

		it('should not auto-close before 60 seconds', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');

			jest.advanceTimersByTime(EDIT_GROUP_TIMEOUT_MS - 1);

			expect(handler.isEditGroupActive()).toBe(true);
		});

		it('should clear the timeout when endEditGroup is received', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			handler.handleEditRequest('request:endEditGroup', {}, 'req-9');

			jest.advanceTimersByTime(EDIT_GROUP_TIMEOUT_MS);

			// Should still be inactive (was already closed)
			expect(handler.isEditGroupActive()).toBe(false);
		});
	});

	describe('socket disconnected', () => {
		it('should not send a response if the socket is disconnected', () => {
			socket.isConnected.mockReturnValue(false);

			handler.handleEditRequest('request:optimize', { componentId: 'resistor-1', parameters: { resistance: 10 } }, 'req-1');

			expect(socket.socket.emit).not.toHaveBeenCalled();
		});
	});

	describe('destroy', () => {
		it('should clear the edit group timeout and deactivate the group', () => {
			handler.handleEditRequest('request:beginEditGroup', {}, 'req-8');
			handler.destroy();

			expect(handler.isEditGroupActive()).toBe(false);

			// Advancing time should not cause issues
			jest.advanceTimersByTime(EDIT_GROUP_TIMEOUT_MS);
			expect(handler.isEditGroupActive()).toBe(false);
		});
	});
});
