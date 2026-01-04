function setupNavigationButtons() {
  document.getElementById("back-btn").addEventListener("click", goBack);
  document.getElementById("forward-btn").addEventListener("click", goForward);
  document.getElementById("up-btn").addEventListener("click", goUp);
  document.getElementById("refresh-btn").addEventListener("click", refresh);
}

function setupSidebarToggle() {
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  const sidebar = document.getElementById("sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");

  if (!sidebarToggleBtn || !sidebar || !sidebarBackdrop) return;

  const toggleSidebar = () => {
    const isOpen = sidebar.classList.toggle("open");
    sidebarBackdrop.classList.toggle("visible", isOpen);
  };

  const closeSidebar = () => {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("visible");
  };

  sidebarToggleBtn.addEventListener("click", toggleSidebar);
  sidebarBackdrop.addEventListener("click", closeSidebar);

  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar-item, .nav-item")) {
      if (window.innerWidth <= 800) {
        closeSidebar();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) {
      closeSidebar();
    }
  });
}

function setupSearchInput() {
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    if (splitViewEnabled && !pickerMode) {
      renderAllPanes();
    } else {
      renderFiles();
    }
  });
}

function setupSortSelect() {
  const sortSelect = document.getElementById("sort-select");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    if (value.startsWith("-")) {
      sortBy = value.slice(1);
      sortAscending = false;
    } else {
      sortBy = value;
      sortAscending = true;
    }
    if (splitViewEnabled && !pickerMode) {
      renderAllPanes();
    } else {
      renderFiles();
    }
  });
}

function setupGroupSelect() {
  const groupSelect = document.getElementById("group-select");
  if (!groupSelect) return;

  groupSelect.addEventListener("change", (e) => {
    groupBy = e.target.value;
    if (splitViewEnabled && !pickerMode) {
      renderAllPanes();
    } else {
      renderFiles();
    }
  });
}

function setupToolbarButtons() {
  if (newFolderBtn) {
    newFolderBtn.addEventListener("click", (e) => {
      console.log("[ui] new-folder-btn clicked");
      e.preventDefault();
      e.stopPropagation();
      createNewFolder();
    });
  }

  if (newFileBtn) {
    newFileBtn.addEventListener("click", (e) => {
      console.log("[ui] new-file-btn clicked");
      e.preventDefault();
      e.stopPropagation();
      createNewFile();
    });
  }

  if (emptyTrashBtn) {
    emptyTrashBtn.addEventListener("click", async (e) => {
      console.log("[ui] empty-trash-btn clicked");
      e.preventDefault();
      e.stopPropagation();
      await emptyTrash();
    });
  }
}

function setupToggleButtons() {
  const toggleHiddenBtn = document.getElementById("toggle-hidden-btn");
  if (toggleHiddenBtn) {
    showHidden = readLocalStorageBool("showHidden", showHidden);
    toggleHiddenBtn.classList.toggle("active", showHidden);

    toggleHiddenBtn.addEventListener("click", () => {
      toggleHiddenFiles();
    });
  }

  const togglePreviewBtn = document.getElementById("toggle-preview-btn");
  if (togglePreviewBtn) {
    togglePreviewBtn.classList.toggle("active", showPreviewPane);

    togglePreviewBtn.addEventListener("click", () => {
      showPreviewPane = !showPreviewPane;
      togglePreviewBtn.classList.toggle("active", showPreviewPane);
      try {
        localStorage.setItem("showPreviewPane", String(showPreviewPane));
      } catch {}
      updatePreviewPanelVisibility();
    });
  }
}

function setupViewMenuButtons() {
  if (viewModeBtn) {
    viewModeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleViewMenu("view", viewModeBtn);
    });
  }

  if (sortBtn) {
    sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleViewMenu("sort", sortBtn);
    });
  }

  if (groupBtn) {
    groupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleViewMenu("group", groupBtn);
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSettingsMenu();
    });
  }
}

function setupGlobalClickHandlers() {
  const closeMenusForTarget = (target) => {
    if (!target.closest(".context-menu")) {
      hideContextMenu();
    }

    if (viewMenu && viewMenu.style.display === "block") {
      if (
        !viewMenu.contains(target) &&
        target !== viewModeBtn &&
        target !== sortBtn &&
        target !== groupBtn
      ) {
        viewMenu.style.display = "none";
        activeMenuType = null;
      }
    }

    if (settingsMenu && settingsMenu.style.display === "block") {
      if (!settingsMenu.contains(target) && target !== settingsBtn) {
        settingsMenu.style.display = "none";
      }
    }

    if (opsPanelVisible && opsPanel) {
      if (!opsPanel.contains(target) && target !== opsToggleBtn) {
        setOpsPanelVisible(false);
      }
    }
  };

  document.addEventListener(
    "mousedown",
    (e) => {
      closeMenusForTarget(e.target);
    },
    true,
  );

  document.addEventListener(
    "contextmenu",
    (e) => {
      closeMenusForTarget(e.target);
    },
    true,
  );
}

