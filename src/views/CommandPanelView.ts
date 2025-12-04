import {ItemView, WorkspaceLeaf, Menu, Notice, setIcon, Platform} from 'obsidian';
import CommandPanelPlugin from '../main';
import {VIEW_TYPE_COMMAND_PANEL, CommandGroup, CommandItem, AppWithCommands} from '../types';
import {AddGroupModal} from '../modals/AddGroupModal';
import {AddCommandModal} from '../modals/AddCommandModal';
import {ICON_DEFAULT_COMMAND} from '../utils/constants';

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
			btn.setAttribute('draggable', 'true');
			btn.addEventListener('dragstart', (e) => {
				e.dataTransfer?.setData('text/plain', JSON.stringify({
					type: 'command',
					groupId: groupId,
					commandId: cmdItem.commandId
				}));
				btn.addClass('is-dragging');
			});
			btn.addEventListener('dragend', () => btn.removeClass('is-dragging'));
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
