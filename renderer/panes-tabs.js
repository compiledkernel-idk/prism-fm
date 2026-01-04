function cacheDomRefs() {
  paneHost = document.getElementById("pane-host");
  paneDivider = document.getElementById("pane-divider");
  fileListLeft = document.getElementById("file-grid-left");
  fileListRight = document.getElementById("file-grid-right");
  fileList = fileListLeft;
  pathSegments = document.getElementById("path-segments");
  searchInput = document.getElementById("search-input");
  itemCountEl = document.getElementById("item-count");
  selectedCountEl = document.getElementById("selected-count");
  currentPathEl = document.getElementById("current-path");
  contextMenu = document.getElementById("context-menu");
  contextMenuPanel = document.getElementById("context-menu-panel");
  contextSubmenu = document.getElementById("context-submenu");
  tabBarEl = document.getElementById("tab-bar");
  progressBarContainer = document.getElementById("progress-bar-container");
  progressBarFill = document.getElementById("progress-bar-fill");
  viewMenu = document.getElementById("view-menu");
  viewModeBtn = document.getElementById("view-mode-btn");
  sortBtn = document.getElementById("sort-btn");
  groupBtn = document.getElementById("group-btn");
  settingsMenu = document.getElementById("settings-menu");
  settingsBtn = document.getElementById("settings-btn");
  opsToggleBtn = document.getElementById("ops-btn");
  opsPanel = document.getElementById("ops-panel");
  opsQueueList = document.getElementById("ops-queue-list");
  opsHistoryList = document.getElementById("ops-history-list");
  opsPauseBtn = document.getElementById("ops-pause-btn");
  opsClearBtn = document.getElementById("ops-clear-btn");
  opsCloseBtn = document.getElementById("ops-close-btn");
  themeModal = document.getElementById("theme-modal");
  themeModalBody = document.getElementById("theme-modal-body");
  themeCloseBtn = document.getElementById("theme-close-btn");
  themeResetBtn = document.getElementById("theme-reset-btn");
  themeSaveBtn = document.getElementById("theme-save-btn");

  pinnedListEl = document.getElementById("pinned-list");
  drivesListEl = document.getElementById("drives-list");
  tagsListEl = document.getElementById("tags-list");

  newFolderBtn = document.getElementById("new-folder-btn");
  newFileBtn = document.getElementById("new-file-btn");
  emptyTrashBtn = document.getElementById("empty-trash-btn");

  previewPanel = document.getElementById("preview-panel");
  previewContent = document.getElementById("preview-content");
  previewResizer = document.getElementById("preview-resizer");
  sidebarResizer = document.getElementById("sidebar-resizer");
  sidebarEl = document.getElementById("sidebar");
}

