# Prism FM

A modern, transparent file manager for Linux with glassmorphism UI.

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Platform](https://img.shields.io/badge/platform-Linux-lightgrey)
![Preview](file-manager.png)

## Features

- 🎨 **Glassmorphism UI** - Beautiful transparent interface with backdrop blur
- ⚡ **Fast & Lightweight** - Optimized Electron with GPU acceleration
- 🖼️ **Image Previews** - Built-in image viewer with metadata
- 📁 **Dual Pane** - Side-by-side file navigation
- 🏷️ **File Tagging** - Color-coded organization system
- 🔍 **Quick Search** - Find files instantly
- 📋 **File Operations** - Copy, move, delete with undo support
- 🗜️ **Archive Support** - Extract and compress files
- 🎯 **XDG Portal** - System-wide file picker integration

## Installation

### Quick Install

```bash
git clone https://github.com/compiledkernel-idk/prism-fm.git
cd prism-fm
chmod +x install.sh
./install.sh
```

### Dependencies

- Node.js >= 18.0.0
- npm
- Electron

## Usage

Run from terminal:
```bash
prism-fm [path]
```

Or launch from your application menu as "Prism FM".

### Keyboard Shortcuts

- `Ctrl+C` - Copy
- `Ctrl+X` - Cut
- `Ctrl+V` - Paste
- `Ctrl+A` - Select all
- `Ctrl+R` - Refresh
- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab
- `Ctrl+L` - Focus path bar
- `Ctrl+F` - Focus search
- `Ctrl+H` - Toggle hidden files
- `F2` - Rename
- `Delete` - Move to trash
- `Shift+Delete` - Permanent delete

## Configuration

Prism FM stores its configuration in `~/.config/prism-fm/`.

### Hyprland Users

For best transparency on Hyprland, add to your config:

```
layerrule = blur,class:prism-fm
windowrulev2 = opacity 0.9 0.8,class:^(prism-fm)$
```

## Development

```bash
# Run in development mode
npm run dev

# Start normally
npm start
```

## Credits

- Original author: tomiwaf
- Continued development: compiledkernel-idk

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.
