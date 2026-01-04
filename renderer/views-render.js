function updateUI() {
  updateBreadcrumb();
  updateNavigationButtons();
  if (currentPathEl) {
    currentPathEl.textContent = currentPath;
  }
}

function updateBreadcrumb() {
  if (!pathSegments) return;

  pathSegments.innerHTML = "";

  const isWindows = window.fileManager.platform === "win32";
  const sep = isWindows ? "\\" : "/";
  const parts = currentPath.split(sep).filter((p) => p);

  if (currentPath.startsWith("tag://")) {
    const color = currentPath.replace("tag://", "");
    const rootBtn = document.createElement("button");
    rootBtn.className = "breadcrumb-item";
    rootBtn.textContent = "Tags";
    pathSegments.appendChild(rootBtn);

    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "›";
    pathSegments.appendChild(separator);

    const tagBtn = document.createElement("button");
    tagBtn.className = "breadcrumb-item";
    tagBtn.textContent = color.charAt(0).toUpperCase() + color.slice(1);
    pathSegments.appendChild(tagBtn);
    return;
  }

  const rootBtn = document.createElement("button");
  rootBtn.className = "breadcrumb-item";
  rootBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
  rootBtn.addEventListener("click", () => {
    navigateTo(isWindows ? parts[0] + sep : "/");
  });
  pathSegments.appendChild(rootBtn);

  let accumulated = isWindows ? "" : "/";

  parts.forEach((part, index) => {
    if (isWindows && index === 0) {
      accumulated = part + sep;
    } else {
      accumulated = accumulated + (accumulated.endsWith(sep) ? "" : sep) + part;
    }

    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "›";
    pathSegments.appendChild(separator);

    const partBtn = document.createElement("button");
    partBtn.className = "breadcrumb-item";
    partBtn.textContent = part;
    const targetPath = accumulated;
    partBtn.addEventListener("click", () => navigateTo(targetPath));
    pathSegments.appendChild(partBtn);
  });
}

function updateNavigationButtons() {
  const backBtn = document.getElementById("back-btn");
  const forwardBtn = document.getElementById("forward-btn");

  if (backBtn) backBtn.disabled = historyIndex <= 0;
  if (forwardBtn) forwardBtn.disabled = historyIndex >= history.length - 1;
}

function getFileType(item) {
  if (item.isDirectory) return fileTypes.folder;

  const ext = (item.extension || "").replace(".", "").toLowerCase();

  for (const [type, info] of Object.entries(fileTypes)) {
    if (info.extensions && info.extensions.includes(ext)) {
      return info;
    }
  }

  return fileTypes.default;
}

