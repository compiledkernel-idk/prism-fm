let currentPath = "";
let homeDirectory = "";
let startupPathArg = "";
let history = [];
let historyIndex = -1;
let selectedItems = new Set();
let clipboardItems = [];
let clipboardOperation = null;
let clipboardSourcePaneId = null;
let currentItems = [];
let sortBy = "name";
let sortAscending = true;
let showHidden = false;
let calculateFolderSizes = true;
let fileTags = {};
let viewMode = "detailed";
let thumbnailSize = 140;
let showPreviewPane = false;
let groupBy = "none";
let visibleColumns = { size: true, modified: true, added: true };
let viewSettingsCache = {};
let commonDirs = {};
let collapsedGroups = new Set();
let pickerMode = null;

let tabs = [];
let activeTabIndex = -1;
let splitViewEnabled = false;
let activePaneId = "left";
const panes = {};

const TAG_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];
const TAG_HEX = {
  red: "#ff5f57",
  orange: "#ffbd2e",
  yellow: "#ffcc00",
  green: "#28c940",
  blue: "#3578f6",
  purple: "#bd93f9",
  gray: "#8e8e93",
};

const BUILTIN_ICONS = {
  folder: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  desktop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  documents: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  downloads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  pictures: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`,
  music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  videos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  config: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  root: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/><path d="M12 4v16"/></svg>`,
};

const THEME_COLOR_GROUPS = [
  {
    title: "Backgrounds",
    items: [
      { label: "App background", varName: "--bg-primary", hint: "Main window" },
      { label: "Toolbar & status", varName: "--bg-secondary", hint: "Top/bottom bars" },
      { label: "Panels", varName: "--bg-tertiary", hint: "Cards and buttons" },
      { label: "Overlays", varName: "--bg-overlay", hint: "Floating surfaces" },
      { label: "Menus", varName: "--menu-bg", hint: "Context + view menus" },
      { label: "Menu overlay", varName: "--menu-overlay-bg", hint: "Menu backplates" },
      { label: "Hover highlight", varName: "--bg-hover", hint: "Hover state" },
      { label: "Active highlight", varName: "--bg-active", hint: "Active state" },
      { label: "Modal backdrop", varName: "--modal-backdrop", hint: "Dim background" },
    ],
  },
  {
    title: "Text & Lines",
    items: [
      { label: "Primary text", varName: "--text-primary", hint: "Main labels" },
      { label: "Secondary text", varName: "--text-secondary", hint: "Subtitles" },
      { label: "Muted text", varName: "--text-muted", hint: "Hints and meta" },
      { label: "Borders", varName: "--border-color", hint: "Dividers" },
    ],
  },
  {
    title: "Accents",
    items: [
      { label: "Accent", varName: "--accent-color", hint: "Highlights" },
      { label: "Accent hover", varName: "--accent-hover", hint: "Active icons" },
      { label: "Success", varName: "--success-color", hint: "Success status" },
      { label: "Danger", varName: "--danger-color", hint: "Warnings" },
    ],
  },
];
const THEME_COLOR_VARS = THEME_COLOR_GROUPS.reduce((acc, group) => {
  for (const item of group.items) acc.push(item.varName);
  return acc;
}, []);
const THEME_BASE_PRESETS = {
  dark: {
    "--bg-primary": "rgba(30, 30, 40, 0)",
    "--bg-secondary": "rgba(45, 45, 60, 0)",
    "--bg-tertiary": "rgba(60, 60, 80, 0)",
    "--bg-overlay": "rgba(100, 100, 100, 0)",
    "--menu-bg": "rgba(30, 30, 40, 0.6)",
    "--menu-overlay-bg": "rgba(30, 30, 40, 0.7)",
    "--bg-hover": "rgba(255, 255, 255, 0.25)",
    "--bg-active": "rgba(100, 100, 100, 0.5)",
    "--modal-backdrop": "rgba(0, 0, 0, 0.5)",
    "--text-primary": "rgba(255, 255, 255, 0.95)",
    "--text-secondary": "rgba(255, 255, 255, 0.7)",
    "--text-muted": "rgba(255, 255, 255, 0.5)",
    "--border-color": "rgba(255, 255, 255, 0.1)",
  },
  light: {
    "--bg-primary": "rgba(245, 245, 250, 0)",
    "--bg-secondary": "rgba(250, 250, 252, 0.55)",
    "--bg-tertiary": "rgba(255, 255, 255, 0.45)",
    "--bg-overlay": "rgba(255, 255, 255, 0.65)",
    "--menu-bg": "rgba(255, 255, 255, 0.78)",
    "--menu-overlay-bg": "rgba(255, 255, 255, 0.88)",
    "--bg-hover": "rgba(0, 0, 0, 0.08)",
    "--bg-active": "rgba(0, 0, 0, 0.16)",
    "--modal-backdrop": "rgba(0, 0, 0, 0.5)",
    "--text-primary": "rgba(20, 20, 24, 0.92)",
    "--text-secondary": "rgba(20, 20, 24, 0.68)",
    "--text-muted": "rgba(20, 20, 24, 0.45)",
    "--border-color": "rgba(0, 0, 0, 0.12)",
  },
};

