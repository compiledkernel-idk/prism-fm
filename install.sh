#!/bin/bash
# Prism FM - Electron-based File Manager Installer

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Prism FM Installer             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo

# Check for root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please don't run as root. The script will ask for sudo when needed.${NC}"
    exit 1
fi

# Detect distro
detect_distro() {
    if [ -f /etc/arch-release ]; then
        echo "arch"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/fedora-release ]; then
        echo "fedora"
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)
echo -e "${GREEN}Detected:${NC} $DISTRO"

# Install dependencies
echo -e "\n${BLUE}[1/3]${NC} Installing dependencies..."

case $DISTRO in
    arch)
        sudo pacman -S --needed --noconfirm nodejs npm electron
        ;;
    debian)
        sudo apt update
        sudo apt install -y nodejs npm
        sudo npm install -g electron
        ;;
    fedora)
        sudo dnf install -y nodejs npm
        sudo npm install -g electron
        ;;
    *)
        echo -e "${RED}Unsupported distro. Please install nodejs and npm manually.${NC}"
        exit 1
        ;;
esac

# Install npm dependencies
echo -e "\n${BLUE}[2/3]${NC} Installing npm packages..."
npm install

# Install app
echo -e "\n${BLUE}[3/3]${NC} Installing Prism FM..."

# Create installation directory
INSTALL_DIR="$HOME/.local/share/prism-fm"
mkdir -p "$INSTALL_DIR"

# Copy files
cp -r * "$INSTALL_DIR/" 2>/dev/null || true

# Create wrapper script
sudo tee /usr/local/bin/prism-fm > /dev/null <<'EOF'
#!/bin/bash
cd "$HOME/.local/share/prism-fm"
npm start "$@"
EOF

sudo chmod +x /usr/local/bin/prism-fm

# Create desktop entry
mkdir -p ~/.local/share/applications
tee ~/.local/share/applications/prism-fm.desktop > /dev/null <<'EOF'
[Desktop Entry]
Type=Application
Name=Prism FM
GenericName=File Manager
Comment=A modern, transparent file manager with glassmorphism UI
Exec=prism-fm %U
Icon=prism-fm
Terminal=false
Categories=System;FileTools;FileManager;Utility;
Keywords=files;folders;directory;browser;explorer;manager;
StartupNotify=true
StartupWMClass=prism-fm
MimeType=inode/directory;
Actions=NewWindow;

[Desktop Action NewWindow]
Name=New Window
Exec=prism-fm
EOF

# Copy icon
if [ -f "icon.png" ]; then
    mkdir -p ~/.local/share/icons/hicolor/128x128/apps
    mkdir -p ~/.local/share/icons/hicolor/256x256/apps
    cp icon.png ~/.local/share/icons/hicolor/128x128/apps/prism-fm.png
    cp icon.png ~/.local/share/icons/hicolor/256x256/apps/prism-fm.png
    gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true
fi

# Update desktop database
update-desktop-database ~/.local/share/applications 2>/dev/null || true

echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Installation Complete! 🎉          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo -e "\nRun with: ${BLUE}prism-fm${NC}"
echo -e "Or find 'Prism FM' in your application menu."