function waitForFileManager(timeoutMs = 8000) {
  if (window.fileManager) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (window.fileManager) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        const hasTauri = Boolean(window.__TAURI__);
        const hasIpc = Boolean(
          window.__TAURI_INVOKE__ || window.__TAURI_IPC__,
        );
        const origin = window.location.origin || "";
        reject(
          new Error(
            `File manager bridge not ready (origin=${origin}, tauri=${hasTauri}, ipc=${hasIpc})`,
          ),
        );
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

async function resolveStartupContext() {
  const params = new URLSearchParams(window.location.search);
  const startPathArg = params.get("startPath");

  let resolvedHome = "";
  try {
    resolvedHome = await window.fileManager.getHomeDirectory();
  } catch (e) {
    console.error("Failed to get home directory:", e);
    resolvedHome = "/home";
  }

  if (!homeDirectory) homeDirectory = resolvedHome;
  startupPathArg = startPathArg || "";
  currentPath = startPathArg || resolvedHome;

  if (params.get("picker") === "true") {
    return {
      isPicker: true,
      pickerOptions: {
        mode: params.get("pickerMode") || "open",
        multiple: params.get("allowMultiple") === "true",
        defaultFilename: params.get("defaultFilename") || "",
      },
    };
  }

  return { isPicker: false, pickerOptions: null };
}

function loadCorePreferences() {
  applyThemeOverrides(readLocalStorageJson("themeColors", {}));
  showHidden = readLocalStorageBool("showHidden", showHidden);
  splitViewEnabled = readLocalStorageBool("splitViewEnabled", splitViewEnabled);
}

function loadStartupCache() {
  try {
    const raw = localStorage.getItem("startupCacheHome");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.path !== "string") return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyPickerStartupCache(cache) {
  if (!cache || startupPathArg) return false;
  currentPath = cache.path;
  currentItems = cache.items || [];
  appHistory = [currentPath];
  historyIndex = 0;
  selectedItems.clear();

  if (currentPathEl) currentPathEl.textContent = currentPath;
  if (pathSegments) {
    pathSegments.innerHTML = "";
    const span = document.createElement("span");
    span.className = "breadcrumb-item";
    span.textContent = currentPath;
    pathSegments.appendChild(span);
  }

  if (panes[activePaneId]) {
    panes[activePaneId].path = currentPath;
    panes[activePaneId].items = currentItems;
  }

  renderFiles({ skipFolderSizes: true, allowVirtualScroll: false });
  updateStatusBar();
  return true;
}

function applyStartupCache(cache) {
  if (!cache || startupPathArg) return false;
  currentPath = homeDirectory || cache.path;
  currentItems = cache.items || [];
  appHistory = [currentPath];
  historyIndex = 0;
  selectedItems.clear();

  if (currentPathEl) currentPathEl.textContent = currentPath;
  if (pathSegments) {
    pathSegments.innerHTML = "";
    const span = document.createElement("span");
    span.className = "breadcrumb-item";
    span.textContent = currentPath;
    pathSegments.appendChild(span);
  }

  if (panes[activePaneId]) {
    panes[activePaneId].path = currentPath;
    panes[activePaneId].items = currentItems;
  }

  renderFiles({ skipFolderSizes: true, allowVirtualScroll: false });
  updateStatusBar();
  return true;
}

function loadFullPreferences() {
  fileTags = readLocalStorageJson("fileTags", fileTags);
  calculateFolderSizes = readLocalStorageBool(
    "calculateFolderSizes",
    calculateFolderSizes,
  );
  showPreviewPane = readLocalStorageBool("showPreviewPane", showPreviewPane);
  thumbnailSize = readLocalStorageNumber("thumbnailSize", thumbnailSize);
  updateThumbnailSizeCSS();
  viewSettingsCache = readLocalStorageJson("folderViewSettings", {});
  restoreFolderSizeCache(readLocalStorageJson("folderSizeCache", {}));
}

function restoreFolderSizeCache(savedSizes) {
  for (const [path, data] of Object.entries(savedSizes)) {
    folderSizeCache.set(path, data);
  }
  trimCache(folderSizeCache, MAX_FOLDER_SIZE_CACHE_ENTRIES);
}

function createPaneState(id, listEl) {
  return {
    id,
    fileListEl: listEl,
    containerEl: listEl ? listEl.closest(".file-pane") : null,
    path: "",
    items: [],
    selectedItems: new Set(),
    appHistory: [],
    historyIndex: -1,
    scrollTop: 0,
    isArchive: false,
  };
}

function updateActivePaneStyles() {
  Object.values(panes).forEach((pane) => {
    if (pane.containerEl) {
      pane.containerEl.classList.toggle("active", pane.id === activePaneId);
    }
    const listContainer = pane.fileListEl
      ? pane.fileListEl.closest(".file-list-container")
      : null;
    if (listContainer) {
      listContainer.classList.toggle("active", pane.id === activePaneId);
    }
  });
}

function syncActivePaneState() {
  const pane = panes[activePaneId];
  if (!pane) return;
  pane.path = currentPath;
  pane.items = currentItems;
  pane.appHistory = appHistory;
  pane.historyIndex = historyIndex;
  pane.selectedItems = selectedItems;
  pane.scrollTop = fileList ? fileList.scrollTop : 0;
}

function snapshotPaneState(pane) {
  if (!pane) return null;
  const scrollTop = pane.fileListEl ? pane.fileListEl.scrollTop : pane.scrollTop;
  return {
    path: pane.path || "",
    appHistory: Array.isArray(pane.appHistory) ? [...pane.appHistory] : [],
    historyIndex: typeof pane.historyIndex === "number" ? pane.historyIndex : -1,
    selectedItems: new Set(pane.selectedItems || []),
    scrollTop: scrollTop || 0,
    isArchive: Boolean(pane.isArchive),
  };
}

function applyPaneSnapshot(pane, snapshot) {
  if (!pane) return;
  if (!snapshot) {
    pane.path = "";
    pane.items = [];
    pane.selectedItems = new Set();
    pane.appHistory = [];
    pane.historyIndex = -1;
    pane.scrollTop = 0;
    pane.isArchive = false;
    return;
  }

  pane.path = snapshot.path || "";
  pane.items = [];
  pane.appHistory = Array.isArray(snapshot.appHistory)
    ? [...snapshot.appHistory]
    : pane.path
      ? [pane.path]
      : [];
  pane.historyIndex =
    typeof snapshot.historyIndex === "number"
      ? snapshot.historyIndex
      : pane.appHistory.length
        ? pane.appHistory.length - 1
        : -1;
  pane.selectedItems = snapshot.selectedItems
    ? new Set(snapshot.selectedItems)
    : new Set();
  pane.scrollTop = snapshot.scrollTop || 0;
  pane.isArchive = Boolean(snapshot.isArchive);
}

function normalizeTabState(tab) {
  if (!tab) return;

  if (!tab.panes) {
    const basePath = tab.path || currentPath || "";
    tab.panes = {
      left: {
        path: basePath,
        appHistory: tab.appHistory ? [...tab.appHistory] : basePath ? [basePath] : [],
        historyIndex:
          typeof tab.historyIndex === "number" ? tab.historyIndex : 0,
        selectedItems: new Set(tab.selectedItems || []),
        scrollTop: tab.scrollTop || 0,
        isArchive: Boolean(tab.isArchive),
      },
      right: {
        path: "",
        appHistory: [],
        historyIndex: -1,
        selectedItems: new Set(),
        scrollTop: 0,
        isArchive: false,
      },
    };
    tab.activePaneId = "left";
    tab.splitViewEnabled = false;
  }

  if (!tab.panes.left) tab.panes.left = snapshotPaneState(panes.left);
  if (!tab.panes.right) tab.panes.right = snapshotPaneState(panes.right);
  if (!tab.activePaneId) tab.activePaneId = "left";
  if (typeof tab.splitViewEnabled !== "boolean") {
    tab.splitViewEnabled = splitViewEnabled;
  }
}

function getTabPrimaryPath(tab) {
  if (!tab) return "";
  const targetId = tab.activePaneId || "left";
  const panePath =
    tab.panes &&
      tab.panes[targetId] &&
      typeof tab.panes[targetId].path === "string"
      ? tab.panes[targetId].path
      : "";
  if (panePath) return panePath;
  if (tab.panes && tab.panes.left && tab.panes.left.path) {
    return tab.panes.left.path;
  }
  return tab.path || "";
}

function getTabPanePaths(tab) {
  if (!tab) return [];
  const paths = [];
  if (tab.panes?.left?.path) paths.push(tab.panes.left.path);
  if (tab.panes?.right?.path) paths.push(tab.panes.right.path);
  if (!paths.length && tab.path) paths.push(tab.path);
  return paths;
}

function syncActiveTabState() {
  if (activeTabIndex === -1 || !tabs[activeTabIndex]) return;
  syncActivePaneState();
  const tab = tabs[activeTabIndex];
  tab.splitViewEnabled = splitViewEnabled;
  tab.activePaneId = activePaneId;
  tab.panes = {
    left: snapshotPaneState(panes.left),
    right: snapshotPaneState(panes.right),
  };
  tab.path = getTabPrimaryPath(tab);
}

function setActivePane(id, options = {}) {
  if (!panes[id] || activePaneId === id) return;
  if (!options.skipSync) {
    syncActivePaneState();
  }
  activePaneId = id;
  const pane = panes[id];

  fileList = pane.fileListEl;
  currentPath = pane.path || currentPath;
  currentItems = pane.items || [];
  if (!pane.appHistory || pane.appHistory.length === 0) {
    pane.appHistory = pane.path ? [pane.path] : [];
    pane.historyIndex = pane.appHistory.length ? 0 : -1;
  }
  appHistory = pane.appHistory;
  historyIndex = pane.historyIndex ?? -1;
  selectedItems = pane.selectedItems || new Set();
  pane.selectedItems = selectedItems;

  updateActivePaneStyles();

  const shouldRender = !options.skipRender;
  const shouldUpdateUi = options.skipUI !== true;

  if (shouldUpdateUi) {
    applyViewSettings(currentPath);
    updateUI();
    isInTrash =
      Boolean(commonDirs && commonDirs.trash) &&
      normalizePathForCompare(currentPath) ===
      normalizePathForCompare(commonDirs.trash);
    updateToolbarForTrash();
    syncQuickAccessHighlight();
    syncTagsHighlight();
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.toggle("archive-mode", Boolean(pane.isArchive));
    }
    updateStatusBar();
    updatePreviewPanelVisibility();
    updatePreviewPanelContent();
  }

  if (shouldRender) {
    renderFiles();
  } else {
    updateSelectionUI();
  }

  cancelAllFolderSizeWork();
  if (shouldCalculateFolderSizesForPath(currentPath)) {
    scheduleVisibleFolderSizes();
  }

  if (fileList) {
    fileList.scrollTop = pane.scrollTop || 0;
  }
}

function renderPane(pane) {
  if (!pane || !pane.fileListEl) return;
  const prev = {
    fileList,
    currentItems,
    selectedItems,
    currentPath,
    appHistory,
    historyIndex,
    sortBy,
    sortAscending,
    groupBy,
    viewMode,
    visibleColumns,
  };

  fileList = pane.fileListEl;
  currentItems = pane.items || [];
  selectedItems = pane.selectedItems || new Set();
  currentPath = pane.path || currentPath;

  const paneSettings = resolveViewSettings(currentPath);
  sortBy = paneSettings.sortBy;
  sortAscending = paneSettings.sortAscending;
  groupBy = paneSettings.groupBy;
  viewMode = paneSettings.viewMode;
  visibleColumns = paneSettings.visibleColumns;
  const listContainer = pane.fileListEl
    ? pane.fileListEl.closest(".file-list-container")
    : null;
  applyColumnVisibility(listContainer, visibleColumns);

  renderFiles({
    allowVirtualScroll: !splitViewEnabled,
    skipFolderSizes: pane.id !== activePaneId,
  });
  updateGroupHeaderStacking(fileList);
  if (pane.scrollTop) {
    pane.fileListEl.scrollTop = pane.scrollTop;
  }

  fileList = prev.fileList;
  currentItems = prev.currentItems;
  selectedItems = prev.selectedItems;
  currentPath = prev.currentPath;
  appHistory = prev.appHistory;
  historyIndex = prev.historyIndex;
  sortBy = prev.sortBy;
  sortAscending = prev.sortAscending;
  groupBy = prev.groupBy;
  viewMode = prev.viewMode;
  visibleColumns = prev.visibleColumns;
}

function renderAllPanes() {
  renderPane(panes.left);
  if (splitViewEnabled) {
    renderPane(panes.right);
  }
}

async function ensurePaneLoaded(paneId, fallbackPath) {
  const pane = panes[paneId];
  if (!pane) return;

  if (!pane.path) {
    pane.path = fallbackPath || (await window.fileManager.getHomeDirectory());
    pane.appHistory = [pane.path];
    pane.historyIndex = 0;
  }

  try {
    const result = await window.fileManager.getDirectoryContents(pane.path);
    if (result.success) {
      pane.path = result.path;
      pane.items = result.contents;
      pane.isArchive = Boolean(result.isArchive);
      renderPane(pane);
      if (activeTabIndex !== -1 && tabs[activeTabIndex]) {
        const tab = tabs[activeTabIndex];
        normalizeTabState(tab);
        tab.panes[paneId] = snapshotPaneState(pane);
        tab.splitViewEnabled = splitViewEnabled;
        tab.path = getTabPrimaryPath(tab);
        renderTabs();
      }
      if (activePaneId === paneId) {
        currentPath = pane.path;
        currentItems = pane.items;
        selectedItems = pane.selectedItems;
        appHistory = pane.appHistory;
        historyIndex = pane.historyIndex;
        updateUI();
        updateStatusBar();
        updatePreviewPanelVisibility();
        updatePreviewPanelContent();
      }
    }
  } catch (error) {
    console.error("Failed to load pane:", error);
  }
}

function setSplitViewEnabled(enabled, options = {}) {
  splitViewEnabled = Boolean(enabled);
  const appContainer = document.querySelector(".app-container");
  if (appContainer) {
    appContainer.classList.toggle("split-view", splitViewEnabled);
  }

  if (!splitViewEnabled && activePaneId === "right") {
    setActivePane("left");
  }

  if (splitViewEnabled) {
    const ensureRightPane = async () => {
      let targetPath = panes.right?.path || panes.left?.path || currentPath;
      if (!options.keepRightPane) {
        try {
          targetPath = await window.fileManager.getHomeDirectory();
        } catch { }
        panes.right.path = targetPath || "";
        panes.right.appHistory = targetPath ? [targetPath] : [];
        panes.right.historyIndex = panes.right.appHistory.length ? 0 : -1;
        panes.right.selectedItems = new Set();
        panes.right.scrollTop = 0;
        panes.right.isArchive = false;
      }
      await ensurePaneLoaded("right", targetPath);
    };
    void ensureRightPane();
  }

  updateActivePaneStyles();
  renderAllPanes();

  if (!options.skipTabSync && activeTabIndex !== -1 && tabs[activeTabIndex]) {
    syncActiveTabState();
    renderTabs();
  }

  if (options.persist !== false) {
    try {
      localStorage.setItem("splitViewEnabled", String(splitViewEnabled));
    } catch { }
  }
}

function setupPanes() {
  panes.left = createPaneState("left", fileListLeft);
  panes.right = createPaneState("right", fileListRight);

  panes.left.path = currentPath;
  panes.left.appHistory = [currentPath];
  panes.left.historyIndex = 0;
  selectedItems = panes.left.selectedItems;
  appHistory = panes.left.appHistory;
  historyIndex = panes.left.historyIndex;
  fileList = panes.left.fileListEl;

  [panes.left, panes.right].forEach((pane) => {
    if (!pane?.containerEl) return;
    pane.containerEl.addEventListener("mousedown", () => {
      if (pane.id !== activePaneId) {
        setActivePane(pane.id, { skipRender: true });
      }
    });
  });

  updateActivePaneStyles();
}

function setPickerLoadingState() {
  const grid = document.getElementById("file-grid-left");
  if (grid) {
    grid.innerHTML = "";
  }
}

function loadPickerSidebarData() {
  window.fileManager.getCommonDirectories().then((dirs) => {
    commonDirs = dirs;
    hasRealTrashFolder = Boolean(dirs && dirs.trash);
    loadQuickAccessItems();
    renderPinnedItems();
  });
  renderDisks();
}

async function bootstrapPicker() {
  setPickerLoadingState();
  const cached = loadStartupCache();
  if (cached && applyPickerStartupCache(cached)) {
    document.documentElement.classList.add("picker-ready");
  }
  await navigateTo(currentPath);
  document.documentElement.classList.add("picker-ready");
  loadPickerSidebarData();
}

async function bootstrapFullApp() {
  loadQuickAccessItems();
  renderPinnedItems();
  loadFullPreferences();

  const commonDirsPromise = window.fileManager.getCommonDirectories();

  if (!currentPath) {
    try {
      const dirs = await commonDirsPromise;
      if (dirs && dirs.home) {
        currentPath = dirs.home;
        homeDirectory = dirs.home;
        commonDirs = dirs;
      }
    } catch (e) {
      console.error("Failed to get home directory for startup", e);
    }
  }

  // If still empty, fall back to root or simple dot (though home should have worked)
  if (!currentPath) currentPath = "/";

  // Trigger navigation but allow UI to unblock slightly faster if needed,
  // though awaiting is safer to prevent empty state flicker.
  await navigateTo(currentPath);

  document.documentElement.classList.remove("app-loading");

  // If we didn't await commonDirs above, do it now
  if (!commonDirs || Object.keys(commonDirs).length === 0) {
    try {
      commonDirs = await commonDirsPromise;
    } catch { }
  }

  hasRealTrashFolder = Boolean(commonDirs && commonDirs.trash);

  // Ensure homeDirectory is set if it wasn't
  if (!homeDirectory && commonDirs && commonDirs.home) {
    homeDirectory = commonDirs.home;
  }

  renderPinnedItems();
  syncQuickAccessHighlight();

  scheduleIdle(() => {
    renderDisks();
  });
  scheduleIdle(() => {
    renderTagsSidebar();
    syncTagsHighlight();
  });
}

async function initializeTabs() {
  const leftSnapshot = snapshotPaneState(panes.left);
  const rightSnapshot = snapshotPaneState(panes.right);
  tabs.push({
    id: Date.now(),
    panes: {
      left: leftSnapshot,
      right: rightSnapshot,
    },
    activePaneId,
    splitViewEnabled,
    path: currentPath,
  });
  await activateTab(0);
}

function setupProgressListener() {
  if (!window.fileManager?.onFileOperationProgress) return;
  window.fileManager.onFileOperationProgress((percent) => {
    setProgress(percent);
    if (activeOperation) {
      activeOperation.progress = percent;
      scheduleOpsRender();
    }
  });
}

async function init() {
  cacheDomRefs();

  try {
    await waitForFileManager();
    const { isPicker, pickerOptions } = await resolveStartupContext();
    if (isPicker) {
      document.documentElement.classList.add("picker-mode-early");
    } else {
      document.documentElement.classList.add("app-loading");
    }
    loadCorePreferences();
    setupPanes();
    if (!isPicker) {
      const cached = loadStartupCache();
      if (cached && applyStartupCache(cached)) {
        document.documentElement.classList.remove("app-loading");
      }
    }

    if (isPicker) {
      pickerMode = pickerOptions.mode;
      initPickerMode(
        pickerOptions.mode,
        pickerOptions.multiple,
        pickerOptions.defaultFilename,
      );
      await bootstrapPicker();
    } else {
      await bootstrapFullApp();
    }

    await initializeTabs();

    if (isPicker) {
      setSplitViewEnabled(false, { persist: false });
    } else {
      setSplitViewEnabled(splitViewEnabled, { persist: false });
    }

    setupEventListeners();
    setupTabEventListeners();
    setupThumbnailObserver();
    setupPathBarClick();

    if (splitViewEnabled && !isPicker) {
      renderAllPanes();
    } else {
      renderFiles();
    }
    updateStatusBar();
    updatePreviewPanelVisibility();
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Failed to initialize: " + error.message, "error");
  }

  setupProgressListener();
}

function initPickerMode(mode, multiple, defaultFilename) {
  document.body.classList.add("picker-mode");

  const footer = document.createElement("div");
  footer.className = "picker-footer";

  const hiddenToggleHtml = `<button class="picker-btn toggle-hidden ${showHidden ? "active" : ""}" id="picker-hidden-toggle" title="Show Hidden Files">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>`;

  if (mode === "save") {
    footer.innerHTML = `
      <div class="picker-status" style="flex: 1; display: flex; align-items: center; gap: 10px;">
        <span>Name:</span>
        <input type="text" id="picker-filename-input" class="picker-input" placeholder="Filename" style="flex: 1; max-width: 400px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); outline: none;">
      </div>
      <div class="picker-actions">
        ${hiddenToggleHtml}
        <button class="picker-btn new-folder" id="picker-new-folder-btn" title="Create New Folder">New Folder</button>
        <button class="picker-btn cancel" id="picker-cancel-btn">Cancel</button>
        <button class="picker-btn confirm" id="picker-confirm-btn">Save</button>
      </div>
    `;
  } else if (mode === "directory") {
    footer.innerHTML = `
      <div class="picker-status">
        Select Directory: <span id="picker-selection-label"></span>
      </div>
      <div class="picker-actions">
        ${hiddenToggleHtml}
        <button class="picker-btn new-folder" id="picker-new-folder-btn" title="Create New Folder">New Folder</button>
        <button class="picker-btn cancel" id="picker-cancel-btn">Cancel</button>
        <button class="picker-btn confirm" id="picker-confirm-btn">Select</button>
      </div>
    `;
  } else {
    footer.innerHTML = `
      <div class="picker-status">
        Select File: <span id="picker-selection-label"></span>
      </div>
      <div class="picker-actions">
        ${hiddenToggleHtml}
        <button class="picker-btn cancel" id="picker-cancel-btn">Cancel</button>
        <button class="picker-btn confirm" id="picker-confirm-btn">Select</button>
      </div>
    `;
  }

  document.querySelector(".app-container").appendChild(footer);

  const confirmBtn = document.getElementById("picker-confirm-btn");
  const cancelBtn = document.getElementById("picker-cancel-btn");
  const filenameInput = document.getElementById("picker-filename-input");
  const newFolderPickerBtn = document.getElementById("picker-new-folder-btn");
  const hiddenToggleBtn = document.getElementById("picker-hidden-toggle");

  if (newFolderPickerBtn) {
    newFolderPickerBtn.addEventListener("click", () => {
      createNewFolder();
    });
  }

  if (hiddenToggleBtn) {
    hiddenToggleBtn.addEventListener("click", () => {
      showHidden = !showHidden;
      hiddenToggleBtn.classList.toggle("active", showHidden);
      try {
        localStorage.setItem("showHidden", String(showHidden));
      } catch { }
      renderFiles();
    });
  }

  if (mode === "open") confirmBtn.disabled = true;
  if (mode === "save") confirmBtn.disabled = true;

  if (mode === "save" && defaultFilename) {
    filenameInput.value = defaultFilename;
    confirmBtn.disabled = false;
  }

  cancelBtn.addEventListener("click", () => {
    window.fileManager.pickerCancel();
  });

  confirmBtn.addEventListener("click", async () => {
    if (mode === "save") {
      const name = filenameInput.value.trim();
      if (!name) return;

      const fullPath = await window.fileManager.joinPaths(currentPath, name);
      window.fileManager.pickerConfirm([fullPath]);
      return;
    }

    if (mode === "directory") {
      const items = Array.from(selectedItems);
      if (items.length > 0) {
        window.fileManager.pickerConfirm(items);
      } else {
        window.fileManager.pickerConfirm([currentPath]);
      }
    } else {
      const items = Array.from(selectedItems);
      if (items.length > 0) {
        window.fileManager.pickerConfirm(items);
      }
    }
  });

  const originalUpdateSelectionUI = updateSelectionUI;
  updateSelectionUI = () => {
    originalUpdateSelectionUI();

    if (mode === "open") {
      const hasFile = Array.from(selectedItems).some((p) => {
        const item = currentItems.find((i) => i.path === p);
        return item && !item.isDirectory;
      });
      confirmBtn.disabled = !hasFile;
      const label = document.getElementById("picker-selection-label");
      if (label)
        label.textContent = Array.from(selectedItems)
          .map((p) => p.split(/[/\\]/).pop())
          .join(", ");
    } else if (mode === "directory") {
      const label = document.getElementById("picker-selection-label");
      if (label) {
        label.textContent =
          selectedItems.size > 0
            ? Array.from(selectedItems)
              .map((p) => p.split(/[/\\]/).pop())
              .join(", ")
            : currentPath;
      }
    }
  };

  if (filenameInput) {
    filenameInput.focus();
    filenameInput.addEventListener("input", () => {
      confirmBtn.disabled = !filenameInput.value.trim();
    });
    filenameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !confirmBtn.disabled) confirmBtn.click();
    });
  }
}