function formatSize(bytes) {
  if (bytes === 0 || bytes === undefined) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

function folderSizeSpinnerHtml() {
  return "—";
}

function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - dateDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return (
      "Today, " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  } else {
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

function resetFileListView() {
  fileList.innerHTML = "";
  fileList.className = `file-list ${viewMode}-view`;

  const container = fileList.closest(".file-list-container");
  const header = container ? container.querySelector(".file-list-header") : null;
  if (header) {
    header.style.display = viewMode === "detailed" ? "grid" : "none";
  }
}

function getSearchTerm() {
  return searchInput ? searchInput.value.toLowerCase() : "";
}

function filterItems(items, searchTerm) {
  let filtered = items;
  if (!showHidden) {
    filtered = filtered.filter((item) => !item.name.startsWith("."));
  }

  if (pickerMode === "directory") {
    filtered = filtered.filter((item) => item.isDirectory);
  }

  if (searchTerm) {
    filtered = filtered.filter((item) =>
      item.name.toLowerCase().includes(searchTerm),
    );
  }

  return filtered;
}

function getItemSortSize(item) {
  if (!item.isDirectory) return item.size ?? 0;
  return folderSizeCache.get(item.path)?.size ?? 0;
}

function compareItems(a, b) {
  if (a.isDirectory && !b.isDirectory) return -1;
  if (!a.isDirectory && b.isDirectory) return 1;

  let comparison = 0;
  switch (sortBy) {
    case "name":
      comparison = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      break;
    case "size":
      comparison = getItemSortSize(a) - getItemSortSize(b);
      break;
    case "date":
      comparison = new Date(a.modified || 0) - new Date(b.modified || 0);
      break;
    case "added":
      comparison = new Date(a.created || 0) - new Date(b.created || 0);
      break;
    case "type": {
      const extA = (a.extension || "").toLowerCase();
      const extB = (b.extension || "").toLowerCase();
      comparison = extA.localeCompare(extB);
      break;
    }
  }

  return sortAscending ? comparison : -comparison;
}

function getDateGroupLabel(dateValue) {
  if (!dateValue) return "Unknown";
  const d = new Date(dateValue);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - dateDay) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  if (diffDays < 365) return "This Year";
  return "Older";
}

function getGroupKey(item) {
  switch (groupBy) {
    case "type":
      if (item.isDirectory) return "Folders";
      return item.extension
        ? `${item.extension.slice(1).toUpperCase()} Files`
        : "Other Files";
    case "dateModified":
      return getDateGroupLabel(item.modified);
    case "dateAdded":
      return getDateGroupLabel(item.created);
    case "size": {
      if (item.isDirectory) return "Folders";
      const size = item.size || 0;
      if (size === 0) return "Empty";
      if (size < 1024) return "Tiny (< 1 KB)";
      if (size < 1024 * 1024) return "Small (< 1 MB)";
      if (size < 100 * 1024 * 1024) return "Medium (< 100 MB)";
      if (size < 1024 * 1024 * 1024) return "Large (< 1 GB)";
      return "Huge (> 1 GB)";
    }
    default:
      return "All";
  }
}

function buildGroups(items) {
  const groups = new Map();
  items.forEach((item) => {
    const groupKey = getGroupKey(item);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  });
  return groups;
}

function renderEmptyState(searchTerm) {
  fileList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="80" height="80">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <p class="empty-state-text">${searchTerm ? "No matching items" : "This folder is empty"}</p>
      </div>
    `;
}

function getFolderSizeCell(item) {
  if (!item.isDirectory || !calculateFolderSizes) return "—";
  const cached = folderSizeCache.get(item.path);
  const fresh =
    cached && Date.now() - cached.ts < FOLDER_SIZE_CACHE_TTL_MS ? cached : null;
  return fresh ? formatSize(fresh.size) : folderSizeSpinnerHtml();
}

function getItemTagsHtml(itemPath) {
  const itemTags = fileTags[itemPath] || [];
  if (itemTags.length === 0) return "";
  return `<span class="file-tags">${itemTags
    .map(
      (c) =>
        `<span class="tag-dot" style="background-color:${TAG_HEX[c]}"></span>`,
    )
    .join("")}</span>`;
}

function getThumbnailProps(fileType) {
  if (viewMode === "thumbnail" && fileType === fileTypes.image) {
    return { iconContent: fileType.icon, shouldObserveThumbnail: true };
  }
  return { iconContent: fileType.icon, shouldObserveThumbnail: false };
}

function buildItemHtml(
  item,
  fileType,
  folderSizeCell,
  tagsHtml,
  iconContent,
  shouldObserveThumbnail,
) {
  return `
      <div class="file-icon" style="color: ${fileType.color}"${
        shouldObserveThumbnail
          ? ` data-thumb-path="${escapeHtmlAttr(item.path)}" data-fallback-icon="${escapeHtmlAttr(fileType.icon)}"`
          : ""
      }>
        ${iconContent}
      </div>
      <div class="file-name">${escapeHtml(item.name)}${tagsHtml}</div>
      <div class="file-size" data-role="size" data-path="${escapeHtml(item.path)}">${item.isDirectory ? folderSizeCell : formatSize(item.size)}</div>
      <div class="file-date">${formatDate(item.modified)}</div>
      <div class="file-added">${formatDate(item.created)}</div>
    `;
}

function setupDragHandlers(element, item) {
  element.draggable = true;

  element.addEventListener("dragstart", (e) => {
    isDragging = true;
    const paneId = element.closest(".file-pane")?.dataset.pane;
    if (paneId && paneId !== activePaneId) {
      setActivePane(paneId, { skipRender: true });
    }
    dragSourcePaneId = paneId || activePaneId;
    if (selectedItems.has(item.path)) {
      draggedItems = Array.from(selectedItems);
    } else {
      draggedItems = [item.path];
    }
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", draggedItems.join("\n"));
    e.dataTransfer.setData(
      "application/x-file-manager-paths",
      JSON.stringify(draggedItems),
    );
    element.classList.add("dragging");
  });

  element.addEventListener("dragend", () => {
    isDragging = false;
    draggedItems = [];
    dragSourcePaneId = null;
    element.classList.remove("dragging");
    document
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"));
    clearInterval(dragScrollInterval);
    dragScrollInterval = null;
  });
}

function setupFolderDropHandlers(element, item) {
  let folderHoverTimer = null;

  element.addEventListener("dragover", (e) => {
    if (draggedItems.includes(item.path)) return;
    if (draggedItems.some((p) => item.path.startsWith(p + "/"))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
    element.classList.add("drop-target");
    const paneId = element.closest(".file-pane")?.dataset.pane;
    if (paneId && paneId !== activePaneId) {
      setActivePane(paneId, { skipRender: true });
    }

    if (!folderHoverTimer) {
      folderHoverTimer = setTimeout(async () => {
        folderHoverTimer = null;
        if (element.classList.contains("drop-target")) {
          await navigateTo(item.path);
        }
      }, DRAG_HOVER_DELAY);
    }
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove("drop-target");
    if (folderHoverTimer) {
      clearTimeout(folderHoverTimer);
      folderHoverTimer = null;
    }
  });

  element.addEventListener("drop", async (e) => {
    e.preventDefault();
    element.classList.remove("drop-target");
    if (folderHoverTimer) {
      clearTimeout(folderHoverTimer);
      folderHoverTimer = null;
    }

    const paneId = element.closest(".file-pane")?.dataset.pane;
    if (paneId && paneId !== activePaneId) {
      setActivePane(paneId, { skipRender: true });
    }

    if (draggedItems.length > 0) {
      const isCopy = e.ctrlKey;
      await handleFileDrop(
        draggedItems,
        item.path,
        isCopy,
        dragSourcePaneId,
        activePaneId,
      );
      return;
    }

    if (e.dataTransfer.files.length > 0) {
      const externalPaths = Array.from(e.dataTransfer.files).map((f) => f.path);
      await handleFileDrop(externalPaths, item.path, true, null, activePaneId);
    }
  });
}

function setupItemClickHandlers(element, item) {
  element.addEventListener("click", (e) => {
    const paneId = element.closest(".file-pane")?.dataset.pane;
    if (paneId && paneId !== activePaneId) {
      setActivePane(paneId, { skipRender: true });
    }
    handleItemClick(e, item);
  });
  element.addEventListener("dblclick", () => {
    const paneId = element.closest(".file-pane")?.dataset.pane;
    if (paneId && paneId !== activePaneId) {
      setActivePane(paneId, { skipRender: true });
    }
    openItem(item);
  });
}

function renderFileItem(item) {
  const fileType = getFileType(item);
  const element = document.createElement("div");
  element.className = `file-item ${selectedItems.has(item.path) ? "selected" : ""}`;
  element.dataset.path = item.path;
  element.dataset.name = item.name;
  element.dataset.isDirectory = item.isDirectory;

  const folderSizeCell = getFolderSizeCell(item);
  const tagsHtml = getItemTagsHtml(item.path);
  const { iconContent, shouldObserveThumbnail } = getThumbnailProps(fileType);

  element.innerHTML = buildItemHtml(
    item,
    fileType,
    folderSizeCell,
    tagsHtml,
    iconContent,
    shouldObserveThumbnail,
  );

  if (shouldObserveThumbnail) {
    const iconEl = element.querySelector(".file-icon");
    if (iconEl) {
      observeThumbnail(iconEl);
    }
  }

  setupDragHandlers(element, item);
  if (item.isDirectory) setupFolderDropHandlers(element, item);
  setupItemClickHandlers(element, item);

  return element;
}

function sortGroups(groups) {
  const sortedGroups = Array.from(groups.entries());

  if (groupBy === "size") {
    const sizeGroupOrder = [
      "Folders",
      "Empty",
      "Tiny (< 1 KB)",
      "Small (< 1 MB)",
      "Medium (< 100 MB)",
      "Large (< 1 GB)",
      "Huge (> 1 GB)",
    ];

    sortedGroups.sort((a, b) => {
      const indexA = sizeGroupOrder.indexOf(a[0]);
      const indexB = sizeGroupOrder.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  } else if (groupBy === "dateModified" || groupBy === "dateAdded") {
    const dateGroupOrder = [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "This Year",
      "Older",
      "Unknown",
    ];

    sortedGroups.sort((a, b) => {
      const indexA = dateGroupOrder.indexOf(a[0]);
      const indexB = dateGroupOrder.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  } else {
    sortedGroups.sort((a, b) => {
      if (a[0] === "Folders") return -1;
      if (b[0] === "Folders") return 1;
      return a[0].localeCompare(b[0]);
    });
  }

  return sortedGroups;
}

function updateGroupHeaderStacking(listEl = fileList) {
  if (!listEl) return;
  if (groupHeaderRafMap.get(listEl)) return;

  const rafId = requestAnimationFrame(() => {
    groupHeaderRafMap.delete(listEl);
    const headers = Array.from(listEl.querySelectorAll(".group-header"));
    if (headers.length === 0) return;

    const paddingTop = parseFloat(getComputedStyle(listEl).paddingTop) || 0;
    const listTop = listEl.getBoundingClientRect().top + paddingTop + 1;
    let lastStuckIndex = -1;
    const tops = headers.map((header) => header.getBoundingClientRect().top);

    for (let i = 0; i < tops.length; i++) {
      if (tops[i] <= listTop) lastStuckIndex = i;
    }

    for (let i = 0; i < headers.length; i++) {
      const isStuck = tops[i] <= listTop;
      const hide = lastStuckIndex !== -1 && isStuck && i < lastStuckIndex;
      headers[i].classList.toggle("group-header-hidden", hide);
    }
  });

  groupHeaderRafMap.set(listEl, rafId);
}

function renderGroupedItems(groups, fragment) {
  const sortedGroups = sortGroups(groups);

  for (const [groupName, groupItems] of sortedGroups) {
    const sortedGroupItems = groupItems;
    const isCollapsed = collapsedGroups.has(groupName);
    const header = document.createElement("div");
    header.className = "group-header";

    const chevron = `<svg class="group-chevron ${isCollapsed ? "" : "expanded"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    header.innerHTML = `${chevron}<span class="group-name">${escapeHtml(groupName)}</span><span class="group-count">${sortedGroupItems.length}</span>`;
    header.addEventListener("click", (e) => {
      if (e.target.closest(".group-chevron")) {
        if (collapsedGroups.has(groupName)) collapsedGroups.delete(groupName);
        else collapsedGroups.add(groupName);
        if (splitViewEnabled && !pickerMode) {
          renderAllPanes();
        } else {
          renderFiles();
        }
        return;
      }

      const paths = sortedGroupItems.map((i) => i.path);
      if (e.ctrlKey || e.metaKey) {
        const allSelected = paths.every((p) => selectedItems.has(p));
        if (allSelected) paths.forEach((p) => selectedItems.delete(p));
        else paths.forEach((p) => selectedItems.add(p));
      } else {
        selectedItems.clear();
        paths.forEach((p) => selectedItems.add(p));
      }
      updateSelectionUI();
    });
    fragment.appendChild(header);

    if (!isCollapsed) {
      sortedGroupItems.forEach((item) => {
        fragment.appendChild(renderFileItem(item));
      });
    }
  }
}

