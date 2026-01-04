let activeMenuType = null;

function toggleViewMenu(type, btn) {
  if (!viewMenu) return;

  if (settingsMenu && settingsMenu.style.display === "block") {
    settingsMenu.style.display = "none";
  }

  if (viewMenu.style.display === "block" && activeMenuType === type) {
    viewMenu.style.display = "none";
    activeMenuType = null;
    return;
  }

  activeMenuType = type;
  renderViewMenu(type);
  viewMenu.style.display = "block";

  if (btn) {
    const rect = btn.getBoundingClientRect();

    const availableHeight = rect.top - 16;
    viewMenu.style.maxHeight = `${Math.max(100, availableHeight)}px`;
    viewMenu.style.overflowY = "auto";

    const menuWidth = viewMenu.offsetWidth;

    let left = rect.left;
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    viewMenu.style.left = `${left}px`;
    viewMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    viewMenu.style.top = "auto";
  }
}

function renderViewMenu(type) {
  if (!viewMenu) return;
  viewMenu.innerHTML = "";

  const createOption = (label, isActive, onClick) => {
    const div = document.createElement("div");
    div.className = `context-menu-item`;
    div.innerHTML = `
      <span style="flex:1">${escapeHtml(label)}</span>
      ${
        isActive
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-hover)"><polyline points="20 6 9 17 4 12"/></svg>`
          : `<div style="width:16px"></div>`
      }
    `;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      viewMenu.style.display = "none";
    });
    return div;
  };

  const createHeader = (text) => {
    const div = document.createElement("div");
    div.className = "context-menu-header";
    div.textContent = text;
    return div;
  };

  const createSep = () => {
    const div = document.createElement("div");
    div.className = "context-menu-separator";
    return div;
  };

  const rerender = () => {
    if (splitViewEnabled && !pickerMode) {
      renderAllPanes();
    } else {
      renderFiles();
    }
  };

  const updateSort = (newSort) => {
    if (sortBy === newSort) {
      sortAscending = !sortAscending;
    } else {
      sortBy = newSort;
      sortAscending = newSort === "name";
    }
    saveCurrentViewSettings();
    rerender();
  };

  const updateGroup = (newGroup) => {
    groupBy = newGroup;
    collapsedGroups.clear();
    saveCurrentViewSettings();
    rerender();
  };

  const updateView = (newView) => {
    viewMode = newView;
    saveCurrentViewSettings();
    rerender();
  };

  const toggleColumn = (col) => {
    visibleColumns[col] = !visibleColumns[col];
    const container =
      splitViewEnabled && panes[activePaneId]?.fileListEl
        ? panes[activePaneId].fileListEl.closest(".file-list-container")
        : null;
    applyColumnVisibility(container, visibleColumns);
    saveCurrentViewSettings();
  };

  if (type === "view") {
    viewMenu.appendChild(createHeader("View Mode"));
    viewMenu.appendChild(
      createOption("Detailed", viewMode === "detailed", () =>
        updateView("detailed"),
      ),
    );
    viewMenu.appendChild(
      createOption("List", viewMode === "list", () => updateView("list")),
    );
    viewMenu.appendChild(
      createOption("Grid", viewMode === "grid", () => updateView("grid")),
    );
    viewMenu.appendChild(
      createOption("Thumbnail", viewMode === "thumbnail", () =>
        updateView("thumbnail"),
      ),
    );

    viewMenu.appendChild(createSep());
    viewMenu.appendChild(
      createOption("Show Folder Sizes", calculateFolderSizes, () => {
        setFolderSizeEnabled(!calculateFolderSizes);
        rerender();
      }),
    );
    if (!pickerMode) {
      viewMenu.appendChild(
        createOption("Split View", splitViewEnabled, () => {
          setSplitViewEnabled(!splitViewEnabled);
        }),
      );
    }
    if (viewMode === "detailed") {
      viewMenu.appendChild(createHeader("Columns"));
      viewMenu.appendChild(
        createOption("Size", visibleColumns.size, () => toggleColumn("size")),
      );
      viewMenu.appendChild(
        createOption("Date Modified", visibleColumns.modified, () =>
          toggleColumn("modified"),
        ),
      );
      viewMenu.appendChild(
        createOption("Date Added", visibleColumns.added, () =>
          toggleColumn("added"),
        ),
      );
    }

    if (viewMode === "thumbnail") {
      const div = document.createElement("div");
      div.className = "context-menu-item";
      div.style.flexDirection = "column";
      div.style.alignItems = "stretch";
      div.style.cursor = "default";
      div.style.paddingBottom = "12px";

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600;">
          <span>Thumbnail Size</span>
          <span id="thumb-size-display">${thumbnailSize}px</span>
        </div>
        <input type="range" min="80" max="300" step="10" value="${thumbnailSize}" style="width:100%; cursor:pointer;">
      `;

      div.addEventListener("click", (e) => e.stopPropagation());
      const range = div.querySelector("input");
      const display = div.querySelector("#thumb-size-display");
      range.addEventListener("input", (e) => {
        thumbnailSize = parseInt(e.target.value, 10);
        display.textContent = `${thumbnailSize}px`;
        updateThumbnailSizeCSS();
        try {
          localStorage.setItem("thumbnailSize", thumbnailSize);
        } catch {}
      });
      viewMenu.appendChild(div);
    }
  } else if (type === "sort") {
    viewMenu.appendChild(createHeader("Sort By"));
    viewMenu.appendChild(
      createOption("Name", sortBy === "name", () => updateSort("name")),
    );
    viewMenu.appendChild(
      createOption("Date Modified", sortBy === "date", () =>
        updateSort("date"),
      ),
    );
    viewMenu.appendChild(
      createOption("Date Added", sortBy === "added", () => updateSort("added")),
    );
    viewMenu.appendChild(
      createOption("Size", sortBy === "size", () => updateSort("size")),
    );
    viewMenu.appendChild(
      createOption("Type", sortBy === "type", () => updateSort("type")),
    );

    viewMenu.appendChild(createSep());

    viewMenu.appendChild(createHeader("Order"));
    viewMenu.appendChild(
      createOption("Ascending", sortAscending, () => {
        sortAscending = true;
        saveCurrentViewSettings();
        rerender();
      }),
    );
    viewMenu.appendChild(
      createOption("Descending", !sortAscending, () => {
        sortAscending = false;
        saveCurrentViewSettings();
        rerender();
      }),
    );
  } else if (type === "group") {
    viewMenu.appendChild(createHeader("Group By"));
    viewMenu.appendChild(
      createOption("None", groupBy === "none", () => updateGroup("none")),
    );
    viewMenu.appendChild(
      createOption("Type", groupBy === "type", () => updateGroup("type")),
    );
    viewMenu.appendChild(
      createOption("Date Modified", groupBy === "dateModified", () =>
        updateGroup("dateModified"),
      ),
    );
    viewMenu.appendChild(
      createOption("Date Added", groupBy === "dateAdded", () =>
        updateGroup("dateAdded"),
      ),
    );
    viewMenu.appendChild(
      createOption("Size", groupBy === "size", () => updateGroup("size")),
    );
  }
}

