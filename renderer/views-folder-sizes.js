let saveCacheTimeout;

function saveFolderSizeCache() {
  clearTimeout(saveCacheTimeout);
  saveCacheTimeout = setTimeout(() => {
    try {
      trimCache(folderSizeCache, MAX_FOLDER_SIZE_CACHE_ENTRIES);
      const obj = Object.fromEntries(folderSizeCache);
      localStorage.setItem("folderSizeCache", JSON.stringify(obj));
    } catch {}
  }, 2000);
}

function scheduleVisibleFolderSizes() {
  if (!fileList) return;
  if (!shouldCalculateFolderSizesForPath(currentPath)) return;

  const rows = Array.from(fileList.querySelectorAll(".file-item")).filter(
    (el) => el.dataset.isDirectory === "true",
  );

  for (const row of rows) {
    const folderPath = row.dataset.path;
    if (!folderPath) continue;

    const cached = folderSizeCache.get(folderPath);
    const item = currentItems.find((i) => i.path === folderPath);
    const currentMtime =
      item && item.modified ? new Date(item.modified).getTime() : 0;

    const fresh = cached && cached.mtime === currentMtime ? cached : null;

    if (fresh) {
      const cell = row.querySelector('[data-role="size"]');
      if (cell) cell.textContent = formatSize(fresh.size);
      continue;
    }

    if (!folderSizeInFlight.has(folderPath)) {
      enqueueFolderSize(folderPath);
    }
  }
}

function enqueueFolderSize(folderPath) {
  folderSizeQueue.push(folderPath);
  drainFolderSizeQueue();
}

function drainFolderSizeQueue() {
  while (
    folderSizeActive < FOLDER_SIZE_CONCURRENCY &&
    folderSizeQueue.length > 0
  ) {
    const folderPath = folderSizeQueue.shift();
    if (!folderPath) continue;

    const cached = folderSizeCache.get(folderPath);
    const item = currentItems.find((i) => i.path === folderPath);
    const currentMtime =
      item && item.modified ? new Date(item.modified).getTime() : 0;
    const fresh = cached && cached.mtime === currentMtime ? cached : null;

    if (fresh) {
      updateFolderSizeCell(folderPath, fresh.size);
      continue;
    }

    if (folderSizeInFlight.has(folderPath)) continue;

    folderSizeActive++;

    const p = (async () => {
      try {
        const res = await window.fileManager.getItemInfo(folderPath);
        if (
          res &&
          res.success &&
          res.info &&
          typeof res.info.size === "number"
        ) {
          const mtime = res.info.modified
            ? new Date(res.info.modified).getTime()
            : 0;
          folderSizeCache.set(folderPath, {
            size: res.info.size,
            mtime: mtime,
          });
          saveFolderSizeCache();
          updateFolderSizeCell(folderPath, res.info.size);
          return res.info.size;
        }
        updateFolderSizeCell(folderPath, null);
        return null;
      } catch {
        updateFolderSizeCell(folderPath, null);
        return null;
      } finally {
        folderSizeActive--;
        folderSizeInFlight.delete(folderPath);
        drainFolderSizeQueue();
      }
    })();

    folderSizeInFlight.set(folderPath, p);
  }
}

function updateFolderSizeCell(folderPath, sizeOrNull) {
  if (!fileList) return;

  const row = fileList.querySelector(
    `.file-item[data-path="${cssEscape(folderPath)}"]`,
  );
  if (!row) return;

  const cell = row.querySelector('[data-role="size"]');
  if (!cell) return;

  if (typeof sizeOrNull === "number") {
    cell.textContent = formatSize(sizeOrNull);

    if (sortBy === "size") {
      queueMicrotask(() => {
        if (splitViewEnabled && !pickerMode) {
          renderAllPanes();
        } else {
          renderFiles();
        }
      });
    }
  } else {
    cell.textContent = "—";
  }
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