const QUICK_ACCESS_STORAGE_KEY = "quickAccessItemsV1";
const DEFAULT_BUILTINS = [
  { id: "trash", type: "builtin", key: "trash", label: "Trash" },
  { id: "root", type: "builtin", key: "root", label: "Root" },
  { id: "home", type: "builtin", key: "home", label: "Home" },
  { id: "desktop", type: "builtin", key: "desktop", label: "Desktop" },
  { id: "documents", type: "builtin", key: "documents", label: "Documents" },
  { id: "downloads", type: "builtin", key: "downloads", label: "Downloads" },
  { id: "pictures", type: "builtin", key: "pictures", label: "Pictures" },
  { id: "music", type: "builtin", key: "music", label: "Music" },
  { id: "videos", type: "builtin", key: "videos", label: "Videos" },
  { id: "config", type: "builtin", key: "config", label: ".config" },
];

const BUILTIN_REGISTRY = DEFAULT_BUILTINS.reduce((acc, b) => {
  acc[b.key] = b;
  return acc;
}, {});

function inferBuiltinKeyFromName(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (!n) return null;

  const map = {
    trash: "trash",
    "recycle bin": "trash",

    root: "root",
    "/": "root",

    home: "home",
    "~": "home",

    desktop: "desktop",
    documents: "documents",
    downloads: "downloads",
    pictures: "pictures",
    music: "music",
    videos: "videos",

    ".config": "config",
    config: "config",
  };

  return map[n] || null;
}

let quickAccessItems = [];
let pinnedListEl = null;
let drivesListEl = null;
let tagsListEl = null;

let hasRealTrashFolder = false;

let isInTrash = false;

let newFolderBtn;
let newFileBtn;
let emptyTrashBtn;

let draggedItems = [];
let dragSourcePaneId = null;
let isDragging = false;
let dragScrollInterval = null;
let draggedQaId = null;
let dragHoverTimer = null;
const DRAG_HOVER_DELAY = 800;

let contextMenuPanel;
let contextSubmenu;
let contextMenuMode = "background";
let contextSubmenuOpen = false;

let contextPinTargetPath = null;
let contextPinTargetLabel = null;

let contextQuickAccessId = null;

