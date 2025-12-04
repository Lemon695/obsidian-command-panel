import {Plugin, WorkspaceLeaf} from 'obsidian';
import {CommandPanelSettings, DEFAULT_SETTINGS, VIEW_TYPE_COMMAND_PANEL, CommandGroup} from './types';
import {CommandPanelView} from './views/CommandPanelView';
import {CommandPanelSettingTab} from './settings';

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
		const {workspace} = this.app;

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

	// 1. 重新排序分组
	async reorderGroup(groupId: string, newIndex: number) {
		const oldIndex = this.settings.groups.findIndex(g => g.id === groupId);
		if (oldIndex < 0 || newIndex < 0 || newIndex >= this.settings.groups.length) return;

		// 移动元素
		const group = this.settings.groups[oldIndex];
		this.settings.groups.splice(oldIndex, 1);
		this.settings.groups.splice(newIndex, 0, group);

		// 更新所有分组的 order 属性，确保数据一致性
		this.settings.groups.forEach((g, i) => g.order = i);

		await this.saveSettings();
	}

	// 2. 移动命令 (支持组内排序 和 跨组移动)
	async moveCommand(commandId: string, sourceGroupId: string, targetGroupId: string, targetIndex: number) {
		const sourceGroup = this.settings.groups.find(g => g.id === sourceGroupId);
		const targetGroup = this.settings.groups.find(g => g.id === targetGroupId);

		if (!sourceGroup || !targetGroup) return;

		// 找到要移动的命令
		const commandIndex = sourceGroup.commands.findIndex(c => c.commandId === commandId);
		if (commandIndex < 0) return;

		// 取出命令
		const [commandToMove] = sourceGroup.commands.splice(commandIndex, 1);

		// 如果是在同一个组内移动，且目标索引在原索引之后，需要修正索引（因为数组长度变小了）
		if (sourceGroupId === targetGroupId && targetIndex > commandIndex) {
			targetIndex--;
		}

		// 插入命令到目标位置
		// 确保索引不越界
		targetIndex = Math.max(0, Math.min(targetIndex, targetGroup.commands.length));
		targetGroup.commands.splice(targetIndex, 0, commandToMove);

		// 更新排序属性 (可选，取决于你是否依赖 order 字段)
		sourceGroup.commands.forEach((c, i) => c.order = i);
		if (sourceGroupId !== targetGroupId) {
			targetGroup.commands.forEach((c, i) => c.order = i);
		}

		await this.saveSettings();
	}

	updateCommand(groupId: string, commandId: string, data: Partial<import('./types').CommandItem>) {
		const group = this.settings.groups.find(g => g.id === groupId);
		if (group) {
			const command = group.commands.find(c => c.commandId === commandId);
			if (command) {
				// 更新属性
				if (data.customName !== undefined) command.customName = data.customName;
				if (data.customIcon !== undefined) command.customIcon = data.customIcon;
				if (data.color !== undefined) command.color = data.color;

				this.saveSettings();
			}
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
