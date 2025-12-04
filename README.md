# Command Panel for Obsidian

[中文文档](./README_CN.md) | English

A powerful visual command panel plugin for Obsidian that helps you organize and quickly execute commands through an intuitive interface.

## ✨ Features

### 🎯 Core Features

- **Dual Mode Access**
  - 📌 Sidebar Panel - Persistent command panel in your sidebar
  - ⚡ Pop-up Modal - Quick access popup (supports Shift to keep open)
  
- **Smart Command Organization**
  - 📁 Custom Groups - Organize commands into logical groups
  - 🎨 Visual Customization - Custom names, icons, and colors for each command
  - 🔄 Drag & Drop - Easily reorder commands and groups
  
- **Intelligent Tracking**
  - 🕐 Recently Used - Automatically tracks your recent commands
  - 📊 Most Used - Shows your most frequently used commands with usage count badges
  - 🎯 Smart Suggestions - Commands you need, when you need them

- **Flexible Layouts**
  - 📐 Grid Layout - Compact icon-based view
  - 📋 List Layout - Detailed list with full command names
  - 🔲 Compact Layout - Maximum density for power users

- **Powerful Search**
  - 🔍 Real-time Filtering - Instant search across all commands
  - 🎯 Fuzzy Matching - Find commands even with partial matches
  - ⌨️ Keyboard Shortcuts Display - See hotkeys at a glance

### 🎨 Customization

- **Command Styling**
  - Custom icons (Lucide icons)
  - Custom names (override default)
  - Custom colors (highlight important commands)
  
- **Layout Options**
  - Adjustable grid columns (2-8)
  - Button size (Small/Medium/Large)
  - Show/hide hotkeys and tooltips

- **Context Awareness**
  - Show groups only in specific contexts (Editor/Markdown/Canvas)
  - Automatic context filtering

