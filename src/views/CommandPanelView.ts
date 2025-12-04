import {ItemView, WorkspaceLeaf, Menu, Notice, setIcon, Platform} from 'obsidian';
import CommandPanelPlugin from '../main';
import {VIEW_TYPE_COMMAND_PANEL, CommandGroup, CommandItem, AppWithCommands} from '../types';
import {AddGroupModal} from '../modals/AddGroupModal';
import {AddCommandModal} from '../modals/AddCommandModal';
import {ICON_DEFAULT_COMMAND} from '../utils/constants';

interface DragData {
	type: 'group' | 'command';
	id: string; // commandId or groupId
	sourceGroupId?: string; // only for command
}

export class CommandPanelView extends ItemView {
	plugin: CommandPanelPlugin;
	searchQuery: string = '';

	constructor(leaf: WorkspaceLeaf, plugin: CommandPanelPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_COMMAND_PANEL;
	}

	getDisplayText(): string {
		return 'Command Panel';
	}

	getIcon(): string {
		return 'layout-grid';
	}

	async onOpen() {
		this.render();
	}

	// --- Rendering ---

	render() {
		const app = this.app as AppWithCommands;

		const container = this.contentEl;
		container.empty();
		container.addClass('command-panel-container');

		// 1. Search Bar
		this.renderSearchBar(container);

		// 2. Groups Container
		const groupsContainer = container.createDiv('command-panel-groups');

		// Filter Logic
		const groupsToRender = this.plugin.settings.groups
			.sort((a, b) => a.order - b.order)
			.map(group => {
				// If searching, filter commands inside group
				if (this.searchQuery) {
					const filteredCommands = group.commands.filter(cmd => {
						const obsidianCmd = app.commands.findCommand(cmd.commandId);
						const name = cmd.customName || obsidianCmd?.name || '';
						return name.toLowerCase().includes(this.searchQuery.toLowerCase());
					});
					// Return a shallow copy with filtered commands for rendering only
					return {...group, commands: filteredCommands, collapsed: false}; // Auto expand on search
				}
				return group;
			})
			.filter(group => {
				// Hide empty groups during search, show all otherwise
				if (this.searchQuery) return group.commands.length > 0;
				return true;
			});

		// Render "Recently Used" (Simple implementation for P0)
		if (this.plugin.settings.showRecentlyUsed && !this.searchQuery) {
			this.renderRecentlyUsed(groupsContainer);
		}

		// Render User Groups
		groupsToRender.forEach(group => {
			this.renderGroup(groupsContainer, group);
		});

		// 3. Add Group Button
		const addGroupBtn = container.createDiv('command-panel-add-group');
		setIcon(addGroupBtn.createSpan(), 'plus');
		addGroupBtn.createSpan({text: ' Add Group'});
		addGroupBtn.addEventListener('click', () => {
			new AddGroupModal(this.app, (result) => {
				this.plugin.addGroup(result.name || 'New Group', result.icon || 'folder');
				this.render();
			}).open();
		});
	}