function validateNewItemName(rawName) {
  const name = (rawName ?? "").trim();
  if (!name) return { ok: false, reason: "Name cannot be empty" };

  if (name.includes("/") || name.includes("\\")) {
    return { ok: false, reason: "Name cannot contain / or \\" };
  }

  if (name === "." || name === "..") {
    return { ok: false, reason: "Invalid name" };
  }

  if (/[<>:"|?*]/.test(name)) {
    return {
      ok: false,
      reason: 'Name cannot contain any of: < > : " | ? *',
    };
  }

  return { ok: true, name };
}

function escapeHtmlAttr(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readLocalStorageBool(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

function readLocalStorageNumber(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function readLocalStorageString(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function readLocalStorageJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function applyThemeOverrides(overrides) {
  themeOverrides = { ...(overrides || {}) };
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeOverrides)) {
    if (value) root.style.setProperty(key, value);
  }
}

function saveThemeOverrides() {
  try {
    localStorage.setItem("themeColors", JSON.stringify(themeOverrides));
  } catch {}
}

function ensureColorProbe() {
  if (colorProbe) return colorProbe;
  colorProbe = document.createElement("span");
  colorProbe.style.display = "none";
  document.body.appendChild(colorProbe);
  return colorProbe;
}

function parseRgbValue(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return { r: 255, g: 255, b: 255, a: 1 };
  const parts = match[1].split(",").map((part) => part.trim());
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts[3] !== undefined ? Number(parts[3]) : 1;
  return {
    r: Number.isFinite(r) ? r : 255,
    g: Number.isFinite(g) ? g : 255,
    b: Number.isFinite(b) ? b : 255,
    a: Number.isFinite(a) ? a : 1,
  };
}

function normalizeColorValue(value) {
  const probe = ensureColorProbe();
  probe.style.color = "";
  probe.style.color = value || "";
  const computed = getComputedStyle(probe).color;
  return parseRgbValue(computed);
}

function rgbaFromColor(value, alpha) {
  const { r, g, b } = normalizeColorValue(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function inferWalVariant(theme) {
  const ref = `${theme?.path || ""} ${theme?.name || ""}`.toLowerCase();
  if (ref.includes("/light/") || ref.includes("\\light\\")) return "light";
  if (ref.includes("/dark/") || ref.includes("\\dark\\")) return "dark";
  return "dark";
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgb(hex) {
  const cleaned = String(hex || "").replace("#", "");
  if (cleaned.length !== 6) return { r: 255, g: 255, b: 255 };
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function buildThemeModal() {
  if (!themeModalBody) return;
  themeModalBody.innerHTML = "";
  themeControlMap.clear();

  const walSection = document.createElement("div");
  walSection.className = "theme-section";

  const walHeader = document.createElement("div");
  walHeader.className = "theme-section-title";
  walHeader.textContent = "Wal Themes";
  walSection.appendChild(walHeader);

  const walRow = document.createElement("div");
  walRow.className = "theme-row";

  const walLabel = document.createElement("div");
  walLabel.className = "theme-label";

  const walName = document.createElement("div");
  walName.className = "theme-name";
  walName.textContent = "Apply a wal colorscheme";

  const walHint = document.createElement("div");
  walHint.className = "theme-hint";
  walHint.textContent = "~/.config/wal/colorschemes/*.json";

  walLabel.appendChild(walName);
  walLabel.appendChild(walHint);

  const walControls = document.createElement("div");
  walControls.className = "theme-controls theme-inline-actions";

  walThemeSelect = document.createElement("select");
  walThemeSelect.className = "theme-select";

  walApplyBtn = document.createElement("button");
  walApplyBtn.className = "theme-btn";
  walApplyBtn.textContent = "Apply";

  walRefreshBtn = document.createElement("button");
  walRefreshBtn.className = "theme-btn";
  walRefreshBtn.textContent = "Refresh";

  walControls.appendChild(walThemeSelect);
  walControls.appendChild(walApplyBtn);
  walControls.appendChild(walRefreshBtn);

  walRow.appendChild(walLabel);
  walRow.appendChild(walControls);
  walSection.appendChild(walRow);
  themeModalBody.appendChild(walSection);

  walThemeSelect.addEventListener("change", () => {
    if (walApplyBtn) walApplyBtn.disabled = !walThemeSelect.value;
  });

  walApplyBtn.addEventListener("click", () => {
    const selected = walThemeSelect.value;
    const theme = walThemes.find((t) => t.path === selected);
    if (theme) applyWalTheme(theme);
  });

  walRefreshBtn.addEventListener("click", () => {
    refreshWalThemes();
  });

  for (const group of THEME_COLOR_GROUPS) {
    const section = document.createElement("div");
    section.className = "theme-section";

    const header = document.createElement("div");
    header.className = "theme-section-title";
    header.textContent = group.title;
    section.appendChild(header);

    for (const item of group.items) {
      const row = document.createElement("div");
      row.className = "theme-row";

      const label = document.createElement("div");
      label.className = "theme-label";

      const name = document.createElement("div");
      name.className = "theme-name";
      name.textContent = item.label;

      const hint = document.createElement("div");
      hint.className = "theme-hint";
      hint.textContent = item.hint || "";

      label.appendChild(name);
      label.appendChild(hint);

      const controls = document.createElement("div");
      controls.className = "theme-controls";

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "theme-color-input";

      const opacityWrap = document.createElement("div");
      opacityWrap.className = "theme-opacity";

      const alphaInput = document.createElement("input");
      alphaInput.type = "range";
      alphaInput.min = "0";
      alphaInput.max = "100";
      alphaInput.className = "theme-alpha-input";

      const alphaValue = document.createElement("span");
      alphaValue.className = "theme-alpha-value";

      opacityWrap.appendChild(alphaInput);
      opacityWrap.appendChild(alphaValue);

      controls.appendChild(colorInput);
      controls.appendChild(opacityWrap);

      row.appendChild(label);
      row.appendChild(controls);
      section.appendChild(row);

      const updateVar = () => {
        const alpha = Number(alphaInput.value) / 100;
        const rgb = hexToRgb(colorInput.value);
        const value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        document.documentElement.style.setProperty(item.varName, value);
        themeOverrides[item.varName] = value;
        alphaValue.textContent = `${alphaInput.value}%`;
        saveThemeOverrides();
      };

      colorInput.addEventListener("input", updateVar);
      alphaInput.addEventListener("input", updateVar);

      themeControlMap.set(item.varName, {
        colorInput,
        alphaInput,
        alphaValue,
      });
    }

    themeModalBody.appendChild(section);
  }

  refreshWalThemes();
}

function syncThemeControls() {
  const styles = getComputedStyle(document.documentElement);
  for (const [varName, controls] of themeControlMap.entries()) {
    const raw = styles.getPropertyValue(varName).trim();
    const { r, g, b, a } = normalizeColorValue(raw);
    controls.colorInput.value = rgbToHex(r, g, b);
    controls.alphaInput.value = String(Math.round(a * 100));
    controls.alphaValue.textContent = `${controls.alphaInput.value}%`;
  }
}

function buildWalOverrides(theme) {
  const variant = inferWalVariant(theme);
  const base = THEME_BASE_PRESETS[variant] || THEME_BASE_PRESETS.dark;
  const foreground = theme?.special?.foreground || theme?.colors?.color7 || "#f0f0f0";
  const accent = theme?.colors?.color4 || theme?.colors?.color6 || foreground;
  const accentHover = theme?.colors?.color12 || theme?.colors?.color6 || foreground;
  const success = theme?.colors?.color2 || "#28c940";
  const danger = theme?.colors?.color1 || "#ff5f57";

  return {
    ...base,
    "--accent-color": rgbaFromColor(accent, 0.5),
    "--accent-hover": rgbaFromColor(accentHover, 0.95),
    "--success-color": rgbaFromColor(success, 0.8),
    "--danger-color": rgbaFromColor(danger, 0.8),
  };
}

function applyWalTheme(theme) {
  const overrides = buildWalOverrides(theme);
  applyThemeOverrides(overrides);
  saveThemeOverrides();
  try {
    localStorage.setItem("walThemePath", theme.path);
  } catch {}
  syncThemeControls();
}

function populateWalSelect() {
  if (!walThemeSelect) return;
  walThemeSelect.innerHTML = "";

  if (!walThemes.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No wal themes found";
    walThemeSelect.appendChild(option);
    walThemeSelect.disabled = true;
    if (walApplyBtn) walApplyBtn.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a wal theme";
  walThemeSelect.appendChild(placeholder);

  const lastPath = readLocalStorageString("walThemePath", "");
  for (const theme of walThemes) {
    const option = document.createElement("option");
    option.value = theme.path;
    option.textContent = theme.name;
    if (lastPath && theme.path === lastPath) {
      option.selected = true;
    }
    walThemeSelect.appendChild(option);
  }

  walThemeSelect.disabled = false;
  if (walApplyBtn) walApplyBtn.disabled = !walThemeSelect.value;
}

async function refreshWalThemes() {
  if (!walThemeSelect || !window.fileManager?.getWalThemes) return;
  walThemeSelect.innerHTML = "";
  const loading = document.createElement("option");
  loading.textContent = "Loading...";
  loading.value = "";
  walThemeSelect.appendChild(loading);
  walThemeSelect.disabled = true;
  if (walApplyBtn) walApplyBtn.disabled = true;

  try {
    const list = await window.fileManager.getWalThemes();
    walThemes = Array.isArray(list) ? list : [];
  } catch {
    walThemes = [];
  }
  populateWalSelect();
}

function openThemeCustomizer() {
  if (!themeModal) return;
  if (!themeModalBody || themeModalBody.childElementCount === 0) {
    buildThemeModal();
  }
  refreshWalThemes();
  syncThemeControls();
  themeModal.classList.add("visible");
}

function closeThemeCustomizer() {
  if (!themeModal) return;
  themeModal.classList.remove("visible");
}

function resetThemeToDefaults() {
  themeOverrides = {};
  try {
    localStorage.removeItem("themeColors");
  } catch {}
  for (const varName of THEME_COLOR_VARS) {
    document.documentElement.style.removeProperty(varName);
  }
  syncThemeControls();
}

function scheduleIdle(task, timeout = 800) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout });
  } else {
    setTimeout(task, 0);
  }
}

function showTextInputModal(
  title,
  message,
  defaultValue,
  okLabel = "OK",
  inputType = "text",
) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-role", "fm-modal-overlay");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: var(--modal-backdrop);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6000;
    `;

    const dialog = document.createElement("div");
    dialog.setAttribute("data-role", "fm-modal");
    dialog.style.cssText = `
      width: 420px;
      max-width: calc(100vw - 32px);
      background: var(--bg-overlay);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: var(--shadow);
      padding: 16px;
      color: var(--text-primary);
    `;

    dialog.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">${escapeHtmlAttr(title)}</div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;">${escapeHtmlAttr(message)}</div>
      <input data-role="fm-modal-input" type="${inputType}" value="${escapeHtmlAttr(defaultValue ?? "")}" style="
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        outline: none;
        font-size: 13px;
        box-sizing: border-box;
      "/>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 14px;">
        <button data-role="fm-modal-cancel" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          cursor: pointer;
        ">Cancel</button>
        <button data-role="fm-modal-ok" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        ">${escapeHtmlAttr(okLabel)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = dialog.querySelector('[data-role="fm-modal-input"]');
    const ok = dialog.querySelector('[data-role="fm-modal-ok"]');
    const cancel = dialog.querySelector('[data-role="fm-modal-cancel"]');

    const cleanup = () => overlay.remove();

    const finish = (val) => {
      cleanup();
      resolve(val);
    };

    ok.addEventListener("click", () => finish(input.value));
    cancel.addEventListener("click", () => finish(null));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(null);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(input.value);
      if (e.key === "Escape") finish(null);
    });

    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

function showDeleteChoiceModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-role", "fm-delete-overlay");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: var(--modal-backdrop);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6000;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      width: 460px;
      max-width: calc(100vw - 32px);
      background: var(--bg-overlay);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: var(--shadow);
      padding: 16px;
      color: var(--text-primary);
    `;

    dialog.innerHTML = `
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">${escapeHtmlAttr(title)}</div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">${escapeHtmlAttr(message)}</div>
      <div style="display:flex; justify-content:flex-end; flex-wrap: wrap; gap:10px;">
        <button data-role="fm-del-cancel" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          cursor: pointer;
        ">Cancel</button>
        <button data-role="fm-del-trash" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        ">Move to Trash</button>
        <button data-role="fm-del-perm" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: var(--danger-color);
          color: white;
          cursor: pointer;
        ">Delete Permanently</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancel = dialog.querySelector('[data-role="fm-del-cancel"]');
    const trash = dialog.querySelector('[data-role="fm-del-trash"]');
    const perm = dialog.querySelector('[data-role="fm-del-perm"]');

    const cleanup = () => overlay.remove();

    const finish = (val) => {
      cleanup();
      resolve(val);
    };

    cancel.addEventListener("click", () => finish("cancel"));
    trash.addEventListener("click", () => finish("trash"));
    perm.addEventListener("click", () => finish("permanent"));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish("cancel");
    });

    document.addEventListener(
      "keydown",
      function onKey(e) {
        if (e.key === "Escape") finish("cancel");
      },
      { once: true },
    );
  });
}

function showConfirmModal(title, message, confirmLabel = "Confirm") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-role", "fm-confirm-overlay");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: var(--modal-backdrop);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6000;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      width: 440px;
      max-width: calc(100vw - 32px);
      background: var(--bg-overlay);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: var(--shadow);
      padding: 16px;
      color: var(--text-primary);
    `;

    dialog.innerHTML = `
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">${escapeHtmlAttr(title)}</div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">${escapeHtmlAttr(message)}</div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button data-role="fm-confirm-cancel" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          cursor: pointer;
        ">Cancel</button>
        <button data-role="fm-confirm-ok" style="
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: var(--danger-color);
          color: white;
          cursor: pointer;
        ">${escapeHtmlAttr(confirmLabel)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancel = dialog.querySelector('[data-role="fm-confirm-cancel"]');
    const ok = dialog.querySelector('[data-role="fm-confirm-ok"]');

    const cleanup = () => overlay.remove();
    const finish = (val) => {
      cleanup();
      resolve(val);
    };

    cancel.addEventListener("click", () => finish(false));
    ok.addEventListener("click", () => finish(true));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(false);
    });

    document.addEventListener(
      "keydown",
      function onKey(e) {
        if (e.key === "Escape") finish(false);
      },
      { once: true },
    );
  });
}

function getUndoMenuLabel() {
  const entry = undoStack[undoStack.length - 1];
  return entry && entry.label ? entry.label : "Undo";
}

function refreshUndoMenu() {
  if (contextMenu && contextMenu.classList.contains("visible")) {
    renderContextMenu();
  }
}

function formatUndoLabel(action, count, name) {
  if (name) return `Undo ${action} ${name}`;
  if (count) {
    return `Undo ${action} ${count} item${count === 1 ? "" : "s"}`;
  }
  return `Undo ${action}`;
}

function formatOperationLabel(action, count, name) {
  if (name) return `${action} ${name}`;
  if (count) {
    return `${action} ${count} item${count === 1 ? "" : "s"}`;
  }
  return action;
}

function pushUndo(entry) {
  if (!entry || typeof entry.undo !== "function") return;
  undoStack.push(entry);
  if (undoStack.length > UNDO_STACK_LIMIT) {
    undoStack.shift();
  }
  refreshUndoMenu();
}

async function runBatchOperation(items, operation) {
  const result = await window.fileManager.batchFileOperation(items, operation);
  if (!result || !result.success) {
    throw new Error(result?.error || "Undo failed");
  }
}

async function deletePathsPermanently(paths) {
  let sudoPassword = null;
  let sudoCancelled = false;
  const failed = [];

  for (const p of paths) {
    let result = await window.fileManager.deleteItem(p);

    if (
      !result.success &&
      (result.code === "EACCES" || result.code === "EPERM")
    ) {
      if (!sudoPassword && !sudoCancelled) {
        const input = await showTextInputModal(
          "Permission Denied",
          `Privileges required to delete "${p.split(/[/\\]/).pop()}".\nEnter sudo password:`,
          "",
          "Delete",
          "password",
        );
        if (input !== null) {
          sudoPassword = input;
        } else {
          sudoCancelled = true;
        }
      }

      if (sudoPassword) {
        result = await window.fileManager.deleteItemSudo(p, sudoPassword);
        if (!result.success) {
          sudoPassword = null;
        }
      }
    }

    if (!result.success) {
      failed.push({ path: p, error: result.error || "Delete failed" });
    }
  }

  if (failed.length > 0) {
    const message =
      failed.length === 1
        ? `Undo failed: ${failed[0].error}`
        : `Undo failed for ${failed.length} item(s)`;
    throw new Error(message);
  }
}

async function performUndo() {
  if (undoStack.length === 0) return;
  const entry = undoStack[undoStack.length - 1];
  try {
    await entry.undo();
    undoStack.pop();
    refreshUndoMenu();
    if (entry.successMessage) {
      showNotification(entry.successMessage);
    }
  } catch (error) {
    const message = error?.message || "Undo failed";
    showNotification(message, "error");
  }
}

const OPS_PAUSE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>';
const OPS_PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>';

function scheduleOpsRender() {
  if (!opsPanelVisible || !opsPanel) return;
  if (opsRenderRaf) return;
  opsRenderRaf = requestAnimationFrame(() => {
    opsRenderRaf = null;
    renderOperationsPanel();
  });
}

function formatOpTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getOpStatusLabel(op) {
  if (op.status === "running") return "Running";
  if (op.status === "completed") return "Done";
  if (op.status === "failed") return "Failed";
  if (op.status === "cancelled") return "Cancelled";
  if (queuePaused && op.status === "queued") return "Paused";
  return "Queued";
}

function buildOpsItem(op, allowCancel) {
  const item = document.createElement("div");
  item.className = "ops-item";

  const header = document.createElement("div");
  header.className = "ops-item-header";

  const title = document.createElement("div");
  title.className = "ops-item-title";
  title.textContent = op.label || "Operation";

  const meta = document.createElement("div");
  meta.className = "ops-item-meta";
  const statusText = getOpStatusLabel(op);
  const timeText =
    op.status === "completed" || op.status === "failed" || op.status === "cancelled"
      ? formatOpTime(op.finishedAt)
      : "";
  meta.textContent = timeText ? `${statusText} • ${timeText}` : statusText;

  header.appendChild(title);
  header.appendChild(meta);

  if (allowCancel && (op.status === "queued" || op.status === "running")) {
    const actions = document.createElement("div");
    actions.className = "ops-item-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ops-item-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cancelOperation(op.id);
    });
    actions.appendChild(cancelBtn);
    header.appendChild(actions);
  }

  item.appendChild(header);

  if (typeof op.progress === "number" && op.status === "running") {
    const progress = document.createElement("div");
    progress.className = "ops-progress";
    const fill = document.createElement("div");
    fill.className = "ops-progress-fill";
    fill.style.width = `${Math.max(0, Math.min(100, op.progress))}%`;
    progress.appendChild(fill);
    item.appendChild(progress);
  }

  if (op.status === "failed" && op.error) {
    const error = document.createElement("div");
    error.className = "ops-item-meta";
    error.textContent = op.error;
    item.appendChild(error);
  }

  return item;
}

function renderOperationsPanel() {
  if (!opsPanel || !opsQueueList || !opsHistoryList) return;

  const queueItems = [];
  if (activeOperation) queueItems.push(activeOperation);
  queueItems.push(...operationQueue);

  opsQueueList.innerHTML = "";
  if (queueItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ops-empty";
    empty.textContent = "No queued operations";
    opsQueueList.appendChild(empty);
  } else {
    queueItems.forEach((op) => {
      opsQueueList.appendChild(buildOpsItem(op, true));
    });
  }

  opsHistoryList.innerHTML = "";
  if (operationHistory.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ops-empty";
    empty.textContent = "No recent activity";
    opsHistoryList.appendChild(empty);
  } else {
    operationHistory.forEach((op) => {
      opsHistoryList.appendChild(buildOpsItem(op, false));
    });
  }
}

function setOpsPanelVisible(visible) {
  opsPanelVisible = visible;
  if (opsPanel) {
    opsPanel.classList.toggle("visible", opsPanelVisible);
  }
  if (opsPanelVisible) {
    renderOperationsPanel();
  }
}

function setQueuePaused(paused) {
  queuePaused = paused;
  if (opsPauseBtn) {
    opsPauseBtn.innerHTML = queuePaused ? OPS_PLAY_ICON : OPS_PAUSE_ICON;
    opsPauseBtn.title = queuePaused ? "Resume queue" : "Pause queue";
  }
  scheduleOpsRender();
  if (!queuePaused) {
    processOperationQueue();
  }
}

function setupOperationsPanel() {
  if (opsToggleBtn) {
    opsToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpsPanelVisible(!opsPanelVisible);
    });
  }

  if (opsCloseBtn) {
    opsCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpsPanelVisible(false);
    });
  }

  if (opsPauseBtn) {
    opsPauseBtn.innerHTML = queuePaused ? OPS_PLAY_ICON : OPS_PAUSE_ICON;
    opsPauseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setQueuePaused(!queuePaused);
    });
  }

  if (opsClearBtn) {
    opsClearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      operationHistory.length = 0;
      renderOperationsPanel();
    });
  }
}

function enqueueOperation(entry) {
  const op = {
    id: `op-${Date.now()}-${operationSequence++}`,
    status: "queued",
    progress: entry.progress ?? 0,
    createdAt: Date.now(),
    ...entry,
  };
  operationQueue.push(op);
  scheduleOpsRender();
  processOperationQueue();
  return op;
}

async function cancelOperation(id) {
  const queuedIndex = operationQueue.findIndex((op) => op.id === id);
  if (queuedIndex !== -1) {
    const [op] = operationQueue.splice(queuedIndex, 1);
    op.status = "cancelled";
    op.finishedAt = Date.now();
    operationHistory.unshift(op);
    if (operationHistory.length > OPERATION_HISTORY_LIMIT) {
      operationHistory.length = OPERATION_HISTORY_LIMIT;
    }
    scheduleOpsRender();
    return;
  }

  if (activeOperation && activeOperation.id === id) {
    activeOperation.cancelRequested = true;
    if (typeof activeOperation.cancel === "function") {
      await activeOperation.cancel(activeOperation);
    }
  }
}

async function processOperationQueue() {
  if (queuePaused || activeOperation || operationQueue.length === 0) {
    scheduleOpsRender();
    return;
  }

  const op = operationQueue.shift();
  if (!op) return;

  activeOperation = op;
  op.status = "running";
  op.startedAt = Date.now();
  op.progress = op.progress ?? 0;

  if (op.usesProgress) {
    startProgress();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  scheduleOpsRender();

  try {
    const result = await op.run(op);
    if (result && result.cancelled) {
      op.status = "cancelled";
    } else {
      op.status = "completed";
    }
    if (op.onSuccess) {
      await op.onSuccess(result);
    }
  } catch (error) {
    if (error?.cancelled) {
      op.status = "cancelled";
    } else {
      op.status = "failed";
      op.error = error?.message || "Operation failed";
      if (op.onError) {
        await op.onError(error);
      }
    }
  } finally {
    op.finishedAt = Date.now();
    if (op.usesProgress) {
      finishProgress();
    }
    if (op.status !== "running") {
      activeOperation = null;
      operationHistory.unshift(op);
      if (operationHistory.length > OPERATION_HISTORY_LIMIT) {
        operationHistory.length = OPERATION_HISTORY_LIMIT;
      }
      scheduleOpsRender();
      processOperationQueue();
    }
  }
}

const folderSizeCache = new Map();
const folderSizeInFlight = new Map();
const folderSizeQueue = [];
let folderSizeActive = 0;
const FOLDER_SIZE_CONCURRENCY = 3;
const FOLDER_SIZE_CACHE_TTL_MS = 5 * 60 * 1000;

const MAX_FOLDER_SIZE_CACHE_ENTRIES = 500;
const MAX_VIEW_SETTINGS_CACHE_ENTRIES = 100;
const MAX_HISTORY_LENGTH = 50;
const MAX_ITEMS_BEFORE_VIRTUAL_SCROLL = 200;
const MAX_LOADED_THUMBNAILS = 50;
const groupHeaderRafMap = new WeakMap();

function trimCache(cache, maxEntries) {
  if (cache.size <= maxEntries) return;
  const entriesToRemove = cache.size - maxEntries;
  const keys = Array.from(cache.keys());
  for (let i = 0; i < entriesToRemove; i++) {
    cache.delete(keys[i]);
  }
}

function trimObjectCache(obj, maxEntries) {
  const keys = Object.keys(obj);
  if (keys.length <= maxEntries) return;
  const entriesToRemove = keys.length - maxEntries;
  for (let i = 0; i < entriesToRemove; i++) {
    delete obj[keys[i]];
  }
}

let thumbnailObserver = null;
const loadedThumbnails = new Set();

function setupThumbnailObserver() {
  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
  }

  thumbnailObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const iconEl = entry.target;
        const path = iconEl.dataset.thumbPath;
        const fallbackIcon = iconEl.dataset.fallbackIcon;

        if (entry.isIntersecting) {
          if (!iconEl.querySelector("img") && path) {
            const img = document.createElement("img");
            img.src = `file://${path}`;
            img.loading = "lazy";
            img.draggable = false;
            img.onerror = () => {
              iconEl.innerHTML = fallbackIcon || "";
              loadedThumbnails.delete(iconEl);
            };
            img.onload = () => {
              loadedThumbnails.add(iconEl);
              if (loadedThumbnails.size > MAX_LOADED_THUMBNAILS) {
                unloadOffscreenThumbnails();
              }
            };
            iconEl.innerHTML = "";
            iconEl.appendChild(img);
          }
        }
      });
    },
    {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    },
  );
}

