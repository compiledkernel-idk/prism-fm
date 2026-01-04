function loadQuickAccessItems() {
  try {
    const raw = localStorage.getItem(QUICK_ACCESS_STORAGE_KEY);
    if (!raw) {
      quickAccessItems = [...DEFAULT_BUILTINS];
      saveQuickAccessItems();
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      quickAccessItems = [...DEFAULT_BUILTINS];
      saveQuickAccessItems();
      return;
    }

    quickAccessItems = parsed
      .filter(
        (x) => x && typeof x.id === "string" && typeof x.type === "string",
      )
      .map((x) => {
        if (x.type === "builtin") {
          return {
            id: x.id,
            type: "builtin",
            key: String(x.key || ""),
            label: String(x.label || x.key || ""),
          };
        }

        return {
          id: x.id,
          type: "pin",
          path: normalizePathForCompare(String(x.path || "")),
          label:
            typeof x.label === "string" && x.label.trim()
              ? x.label.trim()
              : String(x.path || "")
                  .split(/[/\\]/)
                  .filter(Boolean)
                  .pop() || String(x.path || ""),
        };
      })
      .filter((x) => (x.type === "builtin" ? Boolean(x.key) : Boolean(x.path)));

    if (quickAccessItems.length === 0) {
      quickAccessItems = [...DEFAULT_BUILTINS];
      saveQuickAccessItems();
    }
  } catch {
    quickAccessItems = [...DEFAULT_BUILTINS];
    saveQuickAccessItems();
  }
}

function saveQuickAccessItems() {
  try {
    localStorage.setItem(
      QUICK_ACCESS_STORAGE_KEY,
      JSON.stringify(quickAccessItems),
    );
  } catch {}
}

function resolveQuickAccessPath(item) {
  if (!item) return null;

  if (item.type === "pin") return item.path || null;

  if (!commonDirs) return null;
  return commonDirs[item.key] || null;
}

function isQuickAccessExactActive(item) {
  const target = normalizePathForCompare(resolveQuickAccessPath(item));
  const cur = normalizePathForCompare(currentPath);
  return Boolean(target) && cur === target;
}

function isPinnedExact(pathToCheck) {
  const needle = normalizePathForCompare(pathToCheck);
  return quickAccessItems.some(
    (x) => x.type === "pin" && normalizePathForCompare(x.path) === needle,
  );
}

function addPin(pathToPin, label) {
  const p = normalizePathForCompare(pathToPin);
  if (!p) return;
  if (isPinnedExact(p)) return;

  const niceLabel =
    (label && String(label).trim()) ||
    p.split(/[/\\]/).filter(Boolean).pop() ||
    p;

  const inferredKey = inferBuiltinKeyFromName(niceLabel);
  if (
    inferredKey &&
    BUILTIN_REGISTRY[inferredKey] &&
    !hasBuiltin(inferredKey)
  ) {
    repinBuiltin(inferredKey);
    return;
  }

  quickAccessItems.unshift({
    id: `pin:${p}`,
    type: "pin",
    path: p,
    label: niceLabel,
  });

  saveQuickAccessItems();
  renderPinnedItems();
  syncQuickAccessHighlight();
}

function hasBuiltin(key) {
  return quickAccessItems.some((x) => x.type === "builtin" && x.key === key);
}

function repinBuiltin(keyOrName) {
  const inferred = BUILTIN_REGISTRY[keyOrName]
    ? keyOrName
    : inferBuiltinKeyFromName(keyOrName);

  if (!inferred) return;

  const b = BUILTIN_REGISTRY[inferred];
  if (!b) return;

  if (hasBuiltin(b.key)) return;

  quickAccessItems.unshift({
    id: b.id,
    type: "builtin",
    key: b.key,
    label: b.label,
  });

  saveQuickAccessItems();
  renderPinnedItems();
  syncQuickAccessHighlight();
}

function removeQuickAccessById(id) {
  quickAccessItems = quickAccessItems.filter((x) => x.id !== id);
  saveQuickAccessItems();
  renderPinnedItems();
  syncQuickAccessHighlight();
}

function moveQuickAccess(id, direction) {
  const idx = quickAccessItems.findIndex((x) => x.id === id);
  if (idx < 0) return;

  const next = idx + direction;
  if (next < 0 || next >= quickAccessItems.length) return;

  const copy = [...quickAccessItems];
  const [item] = copy.splice(idx, 1);
  copy.splice(next, 0, item);
  quickAccessItems = copy;

  saveQuickAccessItems();
  renderPinnedItems();
  syncQuickAccessHighlight();
}

