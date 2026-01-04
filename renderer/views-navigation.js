async function navigateTo(path) {
  if (path.startsWith("tag://")) {
    const color = path.replace("tag://", "");
    currentPath = path;

    const paths = Object.entries(fileTags)
      .filter(([p, tags]) => tags.includes(color))
      .map(([p]) => p);

    const items = [];
    for (const p of paths) {
      try {
        const res = await window.fileManager.getItemInfo(p);
        if (res.success) {
          const info = res.info;
          if (!info.extension && info.isFile) {
            const extMatch = info.name.match(/\.([^.]+)$/);
            info.extension = extMatch ? "." + extMatch[1] : "";
          }
          items.push(info);
        }
      } catch (e) { }
    }

    currentItems = items;
    if (panes[activePaneId]) {
      panes[activePaneId].isArchive = false;
    }
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("archive-mode");
    }
    finishNavigation();
    document
      .querySelectorAll(".sidebar-item")
      .forEach((el) => el.classList.remove("active"));
    syncTagsHighlight();
    return;
  }

  try {
    const result = await window.fileManager.getDirectoryContents(path);

    if (result.success) {
      currentPath = result.path;
      currentItems = result.contents;

      const appContainer = document.querySelector(".app-container");
      if (result.isArchive) {
        appContainer.classList.add("archive-mode");
      } else {
        appContainer.classList.remove("archive-mode");
      }
      if (panes[activePaneId]) {
        panes[activePaneId].isArchive = Boolean(result.isArchive);
      }

      applyViewSettings(currentPath);
      collapsedGroups.clear();

      if (activeTabIndex !== -1 && tabs[activeTabIndex]) {
        const tab = tabs[activeTabIndex];
        normalizeTabState(tab);
        if (tab.panes?.[activePaneId]) {
          tab.panes[activePaneId].path = currentPath;
          tab.panes[activePaneId].appHistory = [...appHistory];
          tab.panes[activePaneId].historyIndex = historyIndex;
          tab.panes[activePaneId].selectedItems = new Set(selectedItems);
          tab.panes[activePaneId].scrollTop = fileList ? fileList.scrollTop : 0;
          tab.panes[activePaneId].isArchive = Boolean(result.isArchive);
        }
        tab.activePaneId = activePaneId;
        tab.splitViewEnabled = splitViewEnabled;
        tab.path = getTabPrimaryPath(tab);
      }
      renderTabs();

      if (panes[activePaneId]) {
        panes[activePaneId].path = currentPath;
        panes[activePaneId].items = currentItems;
      }

      if (!pickerMode) {
        saveStartupCache(currentPath, currentItems);
      }

      finishNavigation();

      isInTrash =
        Boolean(commonDirs && commonDirs.trash) &&
        normalizePathForCompare(currentPath) ===
        normalizePathForCompare(commonDirs.trash);
      updateToolbarForTrash();
      syncQuickAccessHighlight();
      scheduleVisibleFolderSizes();
    } else {
      showNotification("Error: " + result.error, "error");
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}



function saveStartupCache(path, items) {
  if (!path || !Array.isArray(items)) return;
  const homeCandidate =
    homeDirectory || (commonDirs && commonDirs.home) || "";
  if (
    !homeCandidate ||
    normalizePathForCompare(path) !== normalizePathForCompare(homeCandidate)
  ) {
    return;
  }
  try {
    const trimmed = items.slice(0, STARTUP_CACHE_MAX_ITEMS).map((item) => ({
      name: item.name,
      path: item.path,
      isDirectory: Boolean(item.isDirectory),
      isFile: Boolean(item.isFile),
      isSymlink: Boolean(item.isSymlink),
      linkTarget: item.linkTarget || null,
      size: item.size || 0,
      modified: item.modified || null,
      created: item.created || null,
      extension: item.extension || "",
    }));
    localStorage.setItem(
      STARTUP_CACHE_KEY,
      JSON.stringify({ path, items: trimmed, ts: Date.now() }),
    );
  } catch { }
}

window.activateTab = activateTab;
window.closeTab = closeTab;
window.createNewTab = createNewTab;

function finishNavigation() {
  folderSizeQueue.length = 0;

  clearThumbnailObserver();
  setupThumbnailObserver();
  if (fileList) fileList.scrollTop = 0;

  if (scrollLoadObserver) {
    scrollLoadObserver.disconnect();
  }
  filteredItems = [];
  renderedItemCount = 0;
  isLoadingMore = false;

  if (historyIndex === -1 || appHistory[historyIndex] !== currentPath) {
    appHistory = appHistory.slice(0, historyIndex + 1);
    appHistory.push(currentPath);
    historyIndex = appHistory.length - 1;

    if (appHistory.length > MAX_HISTORY_LENGTH) {
      const overflow = appHistory.length - MAX_HISTORY_LENGTH;
      appHistory = appHistory.slice(overflow);
      historyIndex -= overflow;
    }
  }

  updateUI();
  if (splitViewEnabled && !pickerMode) {
    renderAllPanes();
  } else {
    renderFiles();
  }
  selectedItems.clear();
  updateStatusBar();

  if (panes[activePaneId]) {
    panes[activePaneId].appHistory = appHistory;
    panes[activePaneId].historyIndex = historyIndex;
    panes[activePaneId].selectedItems = selectedItems;
  }
}

function applyViewSettings(path) {
  const settings = resolveViewSettings(path);
  sortBy = settings.sortBy;
  sortAscending = settings.sortAscending;
  groupBy = settings.groupBy;
  viewMode = settings.viewMode;
  visibleColumns = settings.visibleColumns;
  const container =
    splitViewEnabled && panes[activePaneId]?.fileListEl
      ? panes[activePaneId].fileListEl.closest(".file-list-container")
      : null;
  applyColumnVisibility(container, visibleColumns);
}

function resolveViewSettings(path) {
  const key = normalizePathForCompare(path);
  const defaultColumns = { size: true, modified: true, added: true };

  if (viewSettingsCache[key]) {
    const s = viewSettingsCache[key];
    return {
      sortBy: s.sortBy || "name",
      sortAscending:
        typeof s.sortAscending === "boolean" ? s.sortAscending : true,
      groupBy: s.groupBy || "none",
      viewMode: s.viewMode || "detailed",
      visibleColumns: s.visibleColumns || defaultColumns,
    };
  }

  if (
    commonDirs &&
    commonDirs.downloads &&
    normalizePathForCompare(commonDirs.downloads) === key
  ) {
    return {
      sortBy: "date",
      sortAscending: false,
      groupBy: "dateModified",
      viewMode: "detailed",
      visibleColumns: defaultColumns,
    };
  }

  return {
    sortBy: "name",
    sortAscending: true,
    groupBy: "none",
    viewMode: "detailed",
    visibleColumns: defaultColumns,
  };
}

function applyColumnVisibility(targetContainer = null, columns = null) {
  const containers = targetContainer
    ? [targetContainer]
    : document.querySelectorAll(".file-list-container");
  if (!containers.length) return;

  const state = columns || visibleColumns;
  containers.forEach((container) => {
    container.classList.toggle("hide-size", !state.size);
    container.classList.toggle("hide-modified", !state.modified);
    container.classList.toggle("hide-added", !state.added);
  });
}

function updateThumbnailSizeCSS() {
  document.documentElement.style.setProperty(
    "--thumbnail-size",
    `${thumbnailSize}px`,
  );
}

function saveCurrentViewSettings() {
  const key = normalizePathForCompare(currentPath);
  viewSettingsCache[key] = {
    sortBy,
    sortAscending,
    groupBy,
    viewMode,
    visibleColumns,
  };
  try {
    trimObjectCache(viewSettingsCache, MAX_VIEW_SETTINGS_CACHE_ENTRIES);
    localStorage.setItem(
      "folderViewSettings",
      JSON.stringify(viewSettingsCache),
    );
  } catch { }
}
