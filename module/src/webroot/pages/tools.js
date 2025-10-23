/**
 * TSEE WebUI 功能页面模块
 * 提供各种功能工具入口
 */

const ToolsPage = {
    id: 'tools',
    isLoading: true,
    currentFunction: null,
    logs: [],
    currentPath: '/storage/emulated/0',
    fileList: [],

    async init() {
        this.registerActions();
        this.setupThemeListener();
        return true;
    },

    setupThemeListener() {
        document.addEventListener('themeChanged', (event) => {
            this.handleThemeChange(event.detail.theme);
        });

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this.handleThemeChange(currentTheme);
    },

    handleThemeChange(theme) {
        const arrowIcons = document.querySelectorAll('.bar-arrow img');
        arrowIcons.forEach(icon => {
            if (theme === 'light') {
                icon.style.filter = 'invert(0.3)';
            } else {
                icon.style.filter = 'invert(0.8)';
            }
        });
    },

    registerActions() {
        UI.registerPageActions('tools', [{
            id: 'refresh-tools',
            icon: 'refresh',
            title: I18n.translate('REFRESH', '刷新'),
            onClick: 'refreshTools'
        }]);
    },

    async refreshTools() {
        Core.showToast('刷新工具页面', 'info');
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = '';
            const content = await this.render();
            container.appendChild(content);
            this.afterRender();
        }
    },

    async onActivate() {
        this.isLoading = false;
    },

    onDeactivate() {
        UI.clearPageActions();
        this.hideGlassWindow();
        this.hideFilePicker();
    },

    render() {
        return `
      <div class="tools-list-container">
        <div class="cards-container" id="tools-list-container">
          <div class="tool-card" id="import-keybox" data-function="import">
            <div class="card-header">
              <div class="card-icon">
                <span class="material-symbols-rounded">file_upload</span>
              </div>
              <div class="card-title-section">
                <div class="card-title">${I18n.translate('IMPORT_KEYBOX', '从内部存储导入keybox文件')}</div>
              </div>
            </div>
            <div class="card-author">${I18n.translate('AUTHOR', '作者')}: TheGeniusClub</div>
            <div class="card-description">
              ${I18n.translate('IMPORT_KEYBOX_DESC', '扫描设备内部存储，查找并导入可用的keybox文件到系统分区')}
            </div>
          </div>
        
          <div class="tool-card" id="steal-keybox" data-function="steal">
            <div class="card-header">
              <div class="card-icon">
                <span class="material-symbols-rounded">security</span>
              </div>
              <div class="card-title-section">
                <div class="card-title">${I18n.translate('STEAL_KEYBOX', '窃取谷歌硬件认证根证书签名的keybox')}</div>
              </div>
            </div>
            <div class="card-author">${I18n.translate('AUTHOR', '作者')}: TheGeniusClub</div>
            <div class="card-description">
              ${I18n.translate('STEAL_KEYBOX_DESC', '通过硬件认证漏洞获取谷歌签名的keybox文件，提升设备认证等级')}
            </div>
          </div>
        
          <div class="tool-card" id="security-patch" data-function="patch">
            <div class="card-header">
              <div class="card-icon">
                <span class="material-symbols-rounded">update</span>
              </div>
              <div class="card-title-section">
                <div class="card-title">${I18n.translate('SECURITY_PATCH', '设置安全补丁级别')}</div>
              </div>
            </div>
            <div class="card-author">${I18n.translate('AUTHOR', '作者')}: TheGeniusClub</div>
            <div class="card-description">
              ${I18n.translate('SECURITY_PATCH_DESC', '修改设备安全补丁级别，绕过应用兼容性检查和安全验证')}
            </div>
          </div>
        </div>
      </div>

      <!-- 莫奈主题日志窗口 - 固定在顶部 -->
      <div class="glass-overlay" id="glass-overlay"></div>
      <div class="glass-window" id="glass-window">
        <div class="glass-header">
          <h3 class="glass-title" id="glass-title">${I18n.translate('FUNCTION_EXECUTION', '功能执行')}</h3>
          <button class="glass-close" id="glass-close">&times;</button>
        </div>
        <div class="glass-content-container">
          <div class="glass-content">
            <div class="progress-container" id="progress-container" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <div class="progress-text" id="progress-text">${I18n.translate('PREPARING', '准备中...')}</div>
            </div>
            <div class="log-output" id="log-output"></div>
          </div>
        </div>
        <div class="glass-footer">
          <button class="glass-button" id="glass-button">${I18n.translate('CONFIRM', '确定')}</button>
        </div>
      </div>

      <!-- 文件选择器窗口 - 固定在顶部居中 -->
      <div class="glass-overlay" id="file-picker-overlay"></div>
      <div class="glass-window file-selector" id="file-picker-window">
        <div class="glass-header">
          <h3 class="glass-title" id="file-picker-title">${I18n.translate('SELECT_KEYBOX_FILE', '选择keybox文件')}</h3>
          <button class="glass-close close-selector">&times;</button>
        </div>
        <div class="glass-content-container">
          <div class="glass-content">
            <div class="file-picker-path">
              <div class="current-path" id="file-current-path"></div>
            </div>
            <div class="file-picker-list file-list" id="file-picker-list">
              <!-- 文件列表将在这里动态生成 -->
            </div>
          </div>
        </div>
        <div class="glass-footer">
          <button class="glass-button secondary" id="file-picker-cancel">${I18n.translate('CANCEL', '取消')}</button>
        </div>
      </div>
    `;
    },

    async afterRender() {
        document.getElementById('import-keybox')?.addEventListener('click', () => this.handleImportKeybox());
        document.getElementById('steal-keybox')?.addEventListener('click', () => this.handleStealKeybox());
        document.getElementById('security-patch')?.addEventListener('click', () => this.handleSecurityPatch());

        document.getElementById('glass-close')?.addEventListener('click', () => this.hideGlassWindow());
        document.getElementById('glass-overlay')?.addEventListener('click', () => this.hideGlassWindow());
        document.getElementById('glass-button')?.addEventListener('click', () => this.hideGlassWindow());

        document.querySelector('.close-selector')?.addEventListener('click', () => this.hideFilePicker());
        document.getElementById('file-picker-overlay')?.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) this.hideFilePicker();
        });
        document.getElementById('file-picker-cancel')?.addEventListener('click', () => this.hideFilePicker());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideGlassWindow();
                this.hideFilePicker();
            }
        });

        window.addEventListener('resize', () => {
            const filePickerWindow = document.getElementById('file-picker-window');
            if (filePickerWindow && filePickerWindow.style.display !== 'none') {
                this.positionFilePicker();
            }
        });

        document.addEventListener('scroll', (e) => {
            const filePickerWindow = document.getElementById('file-picker-window');
            if (filePickerWindow && filePickerWindow.style.display !== 'none') {
                this.positionFilePicker();
            }
        }, true);
    },

    showGlassWindow(title) {
        this.logs = [];
        this.currentFunction = title;

        const overlay = document.getElementById('glass-overlay');
        const glassWindow = document.getElementById('glass-window');
        const titleElement = document.getElementById('glass-title');
        const logOutput = document.getElementById('log-output');
        const progressContainer = document.getElementById('progress-container');

        if (overlay && glassWindow && titleElement && logOutput) {
            titleElement.textContent = title;
            logOutput.innerHTML = '';
            progressContainer.style.display = 'none';

            overlay.style.display = 'block';
            glassWindow.style.display = 'flex';

            this.positionGlassWindow();

            this.addLog(I18n.translate('START_EXECUTION', '开始执行功能...'), 'info');
        }
    },

    positionGlassWindow() {
        const glassWindow = document.getElementById('glass-window');
        if (!glassWindow) return;

        glassWindow.style.top = '20px';
        glassWindow.style.left = '50%';
        glassWindow.style.transform = 'translateX(-50%)';

        const viewportHeight = window.innerHeight;
        glassWindow.style.maxHeight = `calc(${viewportHeight}px - 40px)`;
    },

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push({
            timestamp,
            message,
            type
        });

        const logOutput = document.getElementById('log-output');
        if (logOutput) {
            const logLine = document.createElement('div');
            logLine.className = `log-line log-${type}`;
            logLine.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-message">${message}</span>
      `;
            logOutput.appendChild(logLine);

            setTimeout(() => {
                logOutput.scrollTop = logOutput.scrollHeight;
            }, 10);
        }
    },

    hideGlassWindow() {
        const overlay = document.getElementById('glass-overlay');
        const glassWindow = document.getElementById('glass-window');

        if (overlay && glassWindow) {
            overlay.style.display = 'none';
            glassWindow.style.display = 'none';
            this.currentFunction = null;
        }
    },

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressContainer = document.getElementById('progress-container');

        if (progressFill && progressText && progressContainer) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${percent}%`;
            progressText.textContent = text;
        }
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    async showFilePicker() {
        this.currentPath = '/storage/emulated/0';
        const overlay = document.getElementById('file-picker-overlay');
        const filePickerWindow = document.getElementById('file-picker-window');

        if (overlay && filePickerWindow) {
            overlay.style.display = 'block';
            filePickerWindow.style.display = 'flex';

            filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            filePickerWindow.style.opacity = '0';

            this.positionFilePicker();

            setTimeout(() => {
                filePickerWindow.classList.add('open');
                filePickerWindow.style.transform = 'translateX(-50%) scale(1)';
                filePickerWindow.style.opacity = '1';
            }, 10);

            this.updateCurrentPath();
            await this.loadDirectory(this.currentPath);

            setTimeout(() => {
                this.positionFilePicker();
            }, 100);
        }
    },

    positionFilePicker() {
        const filePickerWindow = document.getElementById('file-picker-window');
        if (!filePickerWindow) return;

        filePickerWindow.style.position = 'fixed';
        filePickerWindow.style.top = '20px';
        filePickerWindow.style.left = '50%';
        filePickerWindow.style.transform = 'translateX(-50%)';

        const viewportHeight = window.innerHeight;
        filePickerWindow.style.maxHeight = `calc(${viewportHeight}px - 40px)`;

        filePickerWindow.style.width = '90%';
        filePickerWindow.style.maxWidth = '600px';
    },

    hideFilePicker() {
        const overlay = document.getElementById('file-picker-overlay');
        const filePickerWindow = document.getElementById('file-picker-window');

        if (overlay && filePickerWindow) {
            filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            filePickerWindow.style.opacity = '0';
            filePickerWindow.classList.remove('open');

            setTimeout(() => {
                overlay.style.display = 'none';
                filePickerWindow.style.display = 'none';
                filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            }, 300);
        }
    },

    updateCurrentPath() {
        const currentPathElement = document.getElementById('file-current-path');
        if (!currentPathElement) return;

        const segments = this.currentPath.split('/').filter(Boolean);

        const pathHTML = segments.map((segment, index) => {
            const fullPath = '/' + segments.slice(0, index + 1).join('/');
            return `<span class="path-segment" data-path="${fullPath}">${segment}</span>`;
        }).join('<span class="separator">›</span>');

        currentPathElement.innerHTML = pathHTML;
        currentPathElement.scrollTo({
            left: currentPathElement.scrollWidth,
            behavior: 'smooth'
        });
    },

    async loadDirectory(path) {
        try {
            this.currentPath = path;
            this.updateCurrentPath();

            const fileList = document.getElementById('file-picker-list');
            fileList.innerHTML = `<div class="loading-text">${I18n.translate('LOADING_DIRECTORY', '加载中...')}</div>`;

            this.positionFilePicker();

            const command = `ls "${path}"`;
            const result = await Core.execCommand(command);
            this.parseFileList(result);

            setTimeout(() => {
                this.positionFilePicker();

                const filePickerWindow = document.getElementById('file-picker-window');
                if (filePickerWindow) {
                    const rect = filePickerWindow.getBoundingClientRect();
                    if (rect.top !== 20) {
                        console.log('重新定位文件选择器窗口');
                        this.positionFilePicker();
                    }
                }
            }, 50);

        } catch (error) {
            const fileList = document.getElementById('file-picker-list');
            fileList.innerHTML = `<div class="error-text">${I18n.translate('UNABLE_TO_ACCESS_DIRECTORY', '无法访问目录: {error}', { error: error.message || error })}</div>`;

            setTimeout(() => {
                this.positionFilePicker();
            }, 50);
        }
    },

    parseFileList(lsOutput) {
        const lines = lsOutput.split('\n').filter(line => line.trim());
        const fileList = document.getElementById('file-picker-list');
        fileList.innerHTML = '';

        if (this.currentPath !== '/storage/emulated/0') {
            const parentItem = document.createElement('div');
            parentItem.className = 'file-item directory';
            parentItem.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
          <path d="M141-160q-24 0-42-18.5T81-220v-520q0-23 18-41.5t42-18.5h280l60 60h340q23 0 41.5 18.5T881-680v460q0 23-18.5 41.5T821-160H141Z"/>
        </svg>
        <span>..</span>
      `;
            parentItem.addEventListener('click', () => {
                const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/storage/emulated/0';
                this.loadDirectory(parentPath);
            });
            fileList.appendChild(parentItem);
        }

        let hasFiles = false;

        lines.forEach(line => {
            if (!line.trim()) return;

            const checkDirCommand = `[ -d "${this.currentPath}/${line}" ] && echo "directory" || echo "file"`;

            this.checkFileType(line, checkDirCommand, fileList);
        });

        setTimeout(() => {
            this.positionFilePicker();
        }, 100);
    },

    async checkFileType(filename, checkCommand, fileList) {
        try {
            const result = await Core.execCommand(checkCommand);
            const isDirectory = result.trim() === 'directory';
            const isXmlFile = filename.toLowerCase().endsWith('.xml');

            if (!isDirectory && !isXmlFile) return;

            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${isDirectory ? 'directory' : 'xml-file'}`;

            fileItem.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
          ${isDirectory ? 
            '<path d="M141-160q-24 0-42-18.5T81-220v-520q0-23 18-41.5t42-18.5h280l60 60h340q23 0 41.5 18.5T881-680v460q0 23-18.5 41.5T821-160H141Z"/>' :
            '<path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>'}
        </svg>
        <span>${filename}</span>
      `;

            fileItem.addEventListener('click', () => {
                if (isDirectory) {
                    const newPath = this.currentPath.endsWith('/') ?
                        `${this.currentPath}${filename}` : `${this.currentPath}/${filename}`;
                    this.loadDirectory(newPath);
                } else {
                    const filePath = this.currentPath.endsWith('/') ?
                        `${this.currentPath}${filename}` : `${this.currentPath}/${filename}`;
                    this.selectXmlFile(filePath);
                }
            });

            fileList.appendChild(fileItem);
        } catch (error) {
            // 忽略检查文件类型时的错误
        }
    },

    async selectXmlFile(filePath) {
        this.positionFilePicker();
        this.hideFilePicker();
        await this.processKeyboxImport(filePath);
    },

    async handleImportKeybox() {
        await this.showFilePicker();
    },

    async processKeyboxImport(sourcePath) {
        this.showGlassWindow(I18n.translate('IMPORT_KEYBOX_TITLE', '导入keybox文件'));

        try {
            this.addLog(I18n.translate('FOUND_KEYBOX_FILE', '找到keybox文件: {path}', {
                path: sourcePath
            }), 'info');
            await this.delay(500);

            try {
                await Core.execCommand('test -f /data/adb/tricky_store/keybox.xml');

                this.updateProgress(30, I18n.translate('BACKING_UP', '备份中...'));
                this.addLog(I18n.translate('EXISTING_KEYBOX_FOUND', '发现已存在的keybox文件，正在备份...'), 'warning');

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await Core.execCommand(`cp /data/adb/tricky_store/keybox.xml /data/adb/tricky_store/keybox_backup/keybox_backup_${timestamp}.xml`);
                this.addLog(I18n.translate('BACKUP_COMPLETE', '已备份原有keybox文件'), 'success');
            } catch (e) {
                this.addLog(I18n.translate('NO_EXISTING_KEYBOX', '未发现已存在的keybox文件'), 'info');
            }

            this.updateProgress(50, I18n.translate('COPYING_FILE', '复制文件中...'));
            this.addLog(I18n.translate('COPYING_TO_SYSTEM', '正在复制文件...'), 'info');

            await Core.execCommand(`cp "${sourcePath}" /data/adb/tricky_store/keybox.xml`);

            this.updateProgress(70, I18n.translate('SETTING_PERMISSIONS', '设置权限中...'));
            this.addLog(I18n.translate('SETTING_FILE_PERMISSIONS', '设置文件权限...'), 'info');

            await Core.execCommand('chmod 644 /data/adb/tricky_store/keybox.xml');

            this.updateProgress(100, I18n.translate('IMPORT_COMPLETE', '导入完成'));
            this.addLog(I18n.translate('KEYBOX_IMPORT_SUCCESS', 'keybox文件导入成功！'), 'success');
            this.addLog(I18n.translate('KEYBOX_SAVED_TO', '文件已保存到: {path}', {
                path: '/data/adb/tricky_store/keybox.xml'
            }), 'success');

        } catch (error) {
            this.addLog(`${I18n.translate('IMPORT_FAILED', '导入失败')}: ${error.message || error}`, 'error');
            this.addLog(I18n.translate('CHECK_PERMISSION_SPACE', '请检查文件权限和存储空间'), 'error');
        }
    },

    async handleStealKeybox() {
        this.showGlassWindow(I18n.translate('STEAL_KEYBOX_TITLE', '窃取keybox'));

        try {
            this.addLog(I18n.translate('EXECUTING_COMMAND', '执行命令中...'), 'info');
            this.updateProgress(30, I18n.translate('EXECUTING_COMMAND', '执行命令中...'));

            const commandA = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --stealkeybox -a';
            this.addLog(I18n.translate('EXECUTING_COMMAND', '执行命令: {command}', {
                command: commandA
            }), 'info');

            let result;
            try {
                result = await Core.execCommand(commandA);
                this.addLog(I18n.translate('COMMAND_A_EXECUTED', '使用参数 -a 执行成功'), 'success');
            } catch (errorA) {
                this.addLog(I18n.translate('COMMAND_A_FAILED', '使用参数 -a 执行失败: {error}', {
                    error: errorA.message || errorA
                }), 'warning');

                const commandB = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --stealkeybox -b';
                this.addLog(I18n.translate('TRYING_ALTERNATIVE_COMMAND', '尝试备用命令: {command}', {
                    command: commandB
                }), 'info');

                try {
                    result = await Core.execCommand(commandB);
                    this.addLog(I18n.translate('COMMAND_B_EXECUTED', '使用参数 -b 执行成功'), 'success');
                } catch (errorB) {
                    this.addLog(I18n.translate('COMMAND_B_FAILED', '使用参数 -b 执行失败: {error}', {
                        error: errorB.message || errorB
                    }), 'error');

                    throw new Error(I18n.translate('BOTH_COMMANDS_FAILED', '所有命令执行都失败，请检查设备兼容性'));
                }
            }

            this.updateProgress(70, I18n.translate('PROCESSING_RESULT', '处理结果中...'));
            this.addLog(I18n.translate('COMMAND_EXECUTED', '命令执行完成'), 'success');

            if (result && result.trim()) {
                const lines = result.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.addLog(line, 'info');
                    }
                });
            } else {
                this.addLog(I18n.translate('COMMAND_NO_OUTPUT', '命令执行成功，但没有输出'), 'info');
            }

            this.updateProgress(100, I18n.translate('COMPLETED', '完成'));
            this.addLog(I18n.translate('KEYBOX_STEAL_COMPLETED', 'keybox窃取操作已完成'), 'success');

        } catch (error) {
            const errorMsg = error.message || error.toString();
            this.addLog(`${I18n.translate('STEAL_FAILED', '窃取失败')}: ${errorMsg}`, 'error');

            if (errorMsg.includes('Permission denied')) {
                this.addLog(I18n.translate('PERMISSION_DENIED_CHECK_ROOT', '权限被拒绝，请检查SELinux状态和root权限'), 'error');
            } else if (errorMsg.includes('所有命令执行都失败')) {
                this.addLog(I18n.translate('CHECK_DEVICE_COMPATIBILITY', '请检查设备兼容性或联系开发者获取支持'), 'error');
            } else {
                this.addLog(I18n.translate('CHECK_PROXY_NETWORK', '请检查是否使用代理网络，如果没有请使用代理'), 'error');
            }
        }
    },

    async handleSecurityPatch() {
        this.showGlassWindow(I18n.translate('SECURITY_PATCH_TITLE', '设置安全补丁级别'));

        try {
            this.addLog(I18n.translate('SETTING_SECURITY_PATCH', '正在设置安全补丁级别...'), 'info');
            this.updateProgress(40, I18n.translate('EXECUTING_COMMAND', '执行命令中...'));

            const command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --securitypatchdatefetch';
            this.addLog(I18n.translate('EXECUTING_COMMAND', '执行命令: {command}', {
                command
            }), 'info');

            const result = await Core.execCommand(command);

            this.updateProgress(80, I18n.translate('PROCESSING_RESULT', '处理结果中...'));
            this.addLog(I18n.translate('COMMAND_EXECUTED', '命令执行完成'), 'success');

            if (result && result.trim()) {
                const lines = result.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.addLog(line, 'info');
                    }
                });
            } else {
                this.addLog(I18n.translate('COMMAND_NO_OUTPUT', '命令执行成功，但没有输出'), 'info');
            }

            this.updateProgress(100, I18n.translate('SETUP_COMPLETE', '设置完成'));
            this.addLog(I18n.translate('SECURITY_PATCH_SET_COMPLETED', '安全补丁级别设置完成'), 'success');

        } catch (error) {
            const errorMsg = error.message || error.toString();
            this.addLog(`${I18n.translate('SETUP_FAILED', '设置失败')}: ${errorMsg}`, 'error');

            if (errorMsg.includes('Permission denied')) {
                this.addLog(I18n.translate('PERMISSION_DENIED_CHECK_ROOT', '权限被拒绝，请检查SELinux状态和root权限'), 'error');
            } else {
                this.addLog(I18n.translate('CHECK_PROXY_NETWORK', '请检查是否使用代理网络，如果没有请使用代理'), 'error');
            }
        }
    },

    forceRepositionFilePicker() {
        const filePickerWindow = document.getElementById('file-picker-window');
        if (!filePickerWindow || filePickerWindow.style.display === 'none') {
            return;
        }

        console.log('强制重新定位文件选择器');

        filePickerWindow.style.display = 'none';
        setTimeout(() => {
            filePickerWindow.style.display = 'flex';
            this.positionFilePicker();

            filePickerWindow.classList.add('open');
            filePickerWindow.style.transform = 'translateX(-50%) scale(1)';
            filePickerWindow.style.opacity = '1';
        }, 10);
    }
};

window.ToolsPage = ToolsPage;