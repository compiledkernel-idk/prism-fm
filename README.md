# Prism FM

A lightweight, transparent file manager for Linux utilizing Electron.

![Preview](file-manager.png)

## Features

- **Transparent UI**: Designed for seamless integration with modern compositors (Hyprland, Sway, etc.).
- **Dual Pane Navigation**: Efficient file management with side-by-side views.
- **Core Operations**: Copy, move, delete, rename, and archive management.
- **Preview System**: Integrated image and text previews.
- **Tagging**: Essential file organization with color-coded tags.
- **XDG Integration**: Functions as a system-wide directory picker.

## Installation

```bash
git clone https://github.com/compiledkernel-idk/prism-fm.git
cd prism-fm
./install.sh
```

**Dependencies:** Node.js >= 18.0.0, npm, Electron.

## Usage

Launch via terminal or application menu:
```bash
prism-fm [path]
```

### Key Bindings

| Key | Action |
| :--- | :--- |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `F2` | Rename |
| `Del` / `Shift+Del` | Trash / Permanent Delete |
| `Ctrl+T` / `Ctrl+W` | New Tab / Close Tab |
| `Ctrl+L` | Focus Path |
| `Ctrl+H` | Toggle Hidden Files |

## Configuration

Configuration is stored in `~/.config/prism-fm/`.

**Compositor Configuration (Hyprland):**
```ini
layerrule = blur,class:prism-fm
windowrulev2 = opacity 0.9 0.8,class:^(prism-fm)$
```

## License

GPL-3.0
