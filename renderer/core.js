var currentPath = "";
var homeDirectory = "";
var startupPathArg = "";
var appHistory = [];
var historyIndex = -1;
var selectedItems = new Set();
var clipboardItems = [];
var clipboardOperation = null;
var clipboardSourcePaneId = null;
var currentItems = [];
var sortBy = "name";
var sortAscending = true;
var showHidden = false;
var calculateFolderSizes = true;
var fileTags = {};
var viewMode = "detailed";
var thumbnailSize = 140;
var showPreviewPane = false;
var groupBy = "none";
var visibleColumns = { size: true, modified: true, added: true };
var viewSettingsCache = {};
var commonDirs = {};
var collapsedGroups = new Set();
var pickerMode = null;

var folderSizeCache = new Map();
var folderSizeQueue = [];
var folderSizeInFlight = new Map();
var folderSizeActive = 0;
var FOLDER_SIZE_CONCURRENCY = 3;
var MAX_FOLDER_SIZE_CACHE_ENTRIES = 1000;
var MAX_VIEW_SETTINGS_CACHE_ENTRIES = 50;
var MAX_ITEMS_BEFORE_VIRTUAL_SCROLL = 500;
var FOLDER_SIZE_CACHE_TTL_MS = 300000; // 5 minutes

var tabs = [];
var activeTabIndex = -1;
var splitViewEnabled = false;
var activePaneId = "left";
var panes = {};
var activeOperation = null;
var operationQueue = [];
var operationHistory = [];
var operationSequence = 0;
var queuePaused = false;
var OPERATION_HISTORY_LIMIT = 50;
var undoStack = [];
var UNDO_STACK_LIMIT = 20;
var isInTrash = false;
var filteredItems = [];
var renderedItemCount = 0;
var isLoadingMore = false;
var scrollLoadObserver = null;
var fileList = null;
var MAX_HISTORY_LENGTH = 50;
var folderSizeAbortController = null;

var TAG_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];

var fileTypes = {
  folder: { label: "Folder", icon: "folder" },
  image: {
    label: "Image",
    icon: "pictures",
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"],
  },
  video: {
    label: "Video",
    icon: "videos",
    extensions: ["mp4", "mkv", "webm", "mov", "avi", "wmv", "flv", "m4v"],
  },
  audio: {
    label: "Audio",
    icon: "music",
    extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
  },
  code: {
    label: "Code",
    icon: "config",
    extensions: [
      "js", "css", "html", "json", "ts", "rs", "py", "c", "cpp", "h", "hpp",
      "md", "txt", "xml", "yaml", "yml", "sh", "bat", "ps1", "sql", "java",
    ],
  },
  archive: {
    label: "Archive",
    icon: "config",
    extensions: ["zip", "tar", "gz", "7z", "rar", "xz"],
  },
  default: { label: "File", icon: "documents" },
};

var groupHeaderRafMap = new Map();
var themeOverrides = {};
var themeControlMap = new Map();
var colorProbe = null;
var themeModal = null;

var quickAccessItems = [];
var pinnedListEl = null;
var drivesListEl = null;
var tagsListEl = null;
var hasRealTrashFolder = false;

var newFolderBtn = null;
var newFileBtn = null;
var emptyTrashBtn = null;

var draggedItems = [];
var dragSourcePaneId = null;
var isDragging = false;
var dragScrollInterval = null;
var draggedQaId = null;
var dragHoverTimer = null;
var DRAG_HOVER_DELAY = 800;

var thumbnailObserver = null;

var paneHost = null;
var paneDivider = null;
var fileListLeft = null;
var fileListRight = null;
var pathSegments = null;
var searchInput = null;
var itemCountEl = null;
var selectedCountEl = null;
var currentPathEl = null;
var contextMenu = null;
var contextMenuPanel = null;
var contextSubmenu = null;
var contextMenuMode = "background";
var contextSubmenuOpen = false;
var contextPinTargetPath = null;
var contextPinTargetLabel = null;
var contextQuickAccessId = null;

var tabBarEl = null;
var progressBarContainer = null;
var progressBarFill = null;
var viewMenu = null;
var viewModeBtn = null;
var sortBtn = null;
var groupBtn = null;
var settingsMenu = null;
var settingsBtn = null;
var opsToggleBtn = null;
var opsPanel = null;
var opsQueueList = null;
var opsHistoryList = null;
var opsPauseBtn = null;
var opsClearBtn = null;
var opsCloseBtn = null;
var themeModalBody = null;
var themeCloseBtn = null;
var themeResetBtn = null;
var themeSaveBtn = null;
var previewPanel = null;
var previewContent = null;
var previewResizer = null;
var sidebarResizer = null;
var activeMenuType = null;
var progressInterval = null;
var realProgress = 0;
var fakeProgress = 0;
var notificationActive = false;
var notificationQueue = [];