function renderPinnedItems() {
  if (!pinnedListEl) return;

  pinnedListEl.innerHTML = "";

  const iconForQuickAccess = (qa) => {
    if (qa.type === "pin") return BUILTIN_ICONS.folder;
    const key = String(qa.key || "");
    return BUILTIN_ICONS[key] || BUILTIN_ICONS.folder;
  };

  for (const qa of quickAccessItems) {
    const targetPath = resolveQuickAccessPath(qa);
    const label = qa.label || (qa.type === "builtin" ? qa.key : qa.path);

    const row = document.createElement("div");
    row.className = "sidebar-item nav-item pinned-item";
    row.dataset.qaId = qa.id;
    row.draggable = true;

    if (qa.type === "pin") row.dataset.pinnedPath = qa.path;
    if (qa.type === "builtin") row.dataset.builtinKey = qa.key;

    row.innerHTML = `
      ${iconForQuickAccess(qa)}
      <span>${escapeHtmlAttr(label)}</span>
    `;

    row.addEventListener("dragstart", (e) => {
      if (draggedItems.length > 0) return;
      draggedQaId = qa.id;
      row.classList.add("quick-access-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", qa.id);
    });

    row.addEventListener("dragend", () => {
      draggedQaId = null;
      row.classList.remove("quick-access-dragging");
      pinnedListEl
        .querySelectorAll(".quick-access-insert-line")
        .forEach((el) => el.remove());
      pinnedListEl
        .querySelectorAll(".quick-access-drop-target")
        .forEach((el) => el.classList.remove("quick-access-drop-target"));
    });

    row.addEventListener("dragover", (e) => {
      if (draggedQaId && draggedQaId !== qa.id) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";

        pinnedListEl
          .querySelectorAll(".quick-access-insert-line")
          .forEach((el) => el.remove());
        pinnedListEl
          .querySelectorAll(".quick-access-drop-target")
          .forEach((el) => el.classList.remove("quick-access-drop-target"));

        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        const line = document.createElement("div");
        line.className = "quick-access-insert-line";
        line.style.top = insertBefore ? "-1px" : `${rect.height - 1}px`;
        row.style.position = "relative";
        row.appendChild(line);
      }
    });

    row.addEventListener("dragleave", () => {
      row
        .querySelectorAll(".quick-access-insert-line")
        .forEach((el) => el.remove());
      row.classList.remove("quick-access-drop-target");
    });

    row.addEventListener("drop", (e) => {
      if (draggedQaId && draggedQaId !== qa.id) {
        e.preventDefault();
        e.stopPropagation();

        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        const fromIdx = quickAccessItems.findIndex((x) => x.id === draggedQaId);
        const toIdx = quickAccessItems.findIndex((x) => x.id === qa.id);

        if (fromIdx !== -1 && toIdx !== -1) {
          const [item] = quickAccessItems.splice(fromIdx, 1);
          const newIdx = insertBefore ? toIdx : toIdx + 1;
          const adjustedIdx = fromIdx < toIdx ? newIdx - 1 : newIdx;
          quickAccessItems.splice(adjustedIdx, 0, item);
          saveQuickAccessItems();
          renderPinnedItems();
        }
      }
    });

    row.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!targetPath) return;
      await navigateTo(targetPath);
    });

    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      contextMenuMode = "quickAccess";
      contextPinTargetPath = targetPath;
      contextPinTargetLabel = label;
      contextQuickAccessId = qa.id;
      renderContextMenu();
      showContextMenu(e.clientX, e.clientY);
    });

    if (isQuickAccessExactActive(qa)) row.classList.add("active");

    pinnedListEl.appendChild(row);
  }
}

async function renderDisks() {
  if (!drivesListEl) return;
  drivesListEl.innerHTML = "";

  const drives = await fetchDrives();
  const filtered = filterDrives(drives);

  for (const d of filtered) {
    drivesListEl.appendChild(createDriveRow(d));
  }
}

async function fetchDrives() {
  try {
    return await window.fileManager.getDrives();
  } catch {
    return [];
  }
}

function filterDrives(drives) {
  return drives.filter((d) => {
    const name = String(d?.name || "").toLowerCase();
    const p = String(d?.path || "");
    if (name === "home") return false;
    if (
      p &&
      commonDirs?.home &&
      normalizePathForCompare(p) === normalizePathForCompare(commonDirs.home)
    ) {
      return false;
    }
    return true;
  });
}