function renderChunkedItems(items, fragment) {
  filteredItems = items;
  renderItemForVirtualScroll = renderFileItem;
  renderedItemCount = 0;

  setupScrollLoadObserver();

  const initialCount = Math.min(ITEMS_PER_CHUNK, items.length);
  for (let i = 0; i < initialCount; i++) {
    fragment.appendChild(renderFileItem(items[i]));
  }
  renderedItemCount = initialCount;

  if (renderedItemCount < items.length) {
    const sentinel = document.createElement("div");
    sentinel.className = "load-more-sentinel";
    sentinel.style.height = "1px";
    fragment.appendChild(sentinel);
  }

  fileList.appendChild(fragment);

  const sentinel = fileList.querySelector(".load-more-sentinel");
  if (sentinel && scrollLoadObserver) {
    scrollLoadObserver.observe(sentinel);
  }
}

function renderAllItems(items, fragment) {
  items.forEach((item) => {
    fragment.appendChild(renderFileItem(item));
  });
  fileList.appendChild(fragment);
}

function renderFiles(options = {}) {
  if (!fileList) return;

  resetFileListView();

  const fragment = document.createDocumentFragment();
  let items = filterItems([...currentItems], getSearchTerm());
  items.sort(compareItems);

  const allowVirtualScroll =
    typeof options.allowVirtualScroll === "boolean"
      ? options.allowVirtualScroll
      : !splitViewEnabled;

  const groups = new Map();
  if (groupBy !== "none") {
    const grouped = buildGroups(items);
    grouped.forEach((value, key) => groups.set(key, value));
  }

  if (items.length === 0) {
    renderEmptyState(getSearchTerm());
    return;
  }

  if (groupBy !== "none" && groups.size > 0) {
    renderGroupedItems(groups, fragment);
    fileList.appendChild(fragment);
  } else {
    if (allowVirtualScroll && items.length > MAX_ITEMS_BEFORE_VIRTUAL_SCROLL) {
      renderChunkedItems(items, fragment);
    } else {
      renderAllItems(items, fragment);
    }
  }

  if (!allowVirtualScroll && scrollLoadObserver) {
    scrollLoadObserver.disconnect();
  }

  if (!options.skipFolderSizes) {
    scheduleVisibleFolderSizes();
  }
  updateGroupHeaderStacking();
  document.dispatchEvent(new Event("ezfm:columns-updated"));
}

