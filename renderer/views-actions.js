function openSelected() {
  if (selectedItems.size === 0) return;

  const path = Array.from(selectedItems)[0];
  const item = currentItems.find((i) => i.path === path);
  if (item) {
    openItem(item);
  }
}

async function copySelected() {
  if (selectedItems.size === 0) return;

  clipboardItems = Array.from(selectedItems);
  clipboardOperation = "copy";
  clipboardSourcePaneId = activePaneId;

  try {
    await window.fileManager.clipboardCopyPaths(clipboardItems);
  } catch { }

  showNotification(`Copied ${clipboardItems.length} item(s)`);
}

async function cutSelected() {
  if (selectedItems.size === 0) return;

  clipboardItems = Array.from(selectedItems);
  clipboardOperation = "cut";
  clipboardSourcePaneId = activePaneId;

  try {
    await window.fileManager.clipboardCopyPaths(clipboardItems);
  } catch { }

  showNotification(`Cut ${clipboardItems.length} item(s)`);
}

async function paste() {
  if (clipboardItems.length === 0) return;

  const opType = clipboardOperation;
  const itemsToPaste = [...clipboardItems];
  const sourcePaneId = clipboardSourcePaneId;
  const batchItems = [];

  for (const sourcePath of itemsToPaste) {
    const parsed = await window.fileManager.parsePath(sourcePath);
    const destPath = await window.fileManager.joinPaths(currentPath, parsed.base);
    batchItems.push({ source: sourcePath, dest: destPath });
  }

  const label =
    opType === "copy"
      ? formatOperationLabel("Copy", itemsToPaste.length)
      : formatOperationLabel("Move", itemsToPaste.length);

  enqueueOperation({
    label,
    usesProgress: true,
    run: async (op) => {
      const result = await window.fileManager.batchFileOperation(
        batchItems,
        opType,
        op.id,
      );
      if (!result || !result.success) {
        const error = new Error(result?.error || "Paste failed");
        if (result?.cancelled) error.cancelled = true;
        throw error;
      }
      return result;
    },
    cancel: async (op) => {
      if (window.fileManager.cancelOperation) {
        await window.fileManager.cancelOperation(op.id);
      }
    },
    onSuccess: async () => {
      if (opType === "copy") {
        const copiedPaths = batchItems.map((item) => item.dest);
        pushUndo({
          label: formatUndoLabel("Copy", copiedPaths.length),
          successMessage: "Undid copy",
          undo: async () => {
            await deletePathsPermanently(copiedPaths);
            refresh();
          },
        });
      } else if (opType === "cut") {
        const movedItems = batchItems.map((item) => ({
          source: item.dest,
          dest: item.source,
        }));
        pushUndo({
          label: formatUndoLabel("Move", movedItems.length),
          successMessage: "Undid move",
          undo: async () => {
            await runBatchOperation(movedItems, "move");
            refresh();
          },
        });
      }
      showNotification(
        `${opType === "copy" ? "Copied" : "Moved"} ${itemsToPaste.length} item(s)`,
      );
      refresh();
      if (opType === "cut" && sourcePaneId && sourcePaneId !== activePaneId) {
        await refreshPane(sourcePaneId);
      }
    },
    onError: (error) => {
      if (!error?.cancelled) {
        showNotification(error?.message || "Paste failed", "error");
      }
    },
  });

  if (opType === "cut") {
    clipboardItems = [];
    clipboardOperation = null;
    clipboardSourcePaneId = null;
  }

  showNotification(
    `${opType === "copy" ? "Copy" : "Move"} queued (${itemsToPaste.length} item(s))`,
  );
}

