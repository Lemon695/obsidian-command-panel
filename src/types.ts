import {App, Command} from 'obsidian';

export interface AppWithCommands extends App {
	commands: {
		commands: Record<string, Command>; // 所有已注册命令的字典
		findCommand(id: string): Command | undefined;
		executeCommandById(id: string): boolean;
		listCommands(): Command[];
	};
	// 如果需要访问插件管理器，也可以在这里定义
	// plugins: { ... }
}

export interface CommandItem {
	commandId: string;
	customName?: string;
	customIcon?: string;
	order: number;
}

export interface CommandGroup {
	id: string;
	name: string;
	icon: string;
	collapsed: boolean;
	order: number;
	commands: CommandItem[];
}

export interface CommandPanelSettings {
	// P0 & P1 Features
	layout: 'grid' | 'list' | 'compact';
	gridColumns: number;
	buttonSize: 'small' | 'medium' | 'large';

	showRecentlyUsed: boolean;
	recentlyUsedLimit: number;
	showHotkeys: boolean;
	showTooltips: boolean;
	groups: CommandGroup[];
	recentlyUsed: string[]; // List of command IDs
	commandUsageCount: Record<string, number>;
	showExecuteNotice: boolean;
}

export const DEFAULT_SETTINGS: CommandPanelSettings = {
	layout: 'grid',
	gridColumns: 4,
	buttonSize: 'medium',

	showRecentlyUsed: true,
	recentlyUsedLimit: 20,
	showHotkeys: true,
	showTooltips: true,
	groups: [],
	recentlyUsed: [],
	commandUsageCount: {},
	showExecuteNotice: false,
};

// 1. 扩展命令项，支持颜色
export interface CommandItem {
	commandId: string;
	customName?: string;
	customIcon?: string;
	order: number;
	color?: string; // 新增：支持 hex 颜色或 css 变量
}

// 2. 扩展分组，支持上下文可见性
export interface CommandGroup {
	id: string;
	name: string;
	icon: string;
	collapsed: boolean;
	order: number;
	commands: CommandItem[];
	// 新增：可见性规则
	context?: 'all' | 'editor' | 'markdown' | 'canvas';
}

export const VIEW_TYPE_COMMAND_PANEL = 'command-panel-view';