## 📦 Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Navigate to **Community Plugins** and disable Safe Mode
3. Click **Browse** and search for "Command Panel"
4. Click **Install** and then **Enable**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/Lemon695/obsidian-command-panel/releases)
2. Extract the files to `<vault>/.obsidian/plugins/command-panel/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## 🚀 Quick Start

### 1. Open Command Panel

**Two ways to access:**
- Click the **Grid Icon** (📊) in the ribbon → Opens sidebar panel
- Click the **Lightning Icon** (⚡) in the ribbon → Opens popup modal
- Use command palette: `Command Panel: Open (Sidebar)` or `Command Panel: Open (Pop-up)`

### 2. Create Your First Group

1. Click **"+ Add Group"** button
2. Enter a name (e.g., "Editing", "Navigation", "My Workflow")
3. Choose an icon (optional)
4. Click **Create**

### 3. Add Commands to Group

1. Click the **"+"** button in the group header
2. Search for commands in the modal
3. Select commands you want to add
4. Click **Add Selected**

### 4. Customize Commands

**Right-click any command to:**
- ✏️ Edit - Change name, icon, or color
- 📋 Copy Command ID
- 🗑️ Remove from group

**Edit command details:**
- Custom Name: Override the default command name
- Custom Icon: Choose from Lucide icons (e.g., `star`, `heart`, `zap`)
- Button Color: Pick a highlight color

### 5. Organize Your Panel

**Drag & Drop:**
- Drag commands to reorder within a group
- Drag commands between groups
- Drag groups to reorder them

**Group Management:**
- Click group header to collapse/expand
- Click **⋯** menu for more options (Rename, Move, Delete)

## 💡 Usage Tips

### Pop-up Modal Tips

- **Hold Shift** when clicking commands to keep the modal open
- **Press ESC** to clear search or close modal
- **Auto-focus** on search box for quick filtering

### Sidebar Panel Tips

- Keep frequently used commands in "Recently Used" or "Most Used"
- Use colors to categorize commands (e.g., red for delete, green for create)
- Collapse groups you don't use often to reduce clutter

### Smart Features

**Recently Used:**
- Automatically tracks last 20 commands (configurable)
- Right-click to remove specific commands
- Disable in settings if not needed

**Most Used:**
- Shows commands sorted by usage frequency
- Displays usage count badge
- Right-click to reset count for any command

### Keyboard Shortcuts

**Set custom hotkeys for:**
- `Command Panel: Open (Sidebar)` - Open sidebar panel
- `Command Panel: Open (Pop-up)` - Open popup modal

**Keyboard Navigation (in Pop-up):**
- `↑` / `↓` or `j` / `k` - Navigate up/down
- `←` / `→` or `h` / `l` - Navigate left/right
- `Enter` - Execute selected command
- `/` - Focus search box
- `ESC` - Clear search or close modal
- `Shift + Click` - Execute and keep modal open

## ⚙️ Settings

### Display Settings

- **Layout Style** - Grid, List, or Compact
- **Grid Columns** - Number of columns (2-8)
- **Button Size** - Small, Medium, or Large
- **Show Tooltips** - Display full command names on hover

### Smart Features

- **Show Recently Used** - Enable/disable recent commands tracking
- **Recently Used Limit** - Max number of recent commands (5-50)
- **Show Most Used** - Enable/disable usage statistics
- **Most Used Limit** - Max number of most used commands (5-50)
- **Show Hotkeys** - Display keyboard shortcuts on buttons
- **Show Execution Notice** - Show notification when command executes

### Data Management

- **Export Configuration** - Copy settings to clipboard as JSON
- **Import Configuration** - Restore settings from JSON
- **Reset to Defaults** - Clear all data and restore defaults

## 🎨 Customization Examples

### Example 1: Editing Workflow

```
📝 Editing
├─ Bold (⌘B) - Red color
├─ Italic (⌘I) - Orange color
├─ Highlight - Yellow color
└─ Strikethrough - Gray color
```

### Example 2: Navigation

```
🧭 Navigation
├─ Quick Switcher (⌘O)
├─ Search (⌘⇧F)
├─ Graph View
└─ File Explorer
```

### Example 3: Daily Workflow

```
📅 Daily
├─ Daily Note
├─ Weekly Review
├─ Task List
└─ Calendar
```

## 🔧 Advanced Usage

### Context-Aware Groups

Groups can be configured to show only in specific contexts:
- **All** - Always visible (default)
- **Editor** - Only in editing mode
- **Markdown** - Only in markdown files
- **Canvas** - Only in canvas view

### Batch Operations

1. Use right-click menu to quickly manage commands
2. Copy command IDs for automation
3. Export/import configurations to share with others

### Performance Tips

- Keep groups collapsed when not in use
- Limit "Recently Used" and "Most Used" to reasonable numbers
- Use search instead of scrolling through many commands

## 🐛 Troubleshooting

### Commands not appearing?

- Make sure the plugin that provides the command is enabled
- Check if the command is hidden by context filtering
- Try searching for the command name

### Panel not opening?

- Check if the plugin is enabled in Settings
- Try reloading Obsidian (Ctrl/Cmd + R)
- Check console for errors (Ctrl/Cmd + Shift + I)

### Drag & drop not working?

- Make sure you're not in search mode
- Try clicking and holding for a moment before dragging
- Check if the command/group is locked

### Settings not saving?

- Check file permissions in `.obsidian/plugins/command-panel/`
- Try exporting and re-importing configuration
- Check for conflicting plugins

## 📝 FAQ

**Q: Can I use this on mobile?**
A: Yes! The plugin is fully compatible with Obsidian mobile.

**Q: How do I share my configuration?**
A: Use Export Configuration in settings, then share the JSON with others.

**Q: Can I have the same command in multiple groups?**
A: Yes! Add the same command to as many groups as you need.

**Q: Will this slow down Obsidian?**
A: No, the plugin is optimized for performance even with 100+ commands.

**Q: Can I customize the icons?**
A: Yes! Use any Lucide icon name (see https://lucide.dev)

**Q: How do I reset everything?**
A: Go to Settings → Data Management → Reset to Defaults

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Lemon695/obsidian-command-panel.git

# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Icons from [Lucide](https://lucide.dev)
- Inspired by the Obsidian community

## 📮 Support

- 🐛 [Report Issues](https://github.com/Lemon695/obsidian-command-panel/issues)
- 💡 [Feature Requests](https://github.com/Lemon695/obsidian-command-panel/issues)
- 📖 [Documentation](https://github.com/Lemon695/obsidian-command-panel)

---

**Made with ❤️ for the Obsidian community**