async function handleFileDrop(
  sourcePaths,
  targetDir,
  isCopy = false,
  sourcePaneId = null,
  targetPaneId = activePaneId,
) {
  if (sourcePaths.length === 0) return;

  const normTargetDir = normalizePathForCompare(targetDir);
  const isWindows = window.fileManager.platform === "win32";
  const sep = isWindows ? "\\" : "/";

  const batchItems = [];

  try {
    for (const sourcePath of sourcePaths) {
      const parsed = await window.fileManager.parsePath(sourcePath);
      const destPath = await window.fileManager.joinPaths(
        targetDir,
        parsed.base,
      );
      const normSourcePath = normalizePathForCompare(sourcePath);
      const normDestPath = normalizePathForCompare(destPath);

      if (normSourcePath === normDestPath) {
        continue;
      }

      const cleanSource = sourcePath.replace(/[/\\]+$/, "");
      const lastSep = cleanSource.lastIndexOf(sep);
      if (lastSep >= 0) {
        const parent = lastSep === 0 ? "/" : cleanSource.substring(0, lastSep);
        if (normalizePathForCompare(parent) === normTargetDir) {
          continue;
        }
      }

      if (normDestPath.startsWith(normSourcePath + "/")) {
        continue;
      }

      if (normalizePathForCompare(targetDir) === normSourcePath) {
        continue;
      }

      batchItems.push({ source: sourcePath, dest: destPath });
    }

    if (batchItems.length > 0) {
      const label = formatOperationLabel(
        isCopy ? "Copy" : "Move",
        batchItems.length,
      );
      enqueueOperation({
        label,
        usesProgress: true,
        run: async (op) => {
          const result = await window.fileManager.batchFileOperation(
            batchItems,
            isCopy ? "copy" : "move",
            op.id,
          );
          if (!result || !result.success) {
            const error = new Error(result?.error || "Drop failed");
            if (result?.cancelled) error.cancelled = true;
            throw error;
          }
          return result;
        },
        cancel: async (op) => {
          if (window.fileManager.cancelOperation) {
            await window.fileManager.cancelOperation(op.id);
          }
        },
        onSuccess: async () => {
          if (isCopy) {
            const copiedPaths = batchItems.map((item) => item.dest);
            pushUndo({
              label: formatUndoLabel("Copy", copiedPaths.length),
              successMessage: "Undid copy",
              undo: async () => {
                await deletePathsPermanently(copiedPaths);
                refresh();
              },
            });
          } else {
            const movedItems = batchItems.map((item) => ({
              source: item.dest,
              dest: item.source,
            }));
            pushUndo({
              label: formatUndoLabel("Move", movedItems.length),
              successMessage: "Undid move",
              undo: async () => {
                await runBatchOperation(movedItems, "move");
                refresh();
              },
            });
          }
          showNotification(
            `${isCopy ? "Copied" : "Moved"} ${batchItems.length} item(s)`,
          );
          refresh();
          if (!isCopy && sourcePaneId && sourcePaneId !== targetPaneId) {
            await refreshPane(sourcePaneId);
          }
        },
        onError: (error) => {
          if (!error?.cancelled) {
            showNotification(error?.message || "Drop failed", "error");
          }
        },
      });
      showNotification(
        `${isCopy ? "Copy" : "Move"} queued (${batchItems.length} item(s))`,
      );
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function openLocationViaSystemPicker() {
  const result = await window.fileManager.showOpenDialog({
    properties: ["openDirectory", "showHiddenFiles"],
    title: "Navigate to Folder",
  });

  if (result && !result.canceled && result.filePaths.length > 0) {
    await navigateTo(result.filePaths[0]);
  }
}

async function renameSelected() {
  if (selectedItems.size !== 1) return;

  const oldPath = Array.from(selectedItems)[0];
  const item = currentItems.find((i) => i.path === oldPath);
  if (!item) return;

  const raw = await showTextInputModal(
    "Rename",
    "Enter new name:",
    item.name,
    "Rename",
  );
  if (raw === null) return;

  const validated = validateNewItemName(raw);
  if (!validated.ok) {
    showNotification(validated.reason, "error");
    return;
  }

  if (validated.name === item.name) return;

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
            item.name,
          );
          if (!undoResult || !undoResult.success) {
            throw new Error(undoResult?.error || "Undo rename failed");
          }
          refresh();
        },
      });
      selectedItems.clear();
      selectedItems.add(newPath);
      updateSelectionUI();
    } else {
      showNotification("Error: " + (result?.error || "Rename failed"), "error");
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function deleteSelected(options = {}) {
  if (selectedItems.size === 0) return;

  const count = selectedItems.size;

  let choice = "permanent";
  if (!options.forcePermanent && !isInTrash) {
    choice = await showDeleteChoiceModal(
      "Delete items",
      `What do you want to do with ${count} item(s)?`,
    );
  }

  if (!isInTrash && choice === "cancel") return;
  if (choice === "permanent") {
    const confirmed = await showConfirmModal(
      "Permanently delete?",
      `This will permanently delete ${count} item(s). This cannot be undone.`,
      "Delete",
    );
    if (!confirmed) return;
  }

  let sudoPassword = null;
  let sudoCancelled = false;
  const trashedPaths = [];

  try {
    for (const p of selectedItems) {
      if (choice === "permanent") {
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
          showNotification(`Failed to delete: ${result.error}`, "error");
        }
      } else {
        const result = await window.fileManager.trashItem(p);
        if (result && result.success) {
          trashedPaths.push(p);
        } else {
          showNotification(
            `Failed to move to Trash: ${result?.error || "Unknown error"}`,
            "error",
          );
        }
      }
    }

    if (choice === "trash" && trashedPaths.length > 0) {
      pushUndo({
        label: formatUndoLabel("Move to Trash", trashedPaths.length),
        successMessage: "Undid move to Trash",
        undo: async () => {
          const restoreResult = await window.fileManager.restoreTrashItems(
            trashedPaths,
          );
          if (!restoreResult || !restoreResult.success) {
            throw new Error(
              restoreResult?.error || "Undo restore from Trash failed",
            );
          }
          if (restoreResult.failed && restoreResult.failed.length > 0) {
            throw new Error(
              `Undo failed for ${restoreResult.failed.length} item(s)`,
            );
          }
          refresh();
        },
      });
    }

    showNotification(
      choice === "permanent"
        ? `Permanently deleted ${count} item(s)`
        : `Moved ${count} item(s) to Trash`,
    );
    selectedItems.clear();
    refresh();
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function extractSelected() {
  if (selectedItems.size === 0) return;
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

  const archives = Array.from(selectedItems).filter((p) => {
    const lower = p.toLowerCase();
    return archiveExts.some((ext) => lower.endsWith(`.${ext}`));
  });
  if (archives.length === 0) return;

  enqueueOperation({
    label: formatOperationLabel("Extract", archives.length),
    usesProgress: true,
    run: async (op) => {
      const extractedDirs = [];
      const failed = [];

      for (const p of archives) {
        if (op.cancelRequested) {
          const error = new Error("Extraction cancelled");
          error.cancelled = true;
          throw error;
        }
        const result = await window.fileManager.extractArchive(p, currentPath);
        if (result.success) {
          if (result.outputDir) extractedDirs.push(result.outputDir);
        } else {
          failed.push({
            path: p,
            error: result.error || "Extraction failed",
          });
        }
      }

      return { extractedDirs, failed };
    },
    onSuccess: async (result) => {
      const uniqueDirs = Array.from(new Set(result.extractedDirs || []));
      if (uniqueDirs.length > 0) {
        pushUndo({
          label: formatUndoLabel("Extract", uniqueDirs.length),
          successMessage: "Undid extract",
          undo: async () => {
            await deletePathsPermanently(uniqueDirs);
            refresh();
          },
        });
      }
      if (result.failed && result.failed.length > 0) {
        showNotification(
          `Extract failed for ${result.failed.length} item(s)`,
          "error",
        );
      } else {
        showNotification(`Extracted ${archives.length} item(s)`);
      }
      refresh();
    },
    onError: (error) => {
      if (!error?.cancelled) {
        showNotification(error?.message || "Extract failed", "error");
      }
    },
  });

  showNotification(`Extract queued (${archives.length} item(s))`);
}

async function compressSelected() {
  if (selectedItems.size === 0) return;
  const paths = Array.from(selectedItems);

  let defaultName =
    paths.length === 1 ? paths[0].split(/[/\\]/).pop() : "archive";
  defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".zip";

  const archiveName = await showTextInputModal(
    "Compress",
    "Archive name:",
    defaultName,
    "Compress",
  );
  if (!archiveName) return;

  const outputPath = await window.fileManager.joinPaths(
    currentPath,
    archiveName,
  );

  enqueueOperation({
    label: formatOperationLabel("Compress", 1, `"${archiveName}"`),
    usesProgress: true,
    run: async (op) => {
      if (op.cancelRequested) {
        const error = new Error("Compression cancelled");
        error.cancelled = true;
        throw error;
      }
      const result = await window.fileManager.compressItems(paths, outputPath);
      if (!result || !result.success) {
        throw new Error(result?.error || "Compression failed");
      }
      return { outputPath };
    },
    onSuccess: async () => {
      pushUndo({
        label: formatUndoLabel("Compress", 1, `"${archiveName}"`),
        successMessage: "Undid compression",
        undo: async () => {
          await deletePathsPermanently([outputPath]);
          refresh();
        },
      });
      showNotification(`Created ${archiveName}`);
      refresh();
    },
    onError: (error) => {
      if (!error?.cancelled) {
        showNotification(error?.message || "Compress failed", "error");
      }
    },
  });

  showNotification(`Compress queued (${paths.length} item(s))`);
}

async function createNewFolder() {
  console.log("[action] createNewFolder start", { currentPath });
  const raw = await showTextInputModal(
    "New Folder",
    "Enter folder name:",
    "New Folder",
    "Create",
  );
  if (raw === null) {
    console.log("[action] createNewFolder cancelled");
    return;
  }

  const validated = validateNewItemName(raw);
  if (!validated.ok) {
    showNotification(validated.reason, "error");
    return;
  }

  try {
    const result = await window.fileManager.createFolder(
      currentPath,
      validated.name,
    );

    if (result.success) {
      const createdName = result.path
        ? result.path.split(/[/\\]/).pop()
        : validated.name;

      showNotification(`Created folder: ${createdName}`);
      await navigateTo(currentPath);

      const createdPath =
        result.path ||
        (await window.fileManager.joinPaths(currentPath, createdName));
      pushUndo({
        label: formatUndoLabel("Create Folder", 1, `"${createdName}"`),
        successMessage: "Undid folder creation",
        undo: async () => {
          await deletePathsPermanently([createdPath]);
          refresh();
        },
      });
      selectSingleItemByPath(createdPath);
      scrollItemIntoView(createdPath);
    } else {
      showNotification("Error: " + result.error, "error");
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function createNewFile() {
  console.log("[action] createNewFile start", { currentPath });
  const raw = await showTextInputModal(
    "New File",
    "Enter file name:",
    "New File.txt",
    "Create",
  );
  if (raw === null) {
    console.log("[action] createNewFile cancelled");
    return;
  }

  const validated = validateNewItemName(raw);
  if (!validated.ok) {
    showNotification(validated.reason, "error");
    return;
  }

  try {
    const result = await window.fileManager.createFile(
      currentPath,
      validated.name,
    );

    if (result.success) {
      const createdName = result.path
        ? result.path.split(/[/\\]/).pop()
        : validated.name;

      showNotification(`Created file: ${createdName}`);
      await navigateTo(currentPath);

      const createdPath =
        result.path ||
        (await window.fileManager.joinPaths(currentPath, createdName));
      pushUndo({
        label: formatUndoLabel("Create File", 1, `"${createdName}"`),
        successMessage: "Undid file creation",
        undo: async () => {
          await deletePathsPermanently([createdPath]);
          refresh();
        },
      });
      selectSingleItemByPath(createdPath);
      scrollItemIntoView(createdPath);
    } else {
      showNotification("Error: " + result.error, "error");
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

function updateToolbarForTrash() {
  if (!newFolderBtn || !newFileBtn || !emptyTrashBtn) return;

  if (isInTrash) {
    newFolderBtn.style.display = "none";
    newFileBtn.style.display = "none";
    emptyTrashBtn.style.display = "";
    emptyTrashBtn.title = "Empty Trash";
  } else {
    newFolderBtn.style.display = "";
    newFileBtn.style.display = "";
    emptyTrashBtn.style.display = "none";
    newFolderBtn.title = "New Folder";
    newFileBtn.title = "New File";
  }
}

async function emptyTrash() {
  if (!commonDirs || !commonDirs.trash) {
    showNotification("Trash folder is not available", "error");
    return;
  }

  if (!isInTrash) return;

  const confirm = await showTextInputModal(
    "Empty Trash",
    "This will permanently delete all items in Trash. This cannot be undone.\n\nType DELETE to confirm:",
    "",
    "Empty Trash",
  );

  if (confirm === null) return;

  if (String(confirm).trim().toUpperCase() !== "DELETE") {
    showNotification("Empty Trash cancelled", "error");
    return;
  }

  try {
    const res = await window.fileManager.getDirectoryContents(commonDirs.trash);
    if (!res || !res.success) {
      showNotification("Failed to read Trash", "error");
      return;
    }

    for (const item of res.contents) {
      await window.fileManager.deleteItem(item.path);
    }

    showNotification("Trash emptied");
    await navigateTo(commonDirs.trash);
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

function handleKeyboard(e) {
  if (themeModal && themeModal.classList.contains("visible")) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeThemeCustomizer();
    }
    return;
  }

  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case "a":
        e.preventDefault();
        currentItems.forEach((item) => selectedItems.add(item.path));
        updateSelectionUI();
        break;
      case "c":
        e.preventDefault();
        copySelected();
        break;
      case "x":
        e.preventDefault();
        cutSelected();
        break;
      case "v":
        e.preventDefault();
        paste();
        break;
      case "r":
        e.preventDefault();
        refresh();
        break;
      case "t":
        e.preventDefault();
        createNewTab();
        break;
      case "w":
        e.preventDefault();
        closeTab(activeTabIndex);
        break;
      case "l":
        e.preventDefault();
        focusPathBar();
        break;
      case "f":
        e.preventDefault();
        if (searchInput) searchInput.focus();
        break;
      case "h":
        e.preventDefault();
        toggleHiddenFiles();
        break;
    }
  } else {
    switch (e.key) {
      case "Delete":
      case "Del":
        deleteSelected({ forcePermanent: e.shiftKey });
        break;
      case "F2":
        renameSelected();
        break;
      case "Enter":
        openSelected();
        break;
      case "Backspace":
        goUp();
        break;
      case "Escape":
        selectedItems.clear();
        updateSelectionUI();
        break;
    }
  }
}