async function activateTab(index) {
  if (index < 0 || index >= tabs.length) return;

  if (activeTabIndex !== -1 && tabs[activeTabIndex]) {
    syncActiveTabState();
  }

  activeTabIndex = index;
  const tab = tabs[index];
  normalizeTabState(tab);

  applyPaneSnapshot(panes.left, tab.panes.left);
  applyPaneSnapshot(panes.right, tab.panes.right);

  const tabSplitView = Boolean(tab.splitViewEnabled);
  setSplitViewEnabled(tabSplitView, {
    persist: false,
    skipTabSync: true,
    keepRightPane: true,
  });

  const targetPaneId =
    tabSplitView && tab.activePaneId === "right" ? "right" : "left";
  setActivePane(targetPaneId, { skipRender: true, skipSync: true });

  renderTabs();

  try {
    await ensurePaneLoaded("left", tab.panes.left?.path || currentPath);
    if (tabSplitView) {
      await ensurePaneLoaded("right", tab.panes.right?.path || currentPath);
    }
  } catch (e) {
    console.error("Failed to load tab content", e);
  }
}

async function createNewTab(path) {
  const startPath = path || (await window.fileManager.getHomeDirectory());
  const leftSnapshot = snapshotPaneState(panes.left);
  leftSnapshot.path = startPath;
  leftSnapshot.appHistory = [startPath];
  leftSnapshot.historyIndex = 0;
  leftSnapshot.selectedItems = new Set();
  leftSnapshot.scrollTop = 0;
  leftSnapshot.isArchive = false;

  const rightSnapshot = snapshotPaneState(panes.right);
  const rightPath = startPath;
  rightSnapshot.path = rightPath;
  rightSnapshot.appHistory = rightPath ? [rightPath] : [];
  rightSnapshot.historyIndex = rightSnapshot.appHistory.length ? 0 : -1;
  rightSnapshot.selectedItems = new Set();
  rightSnapshot.scrollTop = 0;
  rightSnapshot.isArchive = false;

  tabs.push({
    id: Date.now() + Math.random(),
    panes: {
      left: leftSnapshot,
      right: rightSnapshot,
    },
    activePaneId: "left",
    splitViewEnabled,
    path: startPath,
  });
  await activateTab(tabs.length - 1);
}