function toggleSettingsMenu() {
  if (!settingsMenu) return;

  if (viewMenu && viewMenu.style.display === "block") {
    viewMenu.style.display = "none";
  }

  if (settingsMenu.style.display === "block") {
    settingsMenu.style.display = "none";
    return;
  }

  renderSettingsMenu();
  settingsMenu.style.display = "block";

  if (settingsBtn) {
    const rect = settingsBtn.getBoundingClientRect();

    const availableHeight = rect.top - 16;
    settingsMenu.style.maxHeight = `${Math.max(100, availableHeight)}px`;
    settingsMenu.style.overflowY = "auto";

    const menuWidth = settingsMenu.offsetWidth;

    let left = rect.left;
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    settingsMenu.style.left = `${left}px`;
    settingsMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    settingsMenu.style.top = "auto";
  }
}

function renderSettingsMenu() {
  if (!settingsMenu) return;
  settingsMenu.innerHTML = "";

  const createOption = (label, isActive, onClick) => {
    const div = document.createElement("div");
    div.className = `context-menu-item`;
    div.innerHTML = `
      <span style="flex:1">${escapeHtml(label)}</span>
      ${
        isActive
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-hover)"><polyline points="20 6 9 17 4 12"/></svg>`
          : `<div style="width:16px"></div>`
      }
    `;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      settingsMenu.style.display = "none";
    });
    return div;
  };

  const createHeader = (text) => {
    const div = document.createElement("div");
    div.className = "context-menu-header";
    div.textContent = text;
    return div;
  };

  const createSep = () => {
    const div = document.createElement("div");
    div.className = "context-menu-separator";
    return div;
  };

  const appearanceHeader = createHeader("Appearance");
  appearanceHeader.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: -3px; margin-right: 8px;">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.38 0 2.69-.28 3.89-.77l-1.4-1.4c-.63.3-1.31.47-2.02.47-4.42 0-8-3.58-8-8s3.58-8 8-8c.71 0 1.39.17 2.02.47l1.4-1.4C14.69 2.28 13.38 2 12 2z"/><path d="M18 6a2 2 0 0 0-2-2c-1.11 0-2 .9-2 2a2 2 0 0 0 2 2c1.11 0 2-.9 2-2z"/><path d="M20 12a2 2 0 0 0-2-2c-1.11 0-2 .9-2 2a2 2 0 0 0 2 2c1.11 0 2-.9 2-2z"/><path d="M18 18a2 2 0 0 0-2-2c-1.11 0-2 .9-2 2a2 2 0 0 0 2 2c1.11 0 2-.9 2-2z"/><path d="M14 12a2 2 0 0 0-2-2c-1.11 0-2 .9-2 2a2 2 0 0 0 2 2c1.11 0 2-.9 2-2z"/>
    </svg>
    <span>Appearance</span>
  `;
  settingsMenu.appendChild(appearanceHeader);
  settingsMenu.appendChild(
    createOption("Customize Colors...", false, () => {
      openThemeCustomizer();
    }),
  );
  settingsMenu.appendChild(
    createOption("Show Preview Pane", showPreviewPane, () => {
      showPreviewPane = !showPreviewPane;
      try {
        localStorage.setItem("showPreviewPane", String(showPreviewPane));
      } catch {}
      updatePreviewPanelVisibility();
    }),
  );
  settingsMenu.appendChild(
    createOption("Show Hidden Files", showHidden, () => {
      showHidden = !showHidden;
      try {
        localStorage.setItem("showHidden", String(showHidden));
      } catch {}
      renderCurrentView();
      updateStatusBar();
    }),
  );
}

