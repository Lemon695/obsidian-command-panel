import { App, Modal, Setting } from 'obsidian';
import { CommandGroup } from '../types';

export class AddGroupModal extends Modal {
	result: Partial<CommandGroup>;
	onSubmit: (result: Partial<CommandGroup>) => void;
	isEditing: boolean;
	initialData?: CommandGroup;

	constructor(
		app: App,
		onSubmit: (result: Partial<CommandGroup>) => void,
		initialData?: CommandGroup
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.initialData = initialData;
		this.isEditing = !!initialData;
		this.result = initialData ? { ...initialData } : { name: '', icon: 'folder', collapsed: false };
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.isEditing ? 'Edit Group' : 'Add New Group' });

		new Setting(contentEl)
			.setName('Group Name')
			.addText((text) =>
				text
					.setValue(this.result.name || '')
					.onChange((value) => {
						this.result.name = value;
					})
			);

		new Setting(contentEl)
			.setName('Icon (Lucide name)')
			.setDesc('e.g., folder, star, zap')
			.addText((text) =>
				text
					.setValue(this.result.icon || 'folder')
					.onChange((value) => {
						this.result.icon = value;
					})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(this.isEditing ? 'Save' : 'Create')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