async function closeTab(index, e) {
  if (e) e.stopPropagation();

  if (tabs.length <= 1) {
    const home = await window.fileManager.getHomeDirectory();
    normalizeTabState(tabs[0]);
    const tabPath = getTabPrimaryPath(tabs[0]);
    if (tabPath !== home) {
      await navigateTo(home);
    }
    return;
  }

  tabs.splice(index, 1);

  if (index === activeTabIndex) {
    activeTabIndex = -1;
    const newIndex = Math.max(0, index - 1);
    await activateTab(newIndex);
  } else {
    if (index < activeTabIndex) {
      activeTabIndex--;
    }
    renderTabs();
  }
}

function renderTabs() {
  if (!tabBarEl) return;
  tabBarEl.innerHTML =
    tabs
      .map(
        (tab, i) => {
          const tabPath =
            i === activeTabIndex ? currentPath : getTabPrimaryPath(tab);
          const icon = getTabIconForPath(tabPath);
          const title = escapeHtml(getTabLabelForTab(tab));
          const tooltip = escapeHtmlAttr(getTabTooltipForTab(tab));
          return `
    <div class="tab ${i === activeTabIndex ? "active" : ""}" data-tab-index="${i}">
      <div class="tab-icon">${icon}</div>
      <div class="tab-title" title="${tooltip}">${title}</div>
      <div class="tab-close" data-tab-close="${i}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
    </div>
  `;
        },
      )
      .join("") +
    `
    <div class="new-tab-btn" data-new-tab title="New Tab">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    </div>
  `;
}

