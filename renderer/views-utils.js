function normalizePathForCompare(p) {
  if (!p) return "";
  let n = String(p);
  if (window.fileManager && window.fileManager.platform === "win32") {
    n = n.replace(/\\/g, "/");
  }
  n = n.replace(/[/\\]+$/, "");
  return n === "" ? "/" : n;
}

function isPathWithin(basePath, candidatePath) {
  if (!basePath || !candidatePath) return false;
  const base = normalizePathForCompare(basePath);
  const candidate = normalizePathForCompare(candidatePath);
  if (!base || !candidate) return false;
  if (candidate === base) return true;
  if (base === "/") return true;
  return candidate.startsWith(base + "/");
}



function isExternalPath(path) {
  const candidate = normalizePathForCompare(path);
  if (!candidate) return false;
  return EXTERNAL_MOUNT_PREFIXES.some(
    (prefix) =>
      candidate === prefix ||
      (candidate.startsWith(prefix + "/") && prefix !== "/"),
  );
}

function shouldCalculateFolderSizesForPath(path) {
  if (!calculateFolderSizes) return false;
  if (isExternalPath(path)) return false;
  return true;
}

function cancelAllFolderSizeWork() {
  folderSizeQueue.length = 0;
  folderSizeInFlight.clear();
}

function updateFolderSizeCellsForCurrentView(listEl = fileList) {
  if (!listEl) return;
  const rows = Array.from(listEl.querySelectorAll(".file-item")).filter(
    (el) => el.dataset.isDirectory === "true",
  );
  for (const row of rows) {
    const cell = row.querySelector('[data-role="size"]');
    if (cell) cell.textContent = "—";
  }
}

function setFolderSizeEnabled(enabled) {
  calculateFolderSizes = Boolean(enabled);
  try {
    localStorage.setItem("calculateFolderSizes", String(calculateFolderSizes));
  } catch { }

  if (!calculateFolderSizes) {
    cancelAllFolderSizeWork();
    if (splitViewEnabled && !pickerMode) {
      if (fileListLeft) updateFolderSizeCellsForCurrentView(fileListLeft);
      if (fileListRight) updateFolderSizeCellsForCurrentView(fileListRight);
    } else {
      updateFolderSizeCellsForCurrentView();
    }
  } else {
    scheduleVisibleFolderSizes();
  }
}

function cancelFolderSizeForPath(prefixPath) {
  const base = normalizePathForCompare(prefixPath);
  if (!base) return;

  if (folderSizeQueue.length > 0) {
    const remaining = folderSizeQueue.filter(
      (p) => !isPathWithin(base, p),
    );
    folderSizeQueue.splice(0, folderSizeQueue.length, ...remaining);
  }

  for (const key of folderSizeInFlight.keys()) {
    if (isPathWithin(base, key)) {
      folderSizeInFlight.delete(key);
    }
  }

  for (const key of folderSizeCache.keys()) {
    if (isPathWithin(base, key)) {
      folderSizeCache.delete(key);
    }
  }
  saveFolderSizeCache();
}

async function prepareUnmount(mountPath) {
  if (!mountPath) return;
  const base = normalizePathForCompare(mountPath);
  if (!base) return;

  let homeDir = null;
  try {
    homeDir = await window.fileManager.getHomeDirectory();
  } catch { }

  const toClose = [];
  for (let i = 0; i < tabs.length; i++) {
    normalizeTabState(tabs[i]);
    const tabPaths = getTabPanePaths(tabs[i]);
    const tabMatches = tabPaths.some((path) => isPathWithin(base, path));
    if (tabMatches) {
      if (i === activeTabIndex) {
        if (homeDir && normalizePathForCompare(currentPath) !== homeDir) {
          await navigateTo(homeDir);
        }
        if (splitViewEnabled && panes.right?.path) {
          if (isPathWithin(base, panes.right.path)) {
            panes.right.path = homeDir || panes.right.path;
            panes.right.appHistory = panes.right.path ? [panes.right.path] : [];
            panes.right.historyIndex = panes.right.appHistory.length ? 0 : -1;
            panes.right.selectedItems = new Set();
            await ensurePaneLoaded("right", panes.right.path);
          }
        }
      } else {
        toClose.push(i);
      }
    }
  }

  toClose.sort((a, b) => b - a);
  for (const idx of toClose) {
    if (idx >= 0 && idx < tabs.length) {
      await closeTab(idx);
    }
  }
}

function getBuiltinIconForPath(path) {
  if (!path || !commonDirs) return null;
  const needle = normalizePathForCompare(path);
  for (const [key, value] of Object.entries(commonDirs)) {
    if (!value) continue;
    if (normalizePathForCompare(value) === needle) {
      return BUILTIN_ICONS[key] || null;
    }
  }
  return null;
}

function getTabIconForPath(path) {
  if (String(path || "").startsWith("tag://")) return BUILTIN_ICONS.folder;
  return getBuiltinIconForPath(path) || BUILTIN_ICONS.folder;
}

function getTabLabelForPath(path) {
  if (!path) return "";
  if (String(path).startsWith("tag://")) {
    const tag = String(path).replace("tag://", "");
    return tag ? `${tag.charAt(0).toUpperCase()}${tag.slice(1)}` : "Tags";
  }
  if (commonDirs && commonDirs.trash) {
    const trashPath = normalizePathForCompare(commonDirs.trash);
    if (normalizePathForCompare(path) === trashPath) return "Trash";
  }
  const parts = String(path).split(/[/\\]/).filter(Boolean);
  return parts.pop() || path;
}

function getTabLabelForTab(tab) {
  if (!tab) return "";
  const leftPath = tab.panes?.left?.path || tab.path || "";
  const rightPath = tab.panes?.right?.path || "";
  const leftLabel = getTabLabelForPath(leftPath);

  if (tab.splitViewEnabled && rightPath) {
    const rightLabel = getTabLabelForPath(rightPath);
    if (rightLabel && rightLabel !== leftLabel) {
      return `${leftLabel} | ${rightLabel}`;
    }
  }

  return leftLabel;
}

function getTabTooltipForTab(tab) {
  if (!tab) return "";
  const leftPath = tab.panes?.left?.path || tab.path || "";
  const rightPath = tab.panes?.right?.path || "";

  if (tab.splitViewEnabled && rightPath && rightPath !== leftPath) {
    return `${leftPath} | ${rightPath}`;
  }

  return leftPath;
}
