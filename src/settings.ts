import {App, Notice, PluginSettingTab, Setting} from 'obsidian';
import CommandPanelPlugin from './main';
import {DEFAULT_SETTINGS} from "./types";

export class CommandPanelSettingTab extends PluginSettingTab {
	plugin: CommandPanelPlugin;

	constructor(app: App, plugin: CommandPanelPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'Command Panel Settings'});

		new Setting(containerEl)
			.setName('Layout Style')
			.setDesc('Choose how commands are displayed.')
			.addDropdown(dropdown => dropdown
				.addOption('grid', 'Grid')
				.addOption('list', 'List')
				.addOption('compact', 'Compact')
				.setValue(this.plugin.settings.layout)
				.onChange(async (value) => {
					this.plugin.settings.layout = value as any;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Recently Used')
			.setDesc('Display recently executed commands at the top.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRecentlyUsed)
				.onChange(async (value) => {
					this.plugin.settings.showRecentlyUsed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Recently Used Limit')
			.setDesc('Maximum number of recent commands to show.')
			.addSlider(slider => slider
				.setLimits(5, 50, 5)
				.setValue(this.plugin.settings.recentlyUsedLimit)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recentlyUsedLimit = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Most Used')
			.setDesc('Display most frequently used commands.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMostUsed)
				.onChange(async (value) => {
					this.plugin.settings.showMostUsed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Most Used Limit')
			.setDesc('Maximum number of most used commands to show.')
			.addSlider(slider => slider
				.setLimits(5, 50, 5)
				.setValue(this.plugin.settings.mostUsedLimit)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.mostUsedLimit = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Hotkeys')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showHotkeys)
				.onChange(async (value) => {
					this.plugin.settings.showHotkeys = value;
					await this.plugin.saveSettings();
				}));

		// --- Data Management Section ---
		containerEl.createEl('h3', {text: 'Data Management'});

		new Setting(containerEl)
			.setName('Export Configuration')
			.setDesc('Copy your current groups and commands to clipboard.')
			.addButton(btn => btn
				.setButtonText('Copy to Clipboard')
				.onClick(async () => {
					const data = JSON.stringify(this.plugin.settings, null, 2);
					await navigator.clipboard.writeText(data);
					new Notice('Configuration copied to clipboard!');
				}));

		new Setting(containerEl)
			.setName('Import Configuration')
			.setDesc('Paste configuration JSON from clipboard. ⚠️ This will overwrite your current settings!')
			.addButton(btn => btn
				.setButtonText('Import from Clipboard')
				.setWarning() // 红色警告按钮
				.onClick(async () => {
					try {
						const text = await navigator.clipboard.readText();
						const imported = JSON.parse(text);

						// 简单的校验
						if (!imported.groups && !imported.layout) {
							throw new Error('Invalid configuration format');
						}

						// 合并默认设置，防止旧版本缺字段
						this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, imported);
						await this.plugin.saveSettings();

						// 刷新视图
						await this.plugin.activateView();
						new Notice('Configuration imported successfully!');
					} catch (e) {
						new Notice('Failed to import: Invalid JSON data.');
						console.error(e);
					}
				}));

		// 危险操作：重置
		new Setting(containerEl)
			.setName('Reset to Defaults')
			.setDesc('Clear all groups and restore default settings.')
			.addButton(btn => btn
				.setButtonText('Reset')
				.setWarning()
				.onClick(async () => {
					if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
						this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
						await this.plugin.saveSettings();
						await this.plugin.activateView();
						new Notice('Reset complete.');
					}
				}));

		new Setting(containerEl)
			.setName('Grid Columns')
			.setDesc('Number of columns in grid layout (2-8).')
			.addSlider(slider => slider
				.setLimits(2, 8, 1)
				.setValue(this.plugin.settings.gridColumns)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.gridColumns = value;
					await this.plugin.saveSettings();
					// 如果视图是打开的，可能需要刷新，或者让 CSS 变量响应式生效（需要在 render 中重新注入）
					// 最简单的办法是用户下次打开或我们手动触发刷新
					// this.plugin.refreshViews(); // 需要你自己实现一个简单的刷新方法
				}));

		new Setting(containerEl)
			.setName('Show Execution Notice')
			.setDesc('Show a notification when a command is executed.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showExecuteNotice ?? false) // 默认 false
				.onChange(async (value) => {
					this.plugin.settings.showExecuteNotice = value;
					await this.plugin.saveSettings();
				}));
	}
}
