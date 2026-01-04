// Tauri IPC Adapter - Replaces Electron's preload.js
// This file provides the same API as window.fileManager but uses Tauri's invoke()

(function () {
    if (!window.__TAURI__) {
        console.error('[Prism FM] Tauri not available - are you running in Tauri?');
        // Create stub API to prevent errors
        window.fileManager = {
            getDirectoryContents: () => Promise.resolve({ success: false, error: 'Tauri not available' }),
            getHomeDirectory: () => Promise.resolve('/home'),
            getCommonDirectories: () => Promise.resolve({}),
            getParentDirectory: () => Promise.resolve('/'),
            pathExists: () => Promise.resolve(false),
            joinPaths: (...paths) => Promise.resolve(paths.join('/')),
            parsePath: () => Promise.resolve({}),
            openFile: () => Promise.resolve({ success: false }),
            showInFolder: () => Promise.resolve({ success: false }),
            openTerminal: () => Promise.resolve({ success: false }),
            deleteItem: () => Promise.resolve({ success: false }),
            deleteItemSudo: () => Promise.resolve({ success: false }),
            trashItem: () => Promise.resolve({ success: false }),
            restoreTrashItems: () => Promise.resolve({ success: false }),
            renameItem: () => Promise.resolve({ success: false }),
            createFolder: () => Promise.resolve({ success: false }),
            createFile: () => Promise.resolve({ success: false }),
            copyItem: () => Promise.resolve({ success: false }),
            moveItem: () => Promise.resolve({ success: false }),
            getItemInfo: () => Promise.resolve(null),
            batchFileOperation: () => Promise.resolve({ success: false }),
            cancelOperation: () => Promise.resolve({ success: true }),
            onFileOperationProgress: () => () => { },
            readFilePreview: () => Promise.resolve(null),
            getImageMetadata: () => Promise.resolve(null),
            getVideoMetadata: () => Promise.resolve(null),
            getDrives: () => Promise.resolve([]),
            mountDevice: () => Promise.resolve({ success: false }),
            unmountDevice: () => Promise.resolve({ success: false }),
            extractArchive: () => Promise.resolve({ success: false }),
            compressItems: () => Promise.resolve({ success: false }),
            clipboardCopyPaths: () => Promise.resolve({ success: false }),
            showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
            showSaveDialog: () => Promise.resolve({ canceled: true, filePath: null }),
            minimizeWindow: () => { },
            maximizeWindow: () => { },
            closeWindow: () => { },
            pickerConfirm: () => { },
            pickerCancel: () => { },
            getWalThemes: () => Promise.resolve([]),
            platform: 'linux',
        };
        return;
    }

    const { invoke } = window.__TAURI__.core;

    const fileManagerApi = {
        // Directory operations
        getDirectoryContents: (dirPath) => invoke('get_directory_contents', { dirPath }),
        getHomeDirectory: () => invoke('get_home_directory'),
        getCommonDirectories: () => invoke('get_common_directories'),
        getParentDirectory: (currentPath) => invoke('get_parent_directory', { currentPath }),
        pathExists: (checkPath) => invoke('path_exists', { checkPath }),
        joinPaths: (...paths) => invoke('join_paths', { paths }),
        parsePath: (pathString) => invoke('parse_path', { pathString }),

        // File operations
        openFile: (filePath) => invoke('open_file', { filePath }),
        showInFolder: (filePath) => invoke('show_in_folder', { filePath }),
        openTerminal: (dirPath) => invoke('open_terminal', { dirPath }),
        deleteItem: (itemPath) => invoke('delete_item', { itemPath }),
        deleteItemSudo: (itemPath) => invoke('delete_item', { itemPath }),
        trashItem: (itemPath) => invoke('trash_item', { itemPath }),
        restoreTrashItems: () => Promise.resolve({ success: false, error: 'Not implemented' }),
        renameItem: (oldPath, newName) => invoke('rename_item', { oldPath, newName }),
        createFolder: (parentPath, folderName) => invoke('create_folder', { parentPath, folderName }),
        createFile: (parentPath, fileName) => invoke('create_file', { parentPath, fileName }),
        copyItem: (sourcePath, destPath) => invoke('copy_item', { sourcePath, destPath }),
        moveItem: (sourcePath, destPath) => invoke('move_item', { sourcePath, destPath }),
        getItemInfo: (itemPath) => invoke('get_item_info', { itemPath }),

        // Batch operations
        batchFileOperation: (operation) => invoke('batch_file_operation', { operation }),
        cancelOperation: () => Promise.resolve({ success: true }),
        onFileOperationProgress: () => () => { },

        // Preview
        readFilePreview: (filePath, maxBytes) => invoke('read_file_preview', { filePath, maxBytes }),
        getImageMetadata: (filePath) => invoke('get_image_metadata', { filePath }),
        getVideoMetadata: () => Promise.resolve(null),

        // Drives
        getDrives: () => invoke('get_drives'),
        mountDevice: () => Promise.resolve({ success: false, error: 'Not implemented' }),
        unmountDevice: () => Promise.resolve({ success: false, error: 'Not implemented' }),

        // Archives
        extractArchive: (archivePath, destDir) => invoke('extract_archive', { archivePath, destDir }),
        compressItems: (items, outputPath, format) => invoke('compress_items', { items, outputPath, format }),

        // Clipboard
        clipboardCopyPaths: (paths) => invoke('clipboard_copy_paths', { paths }),

        // Dialogs
        showOpenDialog: async (options) => {
            try {
                const { open } = window.__TAURI__.dialog;
                const result = await open({
                    multiple: options?.multiple,
                    directory: options?.directory,
                });
                if (result === null) return { canceled: true, filePaths: [] };
                return { canceled: false, filePaths: Array.isArray(result) ? result : [result] };
            } catch {
                return { canceled: true, filePaths: [] };
            }
        },
        showSaveDialog: async (options) => {
            try {
                const { save } = window.__TAURI__.dialog;
                const result = await save({ defaultPath: options?.defaultPath });
                if (result === null) return { canceled: true, filePath: null };
                return { canceled: false, filePath: result };
            } catch {
                return { canceled: true, filePath: null };
            }
        },

        // Window controls
        minimizeWindow: () => invoke('window_minimize'),
        maximizeWindow: () => invoke('window_maximize'),
        closeWindow: () => invoke('window_close'),

        // Picker mode
        pickerConfirm: (paths) => invoke('picker_confirm', { paths }),
        pickerCancel: () => invoke('picker_cancel'),

        // Wal themes
        getWalThemes: () => Promise.resolve([]),

        // Platform
        platform: 'linux',
    };

    // Expose to window immediately
    window.fileManager = fileManagerApi;
    console.log('[Prism FM] Tauri IPC adapter loaded successfully');
})();
