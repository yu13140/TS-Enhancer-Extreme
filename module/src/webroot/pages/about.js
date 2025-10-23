/**
 * TSEE WebUI 设置页面模块
 * 提供管理 WebUI 的选项
 */

const AboutPage = {
    moduleInfo: {},
    version: 'v0.8.3-RC1',
    config: {
        showThemeToggle: false
    },
    
    activeItem: '',
    
    settingsItems: [
        {
            id: 'check-updates',
            title: 'CHECK_UPDATES',
            description: 'CHECK_UPDATES_DESC',
            icon: 'update',
            content: 'checkUpdatesContent',
            isModal: true
        },
        {
            id: 'interface',
            title: 'INTERFACE_SETTINGS',
            description: 'INTERFACE_SETTINGS_DESC',
            icon: 'palette',
            content: 'interfaceContent',
            isModal: true
        },
        {
            id: 'export',
            title: 'EXPORT_LOG',
            description: 'EXPORT_LOG_DESC',
            icon: 'bug_report',
            content: 'exportContent',
            isModal: true
        },
        {
            id: 'about',
            title: 'ABOUT',
            description: 'ABOUT_DESC',
            icon: 'contact_page',
            content: 'aboutContent',
            isModal: true
        }
    ],
    
    async preloadData() {
        try {
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                return JSON.parse(cachedInfo);
            }
            
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            if (configOutput) {
                const lines = configOutput.split('\n');
                const config = {};
                
                lines.forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        config[key] = value;
                    }
                });
                
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                return config;
            }
            return {};
        } catch (error) {
            console.warn('预加载模块信息失败:', error);
            return {};
        }
    },
    
    async init() {
        try {
            this.registerActions();
            const preloadedData = PreloadManager.getData('about') || await this.preloadData();
            this.moduleInfo = preloadedData;
            
            I18n.registerLanguageChangeHandler(this.onLanguageChanged.bind(this));
            
            return true;
        } catch (error) {
            console.error('初始化关于页面失败:', error);
            return false;
        }
    },

    onLanguageChanged() {
        const aboutContent = document.querySelector('.about-container');
        if (aboutContent) {
            aboutContent.outerHTML = this.render().trim();
            this.afterRender();
        }
    },

    onDeactivate() {
        I18n.unregisterLanguageChangeHandler(this.onLanguageChanged.bind(this));
        UI.clearPageActions();
    },

    registerActions() {
        UI.registerPageActions('about', [
            {
                id: 'refresh-about',
                icon: 'refresh',
                title: I18n.translate('REFRESH', '刷新'),
                onClick: 'refreshModuleInfo'
            }
        ]);
        
        if (this.config.showThemeToggle) {
            UI.registerPageActions('about', [
                {
                    id: 'toggle-css',
                    icon: 'palette',
                    title: I18n.translate('TOGGLE_CSS', '切换样式'),
                    onClick: 'toggleCSS'
                }
            ]);
        }
    },
    
    render() {
        return `
        <div class="about-container">
            <!-- 设置列表 -->
            <div class="settings-list">
                ${this.settingsItems.map(item => `
                    <div class="setting-item ${this.activeItem === item.id ? 'active' : ''}" 
                         data-item="${item.id}" data-modal="${item.isModal || false}">
                        <div class="setting-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="setting-content">
                            <h3 class="setting-title" data-i18n="${item.title}">
                                ${I18n.translate(item.title, item.id)}
                            </h3>
                            <p class="setting-description" data-i18n="${item.description}">
                                ${I18n.translate(item.description, `${item.id} description`)}
                            </p>
                        </div>
                        <span class="material-symbols-rounded setting-arrow">chevron_right</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    },

    renderCheckUpdatesModal() {
        return `
        <div class="about-modal-overlay" id="check-updates-modal-overlay">
            <div class="about-modal">
                <div class="about-modal-header">
                    <h2 class="about-modal-title">${I18n.translate('CHECK_UPDATES', '检查更新')}</h2>
                    <button class="about-modal-close" id="check-updates-modal-close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="about-modal-content">
                    <div class="update-info">
                        <div class="info-item">
                            <div class="info-icon">
                                <span class="material-symbols-rounded">info</span>
                            </div>
                            <div class="info-content">
                                <div class="info-label">${I18n.translate('CURRENT_VERSION', '当前版本')}</div>
                                <div class="info-value">${this.version}</div>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-icon">
                                <span class="material-symbols-rounded">update</span>
                            </div>
                            <div class="info-content">
                                <div class="info-label">${I18n.translate('LAST_CHECKED', '最后检查时间')}</div>
                                <div class="info-value">${I18n.translate('NEVER_CHECKED', '从未检查')}</div>
                            </div>
                        </div>
                        <div style="margin-top: var(--spacing-xl); text-align: center;">
                            <button class="dialog-button filled" id="modal-check-update-btn">
                                <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">search</span>
                                ${I18n.translate('CHECK_FOR_UPDATES', '检查更新')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    },

    renderInterfaceSettingsModal() {
        const presetHues = [
            { value: 0, name: 'color' },
            { value: 37, name: 'color' },
            { value: 66, name: 'color' },
            { value: 97, name: 'color' },
            { value: 124, name: 'color' },
            { value: 148, name: 'color' },
            { value: 176, name: 'color' },
            { value: 212, name: 'color' },
            { value: 255, name: 'color' },
            { value: 300, name: 'color' },
            { value: 325, name: 'color' }
        ];

        return `
        <div class="about-modal-overlay" id="interface-settings-modal-overlay">
            <div class="about-modal">
                <div class="about-modal-header">
                    <h2 class="about-modal-title">${I18n.translate('INTERFACE_SETTINGS', '界面设置')}</h2>
                    <button class="about-modal-close" id="interface-settings-modal-close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="about-modal-content">
                    <h3 class="section-title">
                        <span class="material-symbols-rounded">palette</span>
                        ${I18n.translate('COLOR_PICKER', '颜色选择器')}
                    </h3>
                    
                    <div class="color-picker-content">
                        <div class="preset-colors">
                            ${presetHues.map(hue => `
                                <div class="preset-color" data-hue="${hue.value}" title="${hue.name}">
                                    <div class="color-preview" style="--preview-hue: ${hue.value}"></div>
                                </div>
                            `).join('')}
                        </div>
                        <label>
                            <span>${I18n.translate('HUE_VALUE', '色调值')}</span>
                            <input type="range" id="hue-slider" min="0" max="360" value="${this.getCurrentHue()}">
                            <output id="hue-value">${this.getCurrentHue()}</output>
                        </label>
                    </div>
                    
                    <div class="dialog-buttons" style="margin-top: var(--spacing-xl);">
                        <button class="dialog-button" id="cancel-color">${I18n.translate('CANCEL', '取消')}</button>
                        <button class="dialog-button filled" id="apply-color">${I18n.translate('APPLY', '应用')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    },

    renderExportLogModal() {
        return `
        <div class="about-modal-overlay" id="export-log-modal-overlay">
            <div class="about-modal">
                <div class="about-modal-header">
                    <h2 class="about-modal-title">${I18n.translate('EXPORT_LOG', '导出日志')}</h2>
                    <button class="about-modal-close" id="export-log-modal-close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="about-modal-content">
                    <div class="log-content-container">
                        <div class="log-header">
                            
                                <span class="material-symbols-rounded">description</span>
                            
                            <div class="log-info">
                                <span class="log-file-path">/data/adb/ts_enhancer_extreme/log/log.log</span>
                            </div>
                        </div>
                        <div class="log-content" id="log-content">
                            <div class="loading-state">
                                <span class="material-symbols-rounded">hourglass_empty</span>
                                <p>${I18n.translate('LOADING_LOG', '正在加载日志...')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <button class="dialog-button filled" id="export-log-btn">
                            <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">download</span>
                            ${I18n.translate('EXPORT_LOG', '导出日志')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    },

    renderAboutModal() {
        return `
        <div class="about-modal-overlay" id="about-modal-overlay">
            <div class="about-modal">
                <div class="about-modal-header">
                    <h2 class="about-modal-title">${I18n.translate('ABOUT', '关于')}</h2>
                    <button class="about-modal-close" id="about-modal-close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="about-modal-content">
                    <div class="about-header">
                        <div class="app-logo">
                            <span class="material-symbols-rounded">dashboard_customize</span>
                        </div>
                        <div class="about-header-content">
                            <h2>TSEE WebUI</h2>
                            <div class="version-badge">
                                ${I18n.translate('VERSION', '版本')} ${this.version}
                            </div>
                            <p class="about-description">${I18n.translate('ABOUT_DESCRIPTION', 'TSEE模块管理界面')}</p>
                        </div>
                    </div>
                
                    <div class="about-card">
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">info</span>
                                ${I18n.translate('MODULE_INFO', '模块信息')}
                            </h3>
                            <div class="info-list">
                                ${this.renderModuleInfo()}
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">person</span>
                                ${I18n.translate('MODULE_DEVELOPER', '模块开发者')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    ${this.moduleInfo.author}
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="modal-module-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">deployed_code_account</span>
                                ${I18n.translate('WEBUI_DEVELOPER', 'WebUI 开发者')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    yu13140
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="modal-webui-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">engineering</span>
                                ${I18n.translate('FRAMEWORK_DEVELOPER', '框架开发者')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    AuroraNasa
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="modal-framework-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">person_heart</span>
                                ${I18n.translate('MAO_NIANG', '猫娘')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    Nya_Fish
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="mao-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                
                    <div class="about-footer">
                        <p>${I18n.translate('COPYRIGHT_INFO', `© ${new Date().getFullYear()} Aurora星空. All rights reserved.`)}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    showCheckUpdatesModal() {
        const modalHTML = this.renderCheckUpdatesModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('check-updates-modal-close');
        const overlay = document.getElementById('check-updates-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        const checkUpdateBtn = document.getElementById('modal-check-update-btn');
        if (checkUpdateBtn) {
            checkUpdateBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }
    },

    showInterfaceSettingsModal() {
        const modalHTML = this.renderInterfaceSettingsModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('interface-settings-modal-close');
        const overlay = document.getElementById('interface-settings-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.attachColorPickerEvents();
    },

    showExportLogModal() {
        const modalHTML = this.renderExportLogModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('export-log-modal-close');
        const overlay = document.getElementById('export-log-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.loadLogContent();
        
        const exportBtn = document.getElementById('export-log-btn');
            if (exportBtn) {
                exportBtn.dataset.originalHtml = exportBtn.innerHTML;
    
                exportBtn.style.backgroundColor = 'var(--primary)';
    
                exportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.exportLogFile();
            });
        }
    },

    showAboutModal() {
        const modalHTML = this.renderAboutModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('about-modal-close');
        const overlay = document.getElementById('about-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.attachModalEvents();
    },

    async loadLogContent() {
        try {
            const logContentElement = document.getElementById('log-content');
            if (!logContentElement) return;
            
            const fileExists = await Core.execCommand('[ -f /data/adb/ts_enhancer_extreme/log/log.log ] && echo "exists" || echo "not exists"');
            
            if (!fileExists || fileExists.includes('not exists')) {
                logContentElement.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-rounded">error</span>
                        <p>${I18n.translate('LOG_FILE_NOT_FOUND', '日志文件不存在')}</p>
                    </div>
                `;
                return;
            }
            
            const logContent = await Core.execCommand('cat /data/adb/ts_enhancer_extreme/log/log.log');
            
            if (logContent && logContent.trim()) {
                logContentElement.innerHTML = `
                    <pre class="log-text">${this.escapeHtml(logContent)}</pre>
                `;
            } else {
                logContentElement.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-rounded">error</span>
                        <p>${I18n.translate('LOG_EMPTY', '日志文件为空')}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('加载日志内容失败:', error);
            const logContentElement = document.getElementById('log-content');
            if (logContentElement) {
                logContentElement.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-rounded">error</span>
                        <p>${I18n.translate('LOG_LOAD_ERROR', '加载日志失败')}</p>
                        <p class="error-detail">${error.message}</p>
                    </div>
                `;
            }
        }
    },

    async exportLogFile() {
        const exportBtn = document.getElementById('export-log-btn');
    
        const originalHTML = exportBtn.innerHTML;
        const originalBackgroundColor = exportBtn.style.backgroundColor;
    
        try {
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.classList.add('disabled');
                exportBtn.style.backgroundColor = 'var(--surface-container-high)';
                exportBtn.innerHTML = `
                    <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">pending</span>
                    ${I18n.translate('EXPORTING', '导出中...')}
                `;
            
                exportBtn.blur();
            }
        
            await Core.execCommand('mkdir -p /storage/emulated/0/');
        
            const fileExists = await Core.execCommand('[ -f /data/adb/ts_enhancer_extreme/log/log.log ] && echo "exists" || echo "not exists"');
        
            if (!fileExists || fileExists.includes('not exists')) {
                throw new Error('日志文件不存在');
            }
        
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const destPath = `/storage/emulated/0/tsee_log_${timestamp}.log`;
        
            await Core.execCommand(`cp /data/adb/ts_enhancer_extreme/log/log.log "${destPath}"`);
        
            await Core.execCommand(`chmod 644 "${destPath}"`);
        
            Core.showToast(I18n.translate('LOG_EXPORT_SUCCESS', `日志已成功导出到 ${destPath}`), 'success');
        
        } catch (error) {
            console.error('导出日志文件失败:', error);
            let errorMessage = I18n.translate('LOG_EXPORT_ERROR', '导出日志失败');
        
            if (error.message.includes('不存在')) {
                errorMessage = I18n.translate('LOG_FILE_NOT_FOUND', '日志文件不存在');
            } else if (error.message.includes('权限')) {
                errorMessage = I18n.translate('LOG_EXPORT_PERMISSION_DENIED', '权限不足，无法导出日志');
            }
        
            Core.showToast(errorMessage, 'error');
        } finally {
            setTimeout(() => {
                const currentExportBtn = document.getElementById('export-log-btn');
                if (currentExportBtn) {
                    currentExportBtn.disabled = false;
                    currentExportBtn.classList.remove('disabled');
                    currentExportBtn.style.backgroundColor = originalBackgroundColor || '';
                
                    currentExportBtn.innerHTML = currentExportBtn.dataset.originalHtml || `
                        <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">download</span>
                        ${I18n.translate('EXPORT_LOG', '导出日志')}
                    `;
                
                    currentExportBtn.blur();
                }
            }, 100);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    attachColorPickerEvents() {
        const slider = document.getElementById('hue-slider');
        const output = document.getElementById('hue-value');
        
        if (!slider || !output) return;
        
        document.querySelectorAll('.preset-color').forEach(preset => {
            preset.addEventListener('click', () => {
                const hue = preset.dataset.hue;
                slider.value = hue;
                output.textContent = hue + '°';
                document.documentElement.style.setProperty('--hue', hue);
            });
        });
        
        slider.addEventListener('input', () => {
            const value = slider.value;
            output.textContent = value + '°';
            document.documentElement.style.setProperty('--hue', value);
        });
    
        const originalHue = this.getCurrentHue();
    
        document.getElementById('cancel-color').addEventListener('click', () => {
            this.setHueValue(originalHue);
            document.getElementById('interface-settings-modal-overlay').remove();
        });
        
        document.getElementById('apply-color').addEventListener('click', () => {
            this.setHueValue(slider.value);
            document.getElementById('interface-settings-modal-overlay').remove();
            Core.showToast(I18n.translate('COLOR_CHANGED', '颜色已更新'));
        });
    },

    attachModalEvents() {
        const githubLink = document.getElementById('modal-module-github-link');
        if (githubLink) {
            githubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openGitHubLink();
            });
        }
    
        const webuiGithubLink = document.getElementById('modal-webui-github-link');
        if (webuiGithubLink) {
            webuiGithubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openWebuiGitHubLink();
            });
        }
    
        const frameworkGitHubLink = document.getElementById('modal-framework-github-link');
        if (frameworkGitHubLink) {
            frameworkGitHubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.frameworkGitHubLink();
            });
        }
    
        const MaoNiangLink = document.getElementById('mao-github-link');
        if (MaoNiangLink) {
            MaoNiangLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.MaoNiangGitHubLink();
            });
        }
    },

    switchItem(itemId) {
        const item = this.settingsItems.find(i => i.id === itemId);
        
        if (item && item.isModal) {
            switch(itemId) {
                case 'check-updates':
                    this.showCheckUpdatesModal();
                    break;
                case 'interface':
                    this.showInterfaceSettingsModal();
                    break;
                case 'export':
                    this.showExportLogModal();
                    break;
                case 'about':
                    this.showAboutModal();
                    break;
            }
        }
    },
    
    getCurrentHue() {
        const root = document.documentElement;
        const hue = getComputedStyle(root).getPropertyValue('--hue').trim();
        return hue || '300';
    },
    
    setHueValue(hue) {
        const root = document.documentElement;
        root.style.setProperty('--hue', hue);
        localStorage.setItem('ammf_color_hue', hue);
        document.dispatchEvent(new CustomEvent('colorChanged', {
            detail: { hue: hue }
        }));
    },

    renderModuleInfo() {
        const infoItems = [
            { key: 'module_name', label: 'MODULE_NAME', icon: 'tag' },
            { key: 'version', label: 'MODULE_VERSION', icon: 'new_releases' },
            { key: 'versionCode', label: 'VERSION_DATE', icon: 'update' }
        ];
        
        let html = '';
        
        infoItems.forEach(item => {
            if (this.moduleInfo[item.key]) {
                html += `
                    <div class="info-item">
                        <div class="info-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="info-content">
                            <div class="info-label" data-i18n="${item.label}">${I18n.translate(item.label, item.key)}</div>
                            <div class="info-value">${this.moduleInfo[item.key]}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        return html || `<div class="empty-state" data-i18n="NO_INFO">${I18n.translate('NO_INFO', '无可用信息')}</div>`;
    },
    
    async loadModuleInfo() {
        try {
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                this.moduleInfo = JSON.parse(cachedInfo);
                console.log('从缓存加载模块信息:', this.moduleInfo);
                return;
            }
            
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            
            if (configOutput) {
                const lines = configOutput.split('\n');
                const config = {};
                
                lines.forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        config[key] = value;
                    }
                });
                
                this.moduleInfo = config;
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                console.log('模块信息加载成功:', this.moduleInfo);
            } else {
                console.warn('无法读取模块配置文件');
                this.moduleInfo = {};
            }
        } catch (error) {
            console.error('加载模块信息失败:', error);
            this.moduleInfo = {};
        }
    },
    
    async refreshModuleInfo() {
        try {
            sessionStorage.removeItem('moduleInfo');
            await this.loadModuleInfo();
            
            const aboutContent = document.querySelector('.about-container');
            if (aboutContent) {
                aboutContent.outerHTML = this.render().trim();
                this.afterRender();
                Core.showToast(I18n.translate('MODULE_INFO_REFRESHED', '模块信息已刷新'));
            } else {
                App.loadPage('about');
            }
        } catch (error) {
            console.error('刷新模块信息失败:', error);
            Core.showToast(I18n.translate('MODULE_INFO_REFRESH_ERROR', '刷新模块信息失败'), 'error');
        }
    },
    
    afterRender() {
        document.querySelectorAll('.setting-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = item.getAttribute('data-item');
                this.switchItem(itemId);
            });
        });
        
        const refreshButton = document.getElementById('refresh-about');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshModuleInfo();
            });
        }
        
        const toggleCssButton = document.getElementById('toggle-css');
        if (toggleCssButton) {
            this.updateCssButtonStatus(toggleCssButton);
            toggleCssButton.addEventListener('click', () => {
                if (window.CSSLoader && typeof window.CSSLoader.toggleCSS === 'function') {
                    window.CSSLoader.toggleCSS();
                    this.updateCssButtonStatus(toggleCssButton);
                    const cssType = window.CSSLoader.getCurrentCSSType();
                    const message = cssType === 'custom' ? '已切换到自定义样式' : '已切换到默认样式';
                    Core.showToast(I18n.translate('CSS_SWITCHED', message));
                } else {
                    console.error('CSS加载器不可用');
                    Core.showToast(I18n.translate('CSS_LOADER_ERROR', 'CSS加载器不可用'), 'error');
                }
            });
        }
    },

    async checkForUpdates() {
        try {
            const checkUpdateBtn = document.getElementById('modal-check-update-btn');
            if (checkUpdateBtn) {
                checkUpdateBtn.disabled = true;
                checkUpdateBtn.innerHTML = `
                    <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">pending</span>
                    ${I18n.translate('CHECKING', '检查中...')}
                `;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const isUpdateAvailable = false;
            
            if (checkUpdateBtn) {
                checkUpdateBtn.disabled = false;
                checkUpdateBtn.innerHTML = `
                    <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">search</span>
                    ${I18n.translate('CHECK_FOR_UPDATES', '检查更新')}
                `;
            }
            
            if (isUpdateAvailable) {
                Core.showToast(I18n.translate('UPDATE_AVAILABLE', '发现新版本'), 'success');
            } else {
                Core.showToast(I18n.translate('NO_UPDATE_AVAILABLE', '已是最新版本'), 'info');
            }
            
        } catch (error) {
            console.error('检查更新失败:', error);
            Core.showToast(I18n.translate('UPDATE_CHECK_FAILED', '检查更新失败'), 'error');
            
            const checkUpdateBtn = document.getElementById('modal-check-update-btn');
            if (checkUpdateBtn) {
                checkUpdateBtn.disabled = false;
                checkUpdateBtn.innerHTML = `
                    <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">search</span>
                    ${I18n.translate('CHECK_FOR_UPDATES', '检查更新')}
                `;
            }
        }
    },
    
    async openGitHubLink() {
        try {
            let githubUrl = "https://github.com/XtrLumen";
            
            if (this.moduleInfo.github) {
                githubUrl = this.moduleInfo.github;
            }
            
            app.OpenUrl(githubUrl);
            console.log('已打开GitHub链接:', githubUrl);
        } catch (error) {
            console.error('打开GitHub链接失败:', error);
            Core.showToast('打开GitHub链接失败', 'error');
        }
    },
    
    async openModuleGitHubLink() {
        try {
            if (!this.moduleInfo.github) {
                Core.showToast('模块未提供GitHub链接', 'warning');
                return;
            }
            
            await Core.execCommand(`/data/adb/modules/ts_enhancer_extreme/bin/cmd activity start -a android.intent.action.VIEW -d "${this.moduleInfo.github}"`);
            console.log('已打开模块GitHub链接:', this.moduleInfo.github);
        } catch (error) {
            console.error('打开模块GitHub链接失败:', error);
            Core.showToast('打开模块GitHub链接失败', 'error');
        }
    },
    
    async openWebuiGitHubLink() {
        try {
            const webuiGithubUrl = "https://github.com/yu13140";
            app.OpenUrl(webuiGithubUrl);
            console.log('已打开WebUI开发者GitHub链接:', webuiGithubUrl);
        } catch (error) {
            console.error('打开WebUI开发者GitHub链接失败:', error);
            Core.showToast('打开WebUI开发者GitHub链接失败', 'error');
        }
    },
    
    async MaoNiangGitHubLink() {
        try {
            const maoniangGithubUrl = "https://github.com/MrNya907";
            app.OpenUrl(maoniangGithubUrl);
            console.log('已打开WebUI开发者GitHub链接:', webuiGithubUrl);
        } catch (error) {
            console.error('打开WebUI开发者GitHub链接失败:', error);
            Core.showToast('打开WebUI开发者GitHub链接失败', 'error');
        }
    },
    
    async frameworkGitHubLink() {
        try {
            const frameworkGithubUrl = "https://github.com/Aurora-Nasa-1/AM" + "MF2";
            app.OpenUrl(frameworkGithubUrl);
            console.log('已打开模块开发者GitHub链接:', frameworkGithubUrl);
        } catch (error) {
            console.error('打开模块开发者GitHub链接失败:', error);
            Core.showToast('打开模块开发者GitHub链接失败', 'error');
        }
    },
    
    updateCssButtonStatus(button) {
        if (!button || !window.CSSLoader) return;
        
        const cssType = window.CSSLoader.getCurrentCSSType();
        const title = cssType === 'custom' ? 
            I18n.translate('TOGGLE_CSS_DEFAULT', '切换到默认样式') : 
            I18n.translate('TOGGLE_CSS_CUSTOM', '切换到自定义样式');
        
        button.setAttribute('title', title);
    }
};

window.AboutPage = AboutPage;