function renderCurrentView() {
  if (splitViewEnabled && !pickerMode) {
    renderAllPanes();
  } else {
    renderFiles();
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function handleItemClick(e, item) {
  if (pickerMode === "open" && item.isDirectory) return;
  if (pickerMode === "save") return;

  if (e.ctrlKey || e.metaKey) {
    if (selectedItems.has(item.path)) {
      selectedItems.delete(item.path);
    } else {
      selectedItems.add(item.path);
    }
  } else if (e.shiftKey && selectedItems.size > 0) {
    const allItems = Array.from(fileList.children).filter((el) =>
      el.classList.contains("file-item"),
    );
    const lastSelected = Array.from(selectedItems).pop();
    const lastIndex = allItems.findIndex(
      (el) => el.dataset.path === lastSelected,
    );
    const currentIndex = allItems.findIndex(
      (el) => el.dataset.path === item.path,
    );

    const [start, end] = [
      Math.min(lastIndex, currentIndex),
      Math.max(lastIndex, currentIndex),
    ];

    for (let i = start; i <= end; i++) {
      if (allItems[i]) {
        selectedItems.add(allItems[i].dataset.path);
      }
    }
  } else {
    selectedItems.clear();
    selectedItems.add(item.path);
  }

  updateSelectionUI();
}

function updateSelectionUI() {
  const pane = panes[activePaneId];
  const listEl = pane?.fileListEl || fileList;
  const selectedSet = pane?.selectedItems || selectedItems;
  if (listEl) {
    listEl.querySelectorAll(".file-item").forEach((el) => {
      el.classList.toggle("selected", selectedSet.has(el.dataset.path));
    });
  }
  updateStatusBar();
  updatePreviewPanelContent();
}

function toggleFileTag(path, color) {
  if (!fileTags[path]) fileTags[path] = [];
  const idx = fileTags[path].indexOf(color);
  if (idx > -1) {
    fileTags[path].splice(idx, 1);
    if (fileTags[path].length === 0) delete fileTags[path];
  } else {
    fileTags[path].push(color);
  }
  localStorage.setItem("fileTags", JSON.stringify(fileTags));
  renderCurrentView();

  if (currentPath === `tag://${color}`) {
    navigateTo(currentPath);
  }
}

function selectSingleItemByPath(itemPath) {
  if (!itemPath) return;
  selectedItems.clear();
  selectedItems.add(itemPath);
  updateSelectionUI();
}

function scrollItemIntoView(itemPath) {
  if (!fileList || !itemPath) return;
  const row = fileList.querySelector(
    `.file-item[data-path="${cssEscape(itemPath)}"]`,
  );
  if (!row) return;
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function renamePath(oldPath, currentNameForDefault) {
  if (!oldPath) return;
  const raw = await showTextInputModal(
    "Rename",
    "Enter new name:",
    currentNameForDefault || "",
  );
  if (raw === null) return;

  const validated = validateNewItemName(raw);
  if (!validated.ok) {
    showNotification(validated.reason, "error");
    return;
  }

  try {
    const result = await window.fileManager.renameItem(oldPath, validated.name);
    if (result && result.success) {
      showNotification(`Renamed to ${validated.name}`);
      await navigateTo(currentPath);

      const newPath =
        result.newPath ||
        (await window.fileManager.joinPaths(currentPath, validated.name));
      pushUndo({
        label: formatUndoLabel("Rename", 1, `"${validated.name}"`),
        successMessage: "Undid rename",
        undo: async () => {
          const undoResult = await window.fileManager.renameItem(
            newPath,
            currentNameForDefault || "",
          );
          if (!undoResult || !undoResult.success) {
            throw new Error(undoResult?.error || "Undo rename failed");
          }
          refresh();
        },
      });
      selectSingleItemByPath(newPath);
      scrollItemIntoView(newPath);
    } else {
      showNotification("Error: " + (result?.error || "Rename failed"), "error");
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function openItem(item) {
  const archiveExts = [
    ".zip",
    ".7z",
    ".rar",
    ".tar",
    ".gz",
    ".tgz",
    ".bz2",
    ".xz",
    ".iso",
    ".txz",
    ".tbz2",
  ];
  const ext = (item.extension || "").toLowerCase();
  if (item.isDirectory || archiveExts.includes(ext)) {
    await navigateTo(item.path);
  } else {
    await window.fileManager.openFile(item.path);
  }
}

async function goBack() {
  if (historyIndex > 0) {
    historyIndex--;
    const path = history[historyIndex];
    const result = await window.fileManager.getDirectoryContents(path);
    if (result.success) {
      currentPath = result.path;
      currentItems = result.contents;
      if (panes[activePaneId]) {
        panes[activePaneId].isArchive = Boolean(result.isArchive);
      }
      const appContainer = document.querySelector(".app-container");
      if (appContainer) {
        appContainer.classList.toggle(
          "archive-mode",
          Boolean(result.isArchive),
        );
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
        panes[activePaneId].path = currentPath;
        panes[activePaneId].items = currentItems;
        panes[activePaneId].history = history;
        panes[activePaneId].historyIndex = historyIndex;
        panes[activePaneId].selectedItems = selectedItems;
      }
    }
  }
}

async function goForward() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    const path = history[historyIndex];
    const result = await window.fileManager.getDirectoryContents(path);
    if (result.success) {
      currentPath = result.path;
      currentItems = result.contents;
      if (panes[activePaneId]) {
        panes[activePaneId].isArchive = Boolean(result.isArchive);
      }
      const appContainer = document.querySelector(".app-container");
      if (appContainer) {
        appContainer.classList.toggle(
          "archive-mode",
          Boolean(result.isArchive),
        );
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
        panes[activePaneId].path = currentPath;
        panes[activePaneId].items = currentItems;
        panes[activePaneId].history = history;
        panes[activePaneId].historyIndex = historyIndex;
        panes[activePaneId].selectedItems = selectedItems;
      }
    }
  }
}

async function goUp() {
  const parent = await window.fileManager.getParentDirectory(currentPath);
  if (parent !== currentPath) {
    await navigateTo(parent);
  }
}

function refresh() {
  if (currentItems) {
    for (const item of currentItems) {
      if (item.isDirectory) {
        folderSizeCache.delete(item.path);
      }
    }
  }
  navigateTo(currentPath);
}

async function refreshPane(paneId) {
  const pane = panes[paneId];
  if (!pane || !pane.path) return;

  try {
    const result = await window.fileManager.getDirectoryContents(pane.path);
    if (result.success) {
      pane.path = result.path;
      pane.items = result.contents;
      pane.isArchive = Boolean(result.isArchive);
      renderPane(pane);
      if (paneId === activePaneId) {
        const appContainer = document.querySelector(".app-container");
        if (appContainer) {
          appContainer.classList.toggle("archive-mode", pane.isArchive);
        }
      }
    }
  } catch (error) {
    console.error("Pane refresh failed:", error);
  }
}

function toggleHiddenFiles() {
  showHidden = !showHidden;
  try {
    localStorage.setItem("showHidden", String(showHidden));
  } catch {}
  if (splitViewEnabled && !pickerMode) {
    renderAllPanes();
  } else {
    renderFiles();
  }
  updateStatusBar();
  const toggleBtn = document.getElementById("toggle-hidden-btn");
  if (toggleBtn) toggleBtn.classList.toggle("active", showHidden);
  const pickerToggle = document.getElementById("picker-hidden-toggle");
  if (pickerToggle) pickerToggle.classList.toggle("active", showHidden);
}

function setupPathBarClick() {
  const pathBar = document.querySelector(".path-bar");
  if (!pathBar) return;

  pathBar.addEventListener("click", (e) => {
    if (e.target === pathBar || e.target.classList.contains("breadcrumb")) {
      focusPathBar();
    }
  });
}

function focusPathBar() {
  const pathBar = document.querySelector(".path-bar");
  const breadcrumb = document.getElementById("path-segments");
  if (!pathBar || !breadcrumb) return;

  let pathInput = document.getElementById("path-input");
  if (pathInput) {
    pathInput.focus();
    pathInput.select();
    return;
  }

  breadcrumb.style.display = "none";

  pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.id = "path-input";
  pathInput.className = "path-input";
  pathInput.value = currentPath;
  pathBar.appendChild(pathInput);

  pathInput.focus();
  pathInput.select();

  const closePathInput = () => {
    pathInput.remove();
    breadcrumb.style.display = "";
  };

  pathInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      let newPath = pathInput.value.trim();
      closePathInput();
      if (newPath && newPath !== currentPath) {
        if (newPath.startsWith("~")) {
          const home = await window.fileManager.getHomeDirectory();
          newPath = newPath.replace(/^~/, home);
        }
        await navigateTo(newPath);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePathInput();
    }
  });

  pathInput.addEventListener("blur", () => {
    setTimeout(closePathInput, 150);
  });
}

function updateStatusBar() {
  if (itemCountEl) {
    const visibleCount = showHidden
      ? currentItems.length
      : currentItems.filter((item) => !item.name.startsWith(".")).length;
    itemCountEl.textContent = `${visibleCount} items`;
  }
  if (selectedCountEl) {
    selectedCountEl.textContent =
      selectedItems.size > 0 ? `${selectedItems.size} selected` : "";
  }
}

const notificationQueue = [];
let notificationActive = false;

function showNextNotification() {
  if (notificationActive || notificationQueue.length === 0) return;
  notificationActive = true;

  const { message, type } = notificationQueue.shift();
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s";
    setTimeout(() => {
      notification.remove();
      notificationActive = false;
      showNextNotification();
    }, 300);
  }, 3000);
}

function showNotification(message, type = "info") {
  notificationQueue.push({ message, type });
  showNextNotification();
}
