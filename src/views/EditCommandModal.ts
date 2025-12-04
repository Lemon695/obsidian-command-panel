import { App, Modal, Setting } from 'obsidian';
import { CommandItem } from '../types';

export class EditCommandModal extends Modal {
	result: Partial<CommandItem>;
	onSubmit: (result: Partial<CommandItem>) => void;
	originalItem: CommandItem;

	constructor(app: App, item: CommandItem, onSubmit: (result: Partial<CommandItem>) => void) {
		super(app);
		this.originalItem = item;
		this.onSubmit = onSubmit;
		this.result = {
			customName: item.customName,
			customIcon: item.customIcon
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Edit Command' });

		// 自定义名称
		new Setting(contentEl)
			.setName('Custom Name')
			.setDesc('Override the default command name')
			.addText((text) =>
				text
					.setValue(this.result.customName || '')
					.setPlaceholder('Leave empty to use default')
					.onChange((value) => {
						this.result.customName = value;
					})
			);

		// 自定义图标
		new Setting(contentEl)
			.setName('Custom Icon')
			.setDesc('Lucide icon name (e.g., calendar, zap, trash)')
			.addText((text) =>
				text
					.setValue(this.result.customIcon || '')
					.setPlaceholder('Leave empty to use default')
					.onChange((value) => {
						this.result.customIcon = value;
					})
			);

		// 按钮
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Save')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					})
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}

