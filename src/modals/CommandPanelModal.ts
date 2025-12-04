import { App, Modal, setIcon, Notice, Platform, Menu } from 'obsidian';
import CommandPanelPlugin from '../main';
import { CommandGroup, CommandItem, AppWithCommands } from '../types';
import { ICON_DEFAULT_COMMAND } from '../utils/constants';
import { AddCommandModal } from './AddCommandModal';
import {EditCommandModal} from "../views/EditCommandModal";

export class CommandPanelModal extends Modal {
	plugin: CommandPanelPlugin;
	searchQuery: string = '';
	searchInputEl: HTMLInputElement | null = null;
	contentContainerEl: HTMLElement | null = null;
	selectedIndex: number = -1;
	commandButtons: HTMLElement[] = [];
	searchDebounceTimer: number | null = null;

	constructor(app: App, plugin: CommandPanelPlugin) {
		super(app);
		this.plugin = plugin;
		this.modalEl.addClass('command-panel-modal-container');
		
		// 直接设置弹窗尺寸，和 Obsidian 设置弹窗一样大
		this.modalEl.style.setProperty('--dialog-width', '90vw');
		this.modalEl.style.setProperty('--dialog-max-width', '1200px');
		this.modalEl.style.setProperty('--dialog-height', '85vh');
	}

	onOpen() {
		// 强制设置弹窗容器尺寸
		const modalContainer = this.containerEl.querySelector('.modal') as HTMLElement;
		if (modalContainer) {
			modalContainer.style.width = '90vw';
			modalContainer.style.maxWidth = '1200px';
			modalContainer.style.height = '85vh';
			modalContainer.style.maxHeight = '85vh';
		}
		
		this.render();
		
		// 自动聚焦搜索框
		setTimeout(() => {
			this.searchInputEl?.focus();
		}, 50);

		// 键盘导航
		this.setupKeyboardNavigation();
	}