var STARTUP_CACHE_KEY = "startupCacheHome";
var STARTUP_CACHE_MAX_ITEMS = 300;

var COLUMN_WIDTH_STORAGE_KEY = "columnWidthsV1";
var SIDEBAR_WIDTH_STORAGE_KEY = "sidebarWidthV1";
var PREVIEW_WIDTH_STORAGE_KEY = "previewWidthV1";

var COLUMN_DEFAULTS = {
  size: 100,
  modified: 140,
  added: 140,
};

var COLUMN_MIN = {
  size: 70,
  modified: 90,
  added: 90,
};

var EXTERNAL_MOUNT_PREFIXES = ["/run/media", "/media", "/mnt", "/Volumes"];

var sidebarEl = null;

function setupOperationsPanel() {
  if (opsToggleBtn) {
    opsToggleBtn.addEventListener("click", () => {
      if (opsPanel) {
        const isVisible = opsPanel.style.display === "flex";
        opsPanel.style.display = isVisible ? "none" : "flex";
        if (!isVisible) {
          updateOpsPanel();
        }
      }
    });
  }
  if (opsCloseBtn) {
    opsCloseBtn.addEventListener("click", () => {
      if (opsPanel) opsPanel.style.display = "none";
    });
  }
  if (opsPauseBtn) {
    opsPauseBtn.addEventListener("click", () => {
      // Toggle pause state logic would go here
    });
  }
  if (opsClearBtn) {
    opsClearBtn.addEventListener("click", () => {
      // Clear appHistory logic would go here
    });
  }
}

function scheduleIdle(callback) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

function updateOpsPanel() {
  // Stub for operations panel update
  const list = document.getElementById("ops-queue-list");
  if (list) {
    // Basic rendering if needed, or leave empty to prevent crash
  }
}

function scheduleOpsRender() {
  if (typeof updateOpsPanel === "function") {
    requestAnimationFrame(updateOpsPanel);
  }
}

function setupThumbnailObserver() {
  if (thumbnailObserver) return;
  try {
    thumbnailObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          // If we had logic to load real thumbnails, it would go here.
          // For now, this stub prevents crashes.
          thumbnailObserver.unobserve(img);
        }
      });
    }, {
      root: document.querySelector('.file-list-container') || null,
      rootMargin: '100px'
    });
  } catch (e) {
    console.warn("Failed to setup thumbnail observer:", e);
  }
}

function clearThumbnailObserver() {
  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
    thumbnailObserver = null;
  }
}

function openThemeCustomizer() {
  themeModal = document.getElementById("theme-modal");
  if (themeModal) {
    themeModal.style.display = "block";
    buildThemeModal();
  }
}

function closeThemeCustomizer() {
  if (!themeModal) themeModal = document.getElementById("theme-modal");
  if (themeModal) {
    themeModal.style.display = "none";
  }
}

function resetThemeToDefaults() {
  themeOverrides = {};
  localStorage.removeItem("themeColors");
  applyThemeOverrides();
  buildThemeModal();
}

function applyThemeOverrides(overrides) {
  themeOverrides = { ...(overrides || {}) };
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeOverrides)) {
    if (value) root.style.setProperty(key, value);
  }
}

var CONTEXT_MENU_ICONS = {
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 00 2 2h12a2 2 0 00 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  cut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>`,
  rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 6-3 3v5l-2 2-2-2v-5l-3-3 4-6z"/><path d="M5 21l7-7"/></svg>`,
  unpin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 6-3 3v5l-2 2-2-2v-5l-3-3 4-6z"/><path d="M5 21l7-7"/><path d="M3 3l18 18"/></svg>`,
  moveUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
  moveDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  extract: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><path d="M12 11v6"/><path d="M9 14l3 3 3-3"/></svg>`,
  compress: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><path d="M12 17v-6"/><path d="M9 14l3-3 3 3"/></svg>`,
};

var TAG_HEX = {
  red: "#ff5f57",
  orange: "#ffbd2e",
  yellow: "#ffcc00",
  green: "#28c940",
  blue: "#3578f6",
  purple: "#bd93f9",
  gray: "#8e8e93",
};