function showContextMenu(x, y) {
  if (!contextMenu) return;

  contextMenu.classList.add("visible");

  closeContextSubmenu();

  const rect = contextMenu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - 10;
  }
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 10;
  }

  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
}

function hideContextMenu() {
  if (contextMenu) {
    contextMenu.classList.remove("visible");
  }
  closeContextSubmenu();
}

function closeContextSubmenu() {
  contextSubmenuOpen = false;
  if (contextSubmenu) {
    contextSubmenu.style.display = "none";
    contextSubmenu.innerHTML = "";
  }
}

function renderMenuItems(container, items) {
  if (!container) return;
  container.innerHTML = "";

  for (const it of items) {
    if (it.type === "separator") {
      const sep = document.createElement("div");
      sep.className = "context-menu-separator";
      container.appendChild(sep);
      continue;
    }

    if (it.type === "custom" && it.element) {
      container.appendChild(it.element);
      continue;
    }

    const row = document.createElement("div");
    row.className = "context-menu-item";

    if (it.danger) row.classList.add("danger");
    if (it.disabled) row.classList.add("disabled");
    if (it.submenu) row.classList.add("has-submenu");

    row.innerHTML = `
      ${it.icon || ""}
      <span>${escapeHtmlAttr(it.label)}</span>
    `;

    if (it.disabled) {
      row.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    } else if (it.submenu) {
      row.addEventListener("mouseenter", () => {
        openContextSubmenu(it.submenu);
      });
      row.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openContextSubmenu(it.submenu);
      });
    } else if (typeof it.onClick === "function") {
      row.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideContextMenu();
        it.onClick();
      });
    }

    container.appendChild(row);
  }
}

const CONTEXT_MENU_ICONS = {
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
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

function createTagsRow(targetPath) {
  const currentTags = fileTags[targetPath] || [];
  const row = document.createElement("div");
  row.className = "context-menu-tags";

  TAG_COLORS.forEach((color) => {
    const dot = document.createElement("div");
    dot.className = `context-tag-option ${currentTags.includes(color) ? "active" : ""}`;
    dot.style.backgroundColor = TAG_HEX[color];
    dot.title = color.charAt(0).toUpperCase() + color.slice(1);

    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (selectedItems.size > 1 && selectedItems.has(targetPath)) {
        selectedItems.forEach((p) => toggleFileTag(p, color));
      } else {
        toggleFileTag(targetPath, color);
      }
      hideContextMenu();
    });
    row.appendChild(dot);
  });
  return row;
}

function buildUndoMenuItem() {
  const hasUndo = undoStack.length > 0;
  return {
    label: getUndoMenuLabel(),
    icon: CONTEXT_MENU_ICONS.undo,
    disabled: !hasUndo,
    onClick: () => performUndo(),
  };
}