	setupKeyboardNavigation() {
		this.contentEl.addEventListener('keydown', (e) => {
			// 如果在搜索框中，只处理特定按键
			if (document.activeElement === this.searchInputEl) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					this.selectNext();
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					this.selectPrevious();
				} else if (e.key === 'Enter' && this.selectedIndex >= 0) {
					e.preventDefault();
					this.executeSelected();
				}
				return;
			}

			// 全局键盘导航
			switch (e.key) {
				case 'ArrowDown':
				case 'j':
					e.preventDefault();
					this.selectNext();
					break;
				case 'ArrowUp':
				case 'k':
					e.preventDefault();
					this.selectPrevious();
					break;
				case 'ArrowRight':
				case 'l':
					e.preventDefault();
					this.selectNextInRow();
					break;
				case 'ArrowLeft':
				case 'h':
					e.preventDefault();
					this.selectPreviousInRow();
					break;
				case 'Enter':
					e.preventDefault();
					this.executeSelected();
					break;
				case '/':
					e.preventDefault();
					this.searchInputEl?.focus();
					break;
			}
		});
	}

	selectNext() {
		if (this.commandButtons.length === 0) return;
		this.selectedIndex = (this.selectedIndex + 1) % this.commandButtons.length;
		this.updateSelection();
	}

	selectPrevious() {
		if (this.commandButtons.length === 0) return;
		this.selectedIndex = this.selectedIndex <= 0 
			? this.commandButtons.length - 1 
			: this.selectedIndex - 1;
		this.updateSelection();
	}

	selectNextInRow() {
		if (this.commandButtons.length === 0) return;
		const cols = this.plugin.settings.gridColumns;
		this.selectedIndex = Math.min(
			this.selectedIndex + 1,
			this.commandButtons.length - 1
		);
		this.updateSelection();
	}

	selectPreviousInRow() {
		if (this.commandButtons.length === 0) return;
		this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
		this.updateSelection();
	}

	updateSelection() {
		// 移除所有选中状态
		this.commandButtons.forEach(btn => btn.removeClass('keyboard-selected'));
		
		// 添加选中状态
		if (this.selectedIndex >= 0 && this.selectedIndex < this.commandButtons.length) {
			const selected = this.commandButtons[this.selectedIndex];
			selected.addClass('keyboard-selected');
			selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	executeSelected() {
		if (this.selectedIndex >= 0 && this.selectedIndex < this.commandButtons.length) {
			this.commandButtons[this.selectedIndex].click();
		}
	}

	onClose() {
		this.contentEl.empty();
		this.searchQuery = '';
	}

	render() {
		const { contentEl } = this;
		contentEl.empty();

		// 标题栏
		const titleBar = contentEl.createDiv('command-panel-modal-header');
		titleBar.createEl('h2', { text: 'Command Panel', cls: 'command-panel-modal-title' });
		
		// 提示文字
		const hint = titleBar.createDiv('command-panel-modal-hint');
		hint.setText('↑↓ Navigate • Enter Execute • / Search • Shift Keep Open');

		// 搜索框
		this.renderSearchBar(contentEl);

		// 内容容器（固定高度，避免跳动）
		this.contentContainerEl = contentEl.createDiv('command-panel-modal-content');

		// 初始渲染内容
		this.renderContent();
	}

	renderSearchBar(container: HTMLElement) {
		const searchDiv = container.createDiv('command-panel-modal-search');
		this.searchInputEl = searchDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search commands...',
			cls: 'command-panel-search-input'
		});
		this.searchInputEl.value = this.searchQuery;

		// 使用 input 事件，只更新内容区域，不重新渲染整个面板
		this.searchInputEl.addEventListener('input', (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.searchQuery = value;
			
			// 防抖优化
			if (this.searchDebounceTimer) {
				window.clearTimeout(this.searchDebounceTimer);
			}
			
			this.searchDebounceTimer = window.setTimeout(() => {
				this.renderContent();
				// 记录搜索历史（当用户停止输入时）
				if (value.length >= 2) {
					this.plugin.addToSearchHistory(value);
				}
			}, 150);
		});

		// ESC 键清空搜索或关闭弹窗
		this.searchInputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				if (this.searchQuery) {
					this.searchQuery = '';
					if (this.searchInputEl) {
						this.searchInputEl.value = '';
					}
					this.renderContent();
				} else {
					this.close();
				}
			}
		});
	}

	// 只更新内容区域，不影响搜索框
	renderContent() {
		if (!this.contentContainerEl) return;
		
		this.contentContainerEl.empty();
		this.commandButtons = [];
		this.selectedIndex = -1;

		const app = this.app as AppWithCommands;

		// 收藏分组
		if (this.plugin.settings.showFavorites && !this.searchQuery) {
			this.renderFavorites(this.contentContainerEl);
		}

		// 最近使用分组
		if (this.plugin.settings.showRecentlyUsed && !this.searchQuery) {
			this.renderRecentlyUsed(this.contentContainerEl);
		}

		// 最多使用分组
		if (this.plugin.settings.showMostUsed && !this.searchQuery) {
			this.renderMostUsed(this.contentContainerEl);
		}

		// 用户分组
		const groupsToRender = this.plugin.settings.groups
			.filter(group => {
				// 搜索时显示所有分组
				if (this.searchQuery) return true;
				// 可以添加上下文过滤逻辑
				return true;
			})
			.sort((a, b) => a.order - b.order)
			.map(group => {
				// 搜索过滤
				if (this.searchQuery) {
					const filteredCommands = group.commands.filter(cmd => {
						const obsidianCmd = app.commands.findCommand(cmd.commandId);
						const name = cmd.customName || obsidianCmd?.name || '';
						return name.toLowerCase().includes(this.searchQuery.toLowerCase());
					});
					return { ...group, commands: filteredCommands };
				}
				return group;
			})
			.filter(group => {
				// 搜索时隐藏空分组
				if (this.searchQuery) return group.commands.length > 0;
				return group.commands.length > 0;
			});

		groupsToRender.forEach(group => {
			this.renderGroup(this.contentContainerEl!, group);
		});

		// 空状态
		if (groupsToRender.length === 0 && this.searchQuery) {
			const empty = this.contentContainerEl.createDiv('command-panel-modal-empty');
			empty.setText('No commands found');
		}
	}

	renderRecentlyUsed(container: HTMLElement) {
		const recentIds = this.plugin.settings.recentlyUsed;
		if (recentIds.length === 0) return;

		const groupEl = container.createDiv('command-panel-group-minimal');

		// 分组标题
		const header = groupEl.createDiv('group-header-minimal');
		const iconSpan = header.createSpan('group-icon-minimal');
		setIcon(iconSpan, 'clock');
		header.createSpan({ text: 'Recently Used' });

		// 命令网格
		const commandsEl = groupEl.createDiv('command-grid-minimal');
		commandsEl.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

		recentIds.slice(0, this.plugin.settings.recentlyUsedLimit).forEach(id => {
			this.renderButton(commandsEl, { commandId: id, order: 0 }, 'recent');
		});
	}

	renderFavorites(container: HTMLElement) {
		const favorites = this.plugin.getFavoriteCommands();
		if (favorites.length === 0) return;

		const groupEl = container.createDiv('command-panel-group-minimal');

		// 分组标题
		const header = groupEl.createDiv('group-header-minimal');
		const iconSpan = header.createSpan('group-icon-minimal');
		setIcon(iconSpan, 'star');
		header.createSpan({ text: 'Favorites' });

		// 命令网格
		const commandsEl = groupEl.createDiv('command-grid-minimal');
		commandsEl.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

		favorites.forEach(({ groupId, command }) => {
			this.renderButton(commandsEl, command, groupId);
		});
	}

	renderMostUsed(container: HTMLElement) {
		const mostUsedIds = this.plugin.getMostUsedCommands();
		if (mostUsedIds.length === 0) return;

		const groupEl = container.createDiv('command-panel-group-minimal');

		// 分组标题
		const header = groupEl.createDiv('group-header-minimal');
		const iconSpan = header.createSpan('group-icon-minimal');
		setIcon(iconSpan, 'trending-up');
		header.createSpan({ text: 'Most Used' });

		// 命令网格
		const commandsEl = groupEl.createDiv('command-grid-minimal');
		commandsEl.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

		mostUsedIds.forEach(id => {
			const count = this.plugin.settings.commandUsageCount[id] || 0;
			this.renderButton(commandsEl, { commandId: id, order: 0 }, 'most-used', count);
		});
	}

	renderGroup(container: HTMLElement, group: CommandGroup) {
		const groupEl = container.createDiv('command-panel-group-minimal');

		// 分组标题（带添加按钮）
		const header = groupEl.createDiv('group-header-minimal');
		const iconSpan = header.createSpan('group-icon-minimal');
		setIcon(iconSpan, group.icon || 'folder');
		header.createSpan({ text: group.name });

		// 添加命令按钮（在标题右侧）
		const addBtn = header.createSpan('group-add-btn-minimal');
		setIcon(addBtn, 'plus');
		addBtn.setAttribute('aria-label', 'Add command to this group');
		addBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openAddCommandModal(group.id);
		});

		// 命令网格
		const commandsEl = groupEl.createDiv('command-grid-minimal');
		commandsEl.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

		group.commands
			.sort((a, b) => a.order - b.order)
			.forEach(cmd => {
				this.renderButton(commandsEl, cmd, group.id);
			});
	}

	openAddCommandModal(groupId: string) {
		new AddCommandModal(this.app, (cmd) => {
			this.plugin.addCommandToGroup(groupId, cmd.id);
			this.renderContent();
		}).open();
	}

	showCommandContextMenu(e: MouseEvent, cmdItem: CommandItem, groupId: string) {
		const menu = new Menu();

		// 收藏分组 - 取消收藏
		if (groupId === 'favorites') {
			menu.addItem(item =>
				item.setTitle('Remove from Favorites').setIcon('star-off').onClick(() => {
					const favorites = this.plugin.getFavoriteCommands();
					const fav = favorites.find(f => f.command.commandId === cmdItem.commandId);
					if (fav) {
						this.plugin.toggleFavorite(fav.groupId, cmdItem.commandId);
						this.renderContent();
					}
				})
			);
		}
		// 最近使用 - 移除
		else if (groupId === 'recent') {
			menu.addItem(item =>
				item.setTitle('Remove from Recently Used').setIcon('x').onClick(() => {
					this.plugin.removeFromRecent(cmdItem.commandId);
					this.renderContent();
				})
			);
		}
		// 最多使用 - 重置计数
		else if (groupId === 'most-used') {
			menu.addItem(item =>
				item.setTitle('Reset Usage Count').setIcon('rotate-ccw').onClick(() => {
					this.plugin.resetCommandUsage(cmdItem.commandId);
					this.renderContent();
				})
			);
		}
		// 普通分组 - 完整菜单
		else if (groupId) {
			// 收藏/取消收藏
			menu.addItem(item =>
				item
					.setTitle(cmdItem.favorite ? 'Remove from Favorites' : 'Add to Favorites')
					.setIcon(cmdItem.favorite ? 'star-off' : 'star')
					.onClick(() => {
						this.plugin.toggleFavorite(groupId, cmdItem.commandId);
						this.renderContent();
					})
			);

			menu.addSeparator();

			menu.addItem(item =>
				item.setTitle('Edit').setIcon('pencil').onClick(() => {
					new EditCommandModal(this.app, cmdItem, (updates) => {
						this.plugin.updateCommand(groupId, cmdItem.commandId, updates);
						this.renderContent();
					}).open();
				})
			);

			menu.addSeparator();

			menu.addItem(item =>
				item.setTitle('Copy Command ID').setIcon('copy').onClick(() => {
					navigator.clipboard.writeText(cmdItem.commandId);
					new Notice('Command ID copied to clipboard');
				})
			);

			menu.addItem(item =>
				item.setTitle('Remove').setIcon('trash').setWarning(true).onClick(() => {
					this.plugin.removeCommandFromGroup(groupId, cmdItem.commandId);
					this.renderContent();
				})
			);
		}

		menu.showAtMouseEvent(e);
	}

	renderButton(container: HTMLElement, cmdItem: CommandItem, groupId: string = '', usageCount?: number) {
		const app = this.app as AppWithCommands;
		const realCmd = app.commands.findCommand(cmdItem.commandId);
		if (!realCmd) return;

		const btn = container.createDiv('command-btn-minimal');

		// 应用颜色
		if (cmdItem.color) {
			btn.style.setProperty('--btn-color', cmdItem.color);
			btn.addClass('is-colored');
			btn.style.borderColor = cmdItem.color;
			btn.style.color = cmdItem.color;
		}

		// 收藏星标
		if (cmdItem.favorite && groupId !== 'favorites') {
			const star = btn.createDiv('cmd-star');
			setIcon(star, 'star');
		}

		// 图标
		const iconDiv = btn.createDiv('cmd-icon');
		setIcon(iconDiv, cmdItem.customIcon || realCmd.icon || ICON_DEFAULT_COMMAND);

		// 名称
		const nameDiv = btn.createDiv('cmd-name');
		nameDiv.setText(cmdItem.customName || realCmd.name);

		// 快捷键
		if (this.plugin.settings.showHotkeys) {
			const hotkey = this.getHotkeyText(cmdItem.commandId);
			if (hotkey) {
				const hotkeyDiv = btn.createDiv('cmd-hotkey');
				hotkeyDiv.setText(hotkey);
			}
		}

		// 使用次数徽章
		if (usageCount !== undefined && usageCount > 0) {
			const badge = btn.createDiv('cmd-badge');
			badge.setText(usageCount.toString());
		}

		// 工具提示
		if (this.plugin.settings.showTooltips) {
			btn.setAttribute('aria-label', realCmd.name);
		}

		// 右键菜单
		btn.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showCommandContextMenu(e, cmdItem, groupId);
		});

		// 点击执行
		btn.addEventListener('click', (e) => {
			const success = app.commands.executeCommandById(cmdItem.commandId);

			if (success) {
				// 记录最近使用
				this.plugin.addToRecent(cmdItem.commandId);

				// 更新使用统计
				const count = this.plugin.settings.commandUsageCount[cmdItem.commandId] || 0;
				this.plugin.settings.commandUsageCount[cmdItem.commandId] = count + 1;
				this.plugin.saveSettings();

				// 显示通知
				if (this.plugin.settings.showExecuteNotice) {
					new Notice(`Executed: ${cmdItem.customName || realCmd.name}`, 1500);
				}

				// 如果没按住 Shift，关闭弹窗
				if (!e.shiftKey) {
					this.close();
				}
			} else {
				new Notice('Failed to execute command');
			}
		});

		// 收集按钮用于键盘导航
		this.commandButtons.push(btn);
	}

	getHotkeyText(commandId: string): string | null {
		// @ts-ignore
		const hotkeys = this.app.hotkeyManager.getHotkeys(commandId);
		if (hotkeys && hotkeys.length > 0) {
			const k = hotkeys[0];
			const parts = [];
			
			if (k.modifiers.includes('Mod')) {
				parts.push(Platform.isMacOS ? '⌘' : 'Ctrl');
			}
			if (k.modifiers.includes('Shift')) {
				parts.push(Platform.isMacOS ? '⇧' : 'Shift');
			}
			if (k.modifiers.includes('Alt')) {
				parts.push(Platform.isMacOS ? '⌥' : 'Alt');
			}
			if (k.modifiers.includes('Ctrl') && Platform.isMacOS) {
				parts.push('⌃');
			}
			
			parts.push(k.key.toUpperCase());
			
			return parts.join(Platform.isMacOS ? '' : '+');
		}
		return null;
	}
}