function setupThemeCustomizer() {
  if (!themeModal) return;

  buildThemeModal();

  themeModal.addEventListener("click", (e) => {
    if (e.target === themeModal) closeThemeCustomizer();
  });

  if (themeCloseBtn) {
    themeCloseBtn.addEventListener("click", closeThemeCustomizer);
  }

  if (themeSaveBtn) {
    themeSaveBtn.addEventListener("click", closeThemeCustomizer);
  }

  if (themeResetBtn) {
    themeResetBtn.addEventListener("click", resetThemeToDefaults);
  }
}

function closeAllMenus() {
  hideContextMenu();
  if (viewMenu) viewMenu.style.display = "none";
  if (settingsMenu) settingsMenu.style.display = "none";
  activeMenuType = null;
}

function setupContextMenuHandlers() {
  if (contextMenu) {
    contextMenu.addEventListener("mouseleave", () => {
      closeContextSubmenu();
    });
  }

  const attachContextMenu = (listEl, paneId) => {
    if (!listEl) return;
    listEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (paneId && paneId !== activePaneId) {
        setActivePane(paneId, { skipRender: true });
      }

      contextPinTargetPath = null;
      contextPinTargetLabel = null;

      const candidate = e.target.closest(".file-item");
      const fileItem =
        candidate && listEl.contains(candidate) ? candidate : null;

      if (fileItem) {
        contextMenuMode = "item";
        if (!selectedItems.has(fileItem.dataset.path)) {
          selectedItems.clear();
          selectedItems.add(fileItem.dataset.path);
          updateSelectionUI();
        }

        if (selectedItems.size === 1) {
          const p = Array.from(selectedItems)[0];
          const it = currentItems.find((x) => x.path === p);
          if (it && it.isDirectory) {
            contextPinTargetPath = it.path;
            contextPinTargetLabel = it.name;
          }
        }
      } else {
        contextMenuMode = "background";
        selectedItems.clear();
        updateSelectionUI();

        contextPinTargetPath = currentPath;
        contextPinTargetLabel = "Pinned";
      }

      renderContextMenu();
      showContextMenu(e.clientX, e.clientY);
    });
  };

  attachContextMenu(fileListLeft, "left");
  attachContextMenu(fileListRight, "right");
}

function setupFileListHandlers() {
  const attachHandlers = (listEl, paneId) => {
    if (!listEl) return;

    listEl.addEventListener("click", (e) => {
      if (e.target === listEl) {
        if (paneId && paneId !== activePaneId) {
          setActivePane(paneId, { skipRender: true });
        }
        selectedItems.clear();
        updateSelectionUI();
      }
    });

    listEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";

      const rect = listEl.getBoundingClientRect();
      const edgeSize = 50;
      const scrollSpeed = 10;

      clearInterval(dragScrollInterval);

      if (e.clientY < rect.top + edgeSize) {
        dragScrollInterval = setInterval(() => {
          listEl.scrollTop -= scrollSpeed;
        }, 16);
      } else if (e.clientY > rect.bottom - edgeSize) {
        dragScrollInterval = setInterval(() => {
          listEl.scrollTop += scrollSpeed;
        }, 16);
      }

      if (
        e.target === listEl ||
        e.target.closest(".file-item")?.dataset.isDirectory !== "true"
      ) {
        listEl.classList.add("drop-target");
      }
    });

    listEl.addEventListener(
      "wheel",
      (e) => {
        if (isDragging) {
          listEl.scrollTop += e.deltaY;
        }
      },
      { passive: true },
    );

    listEl.addEventListener("dragleave", (e) => {
      if (!listEl.contains(e.relatedTarget)) {
        listEl.classList.remove("drop-target");
        clearInterval(dragScrollInterval);
        dragScrollInterval = null;
      }
    });

    listEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      listEl.classList.remove("drop-target");
      clearInterval(dragScrollInterval);
      dragScrollInterval = null;

      if (paneId && paneId !== activePaneId) {
        setActivePane(paneId, { skipRender: true });
      }

      const targetFolder = e.target.closest(".file-item");
      if (targetFolder?.dataset.isDirectory === "true") return;

      if (draggedItems.length > 0) {
        const isCopy = e.ctrlKey;
        await handleFileDrop(
          draggedItems,
          currentPath,
          isCopy,
          dragSourcePaneId,
          activePaneId,
        );
        return;
      }

      if (e.dataTransfer.files.length > 0) {
        const externalPaths = Array.from(e.dataTransfer.files).map(
          (f) => f.path,
        );
        await handleFileDrop(externalPaths, currentPath, true, null, activePaneId);
      }
    });

    listEl.addEventListener("scroll", () => {
      updateGroupHeaderStacking(listEl);
      const pane = panes[paneId];
      if (pane) pane.scrollTop = listEl.scrollTop;
    });
  };

  attachHandlers(fileListLeft, "left");
  attachHandlers(fileListRight, "right");
}