function buildBackgroundMenuItems() {
  const items = [buildUndoMenuItem(), { type: "separator" }];

  if (isInTrash) {
    items.push({
      label: "Empty Trash",
      icon: CONTEXT_MENU_ICONS.trash,
      danger: true,
      onClick: () => emptyTrash(),
    });
    return items;
  }

  const canPaste = clipboardItems && clipboardItems.length > 0;
  const newSubmenu = [
    {
      label: "Folder",
      icon: CONTEXT_MENU_ICONS.folder,
      onClick: () => createNewFolder(),
    },
    {
      label: "File",
      icon: CONTEXT_MENU_ICONS.file,
      onClick: () => createNewFile(),
    },
  ];

  items.push(
    {
      label: "Paste",
      icon: CONTEXT_MENU_ICONS.paste,
      disabled: !canPaste,
      onClick: () => paste(),
    },
    { type: "separator" },
    {
      label: "New",
      icon: "",
      submenu: newSubmenu,
    },
  );

  if (contextPinTargetPath) {
    items.push({ type: "separator" });
    items.push({
      label: isPinnedExact(contextPinTargetPath) ? "Unpin" : "Pin",
      icon: isPinnedExact(contextPinTargetPath)
        ? CONTEXT_MENU_ICONS.unpin
        : CONTEXT_MENU_ICONS.pin,
      onClick: async () => {
        if (isPinnedExact(contextPinTargetPath)) {
          removeQuickAccessById(
            `pin:${normalizePathForCompare(contextPinTargetPath)}`,
          );
        } else {
          const label = await showTextInputModal(
            "Pin folder",
            "Label:",
            contextPinTargetPath.split(/[/\\]/).filter(Boolean).pop() ||
              contextPinTargetPath,
            "Pin",
          );
          if (label === null) return;
          addPin(contextPinTargetPath, String(label).trim());
        }
      },
    });
  }

  return items;
}

function buildQuickAccessMenuItems() {
  const qaId = contextQuickAccessId;
  return [
    buildUndoMenuItem(),
    { type: "separator" },
    {
      label: "Move Up",
      icon: CONTEXT_MENU_ICONS.moveUp,
      disabled: quickAccessItems.findIndex((x) => x.id === qaId) <= 0,
      onClick: () => moveQuickAccess(qaId, -1),
    },
    {
      label: "Move Down",
      icon: CONTEXT_MENU_ICONS.moveDown,
      disabled:
        quickAccessItems.findIndex((x) => x.id === qaId) >=
        quickAccessItems.length - 1,
      onClick: () => moveQuickAccess(qaId, +1),
    },
    { type: "separator" },
    {
      label: "Unpin",
      icon: CONTEXT_MENU_ICONS.unpin,
      danger: true,
      onClick: () => removeQuickAccessById(qaId),
    },
  ];
}

