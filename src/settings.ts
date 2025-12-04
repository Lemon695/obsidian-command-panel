import { App, PluginSettingTab, Setting } from 'obsidian';
import CommandPanelPlugin from './main';

export class CommandPanelSettingTab extends PluginSettingTab {
	plugin: CommandPanelPlugin;

	constructor(app: App, plugin: CommandPanelPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Command Panel Settings' });

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
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRecentlyUsed)
				.onChange(async (value) => {
					this.plugin.settings.showRecentlyUsed = value;
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
	}
}