	renderSearchBar(container: HTMLElement) {
		const searchDiv = container.createDiv('command-panel-search');
		const input = searchDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search commands...',
			cls: 'command-panel-search-input'
		});
		input.value = this.searchQuery;

		input.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.render(); // Re-render on input
			// Re-focus input after render
			const newInput = this.contentEl.querySelector('.command-panel-search-input') as HTMLInputElement;
			if (newInput) {
				newInput.focus();
				newInput.setSelectionRange(newInput.value.length, newInput.value.length);
			}
		});
	}

	renderRecentlyUsed(container: HTMLElement) {
		const recentIds = this.plugin.settings.recentlyUsed;
		if (recentIds.length === 0) return;

		const groupDiv = container.createDiv('command-panel-group');
		const header = groupDiv.createDiv('command-panel-group-header');
		setIcon(header.createSpan('command-panel-group-icon'), 'clock');
		header.createSpan({text: 'Recently Used', cls: 'command-panel-group-name'});

		const commandsDiv = groupDiv.createDiv('command-panel-commands');
		commandsDiv.addClass(`layout-${this.plugin.settings.layout}`);

		recentIds.forEach(id => {
			this.renderCommandButton(commandsDiv, {commandId: id, order: 0}, 'recent', true);
		});
	}

	renderGroup(container: HTMLElement, group: CommandGroup) {
		const groupDiv = container.createDiv('command-panel-group');

		// --- 1. 分组拖拽逻辑 ---
		groupDiv.draggable = true;
		groupDiv.addEventListener('dragstart', (e) => {
			e.stopPropagation(); // 防止冒泡（避免触发内部命令的拖拽）
			const data: DragData = {type: 'group', id: group.id};
			e.dataTransfer?.setData('application/json', JSON.stringify(data));
			groupDiv.addClass('is-dragging');
			// 设置拖拽效果
			e.dataTransfer!.effectAllowed = 'move';
		});

		groupDiv.addEventListener('dragend', () => groupDiv.removeClass('is-dragging'));

		// 分组作为放置目标 (允许把另一个分组拖到这里，或者把命令拖到这个分组)
		groupDiv.addEventListener('dragover', (e) => {
			e.preventDefault(); // 必须调用，否则无法 drop
			e.stopPropagation();

			// 添加视觉反馈
			groupDiv.addClass('drag-over');
			e.dataTransfer!.dropEffect = 'move';
		});

		groupDiv.addEventListener('dragleave', () => groupDiv.removeClass('drag-over'));

		groupDiv.addEventListener('drop', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			groupDiv.removeClass('drag-over');

			const dataStr = e.dataTransfer?.getData('application/json');
			if (!dataStr) return;
			const data: DragData = JSON.parse(dataStr);

			if (data.type === 'group' && data.id !== group.id) {
				// A. 分组排序逻辑
				// 计算是插在当前分组前面还是后面
				const rect = groupDiv.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				// 如果鼠标在分组上半部分，插在前面；下半部分，插在后面
				let newIndex = this.plugin.settings.groups.findIndex(g => g.id === group.id);
				if (e.clientY > midY) newIndex++;

				await this.plugin.reorderGroup(data.id, newIndex);
				this.render();
			} else if (data.type === 'command' && data.sourceGroupId) {
				// B. 命令拖入分组标题 (移动到该分组末尾)
				// 注意：如果是拖到具体的命令按钮上，会由 renderCommandButton 里的 drop 处理
				await this.plugin.moveCommand(
					data.id,
					data.sourceGroupId,
					group.id,
					group.commands.length // 插到最后
				);
				this.render();
			}
		});

		// Header
		const header = groupDiv.createDiv('command-panel-group-header');

		// Icon
		const iconSpan = header.createSpan('command-panel-group-icon');
		setIcon(iconSpan, group.icon || 'folder');

		// Name
		header.createSpan({text: group.name, cls: 'command-panel-group-name'});

		// Header Controls
		const controls = header.createDiv('command-panel-group-controls');

		// More Menu
		const moreBtn = controls.createSpan('command-panel-group-more');
		setIcon(moreBtn, 'more-horizontal');
		moreBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showGroupContextMenu(e, group);
		});

		// Collapse
		const collapseBtn = controls.createSpan('command-panel-group-collapse');
		setIcon(collapseBtn, group.collapsed ? 'chevron-right' : 'chevron-down');

		// Toggle Collapse
		header.addEventListener('click', () => {
			if (this.searchQuery) return; // Disable collapse during search
			group.collapsed = !group.collapsed;
			this.plugin.saveSettings();
			this.render();
		});

		// Commands Container
		if (!group.collapsed) {
			const commandsDiv = groupDiv.createDiv('command-panel-commands');
			commandsDiv.addClass(`layout-${this.plugin.settings.layout}`);

			// Render Commands
			group.commands
				.sort((a, b) => a.order - b.order)
				.forEach(cmd => {
					this.renderCommandButton(commandsDiv, cmd, group.id);
				});

			// Add Command Button (Small)
			const addCmdBtn = commandsDiv.createDiv('command-panel-add-command');
			addCmdBtn.setAttribute('aria-label', 'Add command');
			setIcon(addCmdBtn, 'plus');
			addCmdBtn.addEventListener('click', () => {
				new AddCommandModal(this.app, (cmd) => {
					this.plugin.addCommandToGroup(group.id, cmd.id);
					this.render();
				}).open();
			});
		}
	}

	renderCommandButton(container: HTMLElement, cmdItem: CommandItem, groupId: string, isReadOnly = false) {
		const app = this.app as AppWithCommands;
		const realCommand = app.commands.findCommand(cmdItem.commandId);

		// Handle missing commands (e.g. disabled plugins)
		if (!realCommand) {
			if (isReadOnly) return;
			// Optional: Render a "broken" state
			return;
		}

		const btn = container.createDiv('command-panel-button');
		// Basic Layout Styling
		if (this.plugin.settings.buttonSize) {
			container.addClass(`button-size-${this.plugin.settings.buttonSize}`);
		}

		// Icon
		const iconDiv = btn.createDiv('command-panel-button-icon');
		setIcon(iconDiv, cmdItem.customIcon || realCommand.icon || ICON_DEFAULT_COMMAND);

		// Name (unless compact)
		if (this.plugin.settings.layout !== 'compact') {
			const nameDiv = btn.createDiv('command-panel-button-name');
			nameDiv.setText(cmdItem.customName || realCommand.name);
		}

		// Hotkey
		if (this.plugin.settings.showHotkeys) {
			const hotkey = this.getHotkeyText(cmdItem.commandId);
			if (hotkey) {
				btn.createDiv('command-panel-button-hotkey').setText(hotkey);
			}
		}

		// Tooltip
		if (this.plugin.settings.showTooltips) {
			btn.setAttribute('aria-label', realCommand.name);
			btn.addClass('has-tooltip');
		}

		// Click -> Execute
		btn.addEventListener('click', () => {
			app.commands.executeCommandById(cmdItem.commandId);
			this.plugin.addToRecent(cmdItem.commandId);

			// Flash effect or notice
			if (this.plugin.settings.showRecentlyUsed) {
				// If viewing recent list, re-render might be needed,
				// but we usually don't want to re-render immediately as it shifts UI under mouse
			}
		});

		// Right Click -> Context Menu
		if (!isReadOnly) {
			btn.addEventListener('contextmenu', (e) => {
				const menu = new Menu();
				menu.addItem(item =>
					item.setTitle('Rename').setIcon('pencil').onClick(() => {
						// Quick prompt for P0
						// In P1 replace with EditCommandModal
						// For now, simple rename
					})
				);
				menu.addItem(item =>
					item.setTitle('Remove').setIcon('trash').onClick(() => {
						this.plugin.removeCommandFromGroup(groupId, cmdItem.commandId);
						this.render();
					})
				);
				menu.showAtMouseEvent(e);
			});
		}

		// Drag and Drop (Basic HTML5 implementation for P0)
		if (!isReadOnly && !this.searchQuery) {
			btn.draggable = true;

			// --- 2. 命令拖拽逻辑 ---

			// Drag Start
			btn.addEventListener('dragstart', (e) => {
				e.stopPropagation(); // 关键：防止触发分组的 dragstart
				const data: DragData = {
					type: 'command',
					id: cmdItem.commandId,
					sourceGroupId: groupId
				};
				e.dataTransfer?.setData('application/json', JSON.stringify(data));
				btn.addClass('is-dragging');
				e.dataTransfer!.effectAllowed = 'move';
			});

			// Drag End
			btn.addEventListener('dragend', () => btn.removeClass('is-dragging'));

			// Drag Over (允许其他命令插队到这个命令位置)
			btn.addEventListener('dragover', (e) => {
				e.preventDefault();
				e.stopPropagation();
				btn.addClass('drag-over');
			});

			btn.addEventListener('dragleave', () => btn.removeClass('drag-over'));

			// Drop
			btn.addEventListener('drop', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				btn.removeClass('drag-over');

				const dataStr = e.dataTransfer?.getData('application/json');
				if (!dataStr) return;
				const data: DragData = JSON.parse(dataStr);

				if (data.type === 'command' && data.sourceGroupId) {
					// 计算插入位置：如果鼠标在按钮左侧/上方，插在当前按钮前；否则插在后
					const rect = btn.getBoundingClientRect();
					const isHorizontal = this.plugin.settings.layout !== 'list'; // 网格模式主要看 X 轴，列表看 Y 轴

					let insertAfter = false;
					if (isHorizontal) {
						const midX = rect.left + rect.width / 2;
						insertAfter = e.clientX > midX;
					} else {
						const midY = rect.top + rect.height / 2;
						insertAfter = e.clientY > midY;
					}

					// 获取当前目标命令的索引
					const targetGroup = this.plugin.settings.groups.find(g => g.id === groupId);
					if (!targetGroup) return;

					let targetIndex = targetGroup.commands.findIndex(c => c.commandId === cmdItem.commandId);
					if (insertAfter) targetIndex++;

					await this.plugin.moveCommand(
						data.id,
						data.sourceGroupId,
						groupId, // 目标分组 ID
						targetIndex
					);
					this.render();
				}
			});
		}
	}

	// --- Logic Helpers ---

	showGroupContextMenu(e: MouseEvent, group: CommandGroup) {
		const menu = new Menu();
		menu.addItem(item =>
			item.setTitle('Rename').setIcon('pencil').onClick(() => {
				new AddGroupModal(this.app, (res) => {
					this.plugin.updateGroup(group.id, res);
					this.render();
				}, group).open();
			})
		);
		menu.addItem(item =>
			item.setTitle('Move Up').setIcon('arrow-up').onClick(() => {
				this.plugin.moveGroup(group.id, -1);
				this.render();
			})
		);
		menu.addItem(item =>
			item.setTitle('Move Down').setIcon('arrow-down').onClick(() => {
				this.plugin.moveGroup(group.id, 1);
				this.render();
			})
		);
		menu.addSeparator();
		menu.addItem(item =>
			item.setTitle('Delete').setIcon('trash').setWarning(true).onClick(() => {
				this.plugin.deleteGroup(group.id);
				this.render();
			})
		);
		menu.showAtMouseEvent(e);
	}

	getHotkeyText(commandId: string): string | null {
		// @ts-ignore
		const hotkeys = this.app.hotkeyManager.getHotkeys(commandId);
		if (hotkeys && hotkeys.length > 0) {
			const k = hotkeys[0];
			// Simplified hotkey string builder
			let text = '';
			if (k.modifiers.includes('Mod')) text += 'Cmd/Ctrl ';
			if (k.modifiers.includes('Shift')) text += 'Shift ';
			if (k.modifiers.includes('Alt')) text += 'Alt ';
			text += k.key.toUpperCase();
			return text;
		}
		return null;
	}
}