function setupTabEventListeners() {
  if (!tabBarEl) return;

  let dragHoverTimeout = null;
  let dragHoverTabIndex = null;

  tabBarEl.addEventListener("click", async (e) => {
    const newTabBtn = e.target.closest("[data-new-tab]");
    if (newTabBtn) {
      await createNewTab();
      return;
    }

    const closeBtn = e.target.closest("[data-tab-close]");
    if (closeBtn) {
      const index = parseInt(closeBtn.dataset.tabClose, 10);
      await closeTab(index, e);
      return;
    }

    const tab = e.target.closest("[data-tab-index]");
    if (tab) {
      const index = parseInt(tab.dataset.tabIndex, 10);
      await activateTab(index);
    }
  });

  tabBarEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const tab = e.target.closest("[data-tab-index]");
    if (!tab) {
      clearTimeout(dragHoverTimeout);
      dragHoverTabIndex = null;
      return;
    }

    const index = parseInt(tab.dataset.tabIndex, 10);
    if (index === activeTabIndex) return;

    if (dragHoverTabIndex !== index) {
      clearTimeout(dragHoverTimeout);
      dragHoverTabIndex = index;
      dragHoverTimeout = setTimeout(async () => {
        if (dragHoverTabIndex === index) {
          await activateTab(index);
        }
      }, 800);
    }
  });

  tabBarEl.addEventListener("dragleave", (e) => {
    if (!tabBarEl.contains(e.relatedTarget)) {
      clearTimeout(dragHoverTimeout);
      dragHoverTabIndex = null;
    }
  });

  tabBarEl.addEventListener("drop", () => {
    clearTimeout(dragHoverTimeout);
    dragHoverTabIndex = null;
  });
}