function buildDriveIcons(drive) {
  const lockIcon =
    drive.readonly && drive.mounted
      ? `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0110 0v4"></path>
        </svg>`
      : "";

  const driveIcon = drive.mounted
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M3 9h18"></path>
        </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="4 2"></rect>
          <path d="M3 9h18" stroke-dasharray="4 2"></path>
        </svg>`;

  return { driveIcon, lockIcon };
}

function buildDriveUsageBar(drive) {
  if (!drive.space || drive.space.total <= 0) return "";

  const used = drive.space.total - drive.space.free;
  const percent = Math.min(100, Math.max(0, (used / drive.space.total) * 100));
  const usageClass = percent > 90 ? "critical" : "";

  return `
        <div class="drive-usage-bar-container" title="Free: ${formatSize(drive.space.free)} / Total: ${formatSize(drive.space.total)}">
          <div class="drive-usage-bar-fill ${usageClass}" style="width: ${percent}%"></div>
        </div>`;
}

async function unmountDrive(drive) {
  try {
    if (drive.mounted && drive.path) {
      await prepareUnmount(drive.path);
      cancelAllFolderSizeWork();
      cancelFolderSizeForPath(drive.path);
    }
    const result = await window.fileManager.unmountDevice(drive.device);
    if (result.success) {
      showNotification(`Unmounted ${drive.name || drive.device}`);
      await renderDisks();
      if (currentPath.startsWith(drive.path)) {
        await navigateTo(await window.fileManager.getHomeDirectory());
      }
    } else if (result.needsAuth) {
      const password = await showTextInputModal(
        "Authentication Required",
        `Enter your password to unmount "${drive.name || drive.device}".`,
        "",
        "Unmount",
        "password",
      );
      if (password === null) return;
      const authResult = await window.fileManager.unmountDevice(drive.device, {
        password,
      });
      if (authResult.success) {
        showNotification(`Unmounted ${drive.name || drive.device}`);
        await renderDisks();
        if (currentPath.startsWith(drive.path)) {
          await navigateTo(await window.fileManager.getHomeDirectory());
        }
      } else {
        showNotification(authResult.error || "Could not unmount", "error");
      }
    } else {
      showNotification(result.error || "Could not unmount", "error");
    }
  } catch (err) {
    showNotification("Unmount failed: " + err.message, "error");
  }
}

async function mountDrive(drive) {
  try {
    const result = await window.fileManager.mountDevice(drive.device);
    if (result.success && result.mountpoint) {
      showNotification(`Mounted ${drive.name || drive.device}`);
      await renderDisks();
      await navigateTo(result.mountpoint);
    } else if (result.needsAuth) {
      const password = await showTextInputModal(
        "Authentication Required",
        `Enter your password to mount "${drive.name || drive.device}".`,
        "",
        "Mount",
        "password",
      );
      if (password === null) return;
      const authResult = await window.fileManager.mountDevice(drive.device, {
        password,
      });
      if (authResult.success && authResult.mountpoint) {
        showNotification(`Mounted ${drive.name || drive.device}`);
        await renderDisks();
        await navigateTo(authResult.mountpoint);
      } else {
        showNotification(authResult.error || "Could not mount device", "error");
      }
    } else {
      showNotification(result.error || "Could not mount device", "error");
    }
  } catch (err) {
    showNotification("Mount failed: " + err.message, "error");
  }
}

function attachDriveDragDropHandlers(row, drive) {
  if (!drive.mounted || drive.readonly) return;

  row.addEventListener("dragover", (e) => {
    if (draggedItems.length === 0 && !e.dataTransfer.types.includes("Files")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
    row.classList.add("drop-target");

    if (!dragHoverTimer) {
      dragHoverTimer = setTimeout(async () => {
        dragHoverTimer = null;
        if (row.classList.contains("drop-target")) {
          await navigateTo(drive.path);
        }
      }, DRAG_HOVER_DELAY);
    }
  });

  row.addEventListener("dragleave", (e) => {
    e.stopPropagation();
    row.classList.remove("drop-target");
    if (dragHoverTimer) {
      clearTimeout(dragHoverTimer);
      dragHoverTimer = null;
    }
  });

  row.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove("drop-target");
    if (dragHoverTimer) {
      clearTimeout(dragHoverTimer);
      dragHoverTimer = null;
    }

    let pathsToProcess = [];
    if (draggedItems.length > 0) {
      pathsToProcess = [...draggedItems];
    } else if (e.dataTransfer.files.length > 0) {
      pathsToProcess = Array.from(e.dataTransfer.files)
        .map((f) => f.path)
        .filter(Boolean);
    }

    if (pathsToProcess.length > 0) {
      const isCopy = e.ctrlKey;
      await handleFileDrop(
        pathsToProcess,
        drive.path,
        isCopy,
        dragSourcePaneId,
        activePaneId,
      );
    }
  });
}

function createDriveRow(drive) {
  const row = document.createElement("div");
  row.className = "sidebar-item nav-item drive-item";
  if (!drive.mounted) row.classList.add("unmounted");
  if (drive.readonly) row.classList.add("readonly");
  row.dataset.drivePath = drive.path;
  if (drive.device) row.dataset.device = drive.device;
  row.dataset.mounted = drive.mounted ? "true" : "false";
  row.dataset.readonly = drive.readonly ? "true" : "false";

  const { driveIcon, lockIcon } = buildDriveIcons(drive);
  const barHtml = buildDriveUsageBar(drive);
  const showEject = drive.mounted && drive.path !== "/" && drive.device;
  const ejectIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 19H3v-2h18v2zm-9-14l-7 10h14l-7-10z"/></svg>`;

  row.innerHTML = `
      <span class="drive-icon-wrapper">${driveIcon}${lockIcon}</span>
      <div class="drive-info"><span class="drive-label">${escapeHtmlAttr(drive.name || drive.path)}</span>${barHtml}</div>
      ${showEject ? `<button class="drive-eject-btn" title="Unmount">${ejectIcon}</button>` : ""}
    `;

  if (showEject) {
    const btn = row.querySelector(".drive-eject-btn");
    if (btn) {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await unmountDrive(drive);
      });
    }
  }

  row.addEventListener("click", async (e) => {
    e.preventDefault();
    if (drive.mounted) {
      await navigateTo(drive.path);
    } else {
      await mountDrive(drive);
    }
  });

  row.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showDriveContextMenu(e, drive);
  });

  attachDriveDragDropHandlers(row, drive);

  return row;
}