function unloadOffscreenThumbnails() {
  const toUnload = [];
  loadedThumbnails.forEach((iconEl) => {
    const rect = iconEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const isOffscreen =
      rect.bottom < -500 ||
      rect.top > viewportHeight + 500 ||
      rect.right < -500 ||
      rect.left > viewportWidth + 500;

    if (isOffscreen) {
      toUnload.push(iconEl);
    }
  });

  const unloadCount = Math.min(
    toUnload.length,
    Math.floor(loadedThumbnails.size / 2),
  );
  for (let i = 0; i < unloadCount; i++) {
    const iconEl = toUnload[i];
    const fallbackIcon = iconEl.dataset.fallbackIcon;
    if (fallbackIcon) {
      iconEl.innerHTML = fallbackIcon;
    }
    loadedThumbnails.delete(iconEl);
  }
}

function observeThumbnail(element) {
  if (thumbnailObserver && element) {
    thumbnailObserver.observe(element);
  }
}

function clearThumbnailObserver() {
  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
  }
  loadedThumbnails.clear();
}

const ITEMS_PER_CHUNK = 50;
let renderedItemCount = 0;
let filteredItems = [];
let isLoadingMore = false;
let scrollLoadObserver = null;

function setupScrollLoadObserver() {
  if (scrollLoadObserver) {
    scrollLoadObserver.disconnect();
  }

  scrollLoadObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (
          entry.isIntersecting &&
          !isLoadingMore &&
          renderedItemCount < filteredItems.length
        ) {
          loadMoreItems();
        }
      });
    },
    {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    },
  );
}

