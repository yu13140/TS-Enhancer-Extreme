/**
 * TSEE WebUI 应用管理页面模块
 * 管理包名黑白名单配置
 */

const SettingsPage = {
    appList: [],
    systemAppList: [],
    targetList: [],
    thirdPartyApps: [],
    systemApps: [],
    isLoading: false,
    isCancelled: false,
    hasUnsavedChanges: false,
    loadingState: 'idle',
    showSystemApps: false,
    isInitialized: false,
    iconCache: new Map(),
    searchQuery: '',

    async preloadData() {
        try {
            const usrPath = '/data/adb/ts_enhancer_extreme/usr.txt';
            const sysPath = '/data/adb/ts_enhancer_extreme/sys.txt';
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('命令执行超时')), 5000);
            });
            
            try {
                const usrRaw = await Promise.race([
                    Core.execCommand(`cat "${usrPath}"`),
                    timeoutPromise
                ]);
                if (typeof usrRaw === 'object' && usrRaw.stdout) {
                    this.thirdPartyApps = (usrRaw.stdout || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                } else {
                    this.thirdPartyApps = (usrRaw || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                }
            } catch (e) {
                this.thirdPartyApps = [];
            }
            
            try {
                const sysRaw = await Promise.race([
                    Core.execCommand(`cat "${sysPath}"`),
                    timeoutPromise
                ]);
                if (typeof sysRaw === 'object' && sysRaw.stdout) {
                    this.systemApps = (sysRaw.stdout || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                } else {
                    this.systemApps = (sysRaw || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                }
            } catch (e) {
                this.systemApps = [];
            }
        } catch (e) {
        }
        
        return true;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    updateProgress(percent, text) {
        const progressFill = document.getElementById('settings-loading-progress-fill');
        const progressText = document.getElementById('settings-loading-progress-text');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = text;
        }
    },

    async fetchAppList() {
        this.setLoadingState('loading');
        
        try {
            this.updateProgress(10, I18n.translate('INITIALIZING', '正在初始化...'));
            await this.delay(100);
            
            const hasKernelSU = typeof ksu !== 'undefined';
            const hasPackageManager = typeof $packageManager !== 'undefined';
            
            if (hasKernelSU || hasPackageManager) {
                await this.fetchAppListWithKernelSU();
            } else {
                await this.fetchAppListWithPM();
            }
            
        } catch (e) {
            this.appList = [];
            this.systemAppList = [];
            this.updateProgress(0, '加载失败');
            await this.delay(500);
            this.setLoadingState('error');
            
            if (document.getElementById('settings-container')) {
                this.renderAppList();
            }
        }
    },

    async fetchAppListWithKernelSU() {
        try {
            this.updateProgress(20, I18n.translate('FETCHING_APP_LIST', '正在获取应用列表...'));
            
            let userPackages = [];
            let systemPackages = [];
            
            if (typeof ksu !== 'undefined') {
                try {
                    const userPkgs = JSON.parse(ksu.listUserPackages() || '[]');
                    userPackages = userPkgs;
                    
                    this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
                    
                    const systemPkgs = JSON.parse(ksu.listSystemPackages() || '[]');
                    systemPackages = systemPkgs;
                    
                } catch (e) {
                    await this.fetchAppListWithPM();
                    return;
                }
            } else if (typeof $packageManager !== 'undefined') {
                try {
                    userPackages = await this.getPackagesWithPackageManager(false);
                    this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
                    systemPackages = await this.getPackagesWithPackageManager(true);
                } catch (e) {
                    await this.fetchAppListWithPM();
                    return;
                }
            }
            
            this.updateProgress(60, I18n.translate('PROCESSING_APP_INFO', '正在处理应用信息...'));
            
            const userEntries = await this.processPackagesWithInfo(userPackages, false);
            this.appList = userEntries;
            
            this.updateProgress(80, I18n.translate('PROCESSING_SYSTEM_APPS', '正在处理系统应用...'));
            
            const systemEntries = await this.processPackagesWithInfo(systemPackages, true);
            this.systemAppList = systemEntries;
            
            this.updateProgress(95, I18n.translate('FINISHING_LOADING', '正在完成加载...'));
            await this.delay(200);
            
            this.updateProgress(100, I18n.translate('LOADING_COMPLETE', '加载完成'));
            await this.delay(300);
            
            this.setLoadingState('success');
            
            if (document.getElementById('settings-container')) {
                this.renderAppList();
            }
            
        } catch (e) {
            throw e;
        }
    },

    async getPackagesWithPackageManager(isSystem) {
        return new Promise((resolve) => {
            const packages = [];
            try {
                if (typeof $packageManager !== 'undefined') {
                    const flags = isSystem ? 0x00000001 : 0x00000002;
                    const installedApps = $packageManager.getInstalledApplications(flags);
                    for (let i = 0; i < installedApps.size(); i++) {
                        packages.push(installedApps.get(i).packageName);
                    }
                }
                resolve(packages);
            } catch (e) {
                resolve([]);
            }
        });
    },

    async fetchAppListWithPM() {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('获取应用列表超时')), 8000);
        });
        
        this.updateProgress(20, I18n.translate('FETCHING_APP_LIST', '正在获取应用列表...'));
        const thirdPartyOutput = await Promise.race([
            Core.execCommand('pm list packages -3'),
            timeoutPromise
        ]);
        
        this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
        const systemOutput = await Promise.race([
            Core.execCommand('pm list packages -s'),
            timeoutPromise
        ]);
        
        this.updateProgress(60, I18n.translate('PROCESSING_APP_INFO', '正在处理应用信息...'));
        
        let thirdPartyPkgs = (thirdPartyOutput.stdout || thirdPartyOutput).split('\n').map(l => l.replace('package:', '').trim()).filter(Boolean);
        const thirdPartyEntries = await this.processPackagesWithInfo(thirdPartyPkgs, false);
        this.appList = thirdPartyEntries;
        
        this.updateProgress(80, I18n.translate('PROCESSING_SYSTEM_APPS', '正在处理系统应用...'));
        
        let systemPkgs = (systemOutput.stdout || systemOutput).split('\n').map(l => l.replace('package:', '').trim()).filter(Boolean);
        const systemEntries = await this.processPackagesWithInfo(systemPkgs, true);
        this.systemAppList = systemEntries;
        
        this.updateProgress(95, I18n.translate('FINISHING_LOADING', '正在完成加载...'));
        await this.delay(200);
        
        this.updateProgress(100, I18n.translate('LOADING_COMPLETE', '加载完成'));
        await this.delay(300);
        
        this.setLoadingState('success');
        
        if (document.getElementById('settings-container')) {
            this.renderAppList();
        }
    },

    async processPackagesWithInfo(packages, isSystemApp) {
        const entries = [];
        const batchSize = 10;
        
        for (let i = 0; i < packages.length; i += batchSize) {
            const batch = packages.slice(i, i + batchSize);
            const batchPromises = batch.map(pkg => this.getAppInfo(pkg));
            const batchResults = await Promise.all(batchPromises);
            
            for (const result of batchResults) {
                entries.push({
                    appName: result.appName,
                    packageName: result.packageName,
                    isSystemApp: isSystemApp
                });
            }
            
            const progress = 60 + Math.floor((i / packages.length) * 35);
            const appType = isSystemApp ? I18n.translate('SYSTEM', '系统') : I18n.translate('THIRD_PARTY', '第三方');
            this.updateProgress(progress, I18n.translate('PROCESSING_APPS_PROGRESS', '处理{type}应用中... ({current}/{total})', {
                type: appType,
                current: Math.min(i + batchSize, packages.length),
                total: packages.length
            }));
            await this.delay(10);
        }
        
        return entries;
    },

    async getAppInfo(packageName) {
        let appName = packageName;
        
        try {
            if (typeof ksu !== 'undefined' && typeof ksu.getPackagesInfo === 'function') {
                const info = JSON.parse(ksu.getPackagesInfo(`["${packageName}"]`));
                if (info && info[0] && info[0].appLabel) {
                    appName = info[0].appLabel;
                }
            } 
            else if (typeof $packageManager !== 'undefined') {
                const info = $packageManager.getApplicationInfo(packageName, 0, 0);
                if (info && info.getLabel) {
                    appName = info.getLabel();
                }
            }
        } catch (e) {
        }
        
        return { 
            appName: appName ? appName.trim() : packageName, 
            packageName: packageName.trim() 
        };
    },

    async loadAppIcon(packageName, imgElement, loaderElement) {
        if (this.iconCache.has(packageName)) {
            imgElement.src = this.iconCache.get(packageName);
            if (loaderElement) loaderElement.style.display = 'none';
            imgElement.style.opacity = '1';
            return;
        }

        try {
            if (typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function') {
                const iconInfo = JSON.parse(ksu.getPackagesIcons(`["${packageName}"]`, 48));
                if (iconInfo && iconInfo[0] && iconInfo[0].icon) {
                    this.iconCache.set(packageName, iconInfo[0].icon);
                    imgElement.src = iconInfo[0].icon;
                    if (loaderElement) loaderElement.style.display = 'none';
                    imgElement.style.opacity = '1';
                    return;
                }
            }
            else if (typeof $packageManager !== 'undefined') {
                try {
                    const icon = $packageManager.getApplicationIcon(packageName, 0, 0);
                } catch (e) {
                }
            }
        } catch (e) {
        }

        if (loaderElement) loaderElement.style.display = 'none';
    },

    setupIconLazyLoad() {
        if (typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const packageName = container.getAttribute('data-package');
                    const imgElement = container.querySelector('.app-icon-img');
                    const loaderElement = container.querySelector('.app-icon-loader');
                    
                    if (packageName && imgElement) {
                        this.loadAppIcon(packageName, imgElement, loaderElement);
                        observer.unobserve(container);
                    }
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        const iconContainers = document.querySelectorAll('.app-icon-container');
        iconContainers.forEach(container => {
            observer.observe(container);
        });
    },

    async init() {
        this.isCancelled = false;
        I18n.registerLanguageChangeHandler(this.onLanguageChanged.bind(this));
        
        await this.preloadData();
        
        this.isInitialized = true;
    },

    onLanguageChanged() {
        if (this.isInitialized) {
            this.renderAppList();
        }
    },

    setLoadingState(state) {
        this.loadingState = state;
        this.updateLoadingAnimation();
    },

    updateLoadingAnimation() {
        const loadingOverlay = document.getElementById('settings-loading');
        const loadingText = document.getElementById('settings-loading-text');
        const progressContainer = document.getElementById('settings-loading-progress-container');
        
        if (!loadingOverlay) return;
        
        switch (this.loadingState) {
            case 'loading':
                loadingOverlay.style.display = 'flex';
                if (loadingText) loadingText.textContent = I18n.translate('LOADING_SETTINGS', '正在加载应用列表...');
                if (progressContainer) progressContainer.style.display = 'block';
                break;
            case 'success':
            case 'error':
            case 'idle':
                loadingOverlay.style.display = 'none';
                break;
        }
    },

    registerActions() {
        UI.registerPageActions('settings', [
            {
                id: 'settings-help',
                icon: 'help',
                title: I18n.translate('HELP', '说明'),
                onClick: 'showHelpModal'
            }
        ]);
    },

    render() {
        return `
            <div class="settings-content">
                <div id="settings-container">
                    <div class="loading-placeholder">
                        ${I18n.translate('LOADING_SETTINGS', '正在加载应用列表...')}
                    </div>
                </div>
                <div id="settings-loading" class="settings-loading-overlay">
                    <div class="settings-loading-content">
                        <div class="settings-loading-spinner"></div>
                        <div id="settings-loading-text" class="settings-loading-text">
                            ${I18n.translate('LOADING_SETTINGS', '正在加载应用列表...')}
                        </div>
                        <div id="settings-loading-progress-container" class="settings-loading-progress-container">
                            <div class="settings-loading-progress">
                                <div id="settings-loading-progress-fill" class="settings-loading-progress-fill"></div>
                            </div>
                            <div id="settings-loading-progress-text" class="settings-loading-progress-text">准备中...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderAppList() {
        const container = document.getElementById('settings-container');
        if (!container) {
            return;
        }
    
        const hasIconSupport = typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function';
    
        let html = `
            <div class="settings-options" style="margin-bottom:24px;">
                <div class="option-group" style="background:var(--surface-container);border-radius:16px;padding:16px;margin-bottom:16px;">
                    <div class="option-item" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                        <div>
                            <div style="font:var(--title-m);color:var(--on-surface);">${I18n.translate('SHOW_SYSTEM_APPS', '显示系统应用')}</div>
                            <div style="font:var(--body-s);color:var(--on-surface-variant);">${I18n.translate('SHOW_SYSTEM_APPS_DESC', '开启后将显示系统应用列表')}</div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="show-system-apps-toggle" ${this.showSystemApps ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                
                    <div class="search-container" style="margin-top:16px;">
                        <div class="search-input-wrapper" style="position:relative;">
                            <input type="text" id="app-search-input" class="search-input" 
                                   placeholder="${I18n.translate('SEARCH_APPS', '搜索应用名称或包名...')}" 
                                   value="${this.searchQuery}">
                            <span class="material-symbols-rounded" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--on-surface-variant);font-size:20px;">search</span>
                        </div>
                    </div>
                </div>
            </div>
        
            <div class="app-list-container">
        `;
    
        let combinedList = [...this.appList];
        if (this.showSystemApps) {
            combinedList = [...combinedList, ...this.systemAppList];
        }
    
        const filteredList = this.filterAppList(combinedList, this.searchQuery);
    
        if (filteredList.length === 0) {
            html += `
                <div class="empty-state">
                    <span class="material-symbols-rounded" style="font-size:64px;color:var(--outline);margin-bottom:16px;">apps</span>
                    <div style="font:var(--title-m);color:var(--on-surface-variant);margin-bottom:8px;">${I18n.translate('NO_APPS_FOUND', '未找到应用')}</div>
                    <div style="font:var(--body-m);color:var(--on-surface-variant);">${this.searchQuery ? I18n.translate('NO_SEARCH_RESULTS', '没有找到匹配的应用') : (this.showSystemApps ? I18n.translate('NO_APPS_DESC', '请确保设备已安装应用') : I18n.translate('ENABLE_SYSTEM_APPS', '尝试开启系统应用显示'))}</div>
                </div>
            `;
        } else {
            html += `<div class="app-list">`;
        
            filteredList.sort((a, b) => {
                if (a.isSystemApp !== b.isSystemApp) return a.isSystemApp ? 1 : -1;
            
                const aChecked = a.isSystemApp ? this.systemApps.includes(a.packageName) : this.thirdPartyApps.includes(a.packageName);
                const bChecked = b.isSystemApp ? this.systemApps.includes(b.packageName) : this.thirdPartyApps.includes(b.packageName);
                if (aChecked !== bChecked) return aChecked ? -1 : 1;
            
                return (a.appName || '').localeCompare(b.appName || '');
            });
        
            for (const { appName, packageName, isSystemApp } of filteredList) {
                const isThirdParty = !isSystemApp;
                const checked = isThirdParty ? 
                    !this.thirdPartyApps.includes(packageName) : 
                    this.systemApps.includes(packageName);
            
                const displayPackageName = packageName.length > 30 ? 
                    packageName.substring(0, 27) + '...' : packageName;
            
                const iconHtml = hasIconSupport ? 
                    `<div class="app-icon-container" data-package="${packageName}" style="position:relative;width:32px;height:32px;margin-right:16px;border-radius:6px;overflow:hidden;">
                      <div class="app-icon-loader" style="width:100%;height:100%;background:var(--outline-variant);display:flex;align-items:center;justify-content:center;">
                            <span class="material-symbols-rounded" style="font-size:20px;color:var(--outline);">${isSystemApp ? 'settings_applications' : 'supervised_user_circle'}</span>
                        </div>
                        <img class="app-icon-img" data-package="${packageName}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.3s;" />
                    </div>` :
                    `<span class="material-symbols-rounded" style="font-size:32px;color:${isSystemApp ? 'var(--outline)' : 'var(--primary)'};margin-right:16px;">${isSystemApp ? 'settings_applications' : 'supervised_user_circle'}</span>`;
            
                const appCardHtml = `
                <div class="card app-card" data-package="${packageName}" data-is-system="${isSystemApp}">
                    ${iconHtml}
                    <div style="flex:1;min-width:0;overflow:hidden;">
                        <div style="font:var(--title-m);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${appName}</div>
                        <div style="font:var(--body-m);color:var(--on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${packageName}">${displayPackageName} ${isSystemApp ? '<span style="font:var(--body-xs);color:var(--secondary);">(系统)</span>' : ''}</div>
                    </div>
                    <label class="switch" style="margin-left:16px;flex-shrink:0;">
                        <input type="checkbox" class="app-toggle" data-package="${packageName}" data-is-system="${isSystemApp}" ${checked ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>`;
            
                html += appCardHtml;
            }
            html += `</div>`;
        }
    
        html += `</div>`;
    
        container.innerHTML = html;
    
        const saveButtonContainer = document.createElement('div');
        saveButtonContainer.id = 'save-button-container';
        saveButtonContainer.innerHTML = `
            <button id="save-apps-btn" class="md3-btn">${I18n.translate('SAVE_SETTINGS', '保存')}</button>
        `;
    
        const oldContainer = document.getElementById('save-button-container');
        if (oldContainer) {
            oldContainer.remove();
        }
    
        document.body.appendChild(saveButtonContainer);
    
        this.bindEvents();
    
        if (hasIconSupport) {
            this.setupIconLazyLoad();
        }
    },

    filterAppList(appList, query) {
        if (!query || query.trim() === '') {
            return appList;
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return appList.filter(app => {
            const appName = app.appName ? app.appName.toLowerCase() : '';
            const packageName = app.packageName ? app.packageName.toLowerCase() : '';
            
            const appNameMatch = appName.includes(searchTerm);
            const packageNameMatch = packageName.includes(searchTerm);
            
            return appNameMatch || packageNameMatch;
        });
    },

    bindEvents() {
        const systemAppsToggle = document.getElementById('show-system-apps-toggle');
        if (systemAppsToggle) {
            systemAppsToggle.addEventListener('change', (e) => {
                this.showSystemApps = e.target.checked;
                this.renderAppList();
            });
        }
        
        const searchInput = document.getElementById('app-search-input');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = value;
                    this.renderAppListOnly();
                }, 300);
            });
            
            this.currentSearchInput = searchInput;
        }
        
        document.querySelectorAll('.app-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const pkg = e.target.getAttribute('data-package');
                const isSystemApp = e.target.getAttribute('data-is-system') === 'true';
                
                if (isSystemApp) {
                    if (e.target.checked) {
                        if (!this.systemApps.includes(pkg)) {
                            this.systemApps.push(pkg);
                        }
                    } else {
                        this.systemApps = this.systemApps.filter(p => p !== pkg);
                    }
                } else {
                    if (!e.target.checked) {
                        if (!this.thirdPartyApps.includes(pkg)) {
                            this.thirdPartyApps.push(pkg);
                        }
                    } else {
                        this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                    }
                }
                this.hasUnsavedChanges = true;
            });
        });
        
        const saveBtn = document.getElementById('save-apps-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        const explanationBtn = document.getElementById('settings-explanation-btn');
        if (explanationBtn) {
            explanationBtn.addEventListener('click', () => {
                this.showExplanationModal();
            });
        }
    },

    renderAppListOnly() {
        const appListContainer = document.querySelector('.app-list-container');
        if (!appListContainer) {
            return;
        }
        
        let combinedList = [...this.appList];
        if (this.showSystemApps) {
            combinedList = [...combinedList, ...this.systemAppList];
        }
        
        const filteredList = this.filterAppList(combinedList, this.searchQuery);
        
        let html = '';
        
        if (filteredList.length === 0) {
            html = `
                <div class="empty-state">
                    <span class="material-symbols-rounded" style="font-size:64px;color:var(--outline);margin-bottom:16px;">apps</span>
                    <div style="font:var(--title-m);color:var(--on-surface-variant);margin-bottom:8px;">${I18n.translate('NO_APPS_FOUND', '未找到应用')}</div>
                    <div style="font:var(--body-m);color:var(--on-surface-variant);">${this.searchQuery ? I18n.translate('NO_SEARCH_RESULTS', '没有找到匹配的应用') : (this.showSystemApps ? I18n.translate('NO_APPS_DESC', '请确保设备已安装应用') : I18n.translate('ENABLE_SYSTEM_APPS', '尝试开启系统应用显示'))}</div>
                </div>
            `;
        } else {
            html = `<div class="app-list">`;
            
            filteredList.sort((a, b) => {
                if (a.isSystemApp !== b.isSystemApp) return a.isSystemApp ? 1 : -1;
                
                const aChecked = a.isSystemApp ? this.systemApps.includes(a.packageName) : this.thirdPartyApps.includes(a.packageName);
                const bChecked = b.isSystemApp ? this.systemApps.includes(b.packageName) : this.thirdPartyApps.includes(b.packageName);
                if (aChecked !== bChecked) return aChecked ? -1 : 1;
                
                return (a.appName || '').localeCompare(b.appName || '');
            });
            
            const hasIconSupport = typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function';
            
            for (const { appName, packageName, isSystemApp } of filteredList) {
                const isThirdParty = !isSystemApp;
                const checked = isThirdParty ? 
                    !this.thirdPartyApps.includes(packageName) : 
                    this.systemApps.includes(packageName);
                
                const displayPackageName = packageName.length > 30 ? 
                    packageName.substring(0, 27) + '...' : packageName;
                
                const iconHtml = hasIconSupport ? 
                    `<div class="app-icon-container" data-package="${packageName}" style="position:relative;width:32px;height:32px;margin-right:16px;border-radius:6px;overflow:hidden;">
                        <div class="app-icon-loader" style="width:100%;height:100%;background:var(--outline-variant);display:flex;align-items:center;justify-content:center;">
                            <span class="material-symbols-rounded" style="font-size:20px;color:var(--outline);">${isSystemApp ? 'settings_applications' : 'supervised_user_circle'}</span>
                        </div>
                        <img class="app-icon-img" data-package="${packageName}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.3s;" />
                    </div>` :
                    `<span class="material-symbols-rounded" style="font-size:32px;color:${isSystemApp ? 'var(--outline)' : 'var(--primary)'};margin-right:16px;">${isSystemApp ? 'settings_applications' : 'supervised_user_circle'}</span>`;
                
                const appCardHtml = `
                <div class="card app-card" data-package="${packageName}" data-is-system="${isSystemApp}">
                    ${iconHtml}
                    <div style="flex:1;min-width:0;overflow:hidden;">
                        <div style="font:var(--title-m);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${appName}</div>
                        <div style="font:var(--body-m);color:var(--on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${packageName}">${displayPackageName} ${isSystemApp ? '<span style="font:var(--body-xs);color:var(--secondary);">(系统)</span>' : ''}</div>
                    </div>
                    <label class="switch" style="margin-left:16px;flex-shrink:0;">
                        <input type="checkbox" class="app-toggle" data-package="${packageName}" data-is-system="${isSystemApp}" ${checked ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>`;
                
                html += appCardHtml;
            }
            html += `</div>`;
        }
        
        appListContainer.innerHTML = html;
        
        document.querySelectorAll('.app-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const pkg = e.target.getAttribute('data-package');
                const isSystemApp = e.target.getAttribute('data-is-system') === 'true';
                
                if (isSystemApp) {
                    if (e.target.checked) {
                        if (!this.systemApps.includes(pkg)) {
                            this.systemApps.push(pkg);
                        }
                    } else {
                        this.systemApps = this.systemApps.filter(p => p !== pkg);
                    }
                } else {
                    if (!e.target.checked) {
                        if (!this.thirdPartyApps.includes(pkg)) {
                            this.thirdPartyApps.push(pkg);
                        }
                    } else {
                        this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                    }
                }
                this.hasUnsavedChanges = true;
            });
        });
        
        if (typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function') {
            this.setupIconLazyLoad();
        }
    },

    showHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'help-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        modal.innerHTML = `
            <div class="help-modal-content" style="
                background: var(--surface-container-high);
                border-radius: 20px;
                padding: 20px;
                width: 90%;
                max-width: 380px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid var(--outline-variant);
                animation: modalSlideUp 0.3s ease-out;
                box-sizing: border-box;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="font: var(--headline-s); color: var(--on-surface); margin: 0; font-size: 18px;">使用说明</h3>
                    <button id="close-help-modal" style="background: none; border: none; color: var(--on-surface-variant); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
                    </button>
                </div>
                <div style="font: var(--body-m); color: var(--on-surface); line-height: 1.5; font-size: 14px;">
                    <p style="margin-bottom: 12px;"><strong>1. 对所有第三方软件：</strong></p>
                    <ul style="margin-left: 16px; margin-bottom: 16px; padding: 0;">
                        <li style="margin-bottom: 6px; list-style-type: disc;">开关关闭显示为开启</li>
                        <li style="list-style-type: disc;">关闭才会将第三方软件加入usr.txt</li>
                    </ul>
                    
                    <p style="margin-bottom: 12px;"><strong>2. 对所有系统软件：</strong></p>
                    <ul style="margin-left: 16px; padding: 0;">
                        <li style="margin-bottom: 6px; list-style-type: disc;">开关显示为关闭</li>
                        <li style="list-style-type: disc;">开启将系统软件加入sys.txt</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('close-help-modal');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        const modalContent = modal.querySelector('.help-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    },

    async saveSettings() {
        const saveBtn = document.getElementById('save-apps-btn');
        const originalText = saveBtn?.textContent;
        
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = I18n.translate('SAVING', '保存中...');
            }
            
            const usrContent = this.thirdPartyApps.join('\n');
            const sysContent = this.systemApps.join('\n');
            
            const usrPath = '/data/adb/ts_enhancer_extreme/usr.txt';
            const sysPath = '/data/adb/ts_enhancer_extreme/sys.txt';
            
            await Core.execCommand(`echo '${usrContent.replace(/'/g, "'\\''")}' > "${usrPath}"`, 5000);
            await Core.execCommand(`echo '${sysContent.replace(/'/g, "'\\''")}' > "${sysPath}"`, 5000);

            try {
                await Core.execCommand('/data/adb/modules/ts_enhancer_extreme/binaries/tseed --packagelistupdate &', 3000);
            } catch (timeoutError) {
            }

            Core.showToast('保存成功', 'success');
            this.hasUnsavedChanges = false;
            
        } catch (e) {
            Core.showToast('保存失败，请检查权限', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    },

    async onActivate() {
        this.isCancelled = false;
        
        if (!this.isInitialized) {
            await this.init();
        }
        
        this.registerActions();
        
        this.setLoadingState('loading');
        await this.fetchAppList();
    },

    onDeactivate() {
        I18n.unregisterLanguageChangeHandler(this.onLanguageChanged.bind(this));
        UI.clearPageActions();
        this.isCancelled = true;

        const saveButtonContainer = document.getElementById('save-button-container');
        if (saveButtonContainer) {
            saveButtonContainer.remove();
        }

        this.currentSearchInput = null;

        const explanationModal = document.getElementById('settings-explanation-modal');
        if (explanationModal) {
            explanationModal.remove();
        }

        const actionsContainer = document.getElementById('settings-page-actions');
        if (actionsContainer) {
            actionsContainer.remove();
        }

        const settingsHeader = document.getElementById('settings-page-/header');
        if (settingsHeader) {
            settingsHeader.remove();
        }
    }
};

window.SettingsPage = SettingsPage;