const COLUMN_WIDTH_STORAGE_KEY = "columnWidthsV1";
const SIDEBAR_WIDTH_STORAGE_KEY = "sidebarWidthV1";
const PREVIEW_WIDTH_STORAGE_KEY = "previewWidthV1";

const COLUMN_DEFAULTS = {
  size: 100,
  modified: 140,
  added: 140,
};

const COLUMN_MIN = {
  size: 70,
  modified: 90,
  added: 90,
};

function clampMin(value, min) {
  return Math.max(min, value);
}

function readColumnWidths() {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return { ...COLUMN_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      size: clampMin(Number(parsed.size) || COLUMN_DEFAULTS.size, COLUMN_MIN.size),
      modified: clampMin(
        Number(parsed.modified) || COLUMN_DEFAULTS.modified,
        COLUMN_MIN.modified,
      ),
      added: clampMin(Number(parsed.added) || COLUMN_DEFAULTS.added, COLUMN_MIN.added),
    };
  } catch {
    return { ...COLUMN_DEFAULTS };
  }
}

function applyColumnWidths(widths) {
  const containers = document.querySelectorAll(".file-list-container");
  containers.forEach((container) => {
    container.style.setProperty("--col-size", `${widths.size}px`);
    container.style.setProperty("--col-modified", `${widths.modified}px`);
    container.style.setProperty("--col-added", `${widths.added}px`);
  });
}