var BUILTIN_ICONS = {
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

var THEME_COLOR_GROUPS = [
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
var THEME_COLOR_VARS = THEME_COLOR_GROUPS.reduce((acc, group) => {
  for (const item of group.items) acc.push(item.varName);
  return acc;
}, []);
var THEME_BASE_PRESETS = {
  dark: {
    "--bg-primary": "rgba(30, 30, 40, 0.05)",
    "--bg-secondary": "rgba(45, 45, 60, 0.05)",
    "--bg-tertiary": "rgba(60, 60, 80, 0.05)",
    "--bg-overlay": "rgba(100, 100, 100, 0.05)",
    "--menu-bg": "rgba(30, 30, 40, 0.6)",
    "--menu-overlay-bg": "rgba(30, 30, 40, 0.7)",
    "--bg-hover": "rgba(255, 255, 255, 0.25)",
    "--bg-active": "rgba(100, 100, 100, 0.5)",
    "--modal-backdrop": "rgba(0, 0, 0, 0.5)",
    "--text-primary": "rgba(255, 255, 255, 0.95)",
    "--text-secondary": "rgba(255, 255, 255, 0.7)",
    "--text-muted": "rgba(255, 255, 255, 0.5)",
    "--border-color": "rgba(255, 255, 255, 0.1)",
    "--accent-color": "rgba(100, 100, 100, 0.5)",
    "--accent-hover": "rgba(170, 170, 170, 0.95)",
    "--success-color": "rgba(100, 255, 150, 0.8)",
    "--danger-color": "rgba(255, 100, 100, 0.8)",
  },
  light: {
    "--bg-primary": "rgba(245, 245, 250, 0.05)",
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
    "--accent-color": "rgba(0, 0, 0, 0.08)",
    "--accent-hover": "rgba(0, 0, 0, 0.16)",
    "--success-color": "rgba(40, 167, 69, 0.8)",
    "--danger-color": "rgba(220, 53, 69, 0.8)",
  },
};

var QUICK_ACCESS_STORAGE_KEY = "quickAccessItemsV1";
var DEFAULT_BUILTINS = [
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

var BUILTIN_REGISTRY = DEFAULT_BUILTINS.reduce((acc, b) => {
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

var quickAccessItems = [];
var pinnedListEl = null;
var drivesListEl = null;
var tagsListEl = null;
var hasRealTrashFolder = false;

var newFolderBtn = null;
var newFileBtn = null;
var emptyTrashBtn = null;

var draggedItems = [];
var dragSourcePaneId = null;
var isDragging = false;
var dragScrollInterval = null;
var draggedQaId = null;
var dragHoverTimer = null;
var DRAG_HOVER_DELAY = 800;

var contextMenuPanel = null;
var contextSubmenu = null;
var contextMenuMode = "background";
var contextSubmenuOpen = false;

var contextPinTargetPath = null;
var contextPinTargetLabel = null;
var contextQuickAccessId = null;

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
  } catch { }
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
  walHint.textContent = "Generates a theme from your wallpaper";

  walLabel.appendChild(walName);
  walLabel.appendChild(walHint);
  walRow.appendChild(walLabel);
  walSection.appendChild(walRow);

  themeModalBody.appendChild(walSection);
}

function trimCache(cacheMap, maxEntries) {
  if (cacheMap.size <= maxEntries) return;
  const entriesToDelete = cacheMap.size - maxEntries;
  let deleted = 0;
  for (const key of cacheMap.keys()) {
    cacheMap.delete(key);
    deleted++;
    if (deleted >= entriesToDelete) break;
  }
}

function trimObjectCache(cacheObj, maxEntries) {
  const keys = Object.keys(cacheObj);
  if (keys.length <= maxEntries) return;
  const entriesToDelete = keys.length - maxEntries;
  for (let i = 0; i < entriesToDelete; i++) {
    delete cacheObj[keys[i]];
  }
}

function escapeHtmlAttr(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
        <button id="fm-del-cancel" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer;">Cancel</button>
        <button id="fm-del-trash" style="padding: 8px 12px; border-radius: 8px; border: none; background: var(--accent-color); color: white; cursor: pointer;">Move to Trash</button>
        <button id="fm-del-perm" style="padding: 8px 12px; border-radius: 8px; border: none; background: var(--danger-color); color: white; cursor: pointer;">Delete Permanently</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const finish = (val) => {
      document.body.removeChild(overlay);
      resolve(val);
    };

    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish("cancel"); });
    dialog.querySelector("#fm-del-cancel").onclick = () => finish("cancel");
    dialog.querySelector("#fm-del-trash").onclick = () => finish("trash");
    dialog.querySelector("#fm-del-perm").onclick = () => finish("permanent");
  });
}

