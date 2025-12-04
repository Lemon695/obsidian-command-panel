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

		// 颜色选择器
		new Setting(this.contentEl)
			.setName('Button Color')
			.setDesc('Pick a highlight color for this button')
			.addColorPicker(color => color
				.setValue(this.result.color || '#000000')
				.onChange(value => {
					this.result.color = value;
				})
			)
			// 添加一个清除颜色的按钮
			.addExtraButton(btn => btn
				.setIcon('x')
				.setTooltip('Clear color')
				.onClick(() => {
					this.result.color = undefined;
					// 强制刷新一下 UI 显示（可选）
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