function setupColumnResizers() {
  const widths = readColumnWidths();
  applyColumnWidths(widths);

  const columnVarMap = {
    size: "--col-size",
    modified: "--col-modified",
    added: "--col-added",
  };

  document.querySelectorAll(".column-resizer").forEach((resizer) => {
    if (resizer.dataset.bound === "true") return;
    resizer.dataset.bound = "true";

    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const column = resizer.dataset.column;
      if (!column || !columnVarMap[column]) return;

      const container = resizer.closest(".file-list-container");
      const headerCell = resizer.parentElement;
      const min = COLUMN_MIN[column] || 60;

      let startWidth = headerCell
        ? headerCell.getBoundingClientRect().width
        : widths[column];

      if (container) {
        const computed = getComputedStyle(container).getPropertyValue(
          columnVarMap[column],
        );
        const parsed = parseFloat(computed);
        if (!Number.isNaN(parsed)) startWidth = parsed;
      }

      const startX = e.clientX;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (ev) => {
        const nextWidth = clampMin(startWidth - (ev.clientX - startX), min);
        widths[column] = nextWidth;
        applyColumnWidths(widths);
      };

      const onUp = () => {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        try {
          localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(widths));
        } catch {}
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
}

function refreshColumnResizers() {
  document
    .querySelectorAll(".column-resizer")
    .forEach((resizer) => delete resizer.dataset.bound);
  setupColumnResizers();
}

function updateResponsiveColumns() {
  const containers = document.querySelectorAll(".file-list-container");
  containers.forEach((container) => {
    const width = container.getBoundingClientRect().width;
    const readCssNumber = (name, fallback) => {
      const raw = getComputedStyle(container).getPropertyValue(name);
      const parsed = parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const colIcon = readCssNumber("--col-icon", 44);
    const colSize = readCssNumber("--col-size", 100);
    const colModified = readCssNumber("--col-modified", 140);
    const colAdded = readCssNumber("--col-added", 140);
    const nameMin = 140;

    const baseHideSize = container.classList.contains("hide-size");
    const baseHideModified = container.classList.contains("hide-modified");
    const baseHideAdded = container.classList.contains("hide-added");

    let showSize = !baseHideSize;
    let showModified = !baseHideModified;
    let showAdded = !baseHideAdded;

    const fixedWidth = () =>
      colIcon +
      (showSize ? colSize : 0) +
      (showModified ? colModified : 0) +
      (showAdded ? colAdded : 0);

    while (width - fixedWidth() < nameMin) {
      if (showAdded) {
        showAdded = false;
        continue;
      }
      if (showModified) {
        showModified = false;
        continue;
      }
      if (showSize) {
        showSize = false;
        continue;
      }
      break;
    }

    container.classList.toggle(
      "responsive-hide-added",
      baseHideAdded ? false : !showAdded,
    );
    container.classList.toggle(
      "responsive-hide-modified",
      baseHideModified ? false : !showModified,
    );
    container.classList.toggle(
      "responsive-hide-size",
      baseHideSize ? false : !showSize,
    );
  });
}

function setupPanelResizers() {
  const appContainer = document.querySelector(".app-container");
  if (sidebarEl) {
    const saved = parseInt(
      localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY),
      10,
    );
    if (!Number.isNaN(saved) && appContainer) {
      appContainer.style.setProperty("--sidebar-width", `${saved}px`);
    }
  }

  if (previewPanel) {
    const saved = parseInt(
      localStorage.getItem(PREVIEW_WIDTH_STORAGE_KEY),
      10,
    );
    if (!Number.isNaN(saved) && appContainer) {
      appContainer.style.setProperty("--preview-width", `${saved}px`);
    }
  }

  if (sidebarResizer && sidebarEl) {
    sidebarResizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarEl.getBoundingClientRect().width;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (ev) => {
        const nextWidth = clamp(startWidth + (ev.clientX - startX), 160, 320);
        if (appContainer) {
          appContainer.style.setProperty("--sidebar-width", `${nextWidth}px`);
        }
      };

      const onUp = () => {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        const width = sidebarEl.getBoundingClientRect().width;
        try {
          localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(Math.round(width)));
        } catch {}
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  if (previewResizer && previewPanel) {
    previewResizer.addEventListener("mousedown", (e) => {
      if (!previewPanel.classList.contains("visible")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = previewPanel.getBoundingClientRect().width;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (ev) => {
        const nextWidth = clamp(startWidth - (ev.clientX - startX), 220, 520);
        if (appContainer) {
          appContainer.style.setProperty("--preview-width", `${nextWidth}px`);
        }
      };

      const onUp = () => {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        const width = previewPanel.getBoundingClientRect().width;
        try {
          localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(Math.round(width)));
        } catch {}
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }
}

function setupEventListeners() {
  setupNavigationButtons();
  setupSidebarToggle();
  setupSearchInput();
  setupSortSelect();
  setupGroupSelect();
  setupToolbarButtons();
  setupToggleButtons();
  setupViewMenuButtons();
  setupThemeCustomizer();
  setupOperationsPanel();
  setupGlobalClickHandlers();
  setupContextMenuHandlers();
  setupFileListHandlers();
  setupColumnResizers();
  setupPanelResizers();
  updateResponsiveColumns();
  window.addEventListener("blur", closeAllMenus);
  window.addEventListener("resize", () => {
    if (fileListLeft) updateGroupHeaderStacking(fileListLeft);
    if (splitViewEnabled && fileListRight) {
      updateGroupHeaderStacking(fileListRight);
    }
    updateResponsiveColumns();
  });

  setupQuickAccess();

  document.addEventListener("keydown", handleKeyboard);
}

document.addEventListener("ezfm:columns-updated", () => {
  updateResponsiveColumns();
  refreshColumnResizers();
});

function setupQuickAccess() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  sidebar.addEventListener("click", async (e) => {
    const item = e.target.closest(".nav-item");
    if (!item) return;

    e.preventDefault();

    const pathType = item.dataset.path;
    if (!pathType) return;

    if (!commonDirs || Object.keys(commonDirs).length === 0) {
      try {
        commonDirs = await window.fileManager.getCommonDirectories();
      } catch (err) {
        showNotification("Quick access: failed to load directories", "error");
        return;
      }
    }

    if (pathType === "trash") {
      if (commonDirs.trash) {
        try {
          await navigateTo(commonDirs.trash);
          return;
        } catch (err) {
          showNotification("Trash: cannot open folder", "error");
          return;
        }
      }

      showNotification(
        "Trash folder is not available on this platform",
        "error",
      );
      return;
    }

    const targetPath = commonDirs[pathType];
    if (!targetPath) {
      showNotification(`Quick access: "${pathType}" not available`, "error");
      return;
    }

    try {
      await navigateTo(targetPath);
    } catch (err) {
      showNotification("Quick access: cannot open that directory", "error");
    }
  });

  sidebar.addEventListener("dragover", (e) => {
    if (draggedQaId) return;

    const hasInternalDrag = draggedItems.length > 0;
    const hasExternalDrag = e.dataTransfer.types.includes("Files");
    if (!hasInternalDrag && !hasExternalDrag) return;

    e.preventDefault();
    e.stopPropagation();

    sidebar
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"));

    const sidebarItem = e.target.closest(".sidebar-item, .nav-item");
    if (sidebarItem) {
      const pinnedPath = sidebarItem.dataset.pinnedPath;
      const builtinKey = sidebarItem.dataset.builtinKey;
      const tagColor = sidebarItem.dataset.tagColor;

      if (pinnedPath || builtinKey) {
        e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
        sidebarItem.classList.add("drop-target");
        sidebar.classList.remove("drag-over");

        if (!dragHoverTimer) {
          const targetPath =
            pinnedPath || (commonDirs && commonDirs[builtinKey]);
          if (targetPath) {
            dragHoverTimer = setTimeout(async () => {
              dragHoverTimer = null;
              if (sidebarItem.classList.contains("drop-target")) {
                await navigateTo(targetPath);
              }
            }, DRAG_HOVER_DELAY);
          }
        }
        return;
      } else if (tagColor) {
        e.dataTransfer.dropEffect = "link";
        sidebarItem.classList.add("drop-target");
        sidebar.classList.remove("drag-over");
        return;
      }
    }

    if (dragHoverTimer) {
      clearTimeout(dragHoverTimer);
      dragHoverTimer = null;
    }

    e.dataTransfer.dropEffect = "link";
    sidebar.classList.add("drag-over");
  });

  sidebar.addEventListener("dragleave", (e) => {
    const sidebarItem = e.target.closest(".sidebar-item, .nav-item");
    if (sidebarItem) {
      sidebarItem.classList.remove("drop-target");
    }
    if (!sidebar.contains(e.relatedTarget)) {
      sidebar.classList.remove("drag-over");
      sidebar
        .querySelectorAll(".drop-target")
        .forEach((el) => el.classList.remove("drop-target"));
      if (dragHoverTimer) {
        clearTimeout(dragHoverTimer);
        dragHoverTimer = null;
      }
    }
  });

  sidebar.addEventListener("drop", async (e) => {
    if (draggedQaId) return;

    e.preventDefault();
    e.stopPropagation();
    sidebar.classList.remove("drag-over");
    sidebar
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"));

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

    if (pathsToProcess.length === 0) return;

    const sidebarItem = e.target.closest(".sidebar-item, .nav-item");
    if (sidebarItem) {
      const pinnedPath = sidebarItem.dataset.pinnedPath;
      const builtinKey = sidebarItem.dataset.builtinKey;
      const tagColor = sidebarItem.dataset.tagColor;

      let targetPath = null;

      if (pinnedPath) {
        targetPath = pinnedPath;
      } else if (builtinKey && commonDirs && commonDirs[builtinKey]) {
        targetPath = commonDirs[builtinKey];
      }

      if (targetPath) {
        const isCopy = e.ctrlKey;
        await handleFileDrop(
          pathsToProcess,
          targetPath,
          isCopy,
          dragSourcePaneId,
          activePaneId,
        );
        return;
      }

      if (tagColor) {
        let taggedCount = 0;
        for (const itemPath of pathsToProcess) {
          if (!fileTags[itemPath]) fileTags[itemPath] = [];
          if (!fileTags[itemPath].includes(tagColor)) {
            fileTags[itemPath].push(tagColor);
            taggedCount++;
          }
        }

        if (taggedCount > 0) {
          try {
            localStorage.setItem("fileTags", JSON.stringify(fileTags));
          } catch {}
          showNotification(`Tagged ${taggedCount} item(s) as ${tagColor}`);

          if (currentPath === `tag://${tagColor}`) navigateTo(currentPath);
          else renderCurrentView();
        }
        return;
      }
    }

    let pinCount = 0;
    for (const itemPath of pathsToProcess) {
      const item = currentItems.find((i) => i.path === itemPath);
      if (item && item.isDirectory) {
        addPin(item.path, item.name);
        pinCount++;
      } else if (!item) {
        try {
          const info = await window.api.getItemInfo(itemPath);
          if (info.success && info.info.isDirectory) {
            const label =
              itemPath.split(/[/\\]/).filter(Boolean).pop() || itemPath;
            addPin(itemPath, label);
            pinCount++;
          }
        } catch (err) {}
      }
    }

    if (pinCount > 0) {
      renderPinnedItems();
      showNotification(`Pinned ${pinCount} folder(s) to Quick Access`);
    }
  });
}