function loadMoreItems() {
  if (isLoadingMore || renderedItemCount >= filteredItems.length) return;
  isLoadingMore = true;

  const startIdx = renderedItemCount;
  const endIdx = Math.min(startIdx + ITEMS_PER_CHUNK, filteredItems.length);

  requestAnimationFrame(() => {
    const fragment = document.createDocumentFragment();
    for (let i = startIdx; i < endIdx; i++) {
      fragment.appendChild(renderItemForVirtualScroll(filteredItems[i]));
    }

    const oldSentinel = fileList.querySelector(".load-more-sentinel");
    if (oldSentinel) oldSentinel.remove();

    fileList.appendChild(fragment);
    renderedItemCount = endIdx;

    if (renderedItemCount < filteredItems.length) {
      const sentinel = document.createElement("div");
      sentinel.className = "load-more-sentinel";
      sentinel.style.height = "1px";
      fileList.appendChild(sentinel);
      if (scrollLoadObserver) {
        scrollLoadObserver.observe(sentinel);
      }
    }

    isLoadingMore = false;
    scheduleVisibleFolderSizes();
  });
}

let renderItemForVirtualScroll = null;

const icons = {
  folder: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`,
  executable: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/></svg>`,
  spreadsheet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  presentation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
};

const fileTypes = {
  folder: {
    icon: icons.folder,
    color: "#ffd866",
  },
  image: {
    icon: icons.image,
    color: "#ff79c6",
    extensions: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "svg",
      "webp",
      "ico",
      "tiff",
    ],
  },
  video: {
    icon: icons.video,
    color: "#bd93f9",
    extensions: ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v"],
  },
  audio: {
    icon: icons.audio,
    color: "#8be9fd",
    extensions: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"],
  },
  document: {
    icon: icons.document,
    color: "#50fa7b",
    extensions: ["pdf", "doc", "docx", "txt", "rtf", "odt", "md"],
  },
  spreadsheet: {
    icon: icons.spreadsheet,
    color: "#69ff94",
    extensions: ["xls", "xlsx", "csv", "ods"],
  },
  presentation: {
    icon: icons.presentation,
    color: "#ffb86c",
    extensions: ["ppt", "pptx", "odp"],
  },
  archive: {
    icon: icons.archive,
    color: "#ff5555",
    extensions: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  },
  code: {
    icon: icons.code,
    color: "#f1fa8c",
    extensions: [
      "js",
      "ts",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "css",
      "html",
      "json",
      "xml",
      "php",
      "rb",
      "go",
      "rs",
      "swift",
      "kt",
      "sh",
      "bat",
    ],
  },
  executable: {
    icon: icons.executable,
    color: "#ff5555",
    extensions: ["exe", "msi", "app", "dmg", "deb", "rpm"],
  },
  default: {
    icon: icons.file,
    color: "#f8f8f2",
  },
};

