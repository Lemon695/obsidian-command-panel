import { App, FuzzySuggestModal, Command } from 'obsidian';

export class AddCommandModal extends FuzzySuggestModal<Command> {
	onChoose: (item: Command) => void;

	constructor(app: App, onChoose: (item: Command) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder('Select a command to add...');
	}

	getItems(): Command[] {
		// @ts-ignore - Accessing internal commands list
		return Object.values(this.app.commands.commands);
	}

	getItemText(item: Command): string {
		return item.name;
	}

	onChooseItem(item: Command, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(item);
	}
}

