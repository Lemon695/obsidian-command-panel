import { Plugin, WorkspaceLeaf } from 'obsidian';
import { CommandPanelSettings, DEFAULT_SETTINGS, VIEW_TYPE_COMMAND_PANEL, CommandGroup } from './types';
import { CommandPanelView } from './views/CommandPanelView';
import { CommandPanelSettingTab } from './settings';

export default class CommandPanelPlugin extends Plugin {
	settings: CommandPanelSettings;

	async onload() {
		await this.loadSettings();

		// Register View
		this.registerView(
			VIEW_TYPE_COMMAND_PANEL,
			(leaf) => new CommandPanelView(leaf, this)
		);

		// Ribbon Icon
		this.addRibbonIcon('layout-grid', 'Open Command Panel', () => {
			this.activateView();
		});

		// Command to open
		this.addCommand({
			id: 'open-command-panel',
			name: 'Open Command Panel',
			callback: () => this.activateView(),
		});

		// Settings Tab
		this.addSettingTab(new CommandPanelSettingTab(this.app, this));
	}

	onunload() {
		// Standard cleanup
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_COMMAND_PANEL)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_COMMAND_PANEL,
					active: true,
				});
				leaf = workspace.getLeavesOfType(VIEW_TYPE_COMMAND_PANEL)[0];
			}
		}

		if (leaf) workspace.revealLeaf(leaf);
	}

	// --- Data Management API for View ---

	addGroup(name: string, icon: string) {
		const newGroup: CommandGroup = {
			id: crypto.randomUUID(),
			name,
			icon,
			collapsed: false,
			order: this.settings.groups.length,
			commands: []
		};
		this.settings.groups.push(newGroup);
		this.saveSettings();
	}

	updateGroup(id: string, data: Partial<CommandGroup>) {
		const group = this.settings.groups.find(g => g.id === id);
		if (group) {
			Object.assign(group, data);
			this.saveSettings();
		}
	}

	deleteGroup(id: string) {
		this.settings.groups = this.settings.groups.filter(g => g.id !== id);
		this.saveSettings();
	}

	moveGroup(id: string, direction: number) {
		const index = this.settings.groups.findIndex(g => g.id === id);
		if (index < 0) return;
		const newIndex = index + direction;

		if (newIndex >= 0 && newIndex < this.settings.groups.length) {
			const temp = this.settings.groups[index];
			this.settings.groups[index] = this.settings.groups[newIndex];
			this.settings.groups[newIndex] = temp;

			// Update order properties
			this.settings.groups.forEach((g, i) => g.order = i);
			this.saveSettings();
		}
	}

	addCommandToGroup(groupId: string, commandId: string) {
		const group = this.settings.groups.find(g => g.id === groupId);
		if (group) {
			group.commands.push({
				commandId,
				order: group.commands.length
			});
			this.saveSettings();
		}
	}

	removeCommandFromGroup(groupId: string, commandId: string) {
		const group = this.settings.groups.find(g => g.id === groupId);
		if (group) {
			group.commands = group.commands.filter(c => c.commandId !== commandId);
			this.saveSettings();
		}
	}

	addToRecent(commandId: string) {
		// Remove if exists
		this.settings.recentlyUsed = this.settings.recentlyUsed.filter(id => id !== commandId);
		// Add to front
		this.settings.recentlyUsed.unshift(commandId);
		// Limit
		if (this.settings.recentlyUsed.length > this.settings.recentlyUsedLimit) {
			this.settings.recentlyUsed.pop();
		}
		this.saveSettings();
	}
}