function showDriveContextMenu(e, drive) {
  const items = [];

  const ICON_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;
  const ICON_MOUNT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
  const ICON_UNMOUNT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

  if (drive.mounted) {
    items.push({
      label: "Open",
      icon: ICON_OPEN,
      onClick: async () => {
        await navigateTo(drive.path);
      },
    });

    if (drive.path !== "/" && drive.device) {
      items.push({ type: "separator" });
      items.push({
        label: "Unmount",
        icon: ICON_UNMOUNT,
        onClick: async () => {
          await unmountDrive(drive);
        },
      });
    }
  } else {
    items.push({
      label: "Mount",
      icon: ICON_MOUNT,
      onClick: async () => {
        await mountDrive(drive);
      },
    });
  }

  renderMenuItems(contextMenuPanel, items);
  showContextMenu(e.clientX, e.clientY);
}

function renderTagsSidebar() {
  if (!tagsListEl) return;
  tagsListEl.innerHTML = "";

  TAG_COLORS.forEach((color) => {
    const row = document.createElement("div");
    row.className = "sidebar-item nav-item tag-item";
    row.dataset.tagColor = color;

    const dot = document.createElement("div");
    dot.className = "sidebar-tag-dot";
    dot.style.backgroundColor = TAG_HEX[color];

    const label = document.createElement("span");
    label.textContent = color.charAt(0).toUpperCase() + color.slice(1);

    row.appendChild(dot);
    row.appendChild(label);

    row.addEventListener("click", () => {
      navigateTo(`tag://${color}`);
    });

    tagsListEl.appendChild(row);
  });
}

async function ensureCommonDirsLoaded() {
  if (commonDirs && Object.keys(commonDirs).length > 0) return;
  commonDirs = await window.fileManager.getCommonDirectories();
}

async function syncQuickAccessHighlight() {
  const items = Array.from(document.querySelectorAll(".nav-item"));
  if (items.length === 0) return;

  try {
    await ensureCommonDirsLoaded();
  } catch {
    items.forEach((i) => i.classList.remove("active"));
    return;
  }

  const cur = normalizePathForCompare(currentPath);
  let anyMatched = false;

  for (const item of items) {
    if (item.classList.contains("pinned-item")) {
      item.classList.remove("active");

      const qaId = item.dataset.qaId;
      const qa = quickAccessItems.find((q) => q.id === qaId);
      const targetPath = resolveQuickAccessPath(qa);

      if (targetPath && normalizePathForCompare(targetPath) === cur) {
        item.classList.add("active");
        anyMatched = true;
      }
      continue;
    }

    if (item.classList.contains("drive-item")) {
      item.classList.remove("active");
      const p = normalizePathForCompare(item.dataset.drivePath);
      if (p && cur === p) {
        item.classList.add("active");
        anyMatched = true;
      }
      continue;
    }
  }

  if (!anyMatched) {
    items.forEach((i) => i.classList.remove("active"));
  }

  syncTagsHighlight();
}

function syncTagsHighlight() {
  if (!tagsListEl) return;
  const items = tagsListEl.querySelectorAll(".tag-item");
  const isTagView = currentPath.startsWith("tag://");
  const currentColor = isTagView ? currentPath.replace("tag://", "") : null;

  items.forEach((item) => {
    if (isTagView && item.dataset.tagColor === currentColor) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

