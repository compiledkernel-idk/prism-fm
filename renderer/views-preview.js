function updatePreviewPanelVisibility() {
  if (!previewPanel) return;

  if (showPreviewPane) {
    previewPanel.classList.add("visible");
    if (previewResizer) previewResizer.classList.add("visible");
    updatePreviewPanelContent();
  } else {
    previewPanel.classList.remove("visible");
    if (previewResizer) previewResizer.classList.remove("visible");
  }
}

function updatePreviewPanelContent() {
  if (!showPreviewPane) return;

  if (selectedItems.size === 1) {
    const selectedPath = Array.from(selectedItems)[0];
    const item = currentItems.find((i) => i.path === selectedPath);
    if (item) {
      renderPreviewItem(item);
      return;
    }
  }

  renderPreviewEmpty();
}

async function renderPreviewItem(item) {
  if (!previewPanel || !previewContent) return;

  previewContent.innerHTML = `
    <div class="preview-loading">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2 A10 10 0 0 1 22 12" stroke-linecap="round"/>
      </svg>
      <p>Loading preview...</p>
    </div>
  `;

  try {
    const fileType = getFileType(item);
    const ext = (item.extension || "").toLowerCase();

    const info = await window.fileManager.getItemInfo(item.path);
    const itemInfo = info.success ? info.info : null;

    if (item.isDirectory) {
      try {
        const folderContents = await window.fileManager.getDirectoryContents(
          item.path,
        );
        if (folderContents.success) {
          const items = folderContents.contents || [];
          const fileCount = items.filter((i) => !i.isDirectory).length;
          const folderCount = items.filter((i) => i.isDirectory).length;
          const totalSize = itemInfo?.size || 0;

          previewContent.innerHTML = `
            <div class="preview-info">
              <div class="preview-info-item">
                <span class="preview-info-label">Name:</span>
                <span class="preview-info-value">${escapeHtml(item.name)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Size:</span>
                <span class="preview-info-value">${formatSize(totalSize)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Items:</span>
                <span class="preview-info-value">${items.length} (${folderCount} folders, ${fileCount} files)</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Modified:</span>
                <span class="preview-info-value">${formatDate(itemInfo?.modified || item.modified)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Path:</span>
                <span class="preview-info-value">${escapeHtml(item.path)}</span>
              </div>
            </div>
          `;
          return;
        }
      } catch (error) {}
    }

    if (fileType === fileTypes.image) {
      const fallbackImageUrl = `file://${item.path.replace(/\\/g, "/")}`;
      const imageInfo = itemInfo || {};

      let imageMetadata = null;
      let imageSrc = "";
      try {
        const dataResult = await window.fileManager.getImageDataUri(item.path);
        if (dataResult?.success && dataResult.data) {
          const mime = dataResult.mime || "application/octet-stream";
          imageSrc = `data:${mime};base64,${dataResult.data}`;
        }
      } catch (error) {}
      if (!imageSrc) {
        imageSrc = fallbackImageUrl;
      }

      try {
        const metadataResult = await window.fileManager.getImageMetadata(
          item.path,
        );
        if (metadataResult.success) {
          imageMetadata = metadataResult.metadata;
        }
      } catch (error) {}

      previewContent.innerHTML = `
        <img src="${escapeHtmlAttr(imageSrc)}" alt="${escapeHtmlAttr(item.name)}" class="preview-image" style="margin-bottom: 16px;" onerror="this.parentElement.innerHTML='<div class=\\'preview-error\\'>Failed to load image</div>'">
        <div class="preview-info">
          <div class="preview-info-item">
            <span class="preview-info-label">Name:</span>
            <span class="preview-info-value">${escapeHtml(item.name)}</span>
          </div>
          ${
            imageMetadata
              ? `
          ${
            imageMetadata.width && imageMetadata.height
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Dimensions:</span>
            <span class="preview-info-value">${imageMetadata.width} × ${imageMetadata.height} px</span>
          </div>
          `
              : ""
          }
          <div class="preview-info-item">
            <span class="preview-info-label">Format:</span>
            <span class="preview-info-value">${escapeHtml((imageMetadata.type || ext || "Unknown").toUpperCase())}</span>
          </div>
          ${
            imageMetadata.hasAlpha !== undefined
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Alpha Channel:</span>
            <span class="preview-info-value">${imageMetadata.hasAlpha ? "Yes" : "No"}</span>
          </div>
          `
              : ""
          }
          ${
            imageMetadata.orientation
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Orientation:</span>
            <span class="preview-info-value">${imageMetadata.orientation}</span>
          </div>
          `
              : ""
          }
          `
              : ""
          }
          <div class="preview-info-item">
            <span class="preview-info-label">File Size:</span>
            <span class="preview-info-value">${formatSize(imageMetadata?.fileSize || imageInfo.size || item.size)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Modified:</span>
            <span class="preview-info-value">${formatDate(imageInfo.modified || item.modified)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Path:</span>
            <span class="preview-info-value">${escapeHtml(item.path)}</span>
          </div>
        </div>
      `;
      return;
    }

    if (fileType === fileTypes.video) {
      const videoUrl = `file://${item.path.replace(/\\/g, "/")}`;
      const videoInfo = itemInfo || {};

      let videoMetadata = null;
      try {
        const metadataResult = await window.fileManager.getVideoMetadata(
          item.path,
        );
        if (metadataResult.success) {
          videoMetadata = metadataResult.metadata;
        }
      } catch (error) {}

      const formatDuration = (seconds) => {
        if (!seconds) return "—";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0)
          return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return `${m}:${s.toString().padStart(2, "0")}`;
      };

      const formatBitrate = (bps) => {
        if (!bps) return "—";
        if (bps < 1000) return `${bps} bps`;
        if (bps < 1000000) return `${(bps / 1000).toFixed(1)} kbps`;
        return `${(bps / 1000000).toFixed(2)} Mbps`;
      };

      previewContent.innerHTML = `
        <video src="${escapeHtmlAttr(videoUrl)}" controls class="preview-video" style="margin-bottom: 16px;" onerror="this.parentElement.innerHTML='<div class=\\'preview-error\\'>Failed to load video</div>'"></video>
        <div class="preview-info">
          <div class="preview-info-item">
            <span class="preview-info-label">Name:</span>
            <span class="preview-info-value">${escapeHtml(item.name)}</span>
          </div>
          ${
            videoMetadata
              ? `
          ${
            videoMetadata.videoWidth && videoMetadata.videoHeight
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Resolution:</span>
            <span class="preview-info-value">${videoMetadata.videoWidth} × ${videoMetadata.videoHeight} px</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.duration
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Duration:</span>
            <span class="preview-info-value">${formatDuration(videoMetadata.duration)}</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.videoFps
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Frame Rate:</span>
            <span class="preview-info-value">${videoMetadata.videoFps.toFixed(2)} fps</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.videoCodec
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Video Codec:</span>
            <span class="preview-info-value">${escapeHtml(videoMetadata.videoCodec.toUpperCase())}</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.audioCodec
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Audio Codec:</span>
            <span class="preview-info-value">${escapeHtml(videoMetadata.audioCodec.toUpperCase())}</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.audioChannels
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Audio Channels:</span>
            <span class="preview-info-value">${videoMetadata.audioChannels}</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.audioSampleRate
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Sample Rate:</span>
            <span class="preview-info-value">${(videoMetadata.audioSampleRate / 1000).toFixed(1)} kHz</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.bitrate
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Bitrate:</span>
            <span class="preview-info-value">${formatBitrate(videoMetadata.bitrate)}</span>
          </div>
          `
              : ""
          }
          ${
            videoMetadata.note
              ? `
          <div class="preview-info-item">
            <span class="preview-info-label">Note:</span>
            <span class="preview-info-value" style="font-size: 11px; color: var(--text-muted);">${escapeHtml(videoMetadata.note)}</span>
          </div>
          `
              : ""
          }
          `
              : ""
          }
          <div class="preview-info-item">
            <span class="preview-info-label">File Size:</span>
            <span class="preview-info-value">${formatSize(videoMetadata?.fileSize || videoInfo.size || item.size)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Modified:</span>
            <span class="preview-info-value">${formatDate(videoInfo.modified || item.modified)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Path:</span>
            <span class="preview-info-value">${escapeHtml(item.path)}</span>
          </div>
        </div>
      `;
      return;
    }

    const textExtensions = [
      ".txt",
      ".md",
      ".json",
      ".xml",
      ".html",
      ".css",
      ".js",
      ".ts",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".rs",
      ".go",
      ".rb",
      ".php",
      ".sh",
      ".bat",
      ".yml",
      ".yaml",
      ".ini",
      ".conf",
      ".log",
      ".csv",
      ".tsv",
      ".sql",
      ".rtf",
      ".tex",
      ".latex",
    ];

    if (textExtensions.includes(ext)) {
      try {
        const result = await window.fileManager.readFilePreview(item.path);
        if (result.success) {
          const escapedContent = escapeHtml(result.content);
          previewContent.innerHTML = `
            <div class="preview-text" style="margin-bottom: 16px;">${escapedContent}</div>
            <div class="preview-info">
              <div class="preview-info-item">
                <span class="preview-info-label">Name:</span>
                <span class="preview-info-value">${escapeHtml(item.name)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Size:</span>
                <span class="preview-info-value">${formatSize(itemInfo?.size || item.size)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Type:</span>
                <span class="preview-info-value">${escapeHtml(ext || "Text")}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Modified:</span>
                <span class="preview-info-value">${formatDate(itemInfo?.modified || item.modified)}</span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">Path:</span>
                <span class="preview-info-value">${escapeHtml(item.path)}</span>
              </div>
            </div>
          `;
          return;
        } else {
        }
      } catch (error) {}
    }

    if (itemInfo) {
      previewContent.innerHTML = `
        <div class="preview-info">
          <div class="preview-info-item">
            <span class="preview-info-label">Name:</span>
            <span class="preview-info-value">${escapeHtml(item.name)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Size:</span>
            <span class="preview-info-value">${formatSize(itemInfo.size)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Type:</span>
            <span class="preview-info-value">${escapeHtml(ext || "Unknown")}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Modified:</span>
            <span class="preview-info-value">${formatDate(itemInfo.modified)}</span>
          </div>
          <div class="preview-info-item">
            <span class="preview-info-label">Path:</span>
            <span class="preview-info-value">${escapeHtml(item.path)}</span>
          </div>
        </div>
      `;
    } else {
      previewContent.innerHTML = `
        <div class="preview-error">Cannot load file information</div>
      `;
    }
  } catch (error) {
    previewContent.innerHTML = `
      <div class="preview-error">Error: ${escapeHtml(error.message)}</div>
    `;
  }
}

function renderPreviewEmpty() {
  if (!previewContent) return;
  previewContent.innerHTML = `
    <div class="preview-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
        </svg>
        <p>Select a file to preview</p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", init);
