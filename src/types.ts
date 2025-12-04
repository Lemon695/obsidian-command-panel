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

// 命令项
export interface CommandItem {
	commandId: string;
	customName?: string;
	customIcon?: string;
	order: number;
	color?: string; // 支持 hex 颜色或 css 变量
}

// 分组
export interface CommandGroup {
	id: string;
	name: string;
	icon: string;
	collapsed: boolean;
	order: number;
	commands: CommandItem[];
	context?: 'all' | 'editor' | 'markdown' | 'canvas'; // 可见性规则
}

// 插件设置
export interface CommandPanelSettings {
	// 布局设置
	layout: 'grid' | 'list' | 'compact';
	gridColumns: number;
	buttonSize: 'small' | 'medium' | 'large';

	// 智能功能
	showRecentlyUsed: boolean;
	recentlyUsedLimit: number;
	showMostUsed: boolean;
	mostUsedLimit: number;
	showHotkeys: boolean;
	showTooltips: boolean;
	showExecuteNotice: boolean;

	// 数据
	groups: CommandGroup[];
	recentlyUsed: string[]; // 最近使用的命令 ID 列表
	commandUsageCount: Record<string, number>; // 命令使用统计
}

// 默认设置
export const DEFAULT_SETTINGS: CommandPanelSettings = {
	layout: 'grid',
	gridColumns: 4,
	buttonSize: 'medium',

	showRecentlyUsed: true,
	recentlyUsedLimit: 20,
	showMostUsed: true,
	mostUsedLimit: 20,
	showHotkeys: true,
	showTooltips: true,
	showExecuteNotice: false,

	groups: [],
	recentlyUsed: [],
	commandUsageCount: {},
};

export const VIEW_TYPE_COMMAND_PANEL = 'command-panel-view';
