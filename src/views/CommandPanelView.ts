import {ItemView, WorkspaceLeaf, Menu, Notice, setIcon, Platform, View, Command} from 'obsidian';
import CommandPanelPlugin from '../main';
import {VIEW_TYPE_COMMAND_PANEL, CommandGroup, CommandItem, AppWithCommands} from '../types';
import {AddGroupModal} from '../modals/AddGroupModal';
import {AddCommandModal} from '../modals/AddCommandModal';
import {ICON_DEFAULT_COMMAND} from '../utils/constants';
import {EditCommandModal} from "./EditCommandModal";

interface DragData {
	type: 'group' | 'command';
	id: string; // commandId or groupId
	sourceGroupId?: string; // only for command
}

export class CommandPanelView extends ItemView {
	plugin: CommandPanelPlugin;
	searchQuery: string = '';
	commandCache: Map<string, Command> = new Map();
	searchDebounceTimer: number | null = null;

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

	// 1. 添加监听器
	async onOpen() {
		this.render();

		// 监听视图变化，触发重绘
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				// 防抖，避免频繁刷新
				this.render();
			})
		);

		// 监听布局变化（例如切换编辑/阅读模式）
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.render();
			})
		);
	}

	// --- Rendering ---

	render() {
		const app = this.app as AppWithCommands;

		const container = this.contentEl;
		container.empty();
		container.addClass('command-panel-container');

		// 让 settings.gridColumns 生效
		container.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

		// 1. Search Bar
		this.renderSearchBar(container);

		// 2. Groups Container
		const groupsContainer = container.createDiv('command-panel-groups');

		// 获取当前上下文
		const activeView = this.app.workspace.getActiveViewOfType(View);
		const viewType = activeView?.getViewType(); // 'markdown', 'canvas', etc.
		// @ts-ignore - 检查是否在编辑模式 (source)
		const isEditing = activeView?.getMode ? activeView.getMode() === 'source' : false;

		// Filter Logic
		const groupsToRender = this.plugin.settings.groups
			.filter(group => {
				// 如果正在搜索，忽略上下文规则，显示所有匹配项
				if (this.searchQuery) return true;

				const context = group.context || 'all';

				if (context === 'all') return true;
				if (context === 'canvas' && viewType === 'canvas') return true;
				if (context === 'markdown' && viewType === 'markdown') return true;
				if (context === 'editor' && viewType === 'markdown' && isEditing) return true;

				return false; // 不符合当前上下文，隐藏
			})
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

		// Render "Favorites"
		if (this.plugin.settings.showFavorites && !this.searchQuery) {
			this.renderFavorites(groupsContainer);
		}

		// Render "Recently Used"
		if (this.plugin.settings.showRecentlyUsed && !this.searchQuery) {
			this.renderRecentlyUsed(groupsContainer);
		}

		// Render "Most Used"
		if (this.plugin.settings.showMostUsed && !this.searchQuery) {
			this.renderMostUsed(groupsContainer);
		}

		// Render User Groups
		groupsToRender.forEach(group => {
			this.renderGroup(groupsContainer, group);
		});

		// 空状态提示
		if (groupsToRender.length === 0 && !this.plugin.settings.showRecentlyUsed && !this.plugin.settings.showMostUsed && !this.plugin.settings.showFavorites) {
			const emptyState = groupsContainer.createDiv('command-panel-empty-state');
			const iconDiv = emptyState.createDiv('empty-state-icon');
			setIcon(iconDiv, 'inbox');
			emptyState.createEl('h3', { text: 'No Groups Yet' });
			emptyState.createEl('p', { text: 'Create your first group to organize commands' });
		}

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
			placeholder: 'Search commands... (Press / to focus)',
			cls: 'command-panel-search-input'
		});
		input.value = this.searchQuery;

		input.addEventListener('input', (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.searchQuery = value;
			
			// 防抖优化
			if (this.searchDebounceTimer) {
				window.clearTimeout(this.searchDebounceTimer);
			}
			
			this.searchDebounceTimer = window.setTimeout(() => {
				this.render();
				// Re-focus input after render
				const newInput = this.contentEl.querySelector('.command-panel-search-input') as HTMLInputElement;
				if (newInput) {
					newInput.focus();
					newInput.setSelectionRange(newInput.value.length, newInput.value.length);
				}
				
				// 记录搜索历史
				if (value.length >= 2) {
					this.plugin.addToSearchHistory(value);
				}
			}, 150);
		});
	}

	renderRecentlyUsed(container: HTMLElement) {
		const recentIds = this.plugin.settings.recentlyUsed;
		if (recentIds.length === 0) return;

		const groupDiv = container.createDiv('command-panel-group');
		const header = groupDiv.createDiv('command-panel-group-header');
		setIcon(header.createSpan('command-panel-group-icon'), 'clock');
		header.createSpan({text: 'Recently Used', cls: 'command-panel-group-name'});

		// 添加更多菜单
		const controls = header.createDiv('command-panel-group-controls');
		const moreBtn = controls.createSpan('command-panel-group-more');
		setIcon(moreBtn, 'more-horizontal');
		moreBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showSpecialGroupMenu(e, 'recent');
		});

		const commandsDiv = groupDiv.createDiv('command-panel-commands');
		commandsDiv.addClass(`layout-${this.plugin.settings.layout}`);

		recentIds.forEach(id => {
			this.renderCommandButton(commandsDiv, {commandId: id, order: 0}, 'recent', true);
		});
	}

	renderFavorites(container: HTMLElement) {
		const favorites = this.plugin.getFavoriteCommands();
		if (favorites.length === 0) return;

		const groupDiv = container.createDiv('command-panel-group');
		const header = groupDiv.createDiv('command-panel-group-header');
		setIcon(header.createSpan('command-panel-group-icon'), 'heart');
		header.createSpan({text: 'Favorites', cls: 'command-panel-group-name'});

		// 添加更多菜单
		const controls = header.createDiv('command-panel-group-controls');
		const moreBtn = controls.createSpan('command-panel-group-more');
		setIcon(moreBtn, 'more-horizontal');
		moreBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showSpecialGroupMenu(e, 'favorites');
		});

		const commandsDiv = groupDiv.createDiv('command-panel-commands');
		commandsDiv.addClass(`layout-${this.plugin.settings.layout}`);

		favorites.forEach(({ groupId, command }) => {
			this.renderCommandButton(commandsDiv, command, 'favorites', true);
		});
	}

	renderMostUsed(container: HTMLElement) {
		const mostUsedIds = this.plugin.getMostUsedCommands();
		if (mostUsedIds.length === 0) return;

		const groupDiv = container.createDiv('command-panel-group');
		const header = groupDiv.createDiv('command-panel-group-header');
		setIcon(header.createSpan('command-panel-group-icon'), 'trending-up');
		header.createSpan({text: 'Most Used', cls: 'command-panel-group-name'});

		// 添加更多菜单
		const controls = header.createDiv('command-panel-group-controls');
		const moreBtn = controls.createSpan('command-panel-group-more');
		setIcon(moreBtn, 'more-horizontal');
		moreBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showSpecialGroupMenu(e, 'most-used');
		});

		const commandsDiv = groupDiv.createDiv('command-panel-commands');
		commandsDiv.addClass(`layout-${this.plugin.settings.layout}`);

		mostUsedIds.forEach(id => {
			const count = this.plugin.settings.commandUsageCount[id] || 0;
			this.renderCommandButton(commandsDiv, {commandId: id, order: 0}, 'most-used', true, count);
		});
	}

	renderGroup(container: HTMLElement, group: CommandGroup) {
		const groupDiv = container.createDiv('command-panel-group');

		// --- 1. 分组拖拽逻辑 ---
		groupDiv.draggable = true;
		groupDiv.addEventListener('dragstart', (e) => {
			e.stopPropagation(); // 防止冒泡（避免触发内部命令的拖拽）
			const data: DragData = {type: 'group', id: group.id};
			e.dataTransfer?.setData('application/json', JSON.stringify(data));
			groupDiv.addClass('is-dragging');
			// 设置拖拽效果
			e.dataTransfer!.effectAllowed = 'move';
		});

		groupDiv.addEventListener('dragend', () => groupDiv.removeClass('is-dragging'));

		// 分组作为放置目标 (允许把另一个分组拖到这里，或者把命令拖到这个分组)
		groupDiv.addEventListener('dragover', (e) => {
			e.preventDefault(); // 必须调用，否则无法 drop
			e.stopPropagation();

			// 添加视觉反馈
			groupDiv.addClass('drag-over');
			e.dataTransfer!.dropEffect = 'move';
		});

		groupDiv.addEventListener('dragleave', () => groupDiv.removeClass('drag-over'));

		groupDiv.addEventListener('drop', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			groupDiv.removeClass('drag-over');

			const dataStr = e.dataTransfer?.getData('application/json');
			if (!dataStr) return;
			const data: DragData = JSON.parse(dataStr);

			if (data.type === 'group' && data.id !== group.id) {
				// A. 分组排序逻辑
				// 计算是插在当前分组前面还是后面
				const rect = groupDiv.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				// 如果鼠标在分组上半部分，插在前面；下半部分，插在后面
				let newIndex = this.plugin.settings.groups.findIndex(g => g.id === group.id);
				if (e.clientY > midY) newIndex++;

				await this.plugin.reorderGroup(data.id, newIndex);
				this.render();
			} else if (data.type === 'command' && data.sourceGroupId) {
				// B. 命令拖入分组标题 (移动到该分组末尾)
				// 注意：如果是拖到具体的命令按钮上，会由 renderCommandButton 里的 drop 处理
				await this.plugin.moveCommand(
					data.id,
					data.sourceGroupId,
					group.id,
					group.commands.length // 插到最后
				);
				this.render();
			}
		});

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

	renderCommandButton(container: HTMLElement, cmdItem: CommandItem, groupId: string, isReadOnly = false, usageCount?: number) {
		const app = this.app as AppWithCommands;
		
		// 使用缓存优化性能
		let realCommand = this.commandCache.get(cmdItem.commandId);
		if (!realCommand) {
			realCommand = app.commands.findCommand(cmdItem.commandId);
			if (realCommand) {
				this.commandCache.set(cmdItem.commandId, realCommand);
			}
		}

		// Handle missing commands (e.g. disabled plugins)
		if (!realCommand) {
			if (isReadOnly) return;
			// Optional: Render a "broken" state
			return;
		}

		const btn = container.createDiv('command-panel-button');

		// --- 应用颜色 ---
		if (cmdItem.color) {
			// 我们设置一个 CSS 变量，方便 CSS 处理 hover 效果
			btn.style.setProperty('--btn-color', cmdItem.color);
			btn.addClass('is-colored');

			// 简单样式：边框和图标变色
			btn.style.borderColor = cmdItem.color;
			btn.style.color = cmdItem.color;

			// 如果想要背景色淡淡的效果：
			// btn.style.backgroundColor = `${cmdItem.color}15`; // 15 是透明度
		}

		// Basic Layout Styling
		if (this.plugin.settings.buttonSize) {
			container.addClass(`button-size-${this.plugin.settings.buttonSize}`);
		}

		// Favorite Heart
		if (cmdItem.favorite && groupId !== 'favorites') {
			const heart = btn.createDiv('command-panel-button-favorite');
			setIcon(heart, 'heart');
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

		// Usage Count Badge (for most used)
		if (usageCount !== undefined && usageCount > 0) {
			const badge = btn.createDiv('command-panel-button-badge');
			badge.setText(usageCount.toString());
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
		btn.addEventListener('contextmenu', (e) => {
			const menu = new Menu();

			// 特殊处理：收藏、最近使用和最多使用
			if (groupId === 'favorites') {
				// 收藏分组中的命令可以取消收藏
				menu.addItem(item =>
					item.setTitle('Remove from Favorites').setIcon('heart-off').onClick(() => {
						// 找到原始分组并取消收藏
						const favorites = this.plugin.getFavoriteCommands();
						const fav = favorites.find(f => f.command.commandId === cmdItem.commandId);
						if (fav) {
							this.plugin.toggleFavorite(fav.groupId, cmdItem.commandId);
							this.render();
						}
					})
				);
				menu.showAtMouseEvent(e);
				return;
			}

			if (groupId === 'recent') {
				menu.addItem(item =>
					item.setTitle('Remove from Recently Used').setIcon('x').onClick(() => {
						this.plugin.removeFromRecent(cmdItem.commandId);
						this.render();
					})
				);
				menu.showAtMouseEvent(e);
				return;
			}

			if (groupId === 'most-used') {
				menu.addItem(item =>
					item.setTitle('Reset Usage Count').setIcon('rotate-ccw').onClick(() => {
						this.plugin.resetCommandUsage(cmdItem.commandId);
						this.render();
					})
				);
				menu.showAtMouseEvent(e);
				return;
			}

			// 普通命令的右键菜单
			if (!isReadOnly) {

				// 0. 收藏/取消收藏
				menu.addItem(item =>
					item
						.setTitle(cmdItem.favorite ? 'Remove from Favorites' : 'Add to Favorites')
						.setIcon(cmdItem.favorite ? 'heart-off' : 'heart')
						.onClick(() => {
							this.plugin.toggleFavorite(groupId, cmdItem.commandId);
							this.render();
						})
				);

				menu.addSeparator();

				// 1. 编辑 (Edit)
				menu.addItem(item =>
					item.setTitle('Edit').setIcon('pencil').onClick(() => {
						new EditCommandModal(this.app, cmdItem, (updates) => {
							this.plugin.updateCommand(groupId, cmdItem.commandId, updates);
							this.render();
						}).open();
					})
				);

				menu.addSeparator();

				// 2. 移动到其他分组 (Move to Group) - 解决长列表拖拽难的问题
				menu.addItem(item => {
					item.setTitle('Move to Group...').setIcon('folder-input');
					// 创建子菜单逻辑 (Obsidian API 未直接提供子菜单 UI，通常用 Modal 或扁平化处理)
					// 这里我们使用一种巧妙的方法：点击后弹出一个小的建议列表，或者直接列出

					// 由于 Obsidian Menu API 的限制，通常直接列出分组比较长。
					// 简单的做法是：
					const subMenu = (item as any).setSubmenu(); // 注意：setSubmenu 是较新 API，需确保 types 匹配

					this.plugin.settings.groups.forEach(g => {
						if (g.id === groupId) return; // 跳过当前组
						subMenu.addItem((subItem: any) => {
							subItem.setTitle(g.name)
								.setIcon(g.icon || 'folder')
								.onClick(async () => {
									await this.plugin.moveCommand(
										cmdItem.commandId,
										groupId,
										g.id,
										g.commands.length // 移动到末尾
									);
									this.render();
								});
						});
					});
				});

				menu.addSeparator();

				// 3. 复制 ID (Copy ID)
				menu.addItem(item =>
					item.setTitle('Copy Command ID').setIcon('copy').onClick(() => {
						navigator.clipboard.writeText(cmdItem.commandId);
						new Notice('Command ID copied to clipboard');
					})
				);

				// 4. 移除 (Remove)
				menu.addItem(item =>
					item.setTitle('Remove').setIcon('trash').setWarning(true).onClick(() => {
						this.plugin.removeCommandFromGroup(groupId, cmdItem.commandId);
						this.render();
					})
				);

				menu.showAtMouseEvent(e);
			}
		});

		// Click -> Execute (增加执行反馈)
		btn.addEventListener('click', () => {
			const success = app.commands.executeCommandById(cmdItem.commandId);

			if (success) {
				this.plugin.addToRecent(cmdItem.commandId);

				// 增加统计计数 (P2 功能)
				const count = this.plugin.settings.commandUsageCount[cmdItem.commandId] || 0;
				this.plugin.settings.commandUsageCount[cmdItem.commandId] = count + 1;
				this.plugin.saveSettings();

				// 执行反馈通知 (P0/P1 功能)
				if (this.plugin.settings.showExecuteNotice && realCommand) {
					new Notice(`Executed: ${cmdItem.customName || realCommand.name}`);
				}
			} else {
				new Notice(`Failed to execute command. Is the plugin enabled?`);
			}
		});

		// Drag and Drop (Basic HTML5 implementation for P0)
		if (!isReadOnly && !this.searchQuery) {
			btn.draggable = true;

			// --- 2. 命令拖拽逻辑 ---

			// Drag Start
			btn.addEventListener('dragstart', (e) => {
				e.stopPropagation(); // 关键：防止触发分组的 dragstart
				const data: DragData = {
					type: 'command',
					id: cmdItem.commandId,
					sourceGroupId: groupId
				};
				e.dataTransfer?.setData('application/json', JSON.stringify(data));
				btn.addClass('is-dragging');
				e.dataTransfer!.effectAllowed = 'move';
			});

			// Drag End
			btn.addEventListener('dragend', () => btn.removeClass('is-dragging'));

			// Drag Over (允许其他命令插队到这个命令位置)
			btn.addEventListener('dragover', (e) => {
				e.preventDefault();
				e.stopPropagation();
				btn.addClass('drag-over');
			});

			btn.addEventListener('dragleave', () => btn.removeClass('drag-over'));

			// Drop
			btn.addEventListener('drop', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				btn.removeClass('drag-over');

				const dataStr = e.dataTransfer?.getData('application/json');
				if (!dataStr) return;
				const data: DragData = JSON.parse(dataStr);

				if (data.type === 'command' && data.sourceGroupId) {
					// 计算插入位置：如果鼠标在按钮左侧/上方，插在当前按钮前；否则插在后
					const rect = btn.getBoundingClientRect();
					const isHorizontal = this.plugin.settings.layout !== 'list'; // 网格模式主要看 X 轴，列表看 Y 轴

					let insertAfter = false;
					if (isHorizontal) {
						const midX = rect.left + rect.width / 2;
						insertAfter = e.clientX > midX;
					} else {
						const midY = rect.top + rect.height / 2;
						insertAfter = e.clientY > midY;
					}

					// 获取当前目标命令的索引
					const targetGroup = this.plugin.settings.groups.find(g => g.id === groupId);
					if (!targetGroup) return;

					let targetIndex = targetGroup.commands.findIndex(c => c.commandId === cmdItem.commandId);
					if (insertAfter) targetIndex++;

					await this.plugin.moveCommand(
						data.id,
						data.sourceGroupId,
						groupId, // 目标分组 ID
						targetIndex
					);
					this.render();
				}
			});
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

	showSpecialGroupMenu(e: MouseEvent, groupType: 'favorites' | 'recent' | 'most-used') {
		const menu = new Menu();
		
		if (groupType === 'favorites') {
			menu.addItem(item =>
				item.setTitle('Clear All Favorites').setIcon('heart-off').setWarning(true).onClick(() => {
					if (confirm('Are you sure you want to remove all favorites?')) {
						// 清除所有收藏
						this.plugin.settings.groups.forEach(group => {
							group.commands.forEach(cmd => {
								cmd.favorite = false;
							});
						});
						this.plugin.saveSettings();
						this.render();
					}
				})
			);
		} else if (groupType === 'recent') {
			menu.addItem(item =>
				item.setTitle('Clear Recently Used').setIcon('x').setWarning(true).onClick(() => {
					this.plugin.settings.recentlyUsed = [];
					this.plugin.saveSettings();
					this.render();
				})
			);
		} else if (groupType === 'most-used') {
			menu.addItem(item =>
				item.setTitle('Clear Usage Statistics').setIcon('rotate-ccw').setWarning(true).onClick(() => {
					if (confirm('Are you sure you want to clear all usage statistics?')) {
						this.plugin.settings.commandUsageCount = {};
						this.plugin.saveSettings();
						this.render();
					}
				})
			);
		}
		
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