function showConfirmModal(title, message, confirmLabel = "Confirm") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:var(--modal-backdrop); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:6000;";
    const dialog = document.createElement("div");
    dialog.style.cssText = "width:400px; background:var(--bg-overlay); border:1px solid var(--border-color); border-radius:14px; padding:16px; color:var(--text-primary);";
    dialog.innerHTML = `
      <div style="font-weight:700; margin-bottom:10px;">${escapeHtmlAttr(title)}</div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">${escapeHtmlAttr(message)}</div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="fm-conf-cancel" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer;">Cancel</button>
        <button id="fm-conf-ok" style="padding:8px 12px; border-radius:8px; border:none; background:var(--accent-color); color:white; cursor:pointer;">${escapeHtmlAttr(confirmLabel)}</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    const finish = (val) => { document.body.removeChild(overlay); resolve(val); };
    dialog.querySelector("#fm-conf-cancel").onclick = () => finish(false);
    dialog.querySelector("#fm-conf-ok").onclick = () => finish(true);
  });
}

function showTextInputModal(title, message, defaultValue = "", confirmLabel = "OK", type = "text") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:var(--modal-backdrop); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:6000;";
    const dialog = document.createElement("div");
    dialog.style.cssText = "width:400px; background:var(--bg-overlay); border:1px solid var(--border-color); border-radius:14px; padding:16px; color:var(--text-primary);";
    dialog.innerHTML = `
      <div style="font-weight:700; margin-bottom:10px;">${escapeHtmlAttr(title)}</div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">${escapeHtmlAttr(message)}</div>
      <input type="${type}" id="fm-input-val" style="width:100%; padding:8px; border-radius:6px; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:white; margin-bottom:14px;" value="${escapeHtmlAttr(defaultValue)}">
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="fm-input-cancel" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer;">Cancel</button>
        <button id="fm-input-ok" style="padding:8px 12px; border-radius:8px; border:none; background:var(--accent-color); color:white; cursor:pointer;">${escapeHtmlAttr(confirmLabel)}</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    const input = dialog.querySelector("#fm-input-val");
    input.focus();
    input.select();
    const finish = (val) => { document.body.removeChild(overlay); resolve(val); };
    dialog.querySelector("#fm-input-cancel").onclick = () => finish(null);
    dialog.querySelector("#fm-input-ok").onclick = () => finish(input.value);
    input.onkeydown = (e) => {
      if (e.key === "Enter") finish(input.value);
      if (e.key === "Escape") finish(null);
    };
  });
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
  if (op.usesProgress) startProgress();
  scheduleOpsRender();
  try {
    const result = await op.run(op);
    op.status = result?.cancelled ? "cancelled" : "completed";
    if (op.onSuccess) await op.onSuccess(result);
  } catch (err) {
    op.status = err?.cancelled ? "cancelled" : "failed";
    op.error = err.message;
  } finally {
    op.finishedAt = Date.now();
    if (op.usesProgress) finishProgress();
    activeOperation = null;
    operationHistory.unshift(op);
    if (operationHistory.length > OPERATION_HISTORY_LIMIT) operationHistory.length = OPERATION_HISTORY_LIMIT;
    scheduleOpsRender();
    processOperationQueue();
  }
}

function scheduleOpsRender() {
  if (typeof updateOpsPanel === "function") updateOpsPanel();
}

function pushUndo(entry) {
  if (!entry || typeof entry.undo !== "function") return;
  undoStack.push(entry);
  if (undoStack.length > UNDO_STACK_LIMIT) undoStack.shift();
  if (typeof refreshUndoMenu === "function") refreshUndoMenu();
}

function formatOperationLabel(type, count) {
  return `${type} ${count} item${count === 1 ? "" : "s"}`;
}

function formatUndoLabel(type, count) {
  return `Undo ${type} of ${count} item${count === 1 ? "" : "s"}`;
}

async function deletePathsPermanently(paths) {
  for (const p of paths) {
    await window.fileManager.deleteItem(p);
  }
}

async function runBatchOperation(items, operation) {
  const result = await window.fileManager.batchFileOperation(items, operation);
  if (!result || !result.success) throw new Error(result?.error || "Batch operation failed");
}

function startProgress() {
  if (progressBarContainer) progressBarContainer.style.display = "block";
  realProgress = 0;
  fakeProgress = 0;
  updateProgressBar();
  progressInterval = setInterval(() => {
    fakeProgress = Math.min(95, fakeProgress + (100 - fakeProgress) * 0.05);
    updateProgressBar();
  }, 200);
}

function finishProgress() {
  clearInterval(progressInterval);
  realProgress = 100;
  fakeProgress = 100;
  updateProgressBar();
  setTimeout(() => {
    if (progressBarContainer) progressBarContainer.style.display = "none";
  }, 500);
}

function updateProgressBar() {
  const p = Math.max(realProgress, fakeProgress);
  if (progressBarFill) progressBarFill.style.width = p + "%";
}