function buildItemMenuItems() {
  const itemMenu = [
    {
      label: "Open",
      icon: CONTEXT_MENU_ICONS.open,
      onClick: () => openSelected(),
    },
    { type: "separator" },
    {
      label: "Copy",
      icon: CONTEXT_MENU_ICONS.copy,
      onClick: () => copySelected(),
    },
    {
      label: "Cut",
      icon: CONTEXT_MENU_ICONS.cut,
      onClick: () => cutSelected(),
    },
    {
      label: "Paste",
      icon: CONTEXT_MENU_ICONS.paste,
      disabled: !(clipboardItems && clipboardItems.length > 0),
      onClick: () => paste(),
    },
    { type: "separator" },
  ];

  if (selectedItems.size > 0) {
    itemMenu.push({
      type: "custom",
      element: createTagsRow(Array.from(selectedItems)[0]),
    });
    itemMenu.push({ type: "separator" });
    itemMenu.push(buildUndoMenuItem());
    itemMenu.push({ type: "separator" });
  } else {
    itemMenu.unshift({ type: "separator" });
    itemMenu.unshift(buildUndoMenuItem());
  }

  if (selectedItems.size === 1) {
    const p = Array.from(selectedItems)[0];
    const it = currentItems.find((x) => x.path === p);
    if (it && it.isDirectory) {
      itemMenu.push({
        label: "Open in Terminal",
        icon: CONTEXT_MENU_ICONS.terminal,
        onClick: () => window.fileManager.openTerminal(p),
      });
      itemMenu.push({ type: "separator" });
    }
  }

  if (contextPinTargetPath) {
    const pinId = `pin:${normalizePathForCompare(contextPinTargetPath)}`;
    itemMenu.push({
      label: isPinnedExact(contextPinTargetPath) ? "Unpin" : "Pin",
      icon: isPinnedExact(contextPinTargetPath)
        ? CONTEXT_MENU_ICONS.unpin
        : CONTEXT_MENU_ICONS.pin,
      onClick: async () => {
        if (isPinnedExact(contextPinTargetPath)) {
          removeQuickAccessById(pinId);
        } else {
          const label = await showTextInputModal(
            "Pin folder",
            "Label:",
            contextPinTargetLabel || "Pinned",
            "Pin",
          );
          if (label === null) return;
          addPin(contextPinTargetPath, String(label).trim());
        }
      },
    });
    itemMenu.push({ type: "separator" });
  }

  const archiveExts = [
    "zip",
    "rar",
    "7z",
    "tar",
    "gz",
    "bz2",
    "xz",
    "tar.gz",
    "tar.bz2",
    "tar.xz",
    "tgz",
  ];
  const selectedPaths = Array.from(selectedItems);
  const hasArchive = selectedPaths.some((p) => {
    const lower = p.toLowerCase();
    return archiveExts.some((ext) => lower.endsWith(`.${ext}`));
  });

  if (hasArchive) {
    itemMenu.push({
      label: "Extract Here",
      icon: CONTEXT_MENU_ICONS.extract,
      onClick: () => extractSelected(),
    });
  }

  if (selectedPaths.length > 0) {
    itemMenu.push({
      label: "Compress",
      icon: CONTEXT_MENU_ICONS.compress,
      onClick: () => compressSelected(),
    });
    itemMenu.push({ type: "separator" });
  }

  itemMenu.push({
    label: "Rename",
    icon: CONTEXT_MENU_ICONS.rename,
    onClick: () => renameSelected(),
  });
  itemMenu.push({
    label: "Delete",
    icon: CONTEXT_MENU_ICONS.trash,
    danger: true,
    onClick: () => deleteSelected(),
  });

  return itemMenu;
}

function openContextSubmenu(subItems) {
  if (!contextSubmenu) return;
  contextSubmenuOpen = true;
  contextSubmenu.style.display = "block";
  renderMenuItems(contextSubmenu, subItems);

  const mainRect = contextMenu.getBoundingClientRect();
  const subRect = contextSubmenu.getBoundingClientRect();
  const desiredLeft = mainRect.width - 8;
  contextSubmenu.style.left = `${desiredLeft}px`;

  const absoluteLeft = mainRect.left + desiredLeft + subRect.width;
  if (absoluteLeft > window.innerWidth - 10) {
    contextSubmenu.style.left = `${-subRect.width + 8}px`;
  }
}

function renderContextMenu() {
  if (!contextMenuPanel) return;

  if (contextMenuMode === "background") {
    renderMenuItems(contextMenuPanel, buildBackgroundMenuItems());
    return;
  }

  if (contextMenuMode === "quickAccess") {
    renderMenuItems(contextMenuPanel, buildQuickAccessMenuItems());
    return;
  }

  renderMenuItems(contextMenuPanel, buildItemMenuItems());
}

let progressInterval = null;
let realProgress = 0;
let fakeProgress = 0;

function startProgress() {
  if (progressInterval) clearInterval(progressInterval);
  realProgress = 0;
  fakeProgress = 0;

  if (progressBarContainer && progressBarFill) {
    progressBarContainer.style.display = "block";
    progressBarFill.style.width = "0%";
  }

  progressInterval = setInterval(() => {
    if (fakeProgress < 25) fakeProgress += 2;
    else if (fakeProgress < 60) fakeProgress += 0.5;
    else if (fakeProgress < 95) fakeProgress += 0.1;
    updateProgressDisplay();
  }, 100);
}

function updateProgressDisplay() {
  if (!progressBarContainer || !progressBarFill) return;
  const display = Math.max(realProgress, fakeProgress);
  progressBarFill.style.width = `${Math.min(100, display)}%`;
  if (activeOperation && activeOperation.usesProgress) {
    activeOperation.progress = display;
    scheduleOpsRender();
  }
}

function setProgress(percent) {
  realProgress = percent;
  updateProgressDisplay();
}

function finishProgress() {
  if (progressInterval) clearInterval(progressInterval);
  realProgress = 100;
  updateProgressDisplay();

  setTimeout(() => {
    if (progressBarContainer) progressBarContainer.style.display = "none";
    if (progressBarFill) progressBarFill.style.width = "0%";
    realProgress = 0;
    fakeProgress = 0;
  }, 700);
}