let fileList;
let pathSegments;
let searchInput;
let itemCountEl;
let selectedCountEl;
let currentPathEl;
let contextMenu;
let previewPanel;
let previewContent;
let previewResizer;
let tabBarEl;
let progressBarContainer;
let progressBarFill;
let paneHost;
let paneDivider;
let fileListLeft;
let fileListRight;
let sidebarResizer;
let sidebarEl;

let viewMenu;
let viewModeBtn;
let sortBtn;
let groupBtn;
let settingsMenu;
let settingsBtn;
let themeModal;
let themeModalBody;
let themeCloseBtn;
let themeResetBtn;
let themeSaveBtn;
let opsToggleBtn;
let opsPanel;
let opsQueueList;
let opsHistoryList;
let opsPauseBtn;
let opsClearBtn;
let opsCloseBtn;

let themeOverrides = {};
let themeControlMap = new Map();
let colorProbe;

let walThemes = [];
let walThemeSelect;
let walApplyBtn;
let walRefreshBtn;

const UNDO_STACK_LIMIT = 30;
const undoStack = [];
const OPERATION_HISTORY_LIMIT = 50;
const operationQueue = [];
const operationHistory = [];
let activeOperation = null;
let queuePaused = false;
let operationSequence = 0;
let opsPanelVisible = false;
let opsRenderRaf = null;
