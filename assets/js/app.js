// ── SmartFin v5.3.0 ──────────────────────────────────────────────────────────
// Major Architecture Redesign: Modular business logic, platform-independent code
// v5.3.0: Dynamic notification system, modern dark theme, enhanced insights & triggers
//
// VERSION MANAGEMENT:
// APP_VERSION below is the SINGLE SOURCE OF TRUTH for version across the entire app.
// When bumping version, use scripts/bump-version.sh (Linux/Mac) or scripts/bump-version.bat (Windows)
// or push to main branch to trigger GitHub Actions auto-bump workflow.
// This will automatically update all documentation files to match this version.

import { showAlert, showConfirm, showPrompt, showTypedConfirm, showToast } from './modules/modal.js';
import { renderDashboard } from './modules/dashboard.js';
import {
    SAVE_DEBOUNCE_MS, PANEL_CLOSE_ANIMATION_MS, SAVE_RETRY_DELAY_MS,
    LOGS_REFRESH_INTERVAL_MS, LOG_FLUSH_INTERVAL_MS, OUTSIDE_CLICK_DELAY_MS,
    UNDO_TOAST_DURATION_MS, SEARCH_DEBOUNCE_MS,
    MAX_LOG_QUEUE_SIZE, MAX_LOCAL_LOGS, LOG_QUERY_LIMIT,
    MOBILE_BREAKPOINT_PX, DEFAULT_INFLATION_RATE, DEFAULT_RETIREMENT_AGE,
    DEFAULT_CURRENT_AGE, MISMATCH_TOLERANCE, DAYS_PER_YEAR,
    COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_WARNING,
    toMonthlyAmount, getPeriodsPerYear
} from './modules/constants.js';
import { iconSvg } from './modules/icons.js';
import { getMonthlyBudgetDistribution } from './modules/budget-distribution.js';

// ── Lazy-Load Helpers (P2: lazy-load SheetJS + Chart.js) ─────────────────────
const _loadedScripts = {};
function loadScript(url) {
    if (_loadedScripts[url]) return _loadedScripts[url];
    _loadedScripts[url] = new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = url;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(s);
    });
    return _loadedScripts[url];
}

const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
const SHEETJS_URL  = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';

async function ensureChartJs() { await loadScript(CHART_JS_URL); }
async function ensureSheetJs() { await loadScript(SHEETJS_URL); }

function setToggleButtonIconText(button, isEditMode, label = 'Edit') {
    if (!button) return;
    button.classList.add('panel-edit-toggle');
    button.classList.toggle('is-editing', isEditMode);
    button.setAttribute('aria-pressed', String(isEditMode));
    button.setAttribute('aria-label', isEditMode ? 'Finish editing' : (label === 'Edit' ? 'Edit details' : `Edit ${label.toLowerCase()} details`));
    button.title = isEditMode ? 'Finish editing' : 'Edit details';
    const iconName = isEditMode ? 'check' : 'pencil';
    button.innerHTML = `${iconSvg(iconName, 'btn-action-svg')} ${isEditMode ? 'Done' : label}`;
}

function setToggleButtonClosed(button, label = 'Closed') {
    if (!button) return;
    button.classList.add('panel-edit-toggle', 'is-closed');
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-label', `${label}: editing unavailable`);
    button.innerHTML = `${iconSvg('lock', 'btn-action-svg')} ${label}`;
}

// ── Debounce Utility (P2) ────────────────────────────────────────────────────
function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ── Undo Delete Queue (P1) ──────────────────────────────────────────────────
let _undoDeleteEntry = null;
let _undoDeleteTabId = null;

// ── Budget State (P2: encapsulate window.* globals) ─────────────────────────
const budgetState = {
    transferAmt: 0,
    salaryAccount: null,
    expAccount: null,
    autoDebitByType: {},
    transferDone: 0,
    trackedExpenses: 0,
    mismatchCorrectTransfer: null,
    mismatchFixedOutflow: null,
};

// ── Loading Spinner ──────────────────────────────────────────────────────────
function hideLoadingOverlay() {
    const el = document.getElementById('loadingOverlay');
    if (el) {
        el.classList.add('sf-loading-fade');
        setTimeout(() => el.remove(), 150);
    }
}

// ── Logging System ─────────────────────────────────────────────────────────────
const LogLevel = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
};

class AppLogger {
    constructor() {
        this.userId = null;
        this.deviceId = this.generateDeviceId();
        this.isEnabled = true;
        this.logQueue = [];
        this.isOnline = navigator.onLine;
        this.maxQueueSize = MAX_LOG_QUEUE_SIZE;
        this.flushInterval = LOG_FLUSH_INTERVAL_MS;
        this.flushTimer = null;
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Start auto-flush
        this.startAutoFlush();
    }
    
    generateDeviceId() {
        let deviceId = localStorage.getItem('app_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('app_device_id', deviceId);
        }
        return deviceId;
    }
    
    setUserId(userId) {
        this.userId = userId;
    }
    
    handleOnline() {
        this.isOnline = true;
        console.log('[AppLogger] Back online, flushing queued logs');
        this.flushQueue();
    }
    
    handleOffline() {
        this.isOnline = false;
        console.log('[AppLogger] Gone offline, logs will be queued');
    }
    
    startAutoFlush() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flushQueue(), this.flushInterval);
    }
    
    stopAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
    
    async log(level, message, context = {}) {
        if (!this.isEnabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            userId: this.userId,
            deviceId: this.deviceId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            context: context
        };
        
        // Always log to console for local debugging
        const consoleMethod = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARNING ? 'warn' : 'log';
        console[consoleMethod](`[${level.toUpperCase()}]`, message, context);
        
        // Add to queue for Firebase
        this.logQueue.push(logEntry);
        
        // Trim queue if too large
        if (this.logQueue.length > this.maxQueueSize) {
            this.logQueue = this.logQueue.slice(-this.maxQueueSize);
        }
        
        // Try to flush immediately if online
        if (this.isOnline) {
            await this.flushQueue();
        }
    }
    
    info(message, context) {
        return this.log(LogLevel.INFO, message, context);
    }
    
    warning(message, context) {
        return this.log(LogLevel.WARNING, message, context);
    }
    
    error(message, context) {
        return this.log(LogLevel.ERROR, message, context);
    }
    
    async flushQueue() {
        if (!this.isOnline || this.logQueue.length === 0) return;
        
        const logsToSend = [...this.logQueue];
        this.logQueue = [];
        
        try {
            // Send to Firebase
            await this.sendToFirebase(logsToSend);
            console.log(`[AppLogger] Flushed ${logsToSend.length} logs to Firebase`);
        } catch (error) {
            console.error('[AppLogger] Failed to flush logs:', error);
            // Re-add failed logs to queue
            this.logQueue = [...logsToSend, ...this.logQueue];
        }
    }
    
    async sendToFirebase(logs) {
        // This will be implemented after Firebase is initialized
        // For now, just store in localStorage as fallback
        try {
            const existingLogs = JSON.parse(localStorage.getItem('app_logs_local') || '[]');
            const newLogs = [...existingLogs, ...logs];
            
            const trimmedLogs = newLogs.slice(-MAX_LOCAL_LOGS);
            localStorage.setItem('app_logs_local', JSON.stringify(trimmedLogs));
            
            // P0: Send to per-user scoped logs collection
            if (window.db && window.firestoreInitialized && this.userId) {
                const logsCollection = window.db.collection('users').doc(this.userId).collection('logs');
                const batch = window.db.batch();
                
                logs.forEach(log => {
                    const docRef = logsCollection.doc();
                    batch.set(docRef, log);
                });
                
                await batch.commit();
            }
        } catch (error) {
            console.error('[AppLogger] Error sending to Firebase:', error);
        }
    }
    
    async getLogs(filters = {}) {
        try {
            // P0: Read from per-user scoped logs collection
            if (window.db && window.firestoreInitialized && this.userId) {
                let query = window.db.collection('users').doc(this.userId).collection('logs')
                    .orderBy('timestamp', 'desc')
                    .limit(LOG_QUERY_LIMIT);
                
                if (filters.level) {
                    query = query.where('level', '==', filters.level);
                }
                
                if (filters.startDate) {
                    query = query.where('timestamp', '>=', filters.startDate);
                }
                
                if (filters.endDate) {
                    query = query.where('timestamp', '<=', filters.endDate);
                }
                
                const snapshot = await query.get();
                return snapshot.docs.map(doc => doc.data());
            }
            
            // Fallback to localStorage
            const localLogs = JSON.parse(localStorage.getItem('app_logs_local') || '[]');
            let filteredLogs = localLogs;
            
            if (filters.level) {
                filteredLogs = filteredLogs.filter(log => log.level === filters.level);
            }
            
            if (filters.userId) {
                filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
            }
            
            if (filters.startDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate);
            }
            
            if (filters.endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate);
            }
            
            // Sort by timestamp desc
            filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return filteredLogs.slice(0, LOG_QUERY_LIMIT);
        } catch (error) {
            console.error('[AppLogger] Error getting logs:', error);
            return [];
        }
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
    
    clearLocalLogs() {
        localStorage.removeItem('app_logs_local');
        console.log('[AppLogger] Local logs cleared');
    }
}

// Initialize global logger
const logger = new AppLogger();

// ── Network Status ───────────────────────────────────────────────────────────────
let networkStatusTimeout = null;

// ── App Logs Panel ─────────────────────────────────────────────────────────────
let logsAutoRefreshInterval = null;

function openLogsPanel() {
    logger.info('Logs panel opened');
    const logsPanel = document.getElementById('logsPanel');
    const logsOverlay = document.getElementById('logsOverlay');
    
    if (!logsPanel || !logsOverlay) {
        console.error('Logs panel or overlay not found');
        return;
    }
    
    logsPanel.hidden = false;
    logsPanel.classList.add('open');
    logsPanel.setAttribute('aria-hidden', 'false');
    logsOverlay.hidden = false;
    
    loadLogs();
    startLogsAutoRefresh();
}

function closeLogsPanel() {
    logger.info('Logs panel closed');
    const logsPanel = document.getElementById('logsPanel');
    const logsOverlay = document.getElementById('logsOverlay');
    
    if (!logsPanel || !logsOverlay) {
        console.error('Logs panel or overlay not found');
        return;
    }
    
    logsPanel.hidden = true;
    logsPanel.classList.remove('open');
    logsPanel.setAttribute('aria-hidden', 'true');
    logsOverlay.hidden = true;
    
    stopLogsAutoRefresh();
}

function startLogsAutoRefresh() {
    stopLogsAutoRefresh();
    logsAutoRefreshInterval = setInterval(() => loadLogs(), LOGS_REFRESH_INTERVAL_MS);
}

function stopLogsAutoRefresh() {
    if (logsAutoRefreshInterval) {
        clearInterval(logsAutoRefreshInterval);
        logsAutoRefreshInterval = null;
    }
}

async function loadLogs() {
    const levelFilter = document.getElementById('logLevelFilter').value;
    const searchInput = document.getElementById('logSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filters = {};
    
    if (levelFilter !== 'all') {
        filters.level = levelFilter;
    }
    
    try {
        let logs = await logger.getLogs(filters);
        
        // Apply search filter
        if (searchTerm) {
            logs = logs.filter(log => {
                const message = log.message.toLowerCase();
                const context = log.context ? JSON.stringify(log.context).toLowerCase() : '';
                return message.includes(searchTerm) || context.includes(searchTerm);
            });
        }
        
        renderLogs(logs);
        updateLogsStats(logs);
    } catch (error) {
        logger.error('Failed to load logs', { error: error.message });
        renderLogsError(error.message);
    }
}

function renderLogs(logs) {
    const logsTable = document.getElementById('logsTable');
    
    if (!logs || logs.length === 0) {
        logsTable.innerHTML = '<div class="logs-empty">No logs found</div>';
        return;
    }
    
    const html = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const contextStr = log.context ? JSON.stringify(log.context, null, 2) : '';
        
        const deviceLabel = log.deviceId ? `<span class="log-entry-device">Device: ${log.deviceId.substring(0, 15)}...</span>` : '';

        return `
            <div class="log-entry ${log.level}">
                <div class="log-entry-header">
                    <span class="log-entry-level ${log.level}">${log.level}</span>
                    <span class="log-entry-timestamp">${timestamp}</span>
                    ${log.userId ? `<span class="log-entry-user">User: ${log.userId.substring(0, 8)}...</span>` : ''}
                    ${deviceLabel}
                </div>
                <div class="log-entry-message">${escapeHtml(log.message)}</div>
                ${contextStr ? `<div class="log-entry-context">${escapeHtml(contextStr)}</div>` : ''}
            </div>
        `;
    }).join('');
    
    logsTable.innerHTML = html;
}

function renderLogsError(errorMessage) {
    const logsTable = document.getElementById('logsTable');
    logsTable.innerHTML = `<div class="logs-empty">Error loading logs: ${escapeHtml(errorMessage)}</div>`;
}

function updateLogsStats(logs) {
    const total = logs.length;
    const info = logs.filter(l => l.level === 'info').length;
    const warning = logs.filter(l => l.level === 'warning').length;
    const error = logs.filter(l => l.level === 'error').length;
    
    document.getElementById('logsTotalCount').textContent = `Total: ${total}`;
    document.getElementById('logsInfoCount').textContent = `Info: ${info}`;
    document.getElementById('logsWarningCount').textContent = `Warning: ${warning}`;
    document.getElementById('logsErrorCount').textContent = `Error: ${error}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportLogs() {
    logger.info('Exporting logs');
    const levelFilter = document.getElementById('logLevelFilter').value;
    const filters = {};
    
    if (levelFilter !== 'all') {
        filters.level = levelFilter;
    }
    
    logger.getLogs(filters).then(logs => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            filters: filters,
            totalLogs: logs.length,
            logs: logs
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartfin-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.info('Logs exported successfully', { count: logs.length });
    }).catch(error => {
        logger.error('Failed to export logs', { error: error.message });
        showAlert('Failed to export logs: ' + error.message, { variant: 'error' });
    });
}

async function clearLocalLogs() {
    if (await showConfirm('Are you sure you want to clear all local logs? This will not delete logs from Firebase.', { title: 'Clear Logs' })) {
        logger.clearLocalLogs();
        loadLogs();
        logger.info('Local logs cleared');
    }
}

// Initialize logs panel event listeners
const logsBtn = document.getElementById('logsBtn');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const logRefreshBtn = document.getElementById('logRefreshBtn');
const logExportBtn = document.getElementById('logExportBtn');
const logClearBtn = document.getElementById('logClearBtn');
const logLevelFilter = document.getElementById('logLevelFilter');
const logSearchInput = document.getElementById('logSearchInput');

if (logsBtn) {
    logsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openLogsPanel();
    });
}

if (closeLogsBtn) {
    closeLogsBtn.addEventListener('click', closeLogsPanel);
}

if (logRefreshBtn) {
    logRefreshBtn.addEventListener('click', () => {
        logger.info('Manual log refresh');
        loadLogs();
    });
}

if (logExportBtn) {
    logExportBtn.addEventListener('click', exportLogs);
}

if (logClearBtn) {
    logClearBtn.addEventListener('click', clearLocalLogs);
}

if (logLevelFilter) {
    logLevelFilter.addEventListener('change', loadLogs);
}

if (logSearchInput) {
    logSearchInput.addEventListener('input', loadLogs);
}

// Close logs panel when clicking overlay
const logsOverlay = document.getElementById('logsOverlay');
if (logsOverlay) {
    logsOverlay.addEventListener('click', closeLogsPanel);
}

// ── Theme-based favicon switching ─────────────────────────────────────────────
function updateFaviconForTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const faviconIcon = document.getElementById('favicon-icon');
    const faviconIcon32 = document.getElementById('favicon-icon-32');
    const appleTouchIcon = document.getElementById('apple-touch-icon');
    
    const logoPath = isLight ? 'assets/logo_light.png' : 'assets/logo_dark.png';
    
    if (faviconIcon) faviconIcon.href = logoPath;
    if (faviconIcon32) faviconIcon32.href = logoPath;
    if (appleTouchIcon) appleTouchIcon.href = logoPath;
}

// ── Chart theme color helper ─────────────────────────────────────────────────
function getChartThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        text:    isLight ? '#212529' : '#e0e0e0',
        grid:    isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
        bar:     isLight ? '#444444' : '#e0e0e0',
    };
}

const SEMANTIC_COLORS = {
    investment: { color: "#3b82f6", bg: "rgba(59, 130, 246, .18)", paidBg: "rgba(59, 130, 246, .05)", text: "#93c5fd", lightBg: "rgba(59, 130, 246, .12)", lightText: "#2563eb" },
    liability: { color: COLOR_NEGATIVE, bg: "rgba(239, 68, 68, .18)", paidBg: "rgba(239, 68, 68, .05)", text: "#fca5a5", lightBg: "rgba(239, 68, 68, .12)", lightText: "#dc2626" },
    savings: { color: COLOR_POSITIVE, bg: "rgba(34, 197, 94, .18)", paidBg: "rgba(34, 197, 94, .05)", text: "#86efac", lightBg: "rgba(34, 197, 94, .12)", lightText: "#16a34a" },
    expenditure: { color: "#f97316", bg: "rgba(249, 115, 22, .18)", paidBg: "rgba(249, 115, 22, .05)", text: "#fdba74", lightBg: "rgba(249, 115, 22, .12)", lightText: "#ea580c" },
    insurance: { color: "#a855f7", bg: "rgba(168, 85, 247, .18)", paidBg: "rgba(168, 85, 247, .05)", text: "#d8b4fe", lightBg: "rgba(168, 85, 247, .12)", lightText: "#7c3aed" },
    others: { color: COLOR_WARNING, bg: "rgba(234, 179, 8, .18)", paidBg: "rgba(234, 179, 8, .05)", text: "#fde68a", lightBg: "rgba(234, 179, 8, .12)", lightText: "#ca8a04" }
};

function semanticKey(value) {
    let key = String(value || "others").trim().toLowerCase().replace(/[^a-z]/g, "") || "others";
    if (key === "saving") key = "savings";
    if (key === "other") key = "others";
    return key;
}

function getSemanticColor(value, paid = false) {
    const palette = SEMANTIC_COLORS[semanticKey(value)] || SEMANTIC_COLORS.others;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        background: paid ? palette.paidBg : (isLight ? palette.lightBg : palette.bg),
        color: isLight ? palette.lightText : palette.text,
        borderColor: palette.color
    };
}

function semanticBadgeStyle(value, paid = false) {
    const c = getSemanticColor(value, paid);
    return `background:${c.background};color:${c.color};border-color:${c.borderColor}`;
}

// ── Version Info ──────────────────────────────────────────────────────────────
const APP_VERSION = { major: 5, minor: 4, build: 11 };
function getAppVersion() {
    return `v${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.build}`;
}

// Log version on load
console.log(`%c🚀 SmartFin ${getAppVersion()} loaded`, 'color: #7c3aed; font-weight: bold; font-size: 14px;');
console.log('If you see errors about "saveData is not defined", please hard refresh (Ctrl+Shift+R)');
console.log('Current APP_VERSION:', APP_VERSION);

// ── Utility: sum only numeric values from a category data object ─────────────
function sumCategoryNumericValues(data) {
    if (!data) return 0;
    return Object.entries(data).reduce((s, [k, v]) => {
        if (k.endsWith('Desc')) return s; // Skip description fields
        return s + (Number(v) || 0);
    }, 0);
}

const DEFAULT_TABS = [
    { id: "dashboard",           label: "Dashboard",             semantic: "Others", core: true },
    { id: "cards",               label: "Accounts",              semantic: "Others", core: true },
    { id: "inflow",              label: "Invest",                semantic: "Investment", core: true },
    { id: "outflow",             label: "Outflow",               semantic: "Liability", core: true },
    { id: "insurance",           label: "Insurance",             semantic: "Insurance", core: true },
    { id: "monthlyBudget",       label: "Budget",                semantic: "Expenditure", core: true },
    { id: "expenseTracking",     label: "Expenses",              semantic: "Expenditure", core: true },
    { id: "financialGoal",       label: "Goals",                 semantic: "Savings", core: true },
    { id: "netWorth",            label: "Net Worth",             semantic: "Others" },
    { id: "taxPlan",             label: "Tax",              semantic: "Savings" },
    { id: "emergencyFund",       label: "Emergency",             semantic: "Savings" },
    { id: "gifts",               label: "Gifts",                 semantic: "Others" }
];

// ── Tab-specific field configurations ───────────────────────────────────────
function getDefaultDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const TAB_FIELDS = {
    monthlyBudget: [
        { id: "name",      label: "Item Name",           type: "text",   placeholder: "e.g. Rent, Groceries", required: true },
        { id: "planned",   label: "Planned Amount (₹)", type: "number", placeholder: "0", required: true },
        { id: "actual",    label: "Actual Amount (₹)",  type: "number", placeholder: "0" },
        { id: "date",      label: "Date",               type: "date",   placeholder: "" },
        { id: "note",      label: "Note",               type: "text",   placeholder: "Optional" }
    ],
    expenseTracking: [
        { id: "category",  label: "Category",           type: "select", options: ["Food & Dining", "Transportation", "Shopping", "Entertainment", "Healthcare", "Education", "Personal Care", "Home & Utilities", "Travel", "Gifts & Donations", "Others"], required: true },
        { id: "amount",    label: "Amount (₹)",         type: "number", placeholder: "0", required: true },
        { id: "date",      label: "Date",               type: "date",   placeholder: "", required: true },
        { id: "merchant",  label: "Merchant",           type: "text",   placeholder: "e.g. Amazon, Swiggy" },
        { id: "description", label: "Description",        type: "text",   placeholder: "Optional notes" }
    ],
    financialGoal: [
        { id: "name",      label: "Goal Name",           type: "text",   placeholder: "e.g. Emergency Fund", required: true },
        { id: "amountNeeded", label: "Amount Needed (₹)", type: "number", placeholder: "0", required: true },
        { id: "amountAccumulated", label: "Amount Accumulated (₹)", type: "number", placeholder: "0" },
        { id: "targetDate", label: "Target Date", type: "date", placeholder: "" },
        { id: "details", label: "Details", type: "text", placeholder: "Optional" },
        { id: "goalType", label: "Goal Type", type: "select", options: ["Short Term", "Mid Term", "Long Term"] }
    ],
    inflow: [
        { id: "name",         label: "Investment Name",     type: "text",   placeholder: "e.g. HDFC SIP, Axis FD", required: true },
        { id: "type",         label: "Type",               type: "select", options: ["Mutual Fund", "SIP", "ELSS", "Index Fund", "ETF", "FD", "RD", "PPF", "EPF", "VPF", "NPS", "NSC", "SSY", "SGB", "Gold ETF", "Digital Gold", "Stocks", "Bonds", "REIT", "Real Estate", "P2P Lending", "ULIP", "Savings", "Others"] },
        { id: "amount",       label: "Invested Amount (₹)", type: "number", placeholder: "Total amount invested", required: true },
        { id: "interestRate", label: "Expected Return (%)", type: "number", placeholder: "Annual return rate", step: "0.01" },
        { id: "frequency",    label: "Frequency",           type: "select", options: ["One-Time", "Monthly", "Quarterly", "Semi-Annual", "Annual"] },
        { id: "startDate",    label: "Start Date",          type: "date",   placeholder: "" },
        { id: "endDate",      label: "Maturity Date",       type: "date",   placeholder: "" },
        { id: "details",      label: "Notes",               type: "text",   placeholder: "Optional notes" }
    ],
    outflow: [
        { id: "name",      label: "Name",           type: "text",   placeholder: "e.g. Rent, LIC Premium", required: true },
        { id: "type",      label: "Type",           type: "select", options: ["Insurance", "Liability", "Savings", "Expenditure", "Investment", "Others"] },
        { id: "amount",    label: "Amount (₹)",     type: "number", placeholder: "0", required: true },
        { id: "frequency", label: "Frequency",      type: "select", options: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "One-Time"] },
        { id: "bankName",  label: "Bank Name",      type: "text",   placeholder: "e.g. HDFC, ICICI" },
        { id: "endDate",   label: "End Date",       type: "date",   placeholder: "" },
        { id: "details",   label: "Details",        type: "text",   placeholder: "Optional" }
    ],
    cards: [
        { id: "bankName",      label: "Bank/NBFC Name",      type: "text",   placeholder: "e.g. HDFC, ICICI", required: true },
        { id: "isPrimary",     label: "Primary Account",     type: "select", options: ["No", "Yes"] },
        { id: "accountPresent", label: "Account Present",    type: "select", options: ["Yes", "No"] },
        { id: "balance",       label: "Balance (₹)",         type: "number", placeholder: "0" },
        { id: "debitCardPresent", label: "Debit Card Present", type: "select", options: ["Yes", "No"] },
        { id: "creditCardPresent", label: "Credit Card Present", type: "select", options: ["Yes", "No"] },
        { id: "creditLimit",   label: "Credit Card Limit (₹)", type: "number", placeholder: "0" },
        { id: "purpose",       label: "Purpose of Use",      type: "select", options: ["Salary", "Expenditure", "Savings", "Investment", "Loan", "Others"] },
        { id: "purposeOther",  label: "Specify Purpose",     type: "text",   placeholder: "Custom purpose (if Others selected)", noTable: true },
        { id: "kycUpdated",   label: "Address/KYC Updated",  type: "select", options: ["Yes", "No"] },
        { id: "nomineeAdded",  label: "Nominee Added",       type: "select", options: ["Yes", "No"] }
    ],
    netWorth: [
        { id: "name",      label: "Asset/Liability Name", type: "text",   placeholder: "e.g. House, Car, Loan", required: true },
        { id: "type",      label: "Type",               type: "select", options: ["Asset", "Liability"] },
        { id: "value",     label: "Value Today (₹)",    type: "number", placeholder: "0", required: true },
        { id: "growthRate", label: "Expected Annual Growth (%)", type: "number", placeholder: "0", step: "0.01" },
        { id: "details",   label: "Details",            type: "text",   placeholder: "Optional" }
    ],
    taxPlan: [
        { id: "name",      label: "Tax Saving Item",     type: "text",   placeholder: "e.g. PPF, ELSS, 80C", required: true },
        { id: "amount",   label: "Amount Invested (₹)", type: "number", placeholder: "0", required: true },
        { id: "section",  label: "Section",             type: "select", options: ["80C", "80D", "80CCD(1B)", "80CCD(2)", "80E", "80EEA", "80G", "24(b)", "80TTA", "HRA", "Others"] },
        { id: "details",   label: "Details",            type: "text",   placeholder: "Optional" }
    ],
    // Salary Details for Tax Planning (Optional - for HRA exemption and comprehensive tax calculation)
    salaryDetails: [
        { id: "basicSalary", label: "Basic Salary (Annual ₹)", type: "number", placeholder: "Annual basic salary" },
        { id: "hraReceived", label: "HRA Received (Annual ₹)", type: "number", placeholder: "Annual HRA received" },
        { id: "rentPaid", label: "Rent Paid (Annual ₹)", type: "number", placeholder: "Annual rent paid" },
        { id: "isMetroCity", label: "Metro City", type: "select", options: ["yes", "no"] },
        { id: "specialAllowance", label: "Special Allowance (Annual ₹)", type: "number", placeholder: "Annual special allowance" },
        { id: "lta", label: "LTA (Annual ₹)", type: "number", placeholder: "Annual leave travel allowance" },
        { id: "otherAllowances", label: "Other Allowances (Annual ₹)", type: "number", placeholder: "Annual other allowances" }
    ],
    // House Property Details for Tax Planning
    houseProperty: [
        { id: "isSelfOccupied", label: "Self Occupied", type: "select", options: ["yes", "no"] },
        { id: "rentalIncome", label: "Rental Income (Annual ₹)", type: "number", placeholder: "Annual rental income" },
        { id: "homeLoanInterest", label: "Home Loan Interest (Annual ₹)", type: "number", placeholder: "Annual home loan interest" },
        { id: "municipalTaxes", label: "Municipal Taxes (Annual ₹)", type: "number", placeholder: "Annual municipal taxes" }
    ],
    gifts: [
        { id: "name",      label: "Gift Type",           type: "select",   options: ["Cash", "Gold", "Silver", "Gift"], required: true },
        { id: "transactionType", label: "Transaction Type", type: "select", options: ["Given", "Taken"] },
        { id: "category",  label: "Category",            type: "select", options: ["Fixed Every Year", "On Demand"] },
        { id: "relativeName", label: "Relative Name",    type: "text",   placeholder: "e.g. John Doe", required: true },
        { id: "occasion",  label: "Occasion",             type: "text",   placeholder: "e.g. Birthday, Wedding, Anniversary" },
        { id: "amount",    label: "Amount (₹)",          type: "number", placeholder: "0" },
        { id: "date",      label: "Gift Date",            type: "date",   placeholder: "" },
        { id: "details",   label: "Details",              type: "text",   placeholder: "Optional" }
    ],
    emergencyFund: [
        { id: "currentFund", label: "Current Emergency Fund (₹)", type: "number", placeholder: "0", required: true },
        { id: "details",     label: "Details",               type: "text",   placeholder: "Optional" }
    ],
    insurance: [
        { id: "name",          label: "Policy Name",          type: "text",   placeholder: "e.g. LIC Term Plan, Star Health", required: true },
        { id: "policyType",    label: "Policy Type",          type: "select", options: ["Term Life", "Whole Life", "Health", "Vehicle", "Home", "Travel", "Critical Illness", "Personal Accident", "Others"] },
        { id: "provider",      label: "Insurance Provider",   type: "text",   placeholder: "e.g. LIC, HDFC Life, Star Health" },
        { id: "policyNumber",  label: "Policy Number",        type: "text",   placeholder: "Policy/Certificate number" },
        { id: "sumAssured",    label: "Sum Assured (₹)",      type: "number", placeholder: "Coverage amount" },
        { id: "premiumAmount", label: "Premium Amount (₹)",   type: "number", placeholder: "0 if no current premium" },
        { id: "premiumFrequency", label: "Premium Frequency", type: "select", options: ["Monthly", "Quarterly", "Half-Yearly", "Annual", "None (Paid Up)"] },
        { id: "startDate",     label: "Policy Start Date",    type: "date",   placeholder: "" },
        { id: "endDate",       label: "Policy End Date",      type: "date",   placeholder: "" },
        { id: "nominee",       label: "Nominee",              type: "text",   placeholder: "Nominee name" },
        { id: "details",       label: "Notes",                type: "text",   placeholder: "Optional notes" }
    ]
};

// ── Monthly Budget Category Fields ───────────────────────────────────────────
const MONTHLY_BUDGET_CATEGORIES = {
    inflow: [
        { id: "primaryIncome", label: "Primary Income (Salary credited this month)", type: "number", description: "Your salary / primary income" },
        { id: "secondaryIncome", label: "Secondary Income", type: "number", description: "Additional income from other sources" },
        { id: "borrowing", label: "Borrowing/Money Back", type: "number", description: "Money borrowed or received back" },
        { id: "interest", label: "Interest/Dividend", type: "number", description: "Interest from savings, dividends, etc." },
        { id: "othersInflow", label: "Others", type: "number", description: "Other income sources" }
    ],
    outflow: [
        { id: "loanEMI", label: "Auto-calculated Liabilities", type: "number", description: "Total of all loan EMIs from Outflow tab" },
        { id: "insurancePremiums", label: "Auto-calculated Insurance Premiums", type: "number", description: "Total of all insurance premiums from Insurance tab" },
        { id: "fixedSaving", label: "Auto-calculated Fixed Saving", type: "number", description: "Total of all fixed savings from Outflow tab" },
        { id: "fixedInvestment", label: "Auto-calculated Fixed Investment", type: "number", description: "Total of all fixed investments from Inflow tab" },
        { id: "fixedExpenditure", label: "Auto-calculated Fixed Expenditure", type: "number", description: "Total of all monthly frequency outflows" },
        { id: "variableExpenditure", label: "Auto-calculated Variable Expenditure", type: "number", description: "Budget for variable expenses this month" },
        { id: "creditCardOutstanding", label: "Previous Month CC Bill (Unpaid)", type: "number", description: "Credit card balance from last month" },
        { id: "midMonthCCOutstanding", label: "Current Month CC Spending (from Quick Update)", type: "number", description: "Credit card spending this month" },
        { id: "debtRepayment", label: "Debt Repayment / Lending", type: "number", description: "Debt payments or money lent to others" },
        { id: "utilityBills", label: "Utility Bills (electricity, water, gas, internet)", type: "number", description: "Monthly utility and service bills" },
        { id: "familyExpenditure", label: "Family Expenditure (groceries, household)", type: "number", description: "Groceries, household items, and family expenses" },
        { id: "miscExpenses", label: "Miscellaneous Expenses", type: "number", description: "Other miscellaneous expenses" },
        { id: "fixedOthers", label: "Auto-calculated Fixed Others", type: "number", description: "Other fixed monthly expenses" }
    ],
    investing: [
        { id: "onetimeSaving", label: "On-Demand Saving", type: "number", hasDescription: true, description: "Ad-hoc savings for the month" },
        { id: "onetimeInvestment", label: "On-Demand Investment", type: "number", hasDescription: true, description: "One-time investments this month" },
        { id: "ondemandExpenditure", label: "On-Demand Expenditure", type: "number", hasDescription: true, description: "Unexpected or planned extra expenses" },
        { id: "ondemandLiability", label: "On-Demand Liability", type: "number", hasDescription: true, description: "One-time debt or liability this month" }
    ]
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const authScreen        = document.getElementById("authScreen");
const appScreen         = document.getElementById("appScreen");
const authForm          = document.getElementById("authForm");
const authNameInput     = document.getElementById("authName");
const authDobInput      = document.getElementById("authDob");
const authLocationInput = document.getElementById("authLocation");
const authCustomLocationInput = document.getElementById("authCustomLocation");
const authEmailInput    = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authSubmitBtn     = document.getElementById("authSubmitBtn");
const authToggleBtn     = document.getElementById("authToggleBtn");
const authSwitchText    = document.getElementById("authSwitchText");
const authError         = document.getElementById("authError");
const nameField         = document.getElementById("nameField");
const dobField          = document.getElementById("dobField");
const locationField     = document.getElementById("locationField");
const customLocationField = document.getElementById("customLocationField");
const logoutBtn         = document.getElementById("logoutBtn");
const notificationBtn   = document.getElementById("notificationBtn");
const notificationBadge = document.getElementById("notificationBadge");
const themeToggle       = document.getElementById("themeToggle");
const tabMenuToggle     = document.getElementById("tabMenuToggle");
const tabList           = document.getElementById("tabList");
const mobileActiveTab   = document.getElementById("mobileActiveTab");
const userEmailDisplay  = document.getElementById("userEmailDisplay");
const tabBar            = document.getElementById("tabBar");

// Ensure the auth form starts in sign-in mode.
nameField.hidden = true;
dobField.hidden = true;
locationField.hidden = true;
customLocationField.hidden = true;
authNameInput.required = false;
authNameInput.value = "";

window.addEventListener("error", event => {
    const message = event.error ? event.error.message : event.message || "Unknown error";
    logger.error('Global script error', {
        message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
    });
    showToast('An unexpected error occurred. Please refresh the page.', { variant: 'error', duration: 7000 });
    console.error("Global script error:", event.error || event.message, event);
});

window.addEventListener("unhandledrejection", event => {
    const reason = event.reason ? (event.reason.message || JSON.stringify(event.reason)) : "Unknown promise rejection";
    logger.error('Unhandled rejection', { reason });
    showToast(`Unexpected error: ${reason}`, { variant: 'error', duration: 7000 });
    console.error("Unhandled rejection:", event.reason);
});


// Ensure the sign-in form starts in sign-in mode.
nameField.hidden = true;
dobField.hidden = true;
locationField.hidden = true;
customLocationField.hidden = true;
authNameInput.required = false;
const activeSubtitle    = document.getElementById("activeSubtitle");
const entryForm         = document.getElementById("entryForm");
const dynamicFields     = document.getElementById("dynamicFields");
const tableHead         = document.getElementById("tableHead");
const entryRows         = document.getElementById("entryRows");
const emptyState        = document.getElementById("emptyState");
const searchInput       = document.getElementById("searchInput");
const exportBtn         = document.getElementById("exportBtn");
const clearTabButton    = document.getElementById("clearTab");
const resetAllDataButton = document.getElementById("resetAllData");

// Monthly Budget specific refs
const monthlyBudgetUI   = document.getElementById("monthlyBudgetUI");
const standardUI        = document.getElementById("standardUI");
const prevMonthBtn      = document.getElementById("prevMonth");
const nextMonthBtn      = document.getElementById("nextMonth");
const toggleBudgetView  = document.getElementById("toggleBudgetView");
const currentMonthDisplay = document.getElementById("currentMonthDisplay");
const budgetStatus      = document.getElementById("budgetStatus");
const inflowFields      = document.getElementById("inflowFields");
const outflowFields     = document.getElementById("outflowFields");
const investingFields   = document.getElementById("investingFields");
// monthEndBalance removed – primary account balance is used instead

// Annual summary refs
const annualSummarySection = document.getElementById("annualSummarySection");
const monthlyViewSection   = document.getElementById("monthlyViewSection");
const annualTotalIncome    = document.getElementById("annualTotalIncome");
const annualTotalExpenditure = document.getElementById("annualTotalExpenditure");
const annualTotalSavings   = document.getElementById("annualTotalSavings");
const annualTotalInvestment = document.getElementById("annualTotalInvestment");
const annualTotalLiability = document.getElementById("annualTotalLiability");
const annualTotalInsurance = document.getElementById("annualTotalInsurance");
const annualTotalOther = document.getElementById("annualTotalOther");
const avgMonthlyIncome     = document.getElementById("avgMonthlyIncome");
const avgMonthlyExpenditure = document.getElementById("avgMonthlyExpenditure");
const avgMonthlySavings = document.getElementById("avgMonthlySavings");
const avgMonthlyInvestment = document.getElementById("avgMonthlyInvestment");
const avgMonthlyLiability = document.getElementById("avgMonthlyLiability");
const avgMonthlyInsurance = document.getElementById("avgMonthlyInsurance");
const avgMonthlyOther = document.getElementById("avgMonthlyOther");
const annualMonthsList     = document.getElementById("annualMonthsList");
const annualPieChartCanvas = document.getElementById("annualPieChart");
const pieCanvas        = document.getElementById("pieChart");
const toggleBudgetEdit  = document.getElementById("toggleBudgetEdit");
const budgetPreview     = document.getElementById("budgetPreview");
const budgetEdit        = document.getElementById("budgetEdit");
const inflowPreview     = document.getElementById("inflowPreview");
const outflowPreview    = document.getElementById("outflowPreview");
const investingPreview  = document.getElementById("investingPreview");

// Financial Goal refs
const financialGoalUI   = document.getElementById("financialGoalUI");
const toggleGoalEdit    = document.getElementById("toggleGoalEdit");
const goalPreview       = document.getElementById("goalPreview");
const goalEdit          = document.getElementById("goalEdit");
const goalsList         = document.getElementById("goalsList");
const goalForm          = document.getElementById("goalForm");
const goalDynamicFields = document.getElementById("goalDynamicFields");
const goalTableHead     = document.getElementById("goalTableHead");
const goalTableBody     = document.getElementById("goalTableBody");
const goalEmptyState    = document.getElementById("goalEmptyState");

// Expense Tracking refs
const expenseTrackingUI = document.getElementById("expenseTrackingUI");
const prevExpenseMonthBtn = document.getElementById("prevExpenseMonth");
const nextExpenseMonthBtn = document.getElementById("nextExpenseMonth");
const currentExpenseMonthDisplay = document.getElementById("currentExpenseMonthDisplay");
const toggleExpenseEdit = document.getElementById("toggleExpenseEdit");
const expensePreview = document.getElementById("expensePreview");
const expenseEdit = document.getElementById("expenseEdit");
const expenseForm = document.getElementById("expenseForm");
const expenseList = document.getElementById("expenseList");
const expenseTableBody = document.getElementById("expenseTableBody");
const expensePieChartCanvas = document.getElementById("expensePieChart");

// Inflow refs
const inflowUI             = document.getElementById("inflowUI");
const toggleInflowEdit     = document.getElementById("toggleInflowEdit");
const inflowTabPreview     = document.getElementById("inflowTabPreview");
const inflowTabEdit        = document.getElementById("inflowTabEdit");
const inflowList           = document.getElementById("inflowList");
const inflowForm           = document.getElementById("inflowForm");
const inflowDynamicFields  = document.getElementById("inflowDynamicFields");
const inflowTableHead      = document.getElementById("inflowTableHead");
const inflowTableBody      = document.getElementById("inflowTableBody");
const inflowEmptyState     = document.getElementById("inflowEmptyState");
const inflowBarChartCanvas = document.getElementById("inflowBarChart");

// Outflow refs
const outflowUI             = document.getElementById("outflowUI");
const toggleOutflowEdit     = document.getElementById("toggleOutflowEdit");
const outflowTabPreview     = document.getElementById("outflowTabPreview");
const outflowTabEdit        = document.getElementById("outflowTabEdit");
const outflowList           = document.getElementById("outflowList");
const outflowForm           = document.getElementById("outflowForm");
const outflowDynamicFields  = document.getElementById("outflowDynamicFields");
const outflowTableHead      = document.getElementById("outflowTableHead");
const outflowTableBody      = document.getElementById("outflowTableBody");
const outflowEmptyState     = document.getElementById("outflowEmptyState");
const outflowBankChartCanvas = document.getElementById("outflowBankChart");
const outflowTypeChartCanvas = document.getElementById("outflowTypeChart");
const monthlyIncomeInput   = document.getElementById("monthlyIncomeInput");

// Cards refs
const cardsUI           = document.getElementById("cardsUI");
const toggleCardEdit    = document.getElementById("toggleCardEdit");
const cardPreview       = document.getElementById("cardPreview");
const cardEdit          = document.getElementById("cardEdit");
const cardsList         = document.getElementById("cardsList");
const cardForm          = document.getElementById("cardForm");
const cardDynamicFields = document.getElementById("cardDynamicFields");
const cardTableHead     = document.getElementById("cardTableHead");
const cardTableBody     = document.getElementById("cardTableBody");
const cardEmptyState    = document.getElementById("cardEmptyState");
const accountsChartCanvas = document.getElementById("accountsChart");

// Net Worth refs
const netWorthUI        = document.getElementById("netWorthUI");
const toggleNetWorthEdit = document.getElementById("toggleNetWorthEdit");
// currentAgeInput removed – age computed from dateOfBirth
const currentAgeDisplay = document.getElementById("currentAgeDisplay");
const currentLocationDisplay = document.getElementById("currentLocationDisplay");
const netWorthPreview  = document.getElementById("netWorthPreview");
const netWorthEdit     = document.getElementById("netWorthEdit");
const assetsList       = document.getElementById("assetsList");
const liabilitiesList  = document.getElementById("liabilitiesList");
const netWorthForm     = document.getElementById("netWorthForm");
const netWorthDynamicFields = document.getElementById("netWorthDynamicFields");
const netWorthTableHead = document.getElementById("netWorthTableHead");
const netWorthTableBody = document.getElementById("netWorthTableBody");
const netWorthEmptyState = document.getElementById("netWorthEmptyState");
const netWorthProjectionChartCanvas = document.getElementById("netWorthProjectionChart");

// Tax Plan refs
let taxPlanUI = null;
let toggleTaxPlanEdit = null;
let taxRegimeSelect = null;
let financialYearSelect = null;
let taxPlanPreview = null;
let taxPlanEdit = null;
let taxDeductionsList = null;
let taxBreakdown = null;
let salaryDetailsList = null;
let housePropertyList = null;
let taxPlanForm = null;
let salaryDetailsForm = null;
let housePropertyForm = null;
let taxPlanDynamicFields = null;
let taxPlanTableHead = null;
let taxPlanTableBody = null;
let taxPlanEmptyState = null;
let taxSavingBanner = null;
let taxDeductionsChartCanvas = null;

// Initialize tax plan elements after DOM is loaded
function initTaxPlanElements() {
    taxPlanUI = document.getElementById("taxPlanUI");
    toggleTaxPlanEdit = document.getElementById("toggleTaxPlanEdit");
    taxRegimeSelect = document.getElementById("taxRegime");
    financialYearSelect = document.getElementById("financialYear");
    taxPlanPreview = document.getElementById("taxPlanPreview");
    taxPlanEdit = document.getElementById("taxPlanEdit");
    taxDeductionsList = document.getElementById("taxDeductionsList");
    taxBreakdown = document.getElementById("taxBreakdown");
    salaryDetailsList = document.getElementById("salaryDetailsList");
    housePropertyList = document.getElementById("housePropertyList");
    taxPlanForm = document.getElementById("taxPlanForm");
    salaryDetailsForm = document.getElementById("salaryDetailsForm");
    housePropertyForm = document.getElementById("housePropertyForm");
    taxPlanDynamicFields = document.getElementById("taxPlanDynamicFields");
    taxPlanTableHead = document.getElementById("taxPlanTableHead");
    taxPlanTableBody = document.getElementById("taxPlanTableBody");
    taxPlanEmptyState = document.getElementById("taxPlanEmptyState");
    taxSavingBanner = document.getElementById("taxSavingBanner");
    taxDeductionsChartCanvas = document.getElementById("taxDeductionsChart");
}

// Gifts refs
const giftsUI          = document.getElementById("giftsUI");
const toggleGiftsEdit  = document.getElementById("toggleGiftsEdit");
const giftsPreview     = document.getElementById("giftsPreview");
const giftsEdit        = document.getElementById("giftsEdit");
const giftsList        = document.getElementById("giftsList");
const giftsForm        = document.getElementById("giftsForm");
const giftsDynamicFields = document.getElementById("giftsDynamicFields");
const giftsTableHead   = document.getElementById("giftsTableHead");
const giftsTableBody   = document.getElementById("giftsTableBody");
const giftsEmptyState  = document.getElementById("giftsEmptyState");
const giftsMonthlyChartCanvas = document.getElementById("giftsMonthlyChart");

// Emergency Fund refs
const emergencyFundUI          = document.getElementById("emergencyFundUI");
const toggleEmergencyFundEdit = document.getElementById("toggleEmergencyFundEdit");
const currentEmergencyFundDisplay = document.getElementById("currentEmergencyFundDisplay");
const emergencyFundPreview      = document.getElementById("emergencyFundPreview");
const emergencyFundEdit         = document.getElementById("emergencyFundEdit");
const emergencyFundForm        = document.getElementById("emergencyFundForm");
const emergencyFundDynamicFields = document.getElementById("emergencyFundDynamicFields");

// Insurance refs
const insuranceUI             = document.getElementById("insuranceUI");
const toggleInsuranceEdit     = document.getElementById("toggleInsuranceEdit");
const insuranceTabPreview     = document.getElementById("insuranceTabPreview");
const insuranceTabEdit        = document.getElementById("insuranceTabEdit");
const insuranceList           = document.getElementById("insuranceList");
const insuranceForm           = document.getElementById("insuranceForm");
const insuranceDynamicFields  = document.getElementById("insuranceDynamicFields");
const insuranceTableHead      = document.getElementById("insuranceTableHead");
const insuranceTableBody      = document.getElementById("insuranceTableBody");
const insuranceEmptyState     = document.getElementById("insuranceEmptyState");

const fieldInputs = {};

// ── App state ─────────────────────────────────────────────────────────────────
let isRegisterMode = false;
let currentUser    = null;
let activeTabId    = "dashboard";
let appData        = { tabData: {}, customTabs: [], userName: "", monthlyBudgetData: {}, expenseTrackingData: {}, taxData: {} };
let firestoreUnsub = null;
let saveTimer      = null;
let currentMonth    = new Date(); // For monthly budget navigation
let currentExpenseMonth = new Date(); // For expense tracking navigation
// Ensure expense tracking month is not in the future and not before onboarding date
const today = new Date();
const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const expenseMonthKey = `${currentExpenseMonth.getFullYear()}-${String(currentExpenseMonth.getMonth() + 1).padStart(2, '0')}`;
if (expenseMonthKey > currentMonthKey) {
    currentExpenseMonth = new Date(); // Reset to current month if it's in the future
}
// Check onboarding date after appData is loaded
const od = appData.onboardingDate;
if (od) {
    const onboardingDate = new Date(od);
    const earliest = new Date(onboardingDate.getFullYear(), onboardingDate.getMonth(), 1);
    const earliestKey = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`;
    if (expenseMonthKey < earliestKey) {
        currentExpenseMonth = earliest; // Reset to onboarding date if it's before
    }
}
let pieChart       = null; // Chart.js instance
let annualPieChart = null;
let expensePieChart = null; // Expense tracking pie chart
let expensePieChartResizeHandler = null; // Store resize handler
let accountsChart = null; // Accounts balance & credit limit chart
let taxDeductionsChart = null; // Tax deductions chart
let isBudgetEditMode = false;
let isAnnualBudgetView = false;

function renderBudgetViewToggle() {
    if (!toggleBudgetView) return;
    const switchToAnnual = !isAnnualBudgetView;
    const label = switchToAnnual ? "Annual" : "Monthly";
    const icon = switchToAnnual ? "receipt" : "calendar";

    toggleBudgetView.setAttribute("aria-pressed", String(isAnnualBudgetView));
    toggleBudgetView.setAttribute("aria-label", `Switch to ${switchToAnnual ? "annual" : "monthly"} budget view`);
    toggleBudgetView.innerHTML = `<span class="view-toggle-icon" aria-hidden="true">${iconSvg(icon, "btn-action-svg")}</span><span class="btn-text">${label}</span>`;
}

renderBudgetViewToggle();
let isGoalEditMode  = false;
let isInflowEditMode = false;
let isOutflowEditMode = false;
let isCardEditMode = false;
let isExpenseEditMode = false;
let isNetWorthEditMode = false;
let isTaxPlanEditMode = false;
let isGiftsEditMode = false;
let isEmergencyFundEditMode = false;
let isInsuranceEditMode = false;
let activeInvestmentView = "all"; // all | existing | monthly | portfolio
let outflowBankChart = null;
let outflowTypeChart = null;
let inflowBarChart   = null;
let netWorthProjectionChart = null;
let giftsMonthlyChart = null;
let localWritePending = false;
let budgetEditSnapshot = null;

// ── Sort/filter state for list views ─────────────────────────────────────────
// Load list sort/filter state from localStorage
const savedListSortFilter = JSON.parse(localStorage.getItem('listSortFilter') || '{}');
const listSortFilter = {
    financialGoal: { sortBy: "", sortDir: "asc", filters: {}, searchText: "", hideCompleted: false, ...savedListSortFilter.financialGoal },
    inflow:        { sortBy: "", sortDir: "asc", filters: {}, searchText: "", ...savedListSortFilter.inflow },
    outflow:       { sortBy: "", sortDir: "asc", filters: {}, searchText: "", ...savedListSortFilter.outflow },
    gifts:         { sortBy: "", sortDir: "asc", filters: {}, searchText: "", ...savedListSortFilter.gifts },
    insurance:     { sortBy: "", sortDir: "asc", filters: {}, searchText: "", ...savedListSortFilter.insurance },
    expenseTracking: { sortBy: "amount", sortDir: "desc", filters: {}, searchText: "", ...savedListSortFilter.expenseTracking }
};

// Save list sort/filter state to localStorage
function saveListSortFilter() {
    localStorage.setItem('listSortFilter', JSON.stringify(listSortFilter));
}

const editingEntryIds = {
    financialGoal: null,
    inflow: null,
    outflow: null,
    cards: null,
    netWorth: null,
    taxPlan: null,
    gifts: null,
    standard: null,
    insurance: null,
};

const sectionConfig = {
    financialGoal: { prefix: "goal", form: () => goalForm, submitText: "Save Goal", addText: "Add Goal", render: () => renderFinancialGoal() },
    inflow: { prefix: "inflow", form: () => inflowForm, submitText: "Save Inflow", addText: "Add Inflow", render: () => renderInflow() },
    outflow: { prefix: "outflow", form: () => outflowForm, submitText: "Save Outflow", addText: "Add Outflow", render: () => renderOutflow() },
    cards: { prefix: "card", form: () => cardForm, submitText: "Save Account", addText: "Add Account", render: () => renderCards() },
    expenseTracking: { prefix: "expense", form: () => expenseForm, submitText: "Save Expense", addText: "Add Expense", render: () => renderExpenseTracking() },
    netWorth: { prefix: "netWorth", form: () => netWorthForm, submitText: "Save Asset/Liability", addText: "Add Asset/Liability", render: () => renderNetWorth() },
    taxPlan: { prefix: "taxPlan", form: () => taxPlanForm, submitText: "Save Tax Item", addText: "Add Tax Saving Item", render: () => renderTaxPlan() },
    gifts: { prefix: "gifts", form: () => giftsForm, submitText: "Save Gift", addText: "Add Gift", render: () => renderGifts() },
    insurance: { prefix: "insurance", form: () => insuranceForm, submitText: "Save Policy", addText: "Add Policy", render: () => renderInsurance() },
    standard: { prefix: "field", form: () => entryForm, submitText: "Save", addText: "Add", render: () => render() },
};

// ── Firebase handles ──────────────────────────────────────────────────────────
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Handle window resize for mobile/desktop name display ───────────────────
window.addEventListener('resize', () => {
    if (currentUser && appData) {
        const fullName = appData.userName || currentUser.email;
        const isMobile = window.innerWidth < 768;
        const displayName = isMobile && fullName.includes(' ') 
            ? fullName.split(' ')[0] 
            : fullName;
        userEmailDisplay.textContent = displayName;
    }
});

// ── Auth state listener ───────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    hideLoadingOverlay();
    if (user) {
        currentUser = user;
        logger.setUserId(user.uid);
        logger.info('User signed in', { uid: user.uid, email: user.email });
        authScreen.hidden = true;
        // Initialize tax plan elements and event listeners
        initTaxPlanElements();
        initTaxPlanEventListeners();
        // Show app screen immediately, then load data in background
        appScreen.hidden = false;
        startListening();
    } else {
        logger.info('User signed out');
        logger.setUserId(null);
        currentUser = null;
        appScreen.hidden  = true;
        authScreen.hidden = false;
        stopListening();
        isRegisterMode = false;
        nameField.hidden = true;
        dobField.hidden = true;
        locationField.hidden = true;
        customLocationField.hidden = true;
        authNameInput.required = false;
        authNameInput.value = "";
        authDobInput.value = "";
        authLocationInput.value = "";
        authCustomLocationInput.value = "";
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = "Sign In";
        authToggleBtn.textContent = "Register";
        authSwitchText.textContent = "Don't have an account?";
        setAuthError("");
    }
});

// ── Auth form ─────────────────────────────────────────────────────────────────
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotPasswordRow = document.getElementById("forgotPasswordRow");

authToggleBtn.addEventListener("click", () => {
    isRegisterMode = !isRegisterMode;
    nameField.hidden = !isRegisterMode;
    dobField.hidden = !isRegisterMode;
    locationField.hidden = !isRegisterMode;
    customLocationField.hidden = !isRegisterMode;
    authNameInput.required = isRegisterMode;
    if (forgotPasswordRow) forgotPasswordRow.hidden = isRegisterMode;
    if (!isRegisterMode) {
        authNameInput.value = "";
        authDobInput.value = "";
        authLocationInput.value = "";
        authCustomLocationInput.value = "";
    }
    authSubmitBtn.textContent  = isRegisterMode ? "Create Account"           : "Sign In";
    authToggleBtn.textContent  = isRegisterMode ? "Sign In"                  : "Register";
    authSwitchText.textContent = isRegisterMode ? "Already have an account?" : "Don't have an account?";
    setAuthError("");
});

// Handle location dropdown change to show/hide custom location field
authLocationInput.addEventListener("change", () => {
    if (authLocationInput.value === "Other") {
        customLocationField.hidden = false;
        authCustomLocationInput.required = true;
    } else {
        customLocationField.hidden = true;
        authCustomLocationInput.required = false;
        authCustomLocationInput.value = "";
    }
});

// ── Forgot Password (P1) ────────────────────────────────────────────────────
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
        const email = authEmailInput.value.trim();
        if (!email) {
            setAuthError("Please enter your email address first, then click 'Forgot password?'");
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
            showToast(`Password reset email sent to ${email}. Check your inbox.`, { variant: 'success', duration: 5000 });
            logger.info('Password reset email sent', { email });
        } catch (err) {
            const msg = err.code === 'auth/user-not-found' ? 'No account found with this email.'
                      : err.code === 'auth/invalid-email' ? 'Please enter a valid email address.'
                      : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
                      : 'Failed to send reset email: ' + err.message;
            setAuthError(msg);
            logger.warning('Password reset failed', { email, error: err.code });
        }
    });
}

// Handle location dropdown change to show/hide custom location field
authLocationInput.addEventListener("change", () => {
    const customLocationField = document.getElementById("customLocationField");
    if (authLocationInput.value === "Other") {
        customLocationField.hidden = false;
        authCustomLocationInput.required = true;
    } else {
        customLocationField.hidden = true;
        authCustomLocationInput.required = false;
        authCustomLocationInput.value = "";
    }
});

authForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email    = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    const name     = authNameInput.value.trim();
    const dob      = authDobInput.value;
    const location = authLocationInput.value;
    const customLocation = authCustomLocationInput.value.trim();
    
    // Handle custom location
    let finalLocation = location;
    if (location === "Other") {
        if (!customLocation) {
            setAuthError("Please enter your city when 'Other' is selected.");
            return;
        }
        finalLocation = customLocation;
    }
    
    // P1: Input validation improvements
    if (!email || !password) { setAuthError("Please fill in all required fields."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setAuthError("Please enter a valid email address."); return; }
    if (password.length < 6) { setAuthError("Password must be at least 6 characters."); return; }
    if (isRegisterMode && !name) { setAuthError("Please enter your name."); return; }
    if (isRegisterMode && name.length < 2) { setAuthError("Name must be at least 2 characters."); return; }
    if (isRegisterMode && !finalLocation) { setAuthError("Please select or enter your location."); return; }
    setAuthError("");
    authSubmitBtn.disabled    = true;
    authSubmitBtn.textContent = "Please wait…";
    try {
        if (isRegisterMode) {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection("users").doc(cred.user.uid).set({
                tabData: {},
                customTabs: [],
                userName: name,
                dateOfBirth: dob,
                userLocation: finalLocation,
                monthlyBudgetData: {},
                onboardingComplete: false,
                onboardingDate: new Date().toISOString().slice(0, 10),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Manually sign in to ensure auth state is properly triggered
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (err) {
        console.error("Firebase auth error:", err);
        logger.error('Authentication failed', { mode: isRegisterMode ? 'register' : 'login', errorCode: err.code, message: err.message });
        const message = friendlyError(err.code);
        const display = err.code
            ? `${err.code}: ${message}`
            : err.message || message || JSON.stringify(err);
        setAuthError(display);
        authSubmitBtn.disabled    = false;
        authSubmitBtn.textContent = isRegisterMode ? "Create Account" : "Sign In";
    }
});

logoutBtn.addEventListener("click", () => {
    logger.info('User initiated sign out');
    auth.signOut();
});

// ── Notification System ───────────────────────────────────────────────────────
let notificationState = JSON.parse(localStorage.getItem('notificationState') || '{}');
let notificationDismissTime = 10000; // 10 seconds auto-dismiss
let notificationTriggers = []; // Store trigger functions

function updateNotificationBadge(count) {
    if (!notificationBadge) {
        console.log('Notification badge element not found');
        return;
    }
    
    // Show badge if there are unread notifications
    const unreadCount = count - (notificationState.viewedCount || 0);
    console.log('Updating badge - total:', count, 'viewed:', notificationState.viewedCount, 'unread:', unreadCount);
    
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.hidden = false;
        console.log('Badge shown with count:', unreadCount);
    } else {
        notificationBadge.hidden = true;
        console.log('Badge hidden');
    }
}

function getNotificationState() {
    const today = new Date().toDateString();
    if (notificationState.date !== today) {
        // Reset for new day
        notificationState = {
            date: today,
            viewedCount: 0,
            cleared: false,
            lastAlertsHash: null,
            autoShownOnLoad: false
        };
        localStorage.setItem('notificationState', JSON.stringify(notificationState));
    }
    return notificationState;
}

// ── Notification Triggers ─────────────────────────────────────────────────────
function registerNotificationTrigger(triggerFn) {
    notificationTriggers.push(triggerFn);
}

function checkNotificationTriggers(options = {}) {
    const { forceShow = false, isUserAction = false } = options;
    const alerts = [];
    
    // Run all registered triggers
    notificationTriggers.forEach(trigger => {
        try {
            const triggerAlerts = trigger();
            if (triggerAlerts && triggerAlerts.length > 0) {
                alerts.push(...triggerAlerts);
            }
        } catch (err) {
            console.error('Notification trigger error:', err);
        }
    });
    
    console.log('[Notification] Generated alerts:', alerts.length);
    
    // Remove duplicates
    const uniqueAlerts = [];
    const seen = new Set();
    alerts.forEach(alert => {
        const key = `${alert.type}-${alert.message}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueAlerts.push(alert);
        }
    });
    
    // Calculate hash of current alerts
    const alertsHash = JSON.stringify(uniqueAlerts);
    const state = getNotificationState();
    
    console.log('[Notification] State check - cleared:', state.cleared, 'lastHash:', state.lastAlertsHash === alertsHash, 'userAction:', isUserAction);
    
    // Determine if we should update
    // Always update if: user action, was cleared, alerts changed, or no alerts
    // Also update on page load if alerts exist and weren't cleared (to persist notifications)
    const shouldUpdate = isUserAction || 
                        state.cleared || 
                        state.lastAlertsHash !== alertsHash ||
                        uniqueAlerts.length === 0 ||
                        (!isUserAction && uniqueAlerts.length > 0 && !state.cleared);
    
    console.log('[Notification] shouldUpdate:', shouldUpdate);
    
    if (shouldUpdate) {
        // Update state
        state.lastAlertsHash = alertsHash;
        state.cleared = false; // Reset cleared flag when updating
        // Don't reset viewedCount - let badge persist until manually cleared
        localStorage.setItem('notificationState', JSON.stringify(state));
        
        // Update alerts and badge
        window.currentAlerts = uniqueAlerts;
        updateNotificationBadge(uniqueAlerts.length);
        console.log('[Notification] Badge updated with count:', uniqueAlerts.length);
        
        // Auto-show popup on first load only (not on user actions)
        if (!state.autoShownOnLoad && !isUserAction && uniqueAlerts.length > 0) {
            state.autoShownOnLoad = true;
            // Don't mark as viewed on auto-show - let badge persist
            localStorage.setItem('notificationState', JSON.stringify(state));
            setTimeout(() => {
                showNotificationPopup(uniqueAlerts);
            }, 2000);
        } else if (forceShow && uniqueAlerts.length > 0) {
            // Force show if explicitly requested
            showNotificationPopup(uniqueAlerts);
        }
    } else {
        console.log('[Notification] No changes detected, skipping update');
    }
}

// Register default notification triggers
registerNotificationTrigger(() => {
    const alerts = [];
    const now = new Date();
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};
    console.log('[Notification Budget Trigger] Month key:', monthKey, 'Month data:', monthData);
    
    // Over budget trigger
    const inflowTotal = Object.values(monthData.inflow || {}).reduce((s, v) => s + Number(v || 0), 0);
    const allOutflows = (appData.tabData || {}).outflow || [];
    let fixedMonthlyOutflow = 0;
    allOutflows.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = freq === "Monthly" ? amount : freq === "Quarterly" ? amount / 3 : freq === "Semi-Annual" ? amount / 6 : freq === "Annual" ? amount / 12 : amount;
        fixedMonthlyOutflow += monthlyAmt;
    });
    const variableExp = Number(monthData.outflow?.variableExpenditure || 0);
    const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    const totalExpenses = variableExp + midMonthCC;
    const budgetBalance = inflowTotal - fixedMonthlyOutflow - totalExpenses;
    console.log('[Notification Budget Trigger] Inflow:', inflowTotal, 'Fixed outflow:', fixedMonthlyOutflow, 'Total expenses:', totalExpenses, 'Balance:', budgetBalance);
    
    if (budgetBalance < 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Over budget by ${formatMoney(Math.abs(budgetBalance))} this month`,
            action: 'monthlyBudget'
        });
    }
    
    // Emergency fund trigger
    const emergencyFund = Number(monthData.inflow?.emergencyFund || 0);
    const idealEmergencyFund = fixedMonthlyOutflow * 6;
    if (emergencyFund < idealEmergencyFund * 0.5 && idealEmergencyFund > 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Emergency fund below 50% of ideal (${formatMoney(emergencyFund)} / ${formatMoney(idealEmergencyFund)})`,
            action: 'emergencyFund'
        });
    }
    
    // Credit card usage trigger
    const cards = (appData.tabData || {}).cards || [];
    const totalCreditLimit = cards.filter(c => c.creditCardPresent?.toLowerCase() === "yes")
        .reduce((s, c) => s + Number(c.creditLimit || 0), 0);
    const totalCreditCardUsage = midMonthCC;
    
    if (totalCreditCardUsage > 50000) {
        alerts.push({
            type: 'info',
            icon: 'creditCardSmall',
            message: `High credit card usage: ${formatMoney(totalCreditCardUsage)}`,
            action: 'monthlyBudget'
        });
    }
    
    // Low savings rate trigger
    const savingsRate = inflowTotal > 0 ? (budgetBalance / inflowTotal) : 0;
    if (savingsRate < 0.1 && inflowTotal > 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Low savings rate: ${Math.round(savingsRate * 100)}%. Aim for at least 20%`,
            action: 'monthlyBudget'
        });
    }
    
    // No investments trigger
    const inflowItems = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);
    const hasInvestments = inflowItems.some(item => Number(item.amount || 0) > 0);
    if (!hasInvestments && inflowTotal > 10000) {
        alerts.push({
            type: 'info',
            icon: 'trendingUpSmall',
            message: 'No investments found. Start investing to grow your wealth',
            action: 'inflow'
        });
    }
    
    console.log('[Notification Budget Trigger] Generated alerts:', alerts.length);
    return alerts;
});

// Goals behind schedule trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const now = new Date();
    const goals = (appData.tabData || {}).financialGoal || [];
    console.log('[Notification Goal Trigger] Total goals:', goals.length);
    
    const ongoingGoals = goals.filter(g => {
        const targetDate = g.targetDate ? new Date(g.targetDate) : null;
        return targetDate && targetDate > now;
    });
    console.log('[Notification Goal Trigger] Ongoing goals:', ongoingGoals.length);
    
    const behindGoals = ongoingGoals.filter(g => {
        if (!g.targetDate) return false;
        const targetDate = new Date(g.targetDate);
        const needed = Number(g.amountNeeded || 0);
        const accumulated = Number(g.amountAccumulated || 0);
        const daysToTarget = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        const expectedProgress = needed > 0 ? (accumulated / needed) * 100 : 0;
        const timeProgress = daysToTarget > 0 ? 100 - (daysToTarget / 365) * 100 : 100;
        return expectedProgress < timeProgress - 10; // 10% tolerance
    });
    
    if (behindGoals.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'trendingUpSmall',
            message: `${behindGoals.length} goal${behindGoals.length > 1 ? 's' : ''} behind schedule`,
            action: 'financialGoal'
        });
    }
    
    // Goals nearing deadline
    const upcomingGoals = ongoingGoals.filter(g => {
        if (!g.targetDate) return false;
        const targetDate = new Date(g.targetDate);
        const daysToTarget = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        return daysToTarget > 0 && daysToTarget <= 30;
    });
    
    if (upcomingGoals.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: `${upcomingGoals.length} goal${upcomingGoals.length > 1 ? 's' : ''} due within 30 days`,
            action: 'financialGoal'
        });
    }
    
    // Goals due very soon (within 7 days) - higher priority
    const urgentGoals = ongoingGoals.filter(g => {
        if (!g.targetDate) return false;
        const targetDate = new Date(g.targetDate);
        const daysToTarget = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        console.log('[Notification Goal Trigger] Goal:', g.name, 'Days to target:', daysToTarget);
        return daysToTarget > 0 && daysToTarget <= 7;
    });
    console.log('[Notification Goal Trigger] Urgent goals (within 7 days):', urgentGoals.length);
    
    if (urgentGoals.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `${urgentGoals.length} goal${urgentGoals.length > 1 ? 's' : ''} due within 7 days!`,
            action: 'financialGoal'
        });
    }
    
    // Goals with insufficient accumulated amount
    const underfundedGoals = ongoingGoals.filter(g => {
        const needed = Number(g.amountNeeded || 0);
        const accumulated = Number(g.amountAccumulated || 0);
        const targetDate = g.targetDate ? new Date(g.targetDate) : null;
        const daysToTarget = targetDate ? Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)) : 365;
        
        if (needed <= 0) return false;
        
        // Calculate expected monthly contribution needed
        const monthsRemaining = Math.max(1, daysToTarget / 30);
        const expectedContribution = (needed - accumulated) / monthsRemaining;
        
        // Alert if accumulated is less than 30% of needed and deadline is within 2 years
        const progressPercentage = (accumulated / needed) * 100;
        const isUnderfunded = progressPercentage < 30 && daysToTarget <= 730; // 2 years
        
        return isUnderfunded;
    });
    
    if (underfundedGoals.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `${underfundedGoals.length} goal${underfundedGoals.length > 1 ? 's' : ''} need more funding (accumulated < 30%)`,
            action: 'financialGoal'
        });
    }
    
    // No goals trigger
    if (goals.length === 0) {
        alerts.push({
            type: 'info',
            icon: 'trendingUpSmall',
            message: 'No financial goals set. Define your goals to track progress',
            action: 'financialGoal'
        });
    }
    
    return alerts;
});

// Insurance coverage trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const insurancePolicies = (appData.tabData || {}).insurance || [];
    
    // Calculate recommended coverage
    const salaryAccount = ((appData.tabData || {}).cards || []).find(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    const annualSalary = salaryAccount ? Number(salaryAccount.balance || 0) * 12 : 0;
    const idealHealthInsurance = annualSalary * 0.5; // 50% of annual salary
    const idealTermInsurance = annualSalary * 10; // 10x annual salary
    
    let healthInsurance = 0;
    let termInsurance = 0;
    
    insurancePolicies.forEach(policy => {
        const annualPremium = policy.premiumFrequency === "Annual" ? Number(policy.amount || 0) :
                              policy.premiumFrequency === "Quarterly" ? Number(policy.amount || 0) * 4 :
                              policy.premiumFrequency === "Half-Yearly" ? Number(policy.amount || 0) * 2 :
                              Number(policy.amount || 0) * 12;
        
        if (policy.type === "Health" || policy.type === "Critical Illness") {
            healthInsurance += annualPremium;
        }
        if (policy.type === "Term Life") {
            termInsurance += Number(policy.sumAssured || 0);
        }
    });
    
    if (healthInsurance < idealHealthInsurance * 0.7 && idealHealthInsurance > 0) {
        alerts.push({
            type: 'warning',
            icon: 'hospitalSmall',
            message: `Health insurance below recommended level`,
            action: 'insurance'
        });
    }
    
    if (termInsurance < idealTermInsurance * 0.7 && idealTermInsurance > 0) {
        alerts.push({
            type: 'warning',
            icon: 'shieldCheckSmall',
            message: `Term insurance below recommended level`,
            action: 'insurance'
        });
    }
    
    // No insurance trigger
    if (insurancePolicies.length === 0 && annualSalary > 0) {
        alerts.push({
            type: 'warning',
            icon: 'hospitalSmall',
            message: 'No insurance policies found. Protect yourself with health and term insurance',
            action: 'insurance'
        });
    }
    
    // Policy expiring soon
    const now = new Date();
    const expiringPolicies = insurancePolicies.filter(p => {
        if (!p.expiryDate) return false;
        const expiry = new Date(p.expiryDate);
        const daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return daysToExpiry > 0 && daysToExpiry <= 60;
    });
    
    if (expiringPolicies.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'calendarSmall',
            message: `${expiringPolicies.length} insurance polic${expiringPolicies.length > 1 ? 'ies' : 'y'} expiring within 60 days`,
            action: 'insurance'
        });
    }
    
    return alerts;
});

// Recurring expenses trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const outflows = (appData.tabData || {}).outflow || [];
    
    const upcomingExpenses = outflows.filter(item => {
        if ((item.frequency || 'Monthly') === 'One-Time') return false;
        return Number(item.amount || 0) > 0;
    });
    
    if (upcomingExpenses.length > 3) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: `${upcomingExpenses.length} recurring commitments this month`,
            action: 'outflow'
        });
    }
    
    // High fixed expenses trigger
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};
    const inflowTotal = Object.values(monthData.inflow || {}).reduce((s, v) => s + Number(v || 0), 0);
    let fixedMonthlyOutflow = 0;
    outflows.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = freq === "Monthly" ? amount : freq === "Quarterly" ? amount / 3 : freq === "Semi-Annual" ? amount / 6 : freq === "Annual" ? amount / 12 : amount;
        fixedMonthlyOutflow += monthlyAmt;
    });
    
    const fixedExpenseRatio = inflowTotal > 0 ? fixedMonthlyOutflow / inflowTotal : 0;
    if (fixedExpenseRatio > 0.6) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Fixed expenses are ${Math.round(fixedExpenseRatio * 100)}% of income. Consider reducing commitments`,
            action: 'outflow'
        });
    }
    
    return alerts;
});

// Net worth trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const assets = (appData.tabData || {}).cards || [];
    const liabilities = (appData.tabData || {}).liability || [];
    
    const totalAssets = assets.reduce((s, a) => s + Number(a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.amount || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // Negative net worth
    if (netWorth < 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Negative net worth: ${formatMoney(netWorth)}. Focus on reducing liabilities`,
            action: 'netWorth'
        });
    }
    
    // Low asset diversification
    const assetTypes = new Set(assets.map(a => a.purpose || 'Other'));
    if (assetTypes.size < 3 && assets.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'trendingUpSmall',
            message: 'Low asset diversification. Consider diversifying across different asset types',
            action: 'netWorth'
        });
    }
    
    // High debt-to-asset ratio
    const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
    if (debtRatio > 0.5) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Debt-to-asset ratio is ${Math.round(debtRatio * 100)}%. Aim to keep it below 50%`,
            action: 'netWorth'
        });
    }
    
    return alerts;
});

// Tax planning trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const taxPlan = (appData.tabData || {}).taxPlan || [];
    
    // No tax planning
    if (taxPlan.length === 0) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: 'No tax planning done. Plan your tax deductions to save more',
            action: 'taxPlan'
        });
    }
    
    // Check if using optimal regime
    const salaryAccount = ((appData.tabData || {}).cards || []).find(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    const annualSalary = salaryAccount ? Number(salaryAccount.balance || 0) * 12 : 0;
    
    if (annualSalary > 500000 && taxPlan.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: 'Review your tax regime choice. Old regime may be better with deductions',
            action: 'taxPlan'
        });
    }
    
    return alerts;
});

// Gifts trigger
registerNotificationTrigger(() => {
    const alerts = [];
    const gifts = (appData.tabData || {}).gifts || [];
    const now = new Date();
    
    // Upcoming birthdays/occasions
    const upcomingGifts = gifts.filter(g => {
        if (!g.date) return false;
        const giftDate = new Date(g.date);
        const daysToGift = Math.ceil((giftDate - now) / (1000 * 60 * 60 * 24));
        return daysToGift > 0 && daysToGift <= 30;
    });
    
    if (upcomingGifts.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: `${upcomingGifts.length} gift${upcomingGifts.length > 1 ? 's' : ''} due within 30 days`,
            action: 'gifts'
        });
    }
    
    return alerts;
});

// Trigger notification check on data changes
function triggerNotificationCheck(options = {}) {
    console.log('[Notification] triggerNotificationCheck called', options);
    checkNotificationTriggers(options);
}

// Make function globally accessible for dashboard.js
window.updateNotificationBadge = updateNotificationBadge;
window.triggerNotificationCheck = triggerNotificationCheck;

// Simple icon SVG paths for notification popup (inline to avoid module import issues)
const NOTIFICATION_ICONS = {
    alertSmall: '<path d="M12 4L5 18h14L12 4z"/><path d="M12 10v4"/><path d="M12 15v.01"/>',
    trendingUpSmall: '<polyline points="4 20 12 10 20 4"/>',
    hospitalSmall: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    shieldCheckSmall: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/>',
    creditCardSmall: '<rect x="4" y="6" width="16" height="12" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>',
    calendarSmall: '<rect x="4" y="4" width="16" height="16" rx="2"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>',
    targetSmall: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    piggyBankSmall: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-2.1-1-5.2-1-7.3 0-.2-.6-1.5-2-3-2H5v2H4v3h1v1c0 2.8 2.2 5 5 5v2c0 1.7 1.3 3 3 3h6c1.7 0 3-1.3 3-3v-2c2.8 0 5-2.2 5-5v-1h1V7h-1V5z"/>',
    walletSmall: '<path d="M20 7h-3V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h3c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"/>'
};

function getNotificationIcon(name) {
    const pathData = NOTIFICATION_ICONS[name] || NOTIFICATION_ICONS.alertSmall;
    return `<svg class="notification-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;
}

function showNotificationPopup(alerts) {
    if (!alerts || alerts.length === 0) return;
    
    // Create notification popup
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.innerHTML = `
        <div class="notification-popup-header">
            <h3>Alerts & Notifications</h3>
            <button class="notification-close" onclick="clearNotifications(this)">Clear All</button>
        </div>
        <div class="notification-popup-content">
            ${alerts.map(alert => `
                <div class="notification-item notification-${alert.type}" onclick="switchToTab('${alert.action}'); this.closest('.notification-popup').remove();">
                    <div class="notification-icon">${getNotificationIcon(alert.icon)}</div>
                    <div class="notification-message">${alert.message}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Close popup when clicking outside
    const closeOnClickOutside = (e) => {
        if (!popup.contains(e.target) && !notificationBtn.contains(e.target)) {
            popup.remove();
            document.removeEventListener('click', closeOnClickOutside);
        }
    };
    
    // Add click listener with slight delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);
    
    // Auto-dismiss after time
    setTimeout(() => {
        if (popup && popup.parentNode) {
            popup.remove();
            document.removeEventListener('click', closeOnClickOutside);
        }
    }, notificationDismissTime);
}

function clearNotifications(button) {
    const state = getNotificationState();
    
    // Mark as cleared - this will allow regeneration on next check
    state.cleared = true;
    state.lastAlertsHash = ''; // Reset hash to force regeneration
    localStorage.setItem('notificationState', JSON.stringify(state));
    
    // Clear the alerts
    window.currentAlerts = [];
    updateNotificationBadge(0);
    
    // Close popup
    button.closest('.notification-popup').remove();
    
    showToast('Notifications cleared. They will reappear on next update.', { variant: 'success' });
    console.log('[Notification] Cleared - will regenerate on next data change');
}

// Make clearNotifications globally accessible
window.clearNotifications = clearNotifications;

if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
        const alerts = window.currentAlerts || [];
        console.log('[Notification] Bell clicked - currentAlerts:', alerts.length, alerts);
        if (alerts.length > 0) {
            showNotificationPopup(alerts);
            // Mark as viewed when user manually opens notifications
            const state = getNotificationState();
            state.viewedCount = alerts.length;
            localStorage.setItem('notificationState', JSON.stringify(state));
            updateNotificationBadge(alerts.length);
        } else {
            showToast('No new notifications', { variant: 'info' });
        }
    });
}

// Show notifications on login if not dismissed
function showNotificationsOnLogin() {
    const alerts = window.currentAlerts || [];
    const state = getNotificationState();
    
    if (alerts.length > 0 && !state.cleared && !state.autoShownOnLoad) {
        state.autoShownOnLoad = true;
        // Don't mark as viewed on auto-show - let badge persist
        localStorage.setItem('notificationState', JSON.stringify(state));
        setTimeout(() => {
            showNotificationPopup(alerts);
        }, 2000); // Show 2 seconds after login
    }
}

// Call on auth state change
auth.onAuthStateChanged((user) => {
    if (user) {
        setTimeout(showNotificationsOnLogin, 1000);
    }
});


// ── App Brand Logo Click (Navigate to Dashboard) ───────────────────────────
const appBrandLogo = document.getElementById("appBrandLogo");
if (appBrandLogo) {
    appBrandLogo.addEventListener("click", () => {
        switchToTab("dashboard");
    });
    // Support keyboard navigation (Enter/Space)
    appBrandLogo.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            switchToTab("dashboard");
        }
    });
}

// ── Theme Toggle ────────────────────────────────────────────────────────────
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const sunIcon  = themeToggle.querySelector(".sun-icon");
    const moonIcon = themeToggle.querySelector(".moon-icon");
    const label    = document.getElementById("themeLabel");
    if (theme === "light") {
        sunIcon.hidden  = true;
        moonIcon.hidden = false;
        if (label) label.textContent = "Dark Mode";
    } else {
        sunIcon.hidden  = false;
        moonIcon.hidden = true;
        if (label) label.textContent = "Light Mode";
    }
    localStorage.setItem("theme", theme);
    updateFaviconForTheme();
}

themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
    // P2 fix: theme toggle only changes CSS variables, no need to re-render all sections
    // Only re-render chart-related elements that depend on theme colors
    if (typeof renderPieChart === 'function' && activeTabId === 'monthlyBudget') {
        const mk = getMonthKey(currentMonth);
        const md = (appData.monthlyBudgetData || {})[mk];
        if (md) renderPieChart(md);
    }
});

// P3: Auto-detect system theme, allow manual override
function getDefaultTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
applyTheme(getDefaultTheme());
updateFaviconForTheme();

// Listen for OS theme changes (only if user hasn't manually overridden)
window.matchMedia?.("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) applyTheme(e.matches ? "light" : "dark");
});

// ── Settings Panel ──────────────────────────────────────────────────────────
const settingsBtn      = document.getElementById("settingsBtn");
const settingsPanel    = document.getElementById("settingsPanel");
const settingsOverlay  = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const exportDataBtn    = document.getElementById("exportDataBtn");
const importFileInput  = document.getElementById("importFileInput");
const resetDataBtn     = document.getElementById("resetDataBtn");

function openSettings() {
    settingsOverlay.hidden = false;
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
    
    // Display app version in settings
    const versionDisplay = document.getElementById("settingsVersionDisplay");
    if (versionDisplay) {
        versionDisplay.textContent = `v${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.build}`;
    }

    // Display current name and location
    if (currentUser && appData) {
        const nameDisplay = document.getElementById("currentNameDisplay");
        const locationDisplay = document.getElementById("settingsLocationDisplay");
        if (nameDisplay) nameDisplay.textContent = appData.userName || "Not set";
        if (locationDisplay) locationDisplay.textContent = appData.userLocation || "Not set";
    }
}

function closeSettings() {
    settingsPanel.classList.remove("open");
    settingsPanel.setAttribute("aria-hidden", "true");
    setTimeout(() => { settingsOverlay.hidden = true; }, PANEL_CLOSE_ANIMATION_MS);
}

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

// ── Help Panel ─────────────────────────────────────────────────────────────
const helpBtn        = document.getElementById("helpBtn");
const helpPanel      = document.getElementById("helpPanel");
const helpOverlay    = document.getElementById("helpOverlay");
const closeHelpBtn   = document.getElementById("closeHelpBtn");

function openHelp() {
    helpOverlay.hidden = false;
    helpPanel.classList.add("open");
    helpPanel.setAttribute("aria-hidden", "false");
}
function closeHelp() {
    helpPanel.classList.remove("open");
    helpPanel.setAttribute("aria-hidden", "true");
    setTimeout(() => { helpOverlay.hidden = true; }, PANEL_CLOSE_ANIMATION_MS);
}

if (helpBtn) helpBtn.addEventListener("click", openHelp);
if (closeHelpBtn) closeHelpBtn.addEventListener("click", closeHelp);
if (helpOverlay) helpOverlay.addEventListener("click", closeHelp);

// ── Quick Update Popup ─────────────────────────────────────────────────────
const quickUpdateOverlay = document.getElementById("quickUpdateOverlay");
const quickUpdatePanel = document.getElementById("quickUpdatePanel");
const closeQuickUpdateBtn = document.getElementById("closeQuickUpdateBtn");

function openQuickUpdatePopup() {
    quickUpdateOverlay.hidden = false;
    quickUpdatePanel.classList.add("open");
    quickUpdatePanel.setAttribute("aria-hidden", "false");
    
    // Pre-fill current values
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};
    const cards = (appData.tabData || {}).cards || [];
    const exp = cards.find(c => c.isPrimary === "Yes");
    
    // Use Number() to ensure we get the numeric value, not string
    document.getElementById("popupExpBalance").value = exp?.balance !== undefined ? Number(exp.balance) : "";
    document.getElementById("popupCCOutstanding").value = monthData.outflow?.midMonthCCOutstanding !== undefined ? Number(monthData.outflow.midMonthCCOutstanding) : "";
    
    // Hide result section initially
    const resultEl = document.getElementById("popupQuickUpdateResult");
    if (resultEl) resultEl.hidden = true;
}

function closeQuickUpdatePopup() {
    quickUpdatePanel.classList.remove("open");
    quickUpdatePanel.setAttribute("aria-hidden", "true");
    setTimeout(() => { quickUpdateOverlay.hidden = true; }, PANEL_CLOSE_ANIMATION_MS);
}

if (closeQuickUpdateBtn) closeQuickUpdateBtn.addEventListener("click", closeQuickUpdatePopup);
if (quickUpdateOverlay) quickUpdateOverlay.addEventListener("click", closeQuickUpdatePopup);

// Popup update buttons
const popupUpdateExpBalance = document.getElementById("popupUpdateExpBalance");
const popupUpdateCCOutstanding = document.getElementById("popupUpdateCCOutstanding");
const popupUpdateBoth = document.getElementById("popupUpdateBoth");

if (popupUpdateExpBalance) {
    popupUpdateExpBalance.addEventListener("click", () => {
        const input = document.getElementById("popupExpBalance");
        const newBalance = Number(input?.value);
        if (isNaN(newBalance) || newBalance < 0) {
            showAlert('Enter a valid expenditure balance.', { variant: 'warning' });
            return;
        }
        
        // Trigger the existing update logic (matching budget edit page implementation)
        const cards = (appData.tabData || {}).cards || [];
        const exp = cards.find(c => c.isPrimary === "Yes");
        if (!exp) {
            showAlert('No Primary (Expenditure) account found.', { variant: 'warning' });
            return;
        }
        
        const oldBalance = Number(exp.balance || 0);
        exp.balance = newBalance;
        appData.tabData.cards = cards.map(c => c.id === exp.id ? exp : c);
        
        // Calculate and update variable expenditure in monthData (matching budget edit page)
        const monthKey = getMonthKey(currentMonth);
        if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
        const monthData = appData.monthlyBudgetData[monthKey] || {
            inflow: {},
            outflow: {},
            investing: {},
            monthEndBalance: 0
        };
        appData.monthlyBudgetData[monthKey] = monthData;
        
        // Use the same calculation as budget edit page
        const prevMonthForCarry = new Date(currentMonth);
        prevMonthForCarry.setMonth(prevMonthForCarry.getMonth() - 1);
        const prevKey = getMonthKey(prevMonthForCarry);
        const { varExp, totalFunded } = calcVariableExpenditure(monthData, prevKey, newBalance);
        
        monthData.outflow.variableExpenditure = varExp;
        monthData.autoLinkedFields = monthData.autoLinkedFields || {};
        monthData.autoLinkedFields["outflow.variableExpenditure"] = true;
        
        // Show result
        const resultEl = document.getElementById("popupQuickUpdateResult");
        const untrackedEl = document.getElementById("popupQuickUpdateUntracked");
        resultEl.hidden = false;
        untrackedEl.textContent = formatMoney(varExp);
        untrackedEl.style.color = varExp > 0 ? COLOR_WARNING : COLOR_POSITIVE;
        
        scheduleSave();
        renderCards(); // Re-render accounts to show updated balance
        showToast(`Expenditure balance updated to ${formatMoney(newBalance)}`, { variant: 'success' });
        
        // Auto-close popup after successful update
        setTimeout(() => closeQuickUpdatePopup(), 1000);
    });
}

if (popupUpdateCCOutstanding) {
    popupUpdateCCOutstanding.addEventListener("click", () => {
        const input = document.getElementById("popupCCOutstanding");
        const newCC = Number(input?.value);
        if (isNaN(newCC) || newCC < 0) {
            showAlert('Enter a valid CC spending amount.', { variant: 'warning' });
            return;
        }
        
        const monthKey = getMonthKey(currentMonth);
        if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
        if (!appData.monthlyBudgetData[monthKey]) appData.monthlyBudgetData[monthKey] = { inflow: {}, outflow: {}, investing: {} };
        const monthData = appData.monthlyBudgetData[monthKey];
        const oldCC = monthData.outflow.midMonthCCOutstanding || 0;
        monthData.outflow.midMonthCCOutstanding = newCC;
        
        // Update breakdown for CC spending (matching budget edit page)
        monthData.autoLinkedFields = monthData.autoLinkedFields || {};
        monthData.autoLinkedFields["outflow.midMonthCCOutstanding"] = true;
        monthData.autoLinkedBreakdown = monthData.autoLinkedBreakdown || {};
        monthData.autoLinkedBreakdown["outflow.midMonthCCOutstanding"] = [
            { name: "Current Month CC Spending", amount: newCC, source: "Quick Update (Mid-Month)" }
        ];
        
        scheduleSave();
        renderMonthlyBudget(); // Re-render budget to show updated CC spending
        showToast(`Current month CC spending for ${currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} updated to ${formatMoney(newCC)}`, { variant: 'success' });
        
        // Auto-close popup after successful update
        setTimeout(() => closeQuickUpdatePopup(), 1000);
    });
}

if (popupUpdateBoth) {
    popupUpdateBoth.addEventListener("click", () => {
        // Trigger both updates and close popup after both complete
        const expInput = document.getElementById("popupExpBalance");
        const ccInput = document.getElementById("popupCCOutstanding");
        const newBalance = Number(expInput?.value);
        const newCC = Number(ccInput?.value);
        
        let updatesCompleted = 0;
        const checkComplete = () => {
            updatesCompleted++;
            if (updatesCompleted === 2) {
                setTimeout(() => closeQuickUpdatePopup(), 1000);
            }
        };
        
        // Update balance (matching budget edit page implementation)
        if (!isNaN(newBalance) && newBalance >= 0) {
            const cards = (appData.tabData || {}).cards || [];
            const exp = cards.find(c => c.isPrimary === "Yes");
            if (exp) {
                exp.balance = newBalance;
                appData.tabData.cards = cards.map(c => c.id === exp.id ? exp : c);
                
                const monthKey = getMonthKey(currentMonth);
                if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
                const monthData = appData.monthlyBudgetData[monthKey] || {
                    inflow: {},
                    outflow: {},
                    investing: {},
                    monthEndBalance: 0
                };
                appData.monthlyBudgetData[monthKey] = monthData;
                
                const prevMonthForCarry = new Date(currentMonth);
                prevMonthForCarry.setMonth(prevMonthForCarry.getMonth() - 1);
                const prevKey = getMonthKey(prevMonthForCarry);
                const { varExp } = calcVariableExpenditure(monthData, prevKey, newBalance);
                
                monthData.outflow.variableExpenditure = varExp;
                monthData.autoLinkedFields = monthData.autoLinkedFields || {};
                monthData.autoLinkedFields["outflow.variableExpenditure"] = true;
                
                const resultEl = document.getElementById("popupQuickUpdateResult");
                const untrackedEl = document.getElementById("popupQuickUpdateUntracked");
                resultEl.hidden = false;
                untrackedEl.textContent = formatMoney(varExp);
                untrackedEl.style.color = varExp > 0 ? COLOR_WARNING : COLOR_POSITIVE;
                
                scheduleSave();
                renderCards();
                showToast(`Expenditure balance updated to ${formatMoney(newBalance)}`, { variant: 'success' });
                checkComplete();
            } else {
                checkComplete();
            }
        } else {
            checkComplete();
        }
        
        // Update CC (matching budget edit page implementation)
        if (!isNaN(newCC) && newCC >= 0) {
            const monthKey = getMonthKey(currentMonth);
            if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
            const monthData = appData.monthlyBudgetData[monthKey] || {
                inflow: {},
                outflow: {},
                investing: {}
            };
            appData.monthlyBudgetData[monthKey] = monthData;
            const oldCC = monthData.outflow.midMonthCCOutstanding || 0;
            monthData.outflow.midMonthCCOutstanding = newCC;
            
            monthData.autoLinkedFields = monthData.autoLinkedFields || {};
            monthData.autoLinkedFields["outflow.midMonthCCOutstanding"] = true;
            monthData.autoLinkedBreakdown = monthData.autoLinkedBreakdown || {};
            monthData.autoLinkedBreakdown["outflow.midMonthCCOutstanding"] = [
                { name: "Current Month CC Spending", amount: newCC, source: "Quick Update (Mid-Month)" }
            ];
            
            scheduleSave();
            renderMonthlyBudget();
            showToast(`Current month CC spending for ${currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} updated to ${formatMoney(newCC)}`, { variant: 'success' });
            checkComplete();
        } else {
            checkComplete();
        }
    });
}

// Expose quick update popup function globally for dashboard
window.openQuickUpdatePopup = openQuickUpdatePopup;

// Expose annual budget view functions globally for dashboard
window.setAnnualBudgetView = () => {
    isAnnualBudgetView = true;
    renderBudgetViewToggle();
    renderMonthlyBudget();
};

// Export
exportDataBtn.addEventListener("click", () => {
    if (!currentUser) return;
    const exportTimestamp = new Date().toISOString();
    const exportDate = exportTimestamp.slice(0, 10);
    
    const payload = JSON.stringify({ 
        exportDate: exportTimestamp, 
        version: getAppVersion(), 
        data: appData 
    }, null, 2);
    
    const blob = new Blob([payload], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `smartfin-backup-${exportDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logger.info('Data exported successfully', { 
        filename: `smartfin-backup-${exportDate}.json`,
        exportDate: exportTimestamp 
    });
    
    showToast(`Backup exported: smartfin-backup-${exportDate}.json`, { variant: 'success' });
});

// Download Dashboard Report (HTML format - can be printed to PDF)
const downloadDashboardBtn = document.getElementById('downloadDashboardBtn');
if (downloadDashboardBtn) {
    downloadDashboardBtn.addEventListener("click", async () => {
        if (!currentUser) return;

        try {
            showToast('Generating dashboard report...', { variant: 'info' });
            const htmlContent = generateDashboardHTML();
            const now = new Date();

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smartfin-dashboard-${now.toISOString().slice(0, 10)}.html`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Dashboard report downloaded! Desktop: Open file and press Ctrl+P to save as PDF. Mobile: Use share/print menu.', { variant: 'success', duration: 6000 });
            logger.info('Dashboard report downloaded', { date: now.toISOString() });
        } catch (err) {
            console.error('Dashboard report generation error:', err);
            logger.error('Dashboard report generation failed', { error: err.message });
            showToast('Failed to generate dashboard report. Please try again.', { variant: 'error' });
        }
    });
}

// Account Settings - Edit Name
const editNameBtn = document.getElementById('editNameBtn');
const saveNameBtn = document.getElementById('saveNameBtn');
const cancelNameBtn = document.getElementById('cancelNameBtn');
const nameEditRow = document.getElementById('nameEditRow');
const editNameInput = document.getElementById('editNameInput');
const currentNameDisplay = document.getElementById('currentNameDisplay');

if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
        nameEditRow.hidden = false;
        editNameInput.value = currentNameDisplay.textContent;
        editNameInput.focus();
    });
}

if (cancelNameBtn) {
    cancelNameBtn.addEventListener('click', () => {
        nameEditRow.hidden = true;
        editNameInput.value = '';
    });
}

if (saveNameBtn) {
    saveNameBtn.addEventListener('click', async () => {
        const newName = editNameInput.value.trim();
        if (!newName || newName.length < 2) {
            showToast('Name must be at least 2 characters', { variant: 'error' });
            return;
        }
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                userName: newName
            });
            appData.userName = newName;
            currentNameDisplay.textContent = newName;
            
            // Update user bar display with mobile consideration
            const isMobile = window.innerWidth < 768;
            const displayName = isMobile && newName.includes(' ') 
                ? newName.split(' ')[0] 
                : newName;
            userEmailDisplay.textContent = displayName;
            
            nameEditRow.hidden = true;
            editNameInput.value = '';
            scheduleSave();
            showToast('Name updated successfully', { variant: 'success' });
            logger.info('User name updated', { newName });
        } catch (err) {
            console.error('Error updating name:', err);
            logger.error('Name update failed', { error: err.message });
            showToast('Failed to update name', { variant: 'error' });
        }
    });
}

// Account Settings - Edit Location
const editLocationBtn = document.getElementById('editLocationBtn');
const saveLocationBtn = document.getElementById('saveLocationBtn');
const cancelLocationBtn = document.getElementById('cancelLocationBtn');
const locationEditRow = document.getElementById('locationEditRow');
const customLocationEditRow = document.getElementById('customLocationEditRow');
const editLocationInput = document.getElementById('editLocationInput');
const editCustomLocationInput = document.getElementById('editCustomLocationInput');
const saveCustomLocationBtn = document.getElementById('saveCustomLocationBtn');
const cancelCustomLocationBtn = document.getElementById('cancelCustomLocationBtn');
const settingsLocationDisplay = document.getElementById('settingsLocationDisplay');

if (editLocationBtn) {
    editLocationBtn.addEventListener('click', () => {
        locationEditRow.hidden = false;
        editLocationInput.value = settingsLocationDisplay.textContent;
        editLocationInput.focus();
    });
}

if (cancelLocationBtn) {
    cancelLocationBtn.addEventListener('click', () => {
        locationEditRow.hidden = true;
        customLocationEditRow.hidden = true;
        editLocationInput.value = '';
        editCustomLocationInput.value = '';
    });
}

if (editLocationInput) {
    editLocationInput.addEventListener('change', () => {
        if (editLocationInput.value === 'Other') {
            customLocationEditRow.hidden = false;
            editCustomLocationInput.focus();
        } else {
            customLocationEditRow.hidden = true;
            editCustomLocationInput.value = '';
        }
    });
}

if (saveLocationBtn) {
    saveLocationBtn.addEventListener('click', async () => {
        const newLocation = editLocationInput.value;
        if (!newLocation) {
            showToast('Please select a location', { variant: 'error' });
            return;
        }
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                userLocation: newLocation
            });
            appData.userLocation = newLocation;
            settingsLocationDisplay.textContent = newLocation;
            currentLocationDisplay.textContent = newLocation;
            locationEditRow.hidden = true;
            customLocationEditRow.hidden = true;
            editLocationInput.value = '';
            editCustomLocationInput.value = '';
            scheduleSave();
            showToast('Location updated successfully', { variant: 'success' });
            logger.info('User location updated', { newLocation });
        } catch (err) {
            console.error('Error updating location:', err);
            logger.error('Location update failed', { error: err.message });
            showToast('Failed to update location', { variant: 'error' });
        }
    });
}

if (saveCustomLocationBtn) {
    saveCustomLocationBtn.addEventListener('click', async () => {
        const customLocation = editCustomLocationInput.value.trim();
        if (!customLocation) {
            showToast('Please enter your city', { variant: 'error' });
            return;
        }
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                userLocation: customLocation
            });
            appData.userLocation = customLocation;
            settingsLocationDisplay.textContent = customLocation;
            currentLocationDisplay.textContent = customLocation;
            locationEditRow.hidden = true;
            customLocationEditRow.hidden = true;
            editLocationInput.value = '';
            editCustomLocationInput.value = '';
            scheduleSave();
            showToast('Location updated successfully', { variant: 'success' });
            logger.info('User location updated (custom)', { customLocation });
        } catch (err) {
            console.error('Error updating location:', err);
            logger.error('Location update failed', { error: err.message });
            showToast('Failed to update location', { variant: 'error' });
        }
    });
}

if (cancelCustomLocationBtn) {
    cancelCustomLocationBtn.addEventListener('click', () => {
        customLocationEditRow.hidden = true;
        editCustomLocationInput.value = '';
        editLocationInput.value = '';
    });
}

// Helper function to generate dashboard HTML content
function generateDashboardHTML() {
    // Helper function for frequency conversion
    function toMonthlyAmountInline(amount, frequency) {
        const divisors = { Monthly: 1, Quarterly: 3, 'Semi-Annual': 6, Annual: 12 };
        return amount / (divisors[frequency] || 1);
    }

    // Get dashboard data
    const tabData = appData.tabData || {};
    const accounts = tabData.cards || [];
    const goals = tabData.financialGoal || [];
    const insurancePolicies = tabData.insurance || [];
    const emergencyFunds = tabData.emergencyFund || [];
    const investments = tabData.inflow || [];
    const outflows = tabData.outflow || [];
    const taxItems = tabData.taxPlan || [];
    const now = new Date();
    const monthKey = getMonthKey(now);
    const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};

    // Use Budget page calculated values instead of recalculating
    const totalIncome = Number(monthData._calculatedTotalIncome || sumCategoryNumericValues(monthData.inflow));
    const totalOutflow = Number(monthData._calculatedTotalOutflow || sumCategoryNumericValues(monthData.outflow));
    const monthlyCommitments = Number(monthData._calculatedMonthlyCommitments || 0);
    const spendable = Number(monthData._calculatedSpendable || 0);
    const untracked = Number(monthData._calculatedUntracked || 0);
    const budgetBalance = Number(monthData._calculatedBudgetBalance || 0);

    // Net Worth
    const netWorthEntries = tabData.netWorth || [];
    const assets = netWorthEntries.filter(e => e.type === "Asset");
    const liabilities = netWorthEntries.filter(e => e.type === "Liability");
    const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.value || 0), 0);
    const netWorthValue = totalAssets - totalLiabilities;
    const debtToAssetRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;
    
    // Accounts
    const accountBalance = accounts.reduce((total, acc) => total + Number(acc.balance || 0), 0);
    const primaryAccount = accounts.find(acc => acc.isPrimary === 'Yes');
    const salaryAccount = accounts.find(acc => acc.purpose === 'Salary' && acc.isPrimary !== 'Yes');
    
    // Investments
    const portfolioValue = investments.reduce((total, inv) => total + Number(inv.currentValue || inv.amount || 0), 0);
    const monthlyInvestment = investments.filter(inv => (inv.frequency || '').toLowerCase() === 'monthly')
        .reduce((total, inv) => total + Number(inv.amount || 0), 0);
    
    // Tax
    const taxPlanned = taxItems.reduce((total, item) => total + Number(item.amount || 0), 0);
    
    // Emergency Fund & Insurance
    const emergencyFund = Number(emergencyFunds[0]?.currentFund || 0);
    const healthInsurance = insurancePolicies.filter(p => p.type === 'Health Insurance')
        .reduce((total, p) => total + Number(p.sumAssured || 0), 0);
    const termInsurance = insurancePolicies.filter(p => p.type === 'Term Insurance')
        .reduce((total, p) => total + Number(p.sumAssured || 0), 0);
    
    // Goals
    const activeGoals = goals.filter(g => {
        const needed = Number(g.amountNeeded || 0);
        const accumulated = Number(g.amountAccumulated || 0);
        return needed > 0 && accumulated < needed && g.status !== 'Achieved';
    });
    const totalGoalTarget = activeGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
    const totalGoalAccumulated = activeGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
    const goalsProgress = totalGoalTarget > 0 ? Math.round((totalGoalAccumulated / totalGoalTarget) * 100) : 0;
    
    // Capture chart as image (if available and ready)
    let chartImage = '';
    try {
        const chartCanvas = document.getElementById('dashboardTrendChart');
        if (chartCanvas) {
            chartImage = chartCanvas.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('Could not capture chart (chart may not be ready):', e);
    }

    // Return HTML content
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SmartFin Dashboard Summary</title>
    <style>
        @media print {
            body { margin: 0; padding: 15mm; }
            .page-break { page-break-before: always; }
            @page { size: A4; margin: 15mm; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a1a; background: #fff; max-width: 210mm; margin: 0 auto; }
        h1 { color: #10b981; margin-bottom: 5px; font-size: 28px; }
        h2 { color: #059669; margin-top: 25px; margin-bottom: 12px; font-size: 20px; border-bottom: 2px solid #10b981; padding-bottom: 5px; }
        .header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; }
        .header-info { color: #666; font-size: 14px; margin: 3px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .card-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .card-value { font-size: 22px; font-weight: bold; color: #10b981; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .metric:last-child { border-bottom: none; }
        .metric-label { font-weight: 500; color: #374151; }
        .metric-value { font-weight: 600; color: #10b981; }
        .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 8px 0; }
        .progress-fill { background: #10b981; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; }
        .chart-container { margin: 20px 0; text-align: center; }
        .chart-container img { max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-bad { color: #ef4444; }
        .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #10b981; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>₹ SmartFin Dashboard Summary</h1>
        <div class="header-info">Generated: ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <div class="header-info">User: ${appData.userName || currentUser.email}</div>
        ${appData.userLocation ? `<div class="header-info">Location: ${appData.userLocation}</div>` : ''}
        <div class="header-info">Version: ${getAppVersion()}</div>
    </div>
    
    <h2>This Month (${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})</h2>
    <div class="grid">
        <div class="card">
            <div class="card-title">Total Income</div>
            <div class="card-value">${formatMoney(totalIncome)}</div>
        </div>
        <div class="card">
            <div class="card-title">Monthly Commitments</div>
            <div class="card-value">${formatMoney(monthlyCommitments)}</div>
        </div>
        <div class="card">
            <div class="card-title">Available Funds</div>
            <div class="card-value">${formatMoney(availableFunds)}</div>
        </div>
        <div class="card">
            <div class="card-title">Budget Status</div>
            <div class="card-value ${budgetBalance >= 0 ? 'status-good' : 'status-bad'}">${budgetBalance >= 0 ? '+' : ''}${formatMoney(budgetBalance)}</div>
        </div>
    </div>
    
    <h2>Net Worth</h2>
    <div class="metric">
        <span class="metric-label">Total Assets</span>
        <span class="metric-value">${formatMoney(totalAssets)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Total Liabilities</span>
        <span class="metric-value">${formatMoney(totalLiabilities)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Net Worth</span>
        <span class="metric-value ${netWorthValue >= 0 ? 'status-good' : 'status-bad'}">${formatMoney(netWorthValue)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Debt-to-Asset Ratio</span>
        <span class="metric-value">${debtToAssetRatio}%</span>
    </div>
    
    <h2>Goals Progress</h2>
    <div class="metric">
        <span class="metric-label">Overall Progress</span>
        <span class="metric-value">${goalsProgress}%</span>
    </div>
    <div class="progress-bar">
        <div class="progress-fill" style="width: ${goalsProgress}%">${goalsProgress}%</div>
    </div>
    ${activeGoals.length > 0 ? `
    <table>
        <thead>
            <tr>
                <th>Goal</th>
                <th>Target</th>
                <th>Accumulated</th>
                <th>Progress</th>
            </tr>
        </thead>
        <tbody>
            ${activeGoals.map(g => {
                const needed = Number(g.amountNeeded || 0);
                const accumulated = Number(g.amountAccumulated || 0);
                const progress = needed > 0 ? Math.round((accumulated / needed) * 100) : 0;
                return `<tr>
                    <td>${g.name}</td>
                    <td>${formatMoney(needed)}</td>
                    <td>${formatMoney(accumulated)}</td>
                    <td>${progress}%</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>` : '<p>No active goals</p>'}
    
    <h2>Preparedness</h2>
    <div class="metric">
        <span class="metric-label">Emergency Fund</span>
        <span class="metric-value">${formatMoney(emergencyFund)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Health Insurance</span>
        <span class="metric-value">${formatMoney(healthInsurance)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Term Insurance</span>
        <span class="metric-value">${formatMoney(termInsurance)}</span>
    </div>
    
    <h2>🏦 Accounts</h2>
    <div class="metric">
        <span class="metric-label">Total Balance</span>
        <span class="metric-value">${formatMoney(accountBalance)}</span>
    </div>
    ${primaryAccount ? `<div class="metric">
        <span class="metric-label">Primary (Expenditure)</span>
        <span class="metric-value">${formatMoney(Number(primaryAccount.balance || 0))}</span>
    </div>` : ''}
    ${salaryAccount ? `<div class="metric">
        <span class="metric-label">Salary Account</span>
        <span class="metric-value">${formatMoney(Number(salaryAccount.balance || 0))}</span>
    </div>` : ''}
    
    <h2>Investments & Planning</h2>
    <div class="metric">
        <span class="metric-label">Portfolio Value</span>
        <span class="metric-value">${formatMoney(portfolioValue)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Monthly Investment</span>
        <span class="metric-value">${formatMoney(monthlyInvestment)}</span>
    </div>
    <div class="metric">
        <span class="metric-label">Tax Planning</span>
        <span class="metric-value">${formatMoney(taxPlanned)}</span>
    </div>
    
    ${chartImage ? `
    <h2>6-Month Trend</h2>
    <div class="chart-container">
        <img src="${chartImage}" alt="6-Month Trend Chart" />
    </div>` : ''}
    
    <div class="footer">
        <p><strong>SmartFin - Smart Financial Planning (v${getAppVersion()})</strong></p>
        <p>This is a comprehensive dashboard summary. For real-time updates and detailed analysis, please visit the app.</p>
        <p>© ${now.getFullYear()} SmartFin. All rights reserved.</p>
    </div>
</body>
</html>`;
}

// P0: Auto-backup before destructive operations
function autoBackup(reason) {
    try {
        const ts = new Date().toISOString();
        const payload = JSON.stringify({
            exportDate: ts,
            version: getAppVersion(),
            reason,
            data: appData
        }, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `smartfin-auto-backup-${ts.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logger.info('Auto-backup created before destructive operation', { reason });
    } catch (err) {
        logger.error('Auto-backup failed', { reason, error: err.message });
    }
}

// Import
importFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    const reader = new FileReader();
    
    reader.onload = async (ev) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            const imported = parsed.data || parsed;
            if (typeof imported !== "object" || Array.isArray(imported)) throw new Error("Invalid format");
            // Basic validation: must have tabData or be recognisable
            if (!imported.tabData && !imported.monthlyBudgetData && !imported.customTabs) {
                throw new Error("File does not contain SmartFin data.");
            }
            const exportInfo = parsed.exportDate ? `\nBackup date: ${new Date(parsed.exportDate).toLocaleDateString("en-IN")}` : "";
            const fileInfo = `\nFile: ${file.name}`;
            const filePath = `\nPath: ${file.path || file.webkitRelativePath || 'Unknown (local file)'}`;
            
            if (!(await showConfirm(`This will overwrite ALL your current data with the imported backup.${exportInfo}${fileInfo}${filePath}\n\nContinue?`, { title: 'Import Data', dangerous: true, confirmText: 'Import' }))) return;

            // P0: Auto-backup current data before overwriting
            autoBackup('import');

            // Ensure all required fields exist in imported data
            const safeImport = {
                tabData: imported.tabData || {},
                customTabs: imported.customTabs || [],
                userName: imported.userName || appData.userName || "",
                userLocation: imported.userLocation || appData.userLocation || "",
                monthlyBudgetData: imported.monthlyBudgetData || {},
                expenseTrackingData: imported.expenseTrackingData || {},
                fixedMonthlyIncome: imported.fixedMonthlyIncome || 0,
                dateOfBirth: imported.dateOfBirth || "",
                currentAge: imported.currentAge || 0,
                onboardingComplete: imported.onboardingComplete || false,
                onboardingDate: imported.onboardingDate || "",
                dataMigrated: imported.dataMigrated || false,
                taxData: imported.taxData || {}
            };

            db.collection("users").doc(currentUser.uid)
                .set(safeImport)
                .then(() => {
                    // Update local state immediately
                    appData = safeImport;
                    normalizeAppDataModel();
                    // Re-check onboarding based on imported accounts
                    const cards = (appData.tabData || {}).cards || [];
                    const hasPrimaryImp = cards.some(c => c.isPrimary === "Yes");
                    const hasSalaryImp = cards.some(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
                    appData.onboardingComplete = hasPrimaryImp && hasSalaryImp;
                    // Trigger migration if needed
                    if (!appData.dataMigrated) migrateToNewTabStructure();
                    activeTabId = appData.onboardingComplete ? "dashboard" : "cards";
                    render();
                    closeSettings();
                    
                    logger.info('Data imported successfully', { 
                        filename: file.name,
                        filePath: file.path || file.webkitRelativePath,
                        fileSize: file.size
                    });
                    
                    showToast('Data imported successfully!', { variant: 'success' });
                })
                .catch(err => {
                    logger.error('Data import save failed', { error: err.message });
                    showAlert('Import failed: ' + err.message, { variant: 'error' });
                });
        } catch (err) {
            logger.error('Import file parsing failed', { filename: file.name, error: err.message });
            showAlert('Could not read file. Make sure it is a valid SmartFin backup (.json).\n\n' + err.message, { variant: 'error' });
        }
    };
    reader.readAsText(file);
    importFileInput.value = "";
});

// Reset (Settings panel)
resetDataBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    if (!(await showConfirm('Are you sure? This will permanently delete ALL your financial data and cannot be undone.', { title: 'Reset All Data', dangerous: true }))) return;
    if (!(await showTypedConfirm('This action cannot be reversed. All your financial data will be permanently deleted.', 'DELETE', { title: 'Confirm Reset' }))) {
        showToast('Reset cancelled.', { variant: 'info' });
        return;
    }
    logger.warning('Reset all data initiated', { userId: currentUser.uid });
    // P0: Auto-backup before settings reset
    autoBackup('settings-reset');
    const resetData = {
        tabData: {}, customTabs: [], userName: appData.userName || "", userLocation: appData.userLocation || "",
        monthlyBudgetData: {}, fixedMonthlyIncome: 0,
        dateOfBirth: "", currentAge: 0,
        onboardingComplete: false, onboardingDate: "", dataMigrated: true
    };
    db.collection("users").doc(currentUser.uid)
        .set(resetData)
        .then(() => {
            appData = resetData;
            activeTabId = "cards";
            render();
            closeSettings();
            logger.info('All data reset successfully');
            showToast('All data has been reset.', { variant: 'success' });
        })
        .catch(err => {
            logger.error('Data reset failed', { error: err.message });
            showAlert('Reset failed: ' + err.message, { variant: 'error' });
        });
});

// ── Tab Menu Toggle ─────────────────────────────────────────────────────────────
tabMenuToggle.addEventListener("click", () => {
    tabList.classList.toggle("open");
});

// Close tab menu when clicking outside on mobile
document.addEventListener("click", (e) => {
    if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
        if (!tabBar.contains(e.target) && tabList.classList.contains("open")) {
            tabList.classList.remove("open");
        }
    }
});

function setAuthError(msg) {
    authError.textContent = msg;
    authError.hidden = !msg;
}

function friendlyError(code) {
    const map = {
        "auth/user-not-found":         "No account found with this email.",
        "auth/wrong-password":         "Incorrect password. Please try again.",
        "auth/invalid-credential":     "Invalid email or password.",
        "auth/email-already-in-use":   "Email already registered. Please sign in.",
        "auth/invalid-email":          "Please enter a valid email address.",
        "auth/weak-password":          "Password must be at least 6 characters.",
        "auth/operation-not-allowed":  "Email/password sign-in is disabled in Firebase Auth.",
        "auth/invalid-api-key":        "Firebase API key is invalid. Check firebase-config.js.",
        "auth/unauthorized-domain":    "This domain is not authorized for Firebase Auth.",
        "auth/too-many-requests":      "Too many attempts. Try again later.",
        "auth/network-request-failed": "Network error. Check your connection."
    };
    return map[code] || "Something went wrong. Please try again.";
}

// ── Firestore real-time sync ──────────────────────────────────────────────────
function startListening() {
    stopListening();
    let firstLoad = true;
    // P0: Mark Firestore as initialized so logger can write to Firebase
    window.firestoreInitialized = true;

    firestoreUnsub = db.collection("users").doc(currentUser.uid)
        .onSnapshot(snap => {
            // Skip re-render when this is our own write being echoed back (prevents focus loss)
            if (snap.metadata.hasPendingWrites) return;
            
            // Capture focused input state BEFORE checking localWritePending
            const focused = document.activeElement;
            const focusedId = focused?.id;
            const focusedValue = (focused?.tagName === 'INPUT' || focused?.tagName === 'TEXTAREA') ? focused.value : null;
            const focusedSelection = focused?.selectionStart;

            const isBudgetFieldFocused = isBudgetEditMode && activeTabId === 'monthlyBudget'
                && focused && monthlyBudgetUI?.contains(focused)
                && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA');
            if (!firstLoad && isBudgetFieldFocused) {
                logger.info('Skipping Firestore update while user is actively editing monthly budget', { fieldId: focusedId });
                if (localWritePending) localWritePending = false;
                return;
            }

            const incomingSnapshot = normalizeSnapshotModel(snap.exists ? snap.data() : {});
            const localSnapshot = normalizeSnapshotModel(appData);
            const isDuplicateSnapshot = !firstLoad && deepEqual(incomingSnapshot, localSnapshot);
            if (isDuplicateSnapshot) {
                if (localWritePending) localWritePending = false;
                return;
            }
            
            if (localWritePending) { localWritePending = false; return; }

            if (snap.exists) {
                const d = snap.data();
                console.log('📥 Loading data from Firestore...');
                console.log('Firestore taxData:', d.taxData);
                
                appData = {
                    tabData: d.tabData || {},
                    customTabs: d.customTabs || [],
                    userName: d.userName || "",
                    userLocation: d.userLocation || "",
                    monthlyBudgetData: d.monthlyBudgetData || {},
                    expenseTrackingData: d.expenseTrackingData || {},
                    fixedMonthlyIncome: d.fixedMonthlyIncome || 0,
                    dateOfBirth: d.dateOfBirth || "",
                    currentAge: d.currentAge || 0,
                    onboardingComplete: d.onboardingComplete || false,
                    onboardingDate: d.onboardingDate || "",
                    dataMigrated: d.dataMigrated || false,
                    taxData: d.taxData || {},
                };
                
                console.log('Loaded appData.taxData:', appData.taxData);
                
                // Show first name only on mobile, full name on desktop
                const fullName = appData.userName || currentUser.email;
                const isMobile = window.innerWidth < 768;
                const displayName = isMobile && fullName.includes(' ') 
                    ? fullName.split(' ')[0] 
                    : fullName;
                userEmailDisplay.textContent = displayName;

                // Data migration: convert old tab structure on first load
                if (!appData.dataMigrated) {
                    migrateToNewTabStructure();
                }
                normalizeAppDataModel();

                // Landing tab logic on first load
                if (firstLoad) {
                    firstLoad = false;
                    if (!appData.onboardingComplete) {
                        activeTabId = "cards";
                    } else {
                        activeTabId = "dashboard";
                        // Auto-advance to next month if current month is closed
                        const todayKey = getMonthKey(new Date());
                        const todayMonthData = (appData.monthlyBudgetData || {})[todayKey];
                        if (todayMonthData && todayMonthData._monthClosed) {
                            currentMonth.setMonth(currentMonth.getMonth() + 1);
                        }
                    }
                }
            } else {
                appData = { tabData: {}, customTabs: [], userName: "", monthlyBudgetData: {}, fixedMonthlyIncome: 0, dateOfBirth: "", currentAge: 0, onboardingComplete: false, onboardingDate: "", dataMigrated: false, taxData: {} };
                
                // Show first name only on mobile, full name on desktop
                const fullName = currentUser.email;
                const isMobile = window.innerWidth < 768;
                const displayName = isMobile && fullName.includes(' ') 
                    ? fullName.split(' ')[0] 
                    : fullName;
                userEmailDisplay.textContent = displayName;
                if (firstLoad) {
                    firstLoad = false;
                    activeTabId = "cards";
                }
            }
            
            // Ensure taxData exists (for backward compatibility with old data)
            if (!appData.taxData) {
                appData.taxData = {};
            }
            
            render();
            
            // Restore focused input state after re-render (prevents value loss while typing)
            if (focusedId && focusedValue !== null) {
                requestAnimationFrame(() => {
                    const restored = document.getElementById(focusedId);
                    if (restored && restored.value !== focusedValue) {
                        restored.value = focusedValue;
                        if (focusedSelection !== null && focusedSelection !== undefined) {
                            restored.setSelectionRange(focusedSelection, focusedSelection);
                        }
                        restored.focus();
                    }
                });
            }
        }, err => {
            console.error("Firestore listen error:", err);
            logger.error('Firestore listener error', { code: err.code, message: err.message });
            if (err.code === 'unavailable' || err.code === 'permission-denied') {
                showAlert('Connection to database lost. Please check your internet connection and refresh the page.', { variant: 'error' });
                showNetworkStatus('error');
            }
        });
}

function stopListening() {
    if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, SAVE_DEBOUNCE_MS);
}

function doSave() {
    if (!currentUser) return;
    localWritePending = true;
    
    console.log('💾 Saving to Firestore...');
    console.log('appData.taxData:', appData.taxData);
    console.log('appData.tabData.taxPlan:', appData.tabData?.taxPlan);
    
    logger.info('Saving data to Firebase', { userId: currentUser.uid, hasTaxData: !!appData.taxData });
    
    db.collection("users").doc(currentUser.uid)
        .set(appData, { merge: true })
        .then(() => {
            console.log('Saved successfully');
            logger.info('Data saved successfully', { userId: currentUser.uid });
            showNetworkStatus('online');
        })
        .catch(err => {
            localWritePending = false;
            logger.error('Save failed', { error: err.message, code: err.code });
            console.error("Save failed:", err);
            
            // Quota exceeded - specific handling
            if (err.code === 'resource-exhausted') {
                showAlert('Firebase quota exceeded. Data will be saved when quota resets (daily at midnight Pacific time) or upgrade your Firebase plan.', { variant: 'warning' });
            }
            // Network errors - retry with user notification
            else if (err.code === 'unavailable' || err.code === 'failed-precondition') {
                logger.warning('Network issue detected, retrying save');
                console.warn("Network issue detected. Data will be retried automatically.");
                showNetworkStatus('reconnecting');
                // Retry after 2 seconds
                setTimeout(() => {
                    if (currentUser) {
                        console.log("Retrying save...");
                        scheduleSave();
                    }
                }, SAVE_RETRY_DELAY_MS);
            }
            // Permission denied
            else if (err.code === 'permission-denied') {
                showAlert('Permission denied. You may need to re-login or check your account access.', { variant: 'error' });
                showNetworkStatus('error');
            }
            // Other errors
            else {
                showAlert('Failed to save data. Please check your internet connection and try again.', { variant: 'error' });
                showNetworkStatus('error');
            }
        });
}

// ── Network Status Indicator Functions ──────────────────────────────────
function showNetworkStatus(status) {
    const networkStatusEl = document.getElementById('networkStatus');
    if (!networkStatusEl) return;
    
    // Clear existing timeout
    if (networkStatusTimeout) {
        clearTimeout(networkStatusTimeout);
        networkStatusTimeout = null;
    }
    
    // Remove all status classes
    networkStatusEl.classList.remove('retrying', 'quota-exceeded', 'error', 'online', 'offline', 'reconnecting');
    
    // Add new status class
    networkStatusEl.classList.add(status);
    
    // Set text and title based on status with detailed tooltips
    const textEl = networkStatusEl.querySelector('.network-status-text');
    if (textEl) {
        switch (status) {
            case 'retrying':
                textEl.textContent = 'Retrying...';
                networkStatusEl.title = 'Network issue detected. Retrying save automatically...';
                break;
            case 'quota-exceeded':
                textEl.textContent = 'Quota Full';
                networkStatusEl.title = 'Firebase storage quota exceeded. Data will be saved when quota resets (daily at midnight Pacific time) or upgrade your Firebase plan.';
                break;
            case 'error':
                textEl.textContent = 'Save Failed';
                networkStatusEl.title = 'Failed to save data. Check your internet connection and try again.';
                break;
            case 'online':
                textEl.textContent = 'Saved';
                networkStatusEl.title = 'Data saved successfully to cloud storage';
                break;
            case 'offline':
                textEl.textContent = 'Offline';
                networkStatusEl.title = 'No internet connection. Data will be saved when connection is restored.';
                break;
            case 'reconnecting':
                textEl.textContent = 'Reconnecting...';
                networkStatusEl.title = 'Connection lost. Attempting to reconnect...';
                break;
            default:
                textEl.textContent = '';
                networkStatusEl.title = '';
        }
    }
    
    // Show the indicator
    networkStatusEl.hidden = false;
    
    // Auto-hide only for success state (online)
    // Warning and error states stay visible
    if (status === 'online') {
        networkStatusTimeout = setTimeout(() => {
            hideNetworkStatus();
        }, 2000);
    }
}

function hideNetworkStatus() {
    const networkStatusEl = document.getElementById('networkStatus');
    if (!networkStatusEl) return;
    
    networkStatusEl.hidden = true;
    networkStatusEl.classList.remove('retrying', 'quota-exceeded', 'error', 'online', 'offline', 'reconnecting');
}

// ── Browser Online/Offline Detection ──────────────────────────────────
window.addEventListener('online', () => {
    console.log('Browser is online');
    showNetworkStatus('online');
    // Retry any pending save
    if (localWritePending) {
        scheduleSave();
    }
});

window.addEventListener('offline', () => {
    console.log('Browser is offline');
    showNetworkStatus('offline');
});

function normalizeAppDataModel() {
    if (!appData.tabData) appData.tabData = {};
    if (!appData.taxData) appData.taxData = {};
    if (!appData.expenseTrackingData) appData.expenseTrackingData = {};
    if (Array.isArray(appData.tabData.inflow)) {
        const before = JSON.stringify(appData.tabData.inflow);
        appData.tabData.inflow = normalizeInvestmentEntries(appData.tabData.inflow);
        if (JSON.stringify(appData.tabData.inflow) !== before) scheduleSave();
    }
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
        if (aKeys[i] !== bKeys[i]) return false;
        if (!deepEqual(a[aKeys[i]], b[bKeys[i]])) return false;
    }
    return true;
}

function normalizeSnapshotModel(snapshot = {}) {
    return {
        tabData: snapshot.tabData || {},
        customTabs: snapshot.customTabs || [],
        userName: snapshot.userName || "",
        monthlyBudgetData: snapshot.monthlyBudgetData || {},
        fixedMonthlyIncome: snapshot.fixedMonthlyIncome || 0,
        dateOfBirth: snapshot.dateOfBirth || "",
        currentAge: snapshot.currentAge || 0,
        onboardingComplete: snapshot.onboardingComplete || false,
        onboardingDate: snapshot.onboardingDate || "",
        dataMigrated: snapshot.dataMigrated || false,
    };
}

// ── Data migration: old tabs → new inflow/outflow ────────────────────────────
function migrateToNewTabStructure() {
    if (!appData.tabData) appData.tabData = {};
    const td = appData.tabData;
    const oldInvestments = td.investments || [];
    const oldExpenses    = td.monthlyFixedExpense || [];
    const oldInsurances  = td.insurances || [];

    // Skip if nothing to migrate
    if (oldInvestments.length === 0 && oldExpenses.length === 0 && oldInsurances.length === 0) {
        appData.dataMigrated = true;
        if (!appData.onboardingDate) appData.onboardingDate = new Date().toISOString().slice(0, 10);
        scheduleSave();
        return;
    }

    const newInflow  = td.inflow  || [];
    const newOutflow = td.outflow || [];

    // Migrate investments → inflow
    oldInvestments.forEach(inv => {
        newInflow.push({
            id: inv.id,
            name: inv.name || "",
            type: "Investment",
            amount: Number(inv.initialInvestment || 0),
            currentValue: Number(inv.totalAmount || inv.initialInvestment || 0),
            interestRate: Number(inv.annualInterestRate || 0),
            frequency: inv.frequency === "Annually" ? "Annual" : (inv.frequency || "One-Time"),
            startDate: inv.startDate || "",
            endDate: inv.maturityDate || "",
            details: inv.details || "",
        });
    });

    // Migrate liabilities → inflow (Investment/Saving types) or outflow (others)
    oldExpenses.forEach(exp => {
        const t = exp.type || "Expenditure";
        if (t === "Investment" || t === "Saving" || t === "Savings") {
            newInflow.push({
                id: exp.id,
                name: exp.name || "",
                type: t,
                amount: Number(exp.amount || 0),
                currentValue: 0,
                interestRate: 0,
                frequency: exp.frequency || "Monthly",
                startDate: "",
                endDate: exp.endDate || "",
                details: exp.bankName ? `Bank: ${exp.bankName}` : "",
            });
        } else {
            newOutflow.push({
                id: exp.id,
                name: exp.name || "",
                type: t,
                amount: Number(exp.amount || 0),
                frequency: exp.frequency || "Monthly",
                bankName: exp.bankName || "",
                endDate: exp.endDate || "",
                details: "",
            });
        }
    });

    // Migrate insurances → outflow
    oldInsurances.forEach(ins => {
        const detailParts = [];
        if (ins.policyType) detailParts.push(`Policy: ${ins.policyType}`);
        if (ins.sumAssured) detailParts.push(`Sum Assured: ${ins.sumAssured}`);
        if (ins.nomineeName) detailParts.push(`Nominee: ${ins.nomineeName}`);
        if (ins.nirLinked === "Yes") detailParts.push("NIR: Yes");
        newOutflow.push({
            id: ins.id,
            name: ins.name || "",
            type: "Insurance",
            amount: Number(ins.premium || 0),
            frequency: ins.premiumFrequency === "Semi-Annual" ? "Semi-Annual" : (ins.premiumFrequency || "Annual"),
            bankName: ins.companyName || "",
            endDate: ins.maturityDate || "",
            details: detailParts.join(", "),
        });
    });

    td.inflow  = newInflow;
    td.outflow = newOutflow;
    td.inflow = normalizeInvestmentEntries(td.inflow);

    // Clean up old keys
    delete td.investments;
    delete td.monthlyFixedExpense;
    delete td.insurances;

    appData.dataMigrated = true;
    if (!appData.onboardingDate) appData.onboardingDate = new Date().toISOString().slice(0, 10);

    // Auto-set onboarding complete if user has accounts
    if ((td.cards || []).length > 0) {
        appData.onboardingComplete = true;
    }

    scheduleSave();
    console.log("Data migrated: investments→inflow, liabilities+insurances→outflow");
}

// ── Tab helpers ───────────────────────────────────────────────────────────────
function getTabs() {
    return DEFAULT_TABS.concat(appData.customTabs || []);
}

function activeEntries() {
    try {
        return (appData.tabData || {})[activeTabId] || [];
    } catch (e) {
        console.error("Error getting active entries:", e);
        logger.error('Error getting active entries', { activeTabId, error: e.message });
        return [];
    }
}

function setActiveEntries(entries) {
    try {
        if (!appData.tabData) appData.tabData = {};
        appData.tabData[activeTabId] = entries || [];
        scheduleSave();
    } catch (e) {
        console.error("Error setting active entries:", e);
        logger.error('Error setting active entries', { activeTabId, error: e.message });
    }
}

// ── Dependency helpers ────────────────────────────────────────────────────────
function getCardEntries() {
    return (appData.tabData || {}).cards || [];
}

function hasAnyAccount() {
    return getCardEntries().length > 0;
}

function buildDependencyNotice(message, jumpTabId) {
    return `<div class="dependency-notice">
        <span class="dependency-notice-icon">${iconSvg('info', 'dependency-notice-svg')}</span>
        <span class="dependency-notice-text">${message}</span>
        <button type="button" class="dependency-notice-btn" onclick="switchToTab('${jumpTabId}')">Go to Accounts →</button>
    </div>`;
}

function switchToTab(tabId) {
    logger.info('Tab switched', { tabId });
    activeTabId = tabId;
    if (searchInput) searchInput.value = "";
    render();
}
// Expose on window for inline onclick handlers in generated HTML
window.switchToTab = switchToTab;

// ── Sort/Filter toolbar helpers ───────────────────────────────────────────────
function buildSortFilterToolbar(tabId, hideFields = []) {
    const fields = TAB_FIELDS[tabId] || [];
    const state = listSortFilter[tabId];
    const selectFields = fields.filter(f => f.type === "select" && !hideFields.includes(f.id) && f.id !== "details");

    // For financialGoal, add Status as a sort option
    let sortOpts = `<option value=""${state.sortBy === "" ? " selected" : ""}>None</option>`;
    if (tabId === "financialGoal") {
        sortOpts += `<option value="status"${state.sortBy === "status" ? " selected" : ""}>Status</option>`;
        sortOpts += `<option value="goalType"${state.sortBy === "goalType" ? " selected" : ""}>Goal Type</option>`;
    }
    sortOpts += fields.filter(f => f.id !== "details").map(f => `<option value="${f.id}"${state.sortBy === f.id ? " selected" : ""}>${f.label}</option>`).join("");

    const filtersHtml = selectFields.map(f => {
        const val = state.filters[f.id] || "";
        const optHtml = f.options.map(o => `<option value="${o}"${val === o ? " selected" : ""}>${o}</option>`).join("");
        return `<div class="toolbar-filter-item">
            <label>${f.label}</label>
            <select class="toolbar-filter-select" data-tab="${tabId}" data-field="${f.id}">
                <option value="">All</option>
                ${optHtml}
            </select>
        </div>`;
    }).join("");

    // Add "Hide Completed" checkbox for financialGoal tab
    const hideCompletedHtml = tabId === "financialGoal" 
        ? `<div class="toolbar-filter-item toolbar-checkbox-item">
            <label class="toolbar-checkbox-label">
                <input type="checkbox" class="toolbar-hide-completed" data-tab="${tabId}" ${state.hideCompleted ? "checked" : ""}>
                <span class="toolbar-checkbox-text">Hide Completed</span>
            </label>
        </div>`
        : "";

    const divider = (selectFields.length > 0 || hideCompletedHtml) ? `<div class="list-toolbar-divider"></div>` : "";
    const filterBlock = (selectFields.length > 0 || hideCompletedHtml)
        ? `<div class="list-toolbar-filters">${filtersHtml}${hideCompletedHtml}</div>`
        : "";

    const searchHtml = `<div class="toolbar-search-item">
        <input type="text" class="toolbar-search-input" data-tab="${tabId}" placeholder="Search all fields..." value="${esc(state.searchText || "")}">
    </div>`;

    return `<div class="list-toolbar">
        ${searchHtml}
        <div class="list-toolbar-sort">
            <label>Sort by</label>
            <select class="toolbar-sort-select" data-tab="${tabId}">${sortOpts}</select>
            <button type="button" class="toolbar-sort-dir" data-tab="${tabId}">${state.sortDir === "asc" ? "↑ Asc" : "↓ Desc"}</button>
        </div>
        ${divider}${filterBlock}
    </div>`;
}

function applyListSortFilter(tabId, entries, skipFilters = false) {
    const state = listSortFilter[tabId];
    const fields = TAB_FIELDS[tabId] || [];
    let result = [...entries];

    // Apply search filter
    if (state.searchText && state.searchText.trim()) {
        const searchLower = state.searchText.toLowerCase().trim();
        result = result.filter(e => {
            // Search across all fields
            return fields.some(f => {
                const val = e[f.id];
                if (val == null || val === "") return false;
                return String(val).toLowerCase().includes(searchLower);
            });
        });
    }

    // Apply hide completed filter for goals
    if (tabId === "financialGoal" && state.hideCompleted) {
        result = result.filter(e => {
            const status = normalizeGoalStatus(e);
            return status !== "Completed";
        });
    }

    // Apply dropdown filters (skip if requested for custom filtering)
    if (!skipFilters) {
        Object.entries(state.filters).forEach(([fieldId, val]) => {
            if (val) result = result.filter(e => (e[fieldId] || "") === val);
        });
    }

    // Apply sorting
    if (state.sortBy) {
        // Special handling for status sorting
        if (state.sortBy === "status" && tabId === "financialGoal") {
            const statusOrder = { "Ongoing": 1, "Planned": 2, "Achieved": 3, "Missed": 4, "Completed": 5 };
            result.sort((a, b) => {
                const statusA = normalizeGoalStatus(a);
                const statusB = normalizeGoalStatus(b);
                const orderA = statusOrder[statusA] || 999;
                const orderB = statusOrder[statusB] || 999;
                return state.sortDir === "asc" ? orderA - orderB : orderB - orderA;
            });
        } else {
            const field = fields.find(f => f.id === state.sortBy);
            result.sort((a, b) => {
                let av = a[state.sortBy] != null ? a[state.sortBy] : "";
                let bv = b[state.sortBy] != null ? b[state.sortBy] : "";
                if (field && field.type === "number") {
                    av = Number(av); bv = Number(bv);
                    return state.sortDir === "asc" ? av - bv : bv - av;
                }
                av = String(av).toLowerCase();
                bv = String(bv).toLowerCase();
                if (av < bv) return state.sortDir === "asc" ? -1 : 1;
                if (av > bv) return state.sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }
    }
    return result;
}

// ── Formatting ────────────────────────────────────────────────────────────────
function calcDurationFromToday(endDate) {
    if (!endDate) return "—";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return "Ended";
    let years  = end.getFullYear() - today.getFullYear();
    let months = end.getMonth()    - today.getMonth();
    let days   = end.getDate()     - today.getDate();
    if (days < 0) {
        months--;
        const lastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        days += lastDay;
    }
    if (months < 0) { years--; months += 12; }
    const parts = [];
    if (years  > 0) parts.push(`${years} Year${years   > 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? "s" : ""}`);
    if (days   > 0) parts.push(`${days} Day${days     > 1 ? "s" : ""}`);
    return parts.length ? parts.join(", ") : "< 1 Day";
}

function calculateAgeFromDob(dob) {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function formatMoney(v) {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(v || 0);
    } catch (e) {
        console.error("Error formatting money:", e);
        return "₹0";
    }
}

function esc(s) {
    return String(s)
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getSectionEntries(tabId) {
    if (tabId === "standard") return activeEntries();
    return ((appData.tabData || {})[tabId] || []);
}

function setSectionEntries(tabId, entries) {
    if (tabId === "inflow") entries = normalizeInvestmentEntries(entries);
    if (tabId === "standard") {
        setActiveEntries(entries);
        return;
    }
    if (!appData.tabData) appData.tabData = {};
    appData.tabData[tabId] = entries || [];
    scheduleSave();
}

function getSectionSubmitButton(tabId) {
    const cfg = sectionConfig[tabId];
    return cfg?.form()?.querySelector("button[type='submit']") || null;
}

function updateSectionSubmitButton(tabId) {
    const btn = getSectionSubmitButton(tabId);
    if (!btn) return;
    const cfg = sectionConfig[tabId] || {};
    btn.textContent = editingEntryIds[tabId] ? (cfg.submitText || "Save") : (cfg.addText || "Add");
}

function clearEditing(tabId) {
    editingEntryIds[tabId] = null;
    updateSectionSubmitButton(tabId);
}

function readSectionFormEntry(tabId) {
    const cfg = sectionConfig[tabId];
    const fields = TAB_FIELDS[tabId === "standard" ? activeTabId : tabId] || TAB_FIELDS.monthlyBudget;
    const entry = { id: editingEntryIds[tabId] || crypto.randomUUID() };

    fields.forEach(f => {
        const input = document.getElementById(`${cfg.prefix}_${f.id}`);
        if (!input) return;
        if (f.type === "number") {
            entry[f.id] = input.value === "" ? "" : Number(input.value || 0);
        } else if (f.type === "date" && input.value.trim() === "") {
            entry[f.id] = tabId === "gifts" ? getDefaultDateValue() : "";
        } else {
            entry[f.id] = input.value.trim();
        }
    });

    return normalizeEntry(tabId, entry);
}

function populateSectionForm(tabId, entry) {
    const cfg = sectionConfig[tabId];
    const fields = TAB_FIELDS[tabId === "standard" ? activeTabId : tabId] || TAB_FIELDS.monthlyBudget;
    if (tabId === "inflow") entry = normalizeInvestmentEntry(entry);
    fields.forEach(f => {
        const input = document.getElementById(`${cfg.prefix}_${f.id}`);
        if (!input) return;
        
        // For financial goals, convert stored values to display values
        let value = entry[f.id] ?? "";
        if (tabId === "financialGoal" && f.id === "goalType") {
            const goalTypeDisplayMap = {
                "ShortTerm": "Short Term",
                "MidTerm": "Mid Term",
                "LongTerm": "Long Term"
            };
            value = goalTypeDisplayMap[value] || value;
        }
        
        input.value = value;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    if (tabId === "cards") {
        document.getElementById("card_isPrimary")?.dispatchEvent(new Event("change", { bubbles: true }));
    }
    
    // For financial goals, if the goal type is already set, mark it as manually selected
    // to prevent auto-selection from overriding it
    if (tabId === "financialGoal" && entry.goalType) {
        const goalTypeInput = document.getElementById("goal_goalType");
        if (goalTypeInput) {
            goalTypeInput.dataset.manuallySelected = 'true';
            goalTypeInput.dataset.autoSelected = 'false';
        }
    }
    
    updateSectionSubmitButton(tabId);
}

function beginEditEntry(tabId, id) {
    const entry = getSectionEntries(tabId).find(i => i.id === id);
    if (!entry) return;
    editingEntryIds[tabId] = id;
    const cfg = sectionConfig[tabId];
    
    // Clear dynamic fields to force re-render with new values
    const dynamicFieldsMap = {
        financialGoal: goalDynamicFields,
        inflow: inflowDynamicFields,
        outflow: outflowDynamicFields,
        cards: cardDynamicFields,
        netWorth: netWorthDynamicFields,
        taxPlan: taxPlanDynamicFields,
        gifts: giftsDynamicFields,
        insurance: insuranceDynamicFields,
    };
    const dynamicFields = dynamicFieldsMap[tabId];
    if (dynamicFields) dynamicFields.innerHTML = "";
    
    cfg.render();
    populateSectionForm(tabId, entry);
    cfg.form()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function upsertSectionEntry(tabId, entry) {
    const entries = getSectionEntries(tabId);
    const editId = editingEntryIds[tabId];
    if (editId) {
        setSectionEntries(tabId, entries.map(item => item.id === editId ? { ...item, ...entry, id: editId } : item));
    } else {
        setSectionEntries(tabId, [entry, ...entries]);
    }
    clearEditing(tabId);
    
    // Trigger notification check after updating entry (user action)
    if (window.triggerNotificationCheck) {
        console.log('[Notification] Entry updated, triggering notification check');
        window.triggerNotificationCheck({ isUserAction: true });
    }
}

function resetSectionForm(tabId) {
    const cfg = sectionConfig[tabId];
    cfg.form()?.reset();
    if (tabId === "inflow") {
        const frequency = document.getElementById("inflow_frequency");
        if (frequency) frequency.value = "One-Time";
        updateInflowCalculatedValuePreview();
    }
    if (tabId === "gifts") {
        const giftDateInput = document.getElementById("gifts_date");
        if (giftDateInput) giftDateInput.value = getDefaultDateValue();
    }
    updateSectionSubmitButton(tabId);
}

function renderRowActions(id) {
    return `<div class="row-actions"><button class="btn-edit" type="button" data-id="${id}">Edit</button><button class="btn-delete" type="button" data-id="${id}">Delete</button></div>`;
}

function handleTableAction(tabId, e) {
    const editBtn = e.target.closest(".btn-edit");
    if (editBtn) {
        beginEditEntry(tabId, editBtn.dataset.id);
        return;
    }
    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
        deleteEntry(deleteBtn.dataset.id);
        // Trigger notification check after deleting entry (user action)
        if (window.triggerNotificationCheck) {
            console.log('[Notification] Entry deleted, triggering notification check');
            window.triggerNotificationCheck({ isUserAction: true });
        }
    }
}

function normalizeGoalStatus(goal) {
    const needed = Number(goal.amountNeeded);
    const accumulated = Number(goal.amountAccumulated || 0);

    const targetDate = goal.targetDate
        ? new Date(`${goal.targetDate}T23:59:59`)
        : null;

    const now = new Date();
    const datePassed = targetDate && targetDate < now;

    if (!datePassed) {
        if (accumulated === 0) return "Planned";
        if (accumulated < needed) return "Ongoing";
        return "Achieved";
    }

    if (accumulated < needed) return "Missed";

    return "Completed";
}

function formatHumanFriendlyDate(dateString) {
    if (!dateString) return "—";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // Add ordinal suffix to day (1st, 2nd, 3rd, 4th, etc.)
    const suffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };
    
    return `${day}${suffix(day)} ${month} ${year}`;
}

function monthsBetween(startDate, endDate = new Date()) {
    if (!startDate) return 0;
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime()) || start > endDate) return 0;
    return Math.max(0, (endDate.getFullYear() - start.getFullYear()) * 12 + (endDate.getMonth() - start.getMonth()));
}

function normalizeInvestmentFrequency(item = {}) {
    if (item.frequency) return item.frequency === "Annually" ? "Annual" : item.frequency;
    if (item.category === "Monthly") return "Monthly";
    return "One-Time";
}

function normalizeInvestmentEntry(entry = {}) {
    const normalized = { ...entry };
    normalized.frequency = normalizeInvestmentFrequency(normalized);
    delete normalized.category;
    normalized.currentValue = calculateInvestmentCurrentValue(normalized);
    return normalized;
}

function normalizeInvestmentEntries(entries = []) {
    return entries.map(normalizeInvestmentEntry);
}

function yearsBetweenDates(startDate, endDate = new Date()) {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.max(0, (end - start) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000));
}

function calculateInvestmentCurrentValue(item = {}) {
    const amount = Number(item.amount || 0);
    const annualRate = Number(item.interestRate || 0) / 100;
    const years = yearsBetweenDates(item.startDate, new Date());
    if (amount <= 0 || years <= 0) return amount;
    if (annualRate <= 0) {
        // No interest: for recurring, total = amount × number of periods elapsed
        const freq = normalizeInvestmentFrequency(item);
        if (freq === "One-Time") return amount;
        return amount * Math.round(years * getPeriodsPerYear(freq));
    }
    const freq = normalizeInvestmentFrequency(item);
    if (freq === "One-Time") {
        // Lump sum compound interest
        return amount * Math.pow(1 + annualRate, years);
    }
    // Recurring investment: Future Value of Annuity
    const periodsPerYear = getPeriodsPerYear(freq);
    const ratePerPeriod = annualRate / periodsPerYear;
    const totalPeriods = Math.round(years * periodsPerYear);
    if (totalPeriods <= 0) return amount;
    // FV = P × [((1+r)^n - 1) / r] × (1+r)  (annuity due, invested at start of period)
    return amount * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod) * (1 + ratePerPeriod);
}

function getInflowCurrentValue(item) {
    return calculateInvestmentCurrentValue(item);
}

function getOutflowAnnualAmount(item) {
    const amount = Number(item.amount || 0);
    const freq = item.frequency || "Monthly";
    if (freq === "Monthly") return amount * 12;
    if (freq === "Quarterly") return amount * 4;
    if (freq === "Semi-Annual") return amount * 2;
    if (freq === "Annual") return amount;
    return amount; // One-Time
}

function getDateProgress(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

function normalizeEntry(tabId, entry) {
    if (tabId === "financialGoal") {
        entry.status = normalizeGoalStatus(entry);
        
        // Normalize goal type: convert display values to stored values
        const goalTypeMap = {
            "Short Term": "ShortTerm",
            "Mid Term": "MidTerm",
            "Long Term": "LongTerm"
        };
        if (entry.goalType && goalTypeMap[entry.goalType]) {
            entry.goalType = goalTypeMap[entry.goalType];
        }
    }
    if (tabId === "inflow") {
        entry = normalizeInvestmentEntry(entry);
    }
    if (tabId === "cards" && entry.isPrimary === "Yes") {
        entry.purpose = "Expenditure";
    }
    return entry;
}

// P2: Shared variable expenditure calculator (deduplicated from two identical implementations)
function calcVariableExpenditure(monthData, prevKey, overrideExpBalance) {
    const cards = (appData.tabData || {}).cards || [];
    const expAccount = cards.find(c => c.isPrimary === "Yes");
    const expBalance = overrideExpBalance != null ? overrideExpBalance : Number(expAccount?.balance || 0);
    const transferDone = Number(monthData._transferDone || 0);
    const prevMonthCarryData = (appData.monthlyBudgetData || {})[prevKey];
    const prevCarryForward = Number(prevMonthCarryData?._carryForwardDone || 0);
    const initialBalance = Number(monthData._initialBalance || 0);
    const totalFunded = initialBalance > 0 ? initialBalance : (transferDone + prevCarryForward);

    // Variable expenditure = totalFunded - expBalance (on-demand items tracked separately, not deducted here)
    const varExp = totalFunded > 0 ? Math.max(0, totalFunded - expBalance) : 0;

    if (!monthData.outflow) monthData.outflow = {};
    if (!monthData.autoLinkedFields) monthData.autoLinkedFields = {};
    if (!monthData.autoLinkedBreakdown) monthData.autoLinkedBreakdown = {};
    monthData.outflow.variableExpenditure = varExp;
    monthData.autoLinkedFields["outflow.variableExpenditure"] = true;

    const breakdownItems = [];
    if (totalFunded > 0) {
        if (initialBalance > 0) {
            if (prevCarryForward > 0) breakdownItems.push({ name: "Carry Forward (Last Month)", amount: prevCarryForward, source: "Previous Month Close" });
            if (transferDone > 0) breakdownItems.push({ name: "Salary Leftover Transferred", amount: transferDone, source: "Execute Transfer" });
            const accountInitial = initialBalance - transferDone - prevCarryForward;
            if (accountInitial > 0) breakdownItems.push({ name: "Account Pre-existing Balance", amount: accountInitial, source: "Account Balance" });
            if (breakdownItems.length === 0) breakdownItems.push({ name: "Balance After Transfer", amount: totalFunded, source: "Post-Transfer Balance" });
        } else {
            if (transferDone > 0) breakdownItems.push({ name: "Salary Leftover Transferred", amount: transferDone, source: "Execute Transfer" });
            if (prevCarryForward > 0) breakdownItems.push({ name: "Carry Forward (Last Month)", amount: prevCarryForward, source: "Previous Month Close" });
        }
        breakdownItems.push({ name: "Current Exp Balance", amount: -expBalance, source: "Account Balance" });
    }
    monthData.autoLinkedBreakdown["outflow.variableExpenditure"] = breakdownItems.length > 0
        ? breakdownItems.filter(b => b.amount !== 0)
        : [{ name: "No transfer done yet", amount: 0, source: "Pending" }];

    return { varExp, totalFunded, expBalance, breakdownItems };
}

function isCurrentOrFutureMonth(monthKey) {
    return monthKey >= getMonthKey(new Date());
}

function buildMonthlyAutoValues(monthKey) {
    const values = { inflow: {}, outflow: {}, investing: {} };
    const breakdown = { inflow: {}, outflow: {}, investing: {} };

    // Outflow tab items with type=Liability → auto-populate budget outflow (all frequencies as monthly equivalent)
    const outflowItems = (appData.tabData || {}).outflow || [];
    outflowItems.forEach(item => {
        const amount = Number(item.amount || 0);
        if (amount <= 0) return;
        if (item.endDate && monthKey > item.endDate.slice(0, 7)) return;
        const freq = item.frequency || "Monthly";
        // Convert to monthly equivalent
        if (freq === "One-Time") {
            // One-time items excluded from recurring monthly budget
            return;
        }
        const monthlyAmount = toMonthlyAmount(amount, freq);
        if (monthlyAmount <= 0) return;
        const freqLabel = freq !== "Monthly" ? ` (${freq} ÷ ${freq === "Quarterly" ? 3 : freq === "Semi-Annual" ? 6 : freq === "Annual" ? 12 : 1})` : "";
        if (item.type === "Liability") {
            values.outflow.loanEMI = (values.outflow.loanEMI || 0) + monthlyAmount;
            if (!breakdown.outflow.loanEMI) breakdown.outflow.loanEMI = [];
            breakdown.outflow.loanEMI.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        } else if (item.type === "Insurance") {
            values.outflow.insurancePremiums = (values.outflow.insurancePremiums || 0) + monthlyAmount;
            if (!breakdown.outflow.insurancePremiums) breakdown.outflow.insurancePremiums = [];
            breakdown.outflow.insurancePremiums.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        } else if (item.type === "Expenditure") {
            values.outflow.fixedExpenditure = (values.outflow.fixedExpenditure || 0) + monthlyAmount;
            if (!breakdown.outflow.fixedExpenditure) breakdown.outflow.fixedExpenditure = [];
            breakdown.outflow.fixedExpenditure.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        } else if (item.type === "Saving" || item.type === "Savings") {
            values.outflow.fixedSaving = (values.outflow.fixedSaving || 0) + monthlyAmount;
            if (!breakdown.outflow.fixedSaving) breakdown.outflow.fixedSaving = [];
            breakdown.outflow.fixedSaving.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        } else if (item.type === "Investment") {
            values.outflow.fixedInvestment = (values.outflow.fixedInvestment || 0) + monthlyAmount;
            if (!breakdown.outflow.fixedInvestment) breakdown.outflow.fixedInvestment = [];
            breakdown.outflow.fixedInvestment.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        } else if (item.type === "Others") {
            values.outflow.fixedOthers = (values.outflow.fixedOthers || 0) + monthlyAmount;
            if (!breakdown.outflow.fixedOthers) breakdown.outflow.fixedOthers = [];
            breakdown.outflow.fixedOthers.push({ name: item.name + freqLabel, amount: monthlyAmount, source: "Fixed Outflow" });
        }
    });

    // Inflow tab items → auto-populate budget investing
    // NOTE: onetimeInvestment is now fully editable for ad-hoc investments, not auto-calculated
    const inflowItems = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);
    inflowItems.forEach(inv => {
        const amount = Number(inv.amount || 0);
        if (amount <= 0) return;
        if (inv.startDate && monthKey < inv.startDate.slice(0, 7)) return;
        if (inv.endDate && monthKey > inv.endDate.slice(0, 7)) return;
        const freq = normalizeInvestmentFrequency(inv);
        // On-Demand Investment is now fully editable - removed auto-calculation
        // Users can manually enter ad-hoc investments in the budget edit page
        // if (freq === "Monthly") {
        //     values.investing.onetimeInvestment = (values.investing.onetimeInvestment || 0) + amount;
        // }
        // if (freq === "Quarterly" && inv.startDate && ((Number(monthKey.slice(5, 7)) - Number(inv.startDate.slice(5, 7)) + 12) % 3 === 0)) {
        //     values.investing.onetimeInvestment = (values.investing.onetimeInvestment || 0) + amount;
        // }
        // if (freq === "Semi-Annual" && inv.startDate && ((Number(monthKey.slice(5, 7)) - Number(inv.startDate.slice(5, 7)) + 12) % 6 === 0)) {
        //     values.investing.onetimeInvestment = (values.investing.onetimeInvestment || 0) + amount;
        // }
        // if (freq === "Annual" && inv.startDate && monthKey.slice(5) === inv.startDate.slice(5, 7)) {
        //     values.investing.onetimeInvestment = (values.investing.onetimeInvestment || 0) + amount;
        // }
        // One-time inflow items excluded from recurring monthly budget
    });

    return { values, breakdown };
}

function applyMonthlyAutoValues(monthKey, monthData, forceApply = false) {
    logger.info('Applying monthly auto values', { monthKey, forceApply });
    
    monthData.autoLinkedFields = monthData.autoLinkedFields || {};
    monthData.autoLinkedBreakdown = monthData.autoLinkedBreakdown || {};
    
    // Preserve Current Month CC Spending value from Quick Update before clearing
    const preservedCCValue = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    
    if (!forceApply && !isCurrentOrFutureMonth(monthKey)) {
        logger.info('Skipping auto values for past month', { monthKey });
        return monthData.autoLinkedFields;
    }
    
    Object.keys(monthData.autoLinkedFields).forEach(key => {
        const [category, fieldId] = key.split(".");
        // Skip clearing midMonthCCOutstanding - it's managed by Quick Update
        if (fieldId === "midMonthCCOutstanding") return;
        if (monthData[category]) monthData[category][fieldId] = 0;
        delete monthData.autoLinkedFields[key];
        delete monthData.autoLinkedBreakdown[key];
    });
    
    const { values, breakdown } = buildMonthlyAutoValues(monthKey);
    
    Object.entries(values).forEach(([category, fieldValues]) => {
        if (!monthData[category]) monthData[category] = {};
        Object.entries(fieldValues).forEach(([fieldId, value]) => {
            monthData[category][fieldId] = value;
            monthData.autoLinkedFields[`${category}.${fieldId}`] = true;
            monthData.autoLinkedBreakdown[`${category}.${fieldId}`] = breakdown[category][fieldId] || [];
        });
    });

    // Auto-calculate Previous Month CC Bill (Unpaid) from previous month closing
    // Formula: creditCardOutstanding = (previous month's actual CC outstanding) - (settled amount in current month)
    const prevDate = new Date(monthKey + "-15");
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevKey = getMonthKey(prevDate);
    const prevData = (appData.monthlyBudgetData || {})[prevKey];
    if (prevData && prevData._monthClosed) {
        // Use the actual outstanding amount after settlements if available, otherwise use the original midMonthCCOutstanding
        const prevCC = Number(prevData._actualCCOutstanding ?? prevData.outflow?.midMonthCCOutstanding ?? 0);
        // Subtract any settlements made in the current month
        const settledAmount = Number(monthData._ccSettlementAmount || 0);
        // Cap the settlement at the previous month's outstanding amount to prevent negative values
        const effectiveSettledAmount = Math.min(settledAmount, prevCC);
        const calculatedCC = Math.max(0, prevCC - effectiveSettledAmount);
        
        if (!monthData.outflow) monthData.outflow = {};
        monthData.outflow.creditCardOutstanding = calculatedCC;
        // Always mark as auto-linked to prevent editing, even if value is 0
        monthData.autoLinkedFields["outflow.creditCardOutstanding"] = true;
        
        if (calculatedCC > 0) {
            const breakdownItems = [
                { name: "Carried over from " + prevDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), amount: prevCC, source: "Previous Month Close" }
            ];
            if (effectiveSettledAmount > 0) {
                breakdownItems.push({ name: "Less: Settled from Savings", amount: -effectiveSettledAmount, source: "Current Month Settlement" });
            }
            monthData.autoLinkedBreakdown["outflow.creditCardOutstanding"] = breakdownItems;
        } else if (prevCC > 0 && effectiveSettledAmount >= prevCC) {
            // Fully settled
            monthData.autoLinkedBreakdown["outflow.creditCardOutstanding"] = [
                { name: "Carried over from " + prevDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), amount: prevCC, source: "Previous Month Close" },
                { name: "Less: Settled from Savings (fully settled)", amount: -effectiveSettledAmount, source: "Current Month Settlement" }
            ];
        } else {
            monthData.autoLinkedBreakdown["outflow.creditCardOutstanding"] = [
                { name: "No CC outstanding from previous month", amount: 0, source: "Previous Month Close" }
            ];
        }
        
        logger.info('Auto-calculated CC Outstanding with settlement', { 
            monthKey, 
            prevCC, 
            settledAmount,
            effectiveSettledAmount,
            calculatedCC 
        });
    } else {
        // If there's a value but it wasn't auto-calculated (legacy data), still mark as auto-linked to prevent editing
        const existingCC = Number(monthData.outflow?.creditCardOutstanding || 0);
        if (existingCC > 0) {
            monthData.autoLinkedFields["outflow.creditCardOutstanding"] = true;
            monthData.autoLinkedBreakdown["outflow.creditCardOutstanding"] = [
                { name: "CC Outstanding (existing value)", amount: existingCC, source: "Existing Data" }
            ];
        }
    }

    // P2: Deduplicated — use shared helper
    const varExpResult = calcVariableExpenditure(monthData, prevKey);
    
    logger.info('Variable expenditure auto-calculated with breakdown', { 
        monthKey, 
        totalFunded: varExpResult.totalFunded, 
        expBalance: varExpResult.expBalance, 
        variableExpenditure: varExpResult.varExp,
        breakdown: varExpResult.breakdownItems
    });

    // Auto-calculate Current Month CC Spending from Quick Update data (applies to all months)
    // Restore the preserved value to prevent it from being reset to 0
    if (!monthData.outflow) monthData.outflow = {};
    monthData.outflow.midMonthCCOutstanding = preservedCCValue;
    // Mark as auto-linked to show it comes from Quick Update
    monthData.autoLinkedFields["outflow.midMonthCCOutstanding"] = true;
    monthData.autoLinkedBreakdown["outflow.midMonthCCOutstanding"] = [
        { name: "Current Month CC Spending", amount: preservedCCValue, source: "Quick Update (Mid-Month)" }
    ];

    return monthData.autoLinkedFields;
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
    const tab = getTabs().find(t => t.id === activeTabId) || DEFAULT_TABS[0];
    // Removed activeSubtitle update - now using static tagline
    renderTabs();

    // All UI panels
    const dashboardUI = document.getElementById("dashboardUI");
    const allPanels = { dashboardUI, monthlyBudgetUI, expenseTrackingUI, standardUI, financialGoalUI, inflowUI, outflowUI, insuranceUI, cardsUI, netWorthUI, taxPlanUI, giftsUI, emergencyFundUI };
    // Hide all panels first
    Object.values(allPanels).forEach(p => { if (p) p.hidden = true; });

    const panelMap = {
        dashboard:       { panel: dashboardUI,         render: () => renderDashboardTab() },
        monthlyBudget:   { panel: monthlyBudgetUI,     render: renderMonthlyBudget },
        expenseTracking: { panel: expenseTrackingUI,   render: renderExpenseTracking },
        financialGoal:   { panel: financialGoalUI,     render: renderFinancialGoal },
        inflow:          { panel: inflowUI,            render: renderInflow },
        outflow:         { panel: outflowUI,           render: renderOutflow },
        cards:           { panel: cardsUI,             render: renderCards },
        netWorth:        { panel: netWorthUI,          render: renderNetWorth },
        taxPlan:         { panel: taxPlanUI,           render: renderTaxPlan },
        gifts:           { panel: giftsUI,             render: renderGifts },
        emergencyFund:   { panel: emergencyFundUI,     render: renderEmergencyFund },
        insurance:       { panel: insuranceUI,         render: renderInsurance },
    };

    const entry = panelMap[activeTabId];
    if (entry && entry.panel) {
        entry.panel.hidden = false;
        // P2: Lazy-load Chart.js for chart-heavy tabs, re-render once loaded
        const chartTabs = ['monthlyBudget', 'expenseTracking', 'inflow', 'outflow', 'netWorth', 'gifts'];
        if (chartTabs.includes(activeTabId) && typeof Chart === 'undefined') {
            const tabIdWaitingForCharts = activeTabId;
            ensureChartJs()
                .then(() => {
                    // The user may have switched tabs while Chart.js was loading.
                    if (activeTabId === tabIdWaitingForCharts) entry.render();
                })
                .catch(error => {
                    logger.error('Chart.js failed to load', { message: error.message, tabId: tabIdWaitingForCharts });
                    showToast('Charts could not be loaded. Please check your connection and try again.', { variant: 'error' });
                });
            return;
        }
        entry.render();
    } else {
        standardUI.hidden = false;
        renderDynamicFields();
        updateSectionSubmitButton("standard");
        const entries = activeEntries();
        renderTableHead();
        renderRows(entries);
    }
}

function renderDashboardTab() {
    renderDashboard(appData, getDashboardNetWorthSummary());
}

function getDashboardNetWorthSummary() {
    const manualEntries = (appData.tabData || {}).netWorth || [];
    // Use the same auto-entry builder as the Net Worth tab. This must remain
    // shared so both views always show identical totals.
    const autoEntries = getAutoNetWorthEntries();
    const allEntries = [...autoEntries, ...manualEntries];
    const assets = allEntries.filter(e => e.type === 'Asset');
    const liabilities = allEntries.filter(e => e.type === 'Liability');
    const totalAssets = assets.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    return {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        assetCount: assets.length,
        liabilityCount: liabilities.length
    };
}

function renderMonthlyBudget() {
    // Handle annual view toggle
    if (isAnnualBudgetView) {
        annualSummarySection.hidden = false;
        monthlyViewSection.hidden = true;
        calculateAnnualSummary();
        // Hide edit and close buttons in annual view
        if (toggleBudgetEdit) toggleBudgetEdit.hidden = true;
        if (btnCarryForward) btnCarryForward.hidden = true;
        return;
    } else {
        annualSummarySection.hidden = true;
        monthlyViewSection.hidden = false;
        if (annualPieChart) { annualPieChart.destroy(); annualPieChart = null; }
        // Show edit and close buttons in monthly view
        if (toggleBudgetEdit) toggleBudgetEdit.hidden = false;
        if (btnCarryForward) btnCarryForward.hidden = false;
    }

    const monthKey = getMonthKey(currentMonth);
    currentMonthDisplay.textContent = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    
    // Get or create month data with safe defaults
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    const monthData = appData.monthlyBudgetData[monthKey] || {
        inflow: {},
        outflow: {},
        investing: {},
        monthEndBalance: 0
    };
    
    // Ensure _transferDone is reset for new months (only for current/future months)
    const today = new Date();
    const isCurrentOrFutureMonth = monthKey >= getMonthKey(today);
    if (isCurrentOrFutureMonth && monthData._transferDone === undefined) {
        monthData._transferDone = 0;
    }
    
    appData.monthlyBudgetData[monthKey] = monthData;
    const autoLinkedFields = applyMonthlyAutoValues(monthKey, monthData);

    // Check if this month is closed (read-only)
    const isMonthClosed = Boolean(monthData._monthClosed);

    // Month-end banner: show if previous month not closed yet
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = getMonthKey(prevMonth);
    const prevMonthData = (appData.monthlyBudgetData || {})[prevMonthKey];
    const budgetStatusEl = document.getElementById("budgetStatus");
    if (budgetStatusEl) {
        if (isMonthClosed) {
            let savedStatus = monthData._closedBudgetStatus || "";
            let savedStatusType = monthData._closedBudgetStatusType || "neutral";
            
            // Fallback: if status wasn't saved (month closed before fix), recalculate it
            if (!savedStatus) {
                const inflowTotal = Object.values(monthData.inflow || {}).reduce((s, v) => s + Number(v || 0), 0);
                const allOutflows = ((appData.tabData || {}).outflow || []);
                let fixedMonthlyOutflow = 0;
                allOutflows.forEach(e => {
                    const amount = Number(e.amount || 0);
                    if (amount <= 0) return;
                    const freq = e.frequency || "Monthly";
                    const monthlyAmt = toMonthlyAmount(amount, freq);
                    fixedMonthlyOutflow += monthlyAmt;
                });
                // Exclude borrowing from spendable as it's not new income
                const borrowing = Number(monthData.inflow?.borrowing || 0);
                const inflowWithoutBorrowing = inflowTotal - borrowing;
                const spendable = inflowWithoutBorrowing - fixedMonthlyOutflow;
                const variableExp = Number(monthData.outflow?.variableExpenditure || 0);
                const creditCardOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
                const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
                const ccSettlementAmount = Number(monthData._ccSettlementAmount || 0);
                // Note: creditCardOutstanding is already reduced by settlements when user clicks "Settle from Saving"
                const actualCCOutstanding = creditCardOutstanding + midMonthCC;
                
                // On-demand items (saving, investment, expenditure, liability)
                const ondemandSaving = Number(monthData.investing?.onetimeSaving || 0);
                const ondemandInvestment = Number(monthData.investing?.onetimeInvestment || 0);
                const ondemandExpenditure = Number(monthData.investing?.ondemandExpenditure || 0);
                const ondemandLiability = Number(monthData.investing?.ondemandLiability || 0);
                const totalOndemand = ondemandSaving + ondemandInvestment + ondemandExpenditure + ondemandLiability;
                
                // Use corrected calculation: exclude on-demand from variable, then sum
                const actualVariableExp = variableExp - totalOndemand;
                const totalAllocated = (actualVariableExp + actualCCOutstanding) + totalOndemand;
                const budgetBalance = spendable - totalAllocated;
                
                // Store calculated values for Dashboard to use (single source of truth)
                monthData._calculatedBudgetBalance = budgetBalance;
                
                if (budgetBalance > 0) {
                    savedStatus = `Budget Surplus: +${formatMoney(budgetBalance)} remaining`;
                    savedStatusType = "positive";
                } else if (budgetBalance < 0) {
                    savedStatus = `Over Budget: ${formatMoney(Math.abs(budgetBalance))} overspent`;
                    savedStatusType = "negative";
                } else {
                    savedStatus = `Budget Balanced — all income allocated`;
                    savedStatusType = "neutral";
                }
                
                // Save the recalculated status for future reference
                monthData._closedBudgetStatus = savedStatus;
                monthData._closedBudgetStatusType = savedStatusType;
                scheduleSave();
            }
            
            // Clear any CSS classes from parent and set the appropriate status class
            budgetStatusEl.className = "budget-status";
            if (savedStatusType === "negative") {
                budgetStatusEl.classList.add("negative");
            } else if (savedStatusType === "neutral") {
                budgetStatusEl.classList.add("neutral");
            } else { // positive
                budgetStatusEl.classList.add("positive");
            }
            
            budgetStatusEl.innerHTML = `
                ${savedStatus ? `<div style="margin-bottom: 8px;">${savedStatus}</div>` : ""}
                <div>This month's budget is closed and read-only.</div>
            `;
        } else {
            budgetStatusEl.innerHTML = "";
            budgetStatusEl.className = "budget-status";
        }
    }
    
    // Update toggle button text — disable edit for closed months
    if (isMonthClosed) {
        setToggleButtonClosed(toggleBudgetEdit, "Closed");
        toggleBudgetEdit.disabled = true;
        toggleBudgetEdit.title = "This month's budget is closed";
        if (isBudgetEditMode) isBudgetEditMode = false;
    } else {
        setToggleButtonIconText(toggleBudgetEdit, isBudgetEditMode, "Edit");
        toggleBudgetEdit.disabled = false;
        toggleBudgetEdit.title = "";
    }
    
    // Show/hide preview/edit modes
    if (isBudgetEditMode && !isMonthClosed) {
        budgetPreview.hidden = true;
        budgetEdit.hidden = false;
        
        // Render category fields in edit mode
        renderCategoryFields(inflowFields, MONTHLY_BUDGET_CATEGORIES.inflow, monthData.inflow, autoLinkedFields, monthData.autoLinkedBreakdown);
        renderCategoryFields(outflowFields, MONTHLY_BUDGET_CATEGORIES.outflow, monthData.outflow, autoLinkedFields, monthData.autoLinkedBreakdown);
        renderCategoryFields(investingFields, MONTHLY_BUDGET_CATEGORIES.investing, monthData.investing, autoLinkedFields, monthData.autoLinkedBreakdown);
        // monthEndBalance removed – primary account balance is used instead
        
        // Update edit mode totals
        const inflowTotal = Object.values(monthData.inflow).reduce((s, v) => s + Number(v || 0), 0);
        const outflowTotal = Object.values(monthData.outflow).reduce((s, v) => s + Number(v || 0), 0);
        const investingTotal = sumCategoryNumericValues(monthData.investing);
        document.getElementById("inflowTotalEdit").textContent = formatMoney(inflowTotal);
        document.getElementById("outflowTotalEdit").textContent = formatMoney(outflowTotal);
        document.getElementById("investingTotalEdit").textContent = formatMoney(investingTotal);
    } else {
        budgetPreview.hidden = false;
        budgetEdit.hidden = true;
        
        // Render preview mode (pass auto-linked info for clickable breakdown)
        renderCategoryPreview(inflowPreview, MONTHLY_BUDGET_CATEGORIES.inflow, monthData.inflow, monthData.autoLinkedFields, monthData.autoLinkedBreakdown, "inflow");
        renderCategoryPreview(outflowPreview, MONTHLY_BUDGET_CATEGORIES.outflow, monthData.outflow, monthData.autoLinkedFields, monthData.autoLinkedBreakdown, "outflow");
        renderCategoryPreview(investingPreview, MONTHLY_BUDGET_CATEGORIES.investing, monthData.investing, monthData.autoLinkedFields, monthData.autoLinkedBreakdown, "investing");
        const investingTotalVal = sumCategoryNumericValues(monthData.investing);
        const investingSection = document.getElementById("investingPreviewSection");
        if (investingSection) investingSection.hidden = (investingTotalVal === 0);

        // Calculate and display totals
        calculateAndDisplaySummary(monthData);
        
        // Render pie chart
        renderPieChart(monthData);
    }
}

function renderCategoryPreview(container, fields, data, autoLinkedFields, autoLinkedBreakdown, categoryName) {
    container.innerHTML = "";
    const alf = autoLinkedFields || {};
    const alb = autoLinkedBreakdown || {};
    fields.forEach(field => {
        const value = Number(data[field.id] || 0);
        const fieldKey = `${categoryName}.${field.id}`;
        const isAutoField = Boolean(alf[fieldKey]);
        if (value > 0 || isAutoField) {
            const item = document.createElement("div");
            item.className = "category-preview-item";
            const isAuto = isAutoField;
            const breakdown = (alb[fieldKey]) || [];
            let badgeHtml = "";
            if (isAuto) {
                badgeHtml = `<span class="auto-badge auto-badge-clickable auto-preview-badge" data-field-key="${fieldKey}" style="cursor:pointer" title="Click to see breakdown">auto</span>`;
            }
            // Check for description (on-demand fields)
            const descKey = field.id + "Desc";
            const userDescription = data[descKey] || "";
            const defaultDescription = field.description || "";
            const description = userDescription || defaultDescription;
            let descTooltipHtml = "";
            if (description) {
                descTooltipHtml = ` title="${esc(description)}"`;
            }
            item.innerHTML = `
                <span class="label"${descTooltipHtml}>${field.label}${badgeHtml}</span>
                <span class="value">${formatMoney(value)}</span>
            `;
            // Attach click handler for auto badge
            if (isAuto && breakdown.length > 0) {
                const badge = item.querySelector(".auto-preview-badge");
                if (badge) {
                    badge.addEventListener("click", (e) => {
                        e.stopPropagation();
                        showAutoCalcPopup(e.target, field.label, breakdown);
                    });
                }
            }
            container.appendChild(item);
        }
    });
    
    if (container.children.length === 0) {
        container.innerHTML = `<div class="category-preview-item" style="color: var(--dim);">No entries</div>`;
    }
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getFinancialYearStartYear(date = currentMonth) {
    return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

function getFinancialYearLabel(startYear) {
    return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getFinancialYearMonthKeys(startYear) {
    return Array.from({ length: 12 }, (_, idx) => {
        const d = new Date(startYear, 3 + idx, 1);
        return getMonthKey(d);
    });
}

const getMonthlyDistribution = getMonthlyBudgetDistribution;

// ── Expense Tracking ──────────────────────────────────────────────────────────

function getExpenseMonthKey(date = currentExpenseMonth) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getExpenseMonthData(monthKey) {
    if (!appData.expenseTrackingData) appData.expenseTrackingData = {};
    if (!appData.expenseTrackingData[monthKey]) {
        appData.expenseTrackingData[monthKey] = { expenses: [] };
    }
    return appData.expenseTrackingData[monthKey];
}

function renderExpenseTracking() {
    const monthKey = getExpenseMonthKey();
    const monthData = getExpenseMonthData(monthKey);
    const expenses = monthData.expenses || [];
    
    // Update month display
    const monthName = currentExpenseMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    currentExpenseMonthDisplay.textContent = monthName;
    
    // Update toggle button
    setToggleButtonIconText(toggleExpenseEdit, isExpenseEditMode, "Edit");
    
    // Disable/enable next month button based on whether we're at current month
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (nextExpenseMonthBtn) {
        const isAtCurrentMonth = (monthKey >= currentMonthKey);
        nextExpenseMonthBtn.disabled = isAtCurrentMonth;
        nextExpenseMonthBtn.style.opacity = isAtCurrentMonth ? '0.5' : '1';
        nextExpenseMonthBtn.style.cursor = isAtCurrentMonth ? 'not-allowed' : 'pointer';
        nextExpenseMonthBtn.title = isAtCurrentMonth ? 'Cannot track expenses for future months' : 'Go to next month';
    }
    
    // Disable/enable previous month button based on whether we're at onboarding date
    const od = appData.onboardingDate;
    if (prevExpenseMonthBtn && od) {
        const onboardingDate = new Date(od);
        const earliest = new Date(onboardingDate.getFullYear(), onboardingDate.getMonth(), 1);
        const earliestKey = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`;
        const isAtEarliest = (monthKey <= earliestKey);
        prevExpenseMonthBtn.disabled = isAtEarliest;
        prevExpenseMonthBtn.style.opacity = isAtEarliest ? '0.5' : '1';
        prevExpenseMonthBtn.style.cursor = isAtEarliest ? 'not-allowed' : 'pointer';
        prevExpenseMonthBtn.title = isAtEarliest ? 'Cannot view expenses before onboarding date' : 'Go to previous month';
    }
    
    // Show/hide edit mode
    expensePreview.hidden = isExpenseEditMode;
    expenseEdit.hidden = !isExpenseEditMode;
    
    // Hide summary cards and chart in edit mode to make more space for the list
    const expenseSummary = document.getElementById('expenseSummary');
    const expenseChart = document.getElementById('expenseChartContainer');
    if (expenseSummary) expenseSummary.hidden = isExpenseEditMode;
    if (expenseChart) expenseChart.hidden = isExpenseEditMode;
    
    // Set date constraints for the current month
    const expenseDateInput = document.getElementById('expenseDate');
    if (expenseDateInput) {
        // Calculate first and last day of current month
        const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
        const lastDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth() + 1, 0);
        
        // Set min and max attributes
        expenseDateInput.min = firstDay.toISOString().split('T')[0];
        expenseDateInput.max = lastDay.toISOString().split('T')[0];
        
        // If current value is outside range, reset to first day of month
        const currentValue = expenseDateInput.value;
        if (currentValue && (currentValue < expenseDateInput.min || currentValue > expenseDateInput.max)) {
            expenseDateInput.value = expenseDateInput.min;
        }
    }
    
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // Get budget variable expenditure for comparison (use currentMonth from budget tab, not currentExpenseMonth)
    const budgetMonthKey = getMonthKey(currentMonth);
    const budgetData = (appData.monthlyBudgetData || {})[budgetMonthKey];
    const budgetVarExp = budgetData?.outflow?.variableExpenditure || 0;
    const difference = totalExpenses - budgetVarExp;
    
    // Update summary cards
    document.getElementById('expenseTrackingTotalExpenses').textContent = formatMoney(totalExpenses);
    document.getElementById('budgetVariableExp').textContent = formatMoney(budgetVarExp);
    document.getElementById('expenseDifference').textContent = formatMoney(Math.abs(difference));
    document.getElementById('expenseDifference').style.color = difference > 0 ? COLOR_NEGATIVE : COLOR_POSITIVE;
    
    const diffCard = document.getElementById('expenseDifferenceCard');
    if (diffCard) {
        diffCard.querySelector('.summary-label').textContent = difference > 0 ? 'Over Budget' : difference < 0 ? 'Under Budget' : 'On Budget';
    }
    
    // Render expense list (preview mode)
    if (!isExpenseEditMode) {
        renderExpenseList(expenses);
    }
    
    // Render expense table (edit mode)
    if (isExpenseEditMode) {
        renderExpenseTable(expenses);
    }
    
    // Render pie chart (preview mode only)
    if (!isExpenseEditMode) {
        renderExpensePieChart(expenses, totalExpenses, budgetVarExp);
    }
}

function renderExpenseList(expenses) {
    const toolbarEl = document.getElementById("expenseSortFilter");
    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        toolbarEl.innerHTML = buildSortFilterToolbar("expenseTracking");
    }
    
    const displayEntries = applyListSortFilter("expenseTracking", expenses);
    
    if (displayEntries.length === 0) {
        expenseList.innerHTML = '<p class="empty-state">No expenses tracked for this month. Click "Edit" to add expenses.</p>';
        return;
    }
    
    // Group by category
    const byCategory = {};
    displayEntries.forEach(exp => {
        if (!byCategory[exp.category]) {
            byCategory[exp.category] = [];
        }
        byCategory[exp.category].push(exp);
    });
    
    let html = '';
    Object.entries(byCategory).forEach(([category, items]) => {
        // Sort items by amount descending within each category
        items.sort((a, b) => Number(b.amount) - Number(a.amount));
        const categoryTotal = items.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        html += `
            <div class="expense-category-group">
                <div class="expense-category-header">
                    <span class="expense-category-title"><span class="expense-category-icon" aria-hidden="true">${iconSvg(getExpenseCategoryIcon(category), 'expense-category-svg')}</span><span class="expense-category-name">${esc(category)}</span></span>
                    <span class="expense-category-total">${formatMoney(categoryTotal)}</span>
                </div>
                <div class="expense-category-items">
                    ${items.map(exp => `
                        <div class="expense-item">
                            <div class="expense-item-details">
                                <span class="expense-item-date">${new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                <span class="expense-item-category-label">${esc(category)}</span>
                                ${exp.merchant ? `<span class="expense-item-merchant">${esc(exp.merchant)}</span>` : ''}
                                ${exp.description ? `<span class="expense-item-description">${esc(exp.description)}</span>` : ''}
                            </div>
                            <span class="expense-item-amount">${formatMoney(exp.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    expenseList.innerHTML = html;
}

function getExpenseCategoryIcon(category) {
    const icons = {
        'Food & Dining': 'utensils',
        Transportation: 'car',
        Shopping: 'shoppingBag',
        Entertainment: 'film',
        Healthcare: 'heartPulse',
        Education: 'graduationCap',
        'Personal Care': 'sparkles',
        'Home & Utilities': 'home',
        Travel: 'plane',
        'Gifts & Donations': 'gift',
        Others: 'sparkles'
    };
    return icons[category] || 'receipt';
}

function renderExpenseTable(expenses) {
    if (expenses.length === 0) {
        expenseTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No expenses yet. Add your first expense above.</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expenseTableBody.innerHTML = sorted.map(exp => `
        <tr>
            <td>${new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span class="table-category-cell"><span class="expense-category-icon" aria-hidden="true">${iconSvg(getExpenseCategoryIcon(exp.category), 'expense-category-svg')}</span>${esc(exp.category)}</span></td>
            <td>${formatMoney(exp.amount)}</td>
            <td><span class="table-payment-method" title="${exp.paymentMethod || 'Not specified'}">${exp.paymentMethod || 'UPI'}</span></td>
            <td>${exp.merchant ? esc(exp.merchant) : '-'}</td>
            <td>${exp.description ? esc(exp.description) : '-'}</td>
            <td>
                <button onclick="editExpense('${exp.id}')" class="btn-edit" title="Edit expense">Edit</button>
                <button onclick="deleteExpense('${exp.id}')" class="btn-delete" title="Delete expense">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function renderExpensePieChart(expenses, totalExpenses, budgetVarExp) {
    if (!expensePieChartCanvas) return;
    
    // Lazy-load Chart.js if needed
    if (typeof Chart === 'undefined') {
        try {
            await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        } catch (err) {
            console.error('Failed to load Chart.js:', err);
            return;
        }
    }
    
    // Calculate category totals
    const categoryTotals = {};
    expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = 0;
        }
        categoryTotals[exp.category] += Number(exp.amount || 0);
    });
    
    // Add "Unidentified" category if there's a difference
    const difference = budgetVarExp - totalExpenses;
    if (difference > 0) {
        categoryTotals['Unidentified'] = difference;
    }

    // Sort categories: Others and Unidentified at the end, others by amount descending
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => {
        const aIsSpecial = a[0] === 'Others' || a[0] === 'Unidentified';
        const bIsSpecial = b[0] === 'Others' || b[0] === 'Unidentified';
        if (aIsSpecial && !bIsSpecial) return 1;
        if (!aIsSpecial && bIsSpecial) return -1;
        if (aIsSpecial && bIsSpecial) return a[0].localeCompare(b[0]);
        return b[1] - a[1]; // Sort by amount descending
    });

    // Prepare chart data
    const labels = sortedCategories.map(entry => entry[0]);
    const data = sortedCategories.map(entry => entry[1]);
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#6366f1'
    ];
    
    // Destroy existing chart and remove old resize listener
    if (expensePieChart) {
        expensePieChart.destroy();
    }
    if (expensePieChartResizeHandler) {
        window.removeEventListener('resize', expensePieChartResizeHandler);
    }
    
    // Create new chart
    const ctx = expensePieChartCanvas.getContext('2d');
    const isMobile = window.innerWidth < 640;
    expensePieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '62%',
            plugins: {
                legend: {
                    position: isMobile ? "bottom" : "right",
                    align: "center",
                    labels: {
                        color: getChartThemeColors().text,
                        font: { size: 12 },
                        padding: 14,
                        boxWidth: 14,
                        boxHeight: 14,
                        generateLabels: (chart) => {
                            const ds = chart.data.datasets[0];
                            const total = ds.data.reduce((a, b) => a + b, 0);
                            const textColor = getChartThemeColors().text;
                            return chart.data.labels.map((label, i) => ({
                                text: `${label}  ${total > 0 ? Math.round(ds.data[i] / total * 100) : 0}%`,
                                fillStyle: ds.backgroundColor[i],
                                strokeStyle: ds.backgroundColor[i],
                                fontColor: textColor,
                                color: textColor,
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatMoney(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Add resize listener to update legend position
    expensePieChartResizeHandler = () => {
        if (expensePieChart) {
            const newIsMobile = window.innerWidth < 640;
            const currentPosition = expensePieChart.options.plugins.legend.position;
            const newPosition = newIsMobile ? "bottom" : "right";
            if (currentPosition !== newPosition) {
                expensePieChart.options.plugins.legend.position = newPosition;
                expensePieChart.update();
            }
        }
    };
    window.addEventListener('resize', expensePieChartResizeHandler);
}

// Expense form handlers
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const category = document.getElementById('expenseCategory').value;
        const amount = document.getElementById('expenseAmount').value;
        const date = document.getElementById('expenseDate').value;
        const paymentMethod = document.getElementById('expensePaymentMethod')?.value || 'UPI';
        const merchant = document.getElementById('expenseMerchant')?.value || '';
        const description = document.getElementById('expenseDescription')?.value || '';
        
        if (!category || !amount || !date) {
            showToast('Please fill in all required fields', { variant: 'error' });
            return;
        }
        
        const monthKey = getExpenseMonthKey();
        const monthData = getExpenseMonthData(monthKey);
        
        const expense = {
            id: Date.now().toString(),
            category,
            amount: Number(amount),
            date,
            paymentMethod,
            merchant,
            description,
            createdAt: new Date().toISOString()
        };
        
        monthData.expenses.push(expense);
        scheduleSave();
        
        // Reset form
        expenseForm.reset();
        // Set date to first day of current month
        const expenseDateInput = document.getElementById('expenseDate');
        if (expenseDateInput) {
            const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
            expenseDateInput.value = firstDay.toISOString().split('T')[0];
        }
        // Set payment method to default (UPI)
        const paymentSelect = document.getElementById('expensePaymentMethod');
        if (paymentSelect) {
            paymentSelect.value = 'UPI';
        }
        
        renderExpenseTracking();
        showToast('Expense added successfully', { variant: 'success' });
    });
}

// CSV Import functionality
window.downloadExpenseTemplate = function() {
    const csvContent = `Date,Category,Amount,Payment Method,TransactionType,Merchant,Description
2024-01-15,Food & Dining,500,UPI,Debit,Swiggy,Lunch
2024-01-16,Transportation,200,Debit Card,Debit,Uber,Office commute
2024-01-17,Shopping,1500,Credit Card,Debit,Amazon,Electronics
2024-01-18,Entertainment,300,Cash,Debit,Netflix,Monthly subscription
2024-01-19,Healthcare,800,Bank Transfer,Debit,Hospital,Checkup
2024-01-20,Education,5000,UPI,Debit,College,Tuition fee
2024-01-21,Personal Care,500,Cash,Debit,Salon,Haircut
2024-01-22,Home & Utilities,2000,Bank Transfer,Debit,Electricity Board,Monthly bill
2024-01-23,Travel,5000,Credit Card,Debit,MakeMyTrip,Flight tickets
2024-01-24,Gifts & Donations,1000,UPI,Debit,Charity,Donation`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', 'expense_template.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    showToast('Template downloaded! Fill it with your expenses and upload.', { variant: 'success' });
};

const expenseImportBtn = document.getElementById('expenseImportBtn');
const expenseFileImport = document.getElementById('expenseFileImport');

if (expenseImportBtn && expenseFileImport) {
    expenseImportBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const file = expenseFileImport.files[0];
        if (!file) {
            showToast('Please select a CSV or XLSX file', { variant: 'error' });
            return;
        }
        
        try {
            const text = await file.text();
            const rows = text.trim().split('\n').map(row => row.split(',').map(cell => cell.trim()));
            
            if (rows.length < 2) {
                showToast('CSV must have at least a header row and one data row', { variant: 'error' });
                return;
            }
            
            const headers = rows[0].map(h => h.toLowerCase());
            const dateIdx = headers.findIndex(h => h.includes('date'));
            const categoryIdx = headers.findIndex(h => h.includes('category'));
            const amountIdx = headers.findIndex(h => h.includes('amount'));
            const paymentIdx = headers.findIndex(h => h.includes('payment'));
            const transactionTypeIdx = headers.findIndex(h => h.includes('transaction'));
            const merchantIdx = headers.findIndex(h => h.includes('merchant'));
            const descriptionIdx = headers.findIndex(h => h.includes('description'));

            if (dateIdx === -1 || categoryIdx === -1 || amountIdx === -1) {
                showToast('CSV must have Date, Category, and Amount columns', { variant: 'error' });
                return;
            }
            
            const monthKey = getExpenseMonthKey();
            const monthData = getExpenseMonthData(monthKey);
            let imported = 0;
            let errors = [];
            
            // Calculate first and last day of current month for validation
            const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
            const lastDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth() + 1, 0);
            
            const progressDiv = document.getElementById('importProgress');
            const importedCountSpan = document.getElementById('importedCount');
            const progressBar = document.getElementById('importProgressBar');
            
            progressDiv.style.display = 'block';
            
            for (let i = 1; i < rows.length; i++) {
                try {
                    const row = rows[i];
                    if (row.length < 3 || !row[dateIdx] || !row[amountIdx]) continue;
                    
                    const date = new Date(row[dateIdx]);
                    if (isNaN(date.getTime())) {
                        errors.push(`Row ${i + 1}: Invalid date format`);
                        continue;
                    }
                    
                    // Validate date is within current month
                    const dateStr = date.toISOString().split('T')[0];
                    if (date < firstDay || date > lastDay) {
                        errors.push(`Row ${i + 1}: Date ${dateStr} is not in current month (${firstDay.toISOString().split('T')[0]} to ${lastDay.toISOString().split('T')[0]})`);
                        continue;
                    }
                    
                    const amount = Number(row[amountIdx]);
                    if (isNaN(amount) || amount <= 0) {
                        errors.push(`Row ${i + 1}: Invalid amount`);
                        continue;
                    }

                    // Check transaction type - only import if Debit
                    const transactionType = transactionTypeIdx >= 0 ? (row[transactionTypeIdx] || '').toLowerCase() : 'debit';
                    if (transactionType !== 'debit') {
                        errors.push(`Row ${i + 1}: Skipped - Transaction type is '${row[transactionTypeIdx] || 'Unknown'}', only 'Debit' transactions are imported`);
                        continue;
                    }

                    const expense = {
                        id: Date.now().toString() + '_' + i,
                        date: date.toISOString().split('T')[0],
                        category: row[categoryIdx] || 'Others',
                        amount: amount,
                        paymentMethod: (paymentIdx >= 0 ? row[paymentIdx] : 'UPI') || 'UPI',
                        merchant: (merchantIdx >= 0 ? row[merchantIdx] : '') || '',
                        description: (descriptionIdx >= 0 ? row[descriptionIdx] : '') || '',
                        createdAt: new Date().toISOString(),
                        importedFromCSV: true
                    };
                    
                    monthData.expenses.push(expense);
                    imported++;
                    
                    importedCountSpan.textContent = imported;
                    progressBar.style.width = ((i / (rows.length - 1)) * 100) + '%';
                } catch (err) {
                    errors.push(`Row ${i + 1}: ${err.message}`);
                }
            }
            
            scheduleSave();
            progressDiv.style.display = 'none';
            expenseFileImport.value = '';
            
            let message = `Imported ${imported} expense${imported !== 1 ? 's' : ''}`;
            if (errors.length > 0) {
                message += ` (${errors.length} skipped)`;
            }
            
            showToast(message, { variant: imported > 0 ? 'success' : 'error' });
            
            if (errors.length > 0) {
                console.log('Import errors:', errors);
            }
            
            renderExpenseTracking();
        } catch (error) {
            console.error('Error importing CSV:', error);
            showToast('Error reading file: ' + error.message, { variant: 'error' });
        }
    });

    // Clear file button
    const expenseFileClearBtn = document.getElementById('expenseFileClearBtn');
    if (expenseFileClearBtn) {
        expenseFileClearBtn.addEventListener('click', () => {
            const expenseFileImport = document.getElementById('expenseFileImport');
            if (expenseFileImport) {
                expenseFileImport.value = '';
            }
        });
    }
}

// Month navigation
if (prevExpenseMonthBtn) {
    prevExpenseMonthBtn.addEventListener('click', () => {
        // Restrict: Can't go before onboarding date
        const proposed = new Date(currentExpenseMonth);
        proposed.setMonth(proposed.getMonth() - 1);
        const od = appData.onboardingDate;
        if (od) {
            const onboardingDate = new Date(od);
            const earliest = new Date(onboardingDate.getFullYear(), onboardingDate.getMonth(), 1);
            if (proposed < earliest) {
                showToast('Cannot view expenses before onboarding date', { variant: 'error' });
                return;
            }
        }
        
        currentExpenseMonth.setMonth(currentExpenseMonth.getMonth() - 1);
        // Reset date input to first day of new month
        const expenseDateInput = document.getElementById('expenseDate');
        if (expenseDateInput) {
            const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
            expenseDateInput.value = firstDay.toISOString().split('T')[0];
        }
        renderExpenseTracking();
    });
}

if (nextExpenseMonthBtn) {
    nextExpenseMonthBtn.addEventListener('click', () => {
        // Restrict: Can't go beyond current month (can't track future expenses)
        const proposed = new Date(currentExpenseMonth);
        proposed.setMonth(proposed.getMonth() + 1);
        
        const today = new Date();
        const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const proposedMonthKey = `${proposed.getFullYear()}-${String(proposed.getMonth() + 1).padStart(2, '0')}`;
        
        // Block navigation beyond current month
        if (proposedMonthKey > currentMonthKey) {
            showToast('Cannot track expenses for future months', { variant: 'error' });
            return;
        }
        
        currentExpenseMonth.setMonth(currentExpenseMonth.getMonth() + 1);
        // Reset date input to first day of new month
        const expenseDateInput = document.getElementById('expenseDate');
        if (expenseDateInput) {
            const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
            expenseDateInput.value = firstDay.toISOString().split('T')[0];
        }
        renderExpenseTracking();
    });
}

// Toggle edit mode
if (toggleExpenseEdit) {
    toggleExpenseEdit.addEventListener('click', () => {
        isExpenseEditMode = !isExpenseEditMode;
        renderExpenseTracking();
    });
}

// Global functions for edit/delete (called from table)
window.editExpense = function(id) {
    const monthKey = getExpenseMonthKey();
    const monthData = getExpenseMonthData(monthKey);
    const expense = monthData.expenses.find(e => e.id === id);
    
    if (!expense) return;
    
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    const paymentSelect = document.getElementById('expensePaymentMethod');
    if (paymentSelect) {
        paymentSelect.value = expense.paymentMethod || 'UPI';
    }
    
    // Validate and set date - ensure it's within current month range
    const expenseDateInput = document.getElementById('expenseDate');
    const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
    const lastDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth() + 1, 0);
    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];
    
    // Use expense date if it's within current month, otherwise use first day
    if (expense.date >= firstDayStr && expense.date <= lastDayStr) {
        expenseDateInput.value = expense.date;
    } else {
        expenseDateInput.value = firstDayStr;
        showToast('Date reset to first day of current month (original date was in different month)', { variant: 'info' });
    }
    
    // Populate merchant and description fields
    const merchantInput = document.getElementById('expenseMerchant');
    if (merchantInput) {
        merchantInput.value = expense.merchant || '';
    }
    const descriptionInput = document.getElementById('expenseDescription');
    if (descriptionInput) {
        descriptionInput.value = expense.description || '';
    }
    
    // Remove the old expense (will be re-added on submit)
    monthData.expenses = monthData.expenses.filter(e => e.id !== id);
    scheduleSave();
    
    showToast('Edit the expense and click "Add Expense" to save', { variant: 'info' });
};

window.deleteExpense = async function(id) {
    const confirmed = await showConfirm('Delete this expense?', 'This action cannot be undone.');
    if (!confirmed) return;
    
    const monthKey = getExpenseMonthKey();
    const monthData = getExpenseMonthData(monthKey);
    monthData.expenses = monthData.expenses.filter(e => e.id !== id);
    
    scheduleSave();
    renderExpenseTracking();
    showToast('Expense deleted', { variant: 'success' });
};

// Initialize expense date field with current month's first day
if (document.getElementById('expenseDate')) {
    const firstDay = new Date(currentExpenseMonth.getFullYear(), currentExpenseMonth.getMonth(), 1);
    document.getElementById('expenseDate').value = firstDay.toISOString().split('T')[0];
}

function renderFinancialGoal() {
    const entries = activeEntries();
    
    // Update toggle button text
    setToggleButtonIconText(toggleGoalEdit, isGoalEditMode, "Edit");
    
    // Show/hide preview/edit modes
    if (isGoalEditMode) {
        goalPreview.hidden = true;
        goalEdit.hidden = false;
        
        // Hide summary in edit mode
        const goalSummary = document.querySelector('.goal-summary');
        if (goalSummary) goalSummary.hidden = true;
        
        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!goalDynamicFields?.hasChildNodes()) {
            renderGoalDynamicFields();
        }
        updateSectionSubmitButton("financialGoal");
        
        // Render table
        renderGoalTable(entries);
    } else {
        goalPreview.hidden = false;
        goalEdit.hidden = true;
        
        // Show summary in preview mode
        const goalSummary = document.querySelector('.goal-summary');
        if (goalSummary) goalSummary.hidden = false;
        
        // Render preview cards
        renderGoalPreviewCards(entries);
        
        // Calculate and display summary
        calculateGoalSummary(entries);
    }
}

function renderGoalDynamicFields() {
    goalDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.financialGoal || TAB_FIELDS.monthlyBudget;
    
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `goal_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        
        goalDynamicFields.appendChild(div);
    });

    // Status is auto-calculated via normalizeGoalStatus() — no form input needed
    
    // Auto-select goal type based on target date
    const targetDateInput = document.getElementById('goal_targetDate');
    const goalTypeInput = document.getElementById('goal_goalType');
    
    if (targetDateInput && goalTypeInput) {
        // Remove existing listener to avoid duplicates
        const newTargetDateInput = targetDateInput.cloneNode(true);
        targetDateInput.parentNode.replaceChild(newTargetDateInput, targetDateInput);
        
        newTargetDateInput.addEventListener('change', function() {
            const targetDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Only auto-select if user hasn't manually selected a type yet
            const isManuallySelected = goalTypeInput.dataset.manuallySelected === 'true';
            
            if (this.value && !isManuallySelected) {
                const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
                
                // Auto-select goal type based on days difference
                // Short Term: ≤ 1 year, Mid Term: 1-3 years, Long Term: > 3 years
                let autoSelectedType;
                if (daysDiff <= 365) {
                    autoSelectedType = 'Short Term';
                } else if (daysDiff <= 1095) {
                    autoSelectedType = 'Mid Term';
                } else {
                    autoSelectedType = 'Long Term';
                }
                
                // Only auto-select if the current value is empty or was auto-selected
                if (!goalTypeInput.value || goalTypeInput.dataset.autoSelected === 'true') {
                    goalTypeInput.value = autoSelectedType;
                    goalTypeInput.dataset.autoSelected = 'true';
                    
                    // Show a brief toast to indicate auto-selection
                    showToast(`Goal type auto-selected: ${autoSelectedType}`, { variant: 'info', duration: 2000 });
                }
            } else if (!this.value && !isManuallySelected) {
                // If no date selected and not manually selected, default to Long Term
                if (!goalTypeInput.value || goalTypeInput.dataset.autoSelected === 'true') {
                    goalTypeInput.value = 'Long Term';
                    goalTypeInput.dataset.autoSelected = 'true';
                }
            }
        });
        
        // Allow manual override - user can change goal type after auto-selection
        goalTypeInput.addEventListener('change', function() {
            // User manually changed the goal type - mark as manually selected
            // This ensures the selection is NEVER overridden by date changes
            this.dataset.manuallySelected = 'true';
            this.dataset.autoSelected = 'false';
        });
        
        // Set default to Long Term on initial load if no value
        if (!goalTypeInput.value) {
            goalTypeInput.value = 'Long Term';
            goalTypeInput.dataset.autoSelected = 'true';
            goalTypeInput.dataset.manuallySelected = 'false';
        }
    }
}

function renderGoalTable(entries) {
    const fields = TAB_FIELDS.financialGoal || TAB_FIELDS.monthlyBudget;
    
    goalTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const statusTh = document.createElement("th");
    statusTh.textContent = "Status";
    tr.appendChild(statusTh);
    const actionTh = document.createElement("th");
    actionTh.textContent = "";
    tr.appendChild(actionTh);
    goalTableHead.appendChild(tr);
    
    goalTableBody.innerHTML = "";
    goalEmptyState.classList.toggle("visible", entries.length === 0);
    
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                td.textContent = formatMoney(Number(item[f.id] || 0));
                td.className = "amount";
            } else if (f.id === "targetDate" && item[f.id]) {
                td.textContent = formatHumanFriendlyDate(item[f.id]);
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const statusTd = document.createElement("td");
        const status = normalizeGoalStatus(item);
        const statusColors = {
            "Planned": "#eab308",
            "Ongoing": "#3b82f6",
            "Achieved": "#10b981",
            "Completed": "#9ca3af",
            "Missed": "#ef4444"
        };
        statusTd.innerHTML = `<span style="color:${statusColors[status] || "#6b7280"};font-weight:500;">${status}</span>`;
        row.appendChild(statusTd);
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        goalTableBody.appendChild(row);
    });
}

function renderGoalPreviewCards(entries) {
    const toolbarEl = document.getElementById("goalSortFilter");
    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        toolbarEl.innerHTML = buildSortFilterToolbar("financialGoal");
    }

    let displayEntries = applyListSortFilter("financialGoal", entries);
    goalsList.innerHTML = "";

    if (displayEntries.length === 0) {
        goalsList.innerHTML = entries.length === 0
            ? `<div class="empty-state visible" style="background: var(--surf1); border: 1px solid var(--border2); border-radius: 12px;">No goals yet. Click Edit to add goals.</div>`
            : `<div class="empty-state visible" style="background: var(--surf1); border: 1px solid var(--border2); border-radius: 12px;">No results match the current filters.</div>`;
        return;
    }

    // Group by goal type if sorting by goalType or no sort selected (default view)
    const state = listSortFilter.financialGoal;
    if (state.sortBy === "goalType" || state.sortBy === "" || !state.sortBy) {
        // Further sort by status within each group
        const statusOrder = { "Ongoing": 1, "Planned": 2, "Achieved": 3, "Missed": 4, "Completed": 5 };
        displayEntries.sort((a, b) => {
            const statusA = normalizeGoalStatus(a);
            const statusB = normalizeGoalStatus(b);
            return (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
        });
        
        const grouped = {};
        displayEntries.forEach(goal => {
            const type = goal.goalType || "Long Term";
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(goal);
        });
        
        const typeOrder = ["Short Term", "Mid Term", "Long Term", "ShortTerm", "MidTerm", "LongTerm"];
        const sortedTypes = Object.keys(grouped).sort((a, b) => {
            const indexA = typeOrder.indexOf(a);
            const indexB = typeOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        
        sortedTypes.forEach(type => {
            const typeDisplayMap = {
                "ShortTerm": "Short Term",
                "MidTerm": "Mid Term",
                "LongTerm": "Long Term"
            };
            const displayType = typeDisplayMap[type] || type;
            
            const groupHeader = document.createElement("div");
            groupHeader.style.cssText = "font-size:14px;font-weight:600;color:var(--text);margin:16px 0 8px 0;padding:8px 12px;background:var(--surf1);border-radius:8px;border-left:3px solid var(--primary);";
            groupHeader.textContent = `${displayType} Goals (${grouped[type].length})`;
            goalsList.appendChild(groupHeader);
            
            grouped[type].forEach(goal => renderGoalCard(goal));
        });
        return;
    }

    displayEntries.forEach(goal => renderGoalCard(goal));
}

function renderGoalCard(goal) {
        const card = document.createElement("div");
        card.className = "goal-card";
        
        const amountNeeded = Number(goal.amountNeeded || 0);
        const amountAccumulated = Number(goal.amountAccumulated || 0);
        const progress = amountNeeded > 0 ? (amountAccumulated / amountNeeded) * 100 : 0;
        const progressClamped = Math.min(progress, 100);
        const status = normalizeGoalStatus(goal);
        const statusClass = status.toLowerCase();
        
        // Convert stored goal type to display value
        const goalTypeDisplayMap = {
            "ShortTerm": "Short Term",
            "MidTerm": "Mid Term",
            "LongTerm": "Long Term"
        };
        const displayGoalType = goalTypeDisplayMap[goal.goalType] || goal.goalType || "Short Term";
        
        card.innerHTML = `
            <div class="goal-card-header">
                <span class="goal-card-title">${esc(goal.name)}</span>
                <div style="display: flex; gap: 8px;">
                    <span class="goal-card-type">${esc(displayGoalType)}</span>
                    <span class="goal-card-status ${statusClass}">${esc(status)}</span>
                </div>
            </div>
            <div class="goal-card-details">
                ${esc(goal.details || "No details")}<br>
                Target: ${formatHumanFriendlyDate(goal.targetDate)}
            </div>
            <div class="goal-card-progress">
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill ${statusClass}" style="width: ${progressClamped}%"></div>
                </div>
                <div class="goal-progress-text">
                    <span>${formatMoney(amountAccumulated)} / ${formatMoney(amountNeeded)}</span>
                    <span>${progress.toFixed(1)}%</span>
                </div>
            </div>
        `;
        
        goalsList.appendChild(card);
}

function calculateGoalSummary(entries) {
    const totalNeeded = entries.reduce((s, g) => s + Number(g.amountNeeded || 0), 0);
    const totalAccumulated = entries.reduce((s, g) => s + Number(g.amountAccumulated || 0), 0);
    const amountMoreNeeded = Math.max(0, totalNeeded - totalAccumulated);

    document.getElementById("totalGoalNeeded").textContent = formatMoney(totalNeeded);
    document.getElementById("totalGoalAccumulated").textContent = formatMoney(totalAccumulated);
    document.getElementById("amountMoreNeeded").textContent = formatMoney(amountMoreNeeded);
}

// ── Investments Tab (was Inflow) ──────────────────────────────────────────────
function renderInflow() {
    const entries = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);

    if (toggleInflowEdit) setToggleButtonIconText(toggleInflowEdit, isInflowEditMode, 'Edit');

    // Show/hide sub-section tabs only in preview
    const subTabs = document.getElementById("investmentSubTabs");
    if (subTabs) subTabs.hidden = isInflowEditMode;
    
    // Hide investment summary in edit mode
    const investmentSummary = document.querySelector('.investment-summary');
    if (investmentSummary) investmentSummary.hidden = isInflowEditMode;

    if (isInflowEditMode) {
        if (inflowTabPreview) inflowTabPreview.hidden = true;
        if (inflowTabEdit) inflowTabEdit.hidden = false;
        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!inflowDynamicFields?.hasChildNodes()) {
            renderInflowDynamicFields();
        }
        updateSectionSubmitButton("inflow");
        renderInflowTable(entries);
    } else {
        if (inflowTabPreview) inflowTabPreview.hidden = false;
        if (inflowTabEdit) inflowTabEdit.hidden = true;
        if (investmentSummary) investmentSummary.hidden = false;

        // Filter based on active investment view
        let displayEntries = entries;
        const portfolioEl = document.getElementById("portfolioSummary");
        const chartSection = inflowTabPreview?.querySelector(".chart-section");
        const sortFilterEl = document.getElementById("inflowSortFilter");

        if (activeInvestmentView === "existing") {
            displayEntries = entries.filter(e => e.frequency === "One-Time");
            if (portfolioEl) portfolioEl.hidden = true;
            if (chartSection) chartSection.hidden = false;
            if (inflowList) inflowList.hidden = false;
            // Hide frequency filter since view is already filtered by frequency
            if (sortFilterEl) {
                sortFilterEl.innerHTML = buildSortFilterToolbar("inflow", ["frequency"]);
            }
        } else if (activeInvestmentView === "monthly") {
            displayEntries = entries.filter(e => e.frequency !== "One-Time");
            if (portfolioEl) portfolioEl.hidden = true;
            if (chartSection) chartSection.hidden = false;
            if (inflowList) inflowList.hidden = false;
            // Hide frequency filter since view is already filtered by frequency
            if (sortFilterEl) {
                sortFilterEl.innerHTML = buildSortFilterToolbar("inflow", ["frequency"]);
            }
        } else if (activeInvestmentView === "portfolio") {
            if (portfolioEl) portfolioEl.hidden = false;
            if (chartSection) chartSection.hidden = true;
            if (inflowList) inflowList.hidden = true;
            if (sortFilterEl) sortFilterEl.innerHTML = "";
            renderPortfolioSummary(entries);
            calculateInflowSummary(entries);
            return;
        } else {
            if (portfolioEl) portfolioEl.hidden = true;
            if (chartSection) chartSection.hidden = false;
            if (inflowList) inflowList.hidden = false;
        }

        renderInflowPreviewCards(displayEntries);
        calculateInflowSummary(entries);
        renderInflowChart(displayEntries);
    }
}

function renderPortfolioSummary(entries) {
    entries = normalizeInvestmentEntries(entries);
    const existingEntries = entries.filter(e => e.frequency === "One-Time");
    const monthlyEntries = entries.filter(e => e.frequency !== "One-Time");

    // One-time investments from budget
    const budgetData = appData.monthlyBudgetData || {};
    const oneTimeInvestments = [];
    Object.entries(budgetData).forEach(([monthKey, md]) => {
        const amt = Number(md?.investing?.onetimeInvestment || 0);
            if (amt > 0) oneTimeInvestments.push({ name: `Budget Investment (${monthKey})`, amount: amt, currentValue: amt, frequency: "One-Time" });
    });

    function renderList(containerEl, items) {
        if (!containerEl) return;
        containerEl.innerHTML = "";
        if (items.length === 0) {
            containerEl.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;">None</div>`;
            return;
        }
        items.forEach(item => {
            const div = document.createElement("div");
            div.className = "portfolio-item";
            div.innerHTML = `<span>${esc(item.name)} <span class="semantic-badge semantic-investment">${esc(item.type || "Investment")}</span></span><span>${formatMoney(getInflowCurrentValue(item))}</span>`;
            containerEl.appendChild(div);
        });
    }

    renderList(document.getElementById("portfolioExisting"), existingEntries);
    renderList(document.getElementById("portfolioMonthly"), monthlyEntries);
    renderList(document.getElementById("portfolioOneTime"), oneTimeInvestments);

    const existingTotal = existingEntries.reduce((s, e) => s + getInflowCurrentValue(e), 0);
    const monthlyTotal = monthlyEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const oneTimeTotal = oneTimeInvestments.reduce((s, e) => s + Number(e.amount || 0), 0);
    const grandTotal = existingTotal + monthlyTotal + oneTimeTotal;

    const el1 = document.getElementById("portfolioExistingTotal");
    const el2 = document.getElementById("portfolioMonthlyTotal");
    const el3 = document.getElementById("portfolioOneTimeTotal");
    const el4 = document.getElementById("portfolioGrandTotal");
    if (el1) el1.textContent = formatMoney(existingTotal);
    if (el2) el2.textContent = formatMoney(monthlyTotal);
    if (el3) el3.textContent = formatMoney(oneTimeTotal);
    if (el4) el4.textContent = formatMoney(grandTotal);
}

function renderInflowDynamicFields() {
    if (!inflowDynamicFields) return;
    inflowDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.inflow;
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") { input.min = "0"; input.step = field.step || "1"; }
        }
        input.id = `inflow_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        inflowDynamicFields.appendChild(div);
    });
    const calculated = document.createElement("div");
    calculated.className = "field calculated-field";
    calculated.innerHTML = `
        <label>Calculated Current Value</label>
        <div id="inflowCalculatedCurrentValue" class="calculated-value">₹0</div>
    `;
    inflowDynamicFields.appendChild(calculated);
    inflowDynamicFields.oninput = updateInflowCalculatedValuePreview;
    inflowDynamicFields.onchange = updateInflowCalculatedValuePreview;
    updateInflowCalculatedValuePreview();
}

function getInflowDraftFromForm() {
    return {
        amount: Number(document.getElementById("inflow_amount")?.value || 0),
        interestRate: Number(document.getElementById("inflow_interestRate")?.value || 0),
        startDate: document.getElementById("inflow_startDate")?.value || "",
        endDate: document.getElementById("inflow_endDate")?.value || "",
        frequency: document.getElementById("inflow_frequency")?.value || "One-Time"
    };
}

function updateInflowCalculatedValuePreview() {
    const el = document.getElementById("inflowCalculatedCurrentValue");
    if (!el) return;
    el.textContent = formatMoney(calculateInvestmentCurrentValue(getInflowDraftFromForm()));
}

function renderInflowTable(entries) {
    if (!inflowTableHead || !inflowTableBody) return;
    const fields = TAB_FIELDS.inflow;
    inflowTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => { const th = document.createElement("th"); th.textContent = f.label; tr.appendChild(th); });
    const valueTh = document.createElement("th"); valueTh.textContent = "Current Value"; tr.appendChild(valueTh);
    const actionTh = document.createElement("th"); actionTh.textContent = ""; tr.appendChild(actionTh);
    inflowTableHead.appendChild(tr);
    inflowTableBody.innerHTML = "";
    if (inflowEmptyState) inflowEmptyState.classList.toggle("visible", entries.length === 0);
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") { 
                // Special handling for percentage fields
                if (f.id === "interestRate") {
                    td.textContent = Number(item[f.id] || 0).toFixed(2) + "%";
                    td.className = "amount";
                } else {
                    td.textContent = formatMoney(Number(item[f.id] || 0)); 
                    td.className = "amount";
                }
            } else { 
                td.textContent = esc(item[f.id] || "—"); 
            }
            row.appendChild(td);
        });
        const currentTd = document.createElement("td");
        currentTd.textContent = formatMoney(getInflowCurrentValue(item));
        currentTd.className = "amount";
        row.appendChild(currentTd);
        const actionTd = document.createElement("td");
        actionTd.innerHTML = renderRowActions(item.id);
        row.appendChild(actionTd);
        inflowTableBody.appendChild(row);
    });
}

function renderInflowPreviewCards(entries) {
    const toolbarEl = document.getElementById("inflowSortFilter");
    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        toolbarEl.innerHTML = buildSortFilterToolbar("inflow");
    }
    const displayEntries = applyListSortFilter("inflow", entries);
    if (!inflowList) return;
    inflowList.innerHTML = "";
    if (displayEntries.length === 0) {
        inflowList.innerHTML = entries.length === 0
            ? `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No inflow items yet. Click Edit to add.</div>`
            : `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No results match the current filters.</div>`;
        return;
    }
    displayEntries.forEach(item => {
        const card = document.createElement("div");
        card.className = "investment-card";
        const curVal = getInflowCurrentValue(item);
        const frequency = normalizeInvestmentFrequency(item);
        card.innerHTML = `
            <div class="investment-card-info">
                <div class="investment-card-title">${esc(item.name)}</div>
                <div class="investment-card-details">
                    <span class="investment-card-frequency" style="${semanticBadgeStyle("Investment", false)}">${esc(item.type || "Others")}</span>
                    <span class="semantic-badge semantic-investment ${frequency === "One-Time" ? "is-paid" : ""}">${esc(frequency)}</span><br>
                    Invested: ${formatMoney(Number(item.amount || 0))}<br>
                    Interest: ${Number(item.interestRate || 0).toFixed(2)}% p.a.<br>
                    Start: ${esc(item.startDate || "—")} | End: ${esc(item.endDate || "—")}<br>
                    ${item.details ? esc(item.details) : ""}
                </div>
            </div>
            <div class="investment-card-amount">${formatMoney(curVal)}</div>`;
        inflowList.appendChild(card);
    });
}

function calculateInflowSummary(entries) {
    entries = normalizeInvestmentEntries(entries);
    const totalAmount = entries.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalCurrent = entries.reduce((s, i) => s + getInflowCurrentValue(i), 0);
    const el1 = document.getElementById("totalInflowAmount");
    const el2 = document.getElementById("totalInflowCurrentValue");
    const el3 = document.getElementById("totalInflowItems");
    if (el1) el1.textContent = formatMoney(totalAmount);
    if (el2) el2.textContent = formatMoney(totalCurrent);
    if (el3) el3.textContent = entries.length;

    // Monthly Recurring vs Existing (Lump Sum) breakdown
    const recurringEntries = entries.filter(e => e.frequency !== "One-Time");
    const existingEntries = entries.filter(e => e.frequency === "One-Time");
    // Prorate all recurring investments to monthly amount
    const monthlyTotal = recurringEntries.reduce((s, i) => {
        const amt = Number(i.amount || 0);
        const freq = i.frequency || "Monthly";
        if (freq === "Monthly") return s + amt;
        if (freq === "Quarterly") return s + (amt / 3);
        if (freq === "Semi-Annual") return s + (amt / 6);
        if (freq === "Annual") return s + (amt / 12);
        return s + amt;
    }, 0);
    const existingTotal = existingEntries.reduce((s, i) => s + getInflowCurrentValue(i), 0);
    const el4 = document.getElementById("totalMonthlyInvestments");
    const el5 = document.getElementById("totalExistingInvestments");
    if (el4) el4.textContent = formatMoney(monthlyTotal);
    if (el5) el5.textContent = formatMoney(existingTotal);
}

function renderInflowChart(entries) {
    if (inflowBarChart) { inflowBarChart.destroy(); inflowBarChart = null; }
    if (!inflowBarChartCanvas || entries.length === 0) return;
    const byType = {};
    normalizeInvestmentEntries(entries).forEach(e => {
        const type = e.type || "Others";
        byType[type] = (byType[type] || 0) + getInflowCurrentValue(e);
    });
    const rows = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const labels = rows.map(([type]) => type);
    const values = rows.map(([, value]) => value);
    if (values.length === 0) return;
    const ctx = inflowBarChartCanvas.getContext("2d");
    inflowBarChart = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Amount (₹)", data: values, backgroundColor: getChartThemeColors().bar, borderWidth: 0, borderRadius: 6, borderSkipped: false, maxBarThickness: 36 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } },
                      y: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } } } }
    });
}

// ── Outflow Tab (replaces Liabilities + Insurances) ──────────────────────────
function renderOutflow() {
    const entries = (appData.tabData || {}).outflow || [];

    if (toggleOutflowEdit) setToggleButtonIconText(toggleOutflowEdit, isOutflowEditMode, "Edit");
    
    // Hide outflow summary in edit mode
    const outflowSummary = document.querySelector('.expense-summary.expense-summary-grid');
    if (outflowSummary) outflowSummary.hidden = isOutflowEditMode;

    if (isOutflowEditMode) {
        if (outflowTabPreview) outflowTabPreview.hidden = true;
        if (outflowTabEdit) outflowTabEdit.hidden = false;
        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!outflowDynamicFields?.hasChildNodes()) {
            renderOutflowDynamicFields();
        }
        updateSectionSubmitButton("outflow");
        renderOutflowTable(entries);
    } else {
        if (outflowTabPreview) outflowTabPreview.hidden = false;
        if (outflowTabEdit) outflowTabEdit.hidden = true;
        if (outflowSummary) outflowSummary.hidden = false;
        renderOutflowPreviewCards(entries);
        calculateOutflowSummary(entries);
        renderOutflowCharts(entries);
    }
}

function renderOutflowDynamicFields() {
    if (!outflowDynamicFields) return;
    outflowDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.outflow;
    const activeAccounts = getCardEntries().filter(c => c.accountPresent === "Yes");
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        let input;
        if (field.id === "bankName") {
            if (activeAccounts.length === 0) {
                const notice = document.createElement("p");
                notice.style.cssText = `font-size:0.82rem;color:${COLOR_WARNING};margin:4px 0 0;`;
                notice.innerHTML = `No active accounts found. <button type="button" class="dependency-notice-btn" style="font-size:0.78rem;padding:3px 8px;" onclick="switchToTab('cards')">Set up Accounts →</button>`;
                div.appendChild(notice);
                input = document.createElement("input");
                input.type = "hidden";
            } else {
                input = document.createElement("select");
                const blank = document.createElement("option");
                blank.value = ""; blank.textContent = "— Select Account —";
                input.appendChild(blank);
                activeAccounts.forEach(acct => { const opt = document.createElement("option"); opt.value = acct.bankName; opt.textContent = acct.bankName; input.appendChild(opt); });
            }
        } else if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => { const option = document.createElement("option"); option.value = opt; option.textContent = opt; input.appendChild(option); });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") { input.min = "0"; input.step = field.step || "1"; }
        }
        input.id = `outflow_${field.id}`;
        if (field.required && field.id !== "bankName") input.required = true;
        div.appendChild(input);
        outflowDynamicFields.appendChild(div);
    });
}

function renderOutflowTable(entries) {
    if (!outflowTableHead || !outflowTableBody) return;
    const fields = TAB_FIELDS.outflow;
    outflowTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => { const th = document.createElement("th"); th.textContent = f.label; tr.appendChild(th); });
    const durTh = document.createElement("th"); durTh.textContent = "Duration"; tr.appendChild(durTh);
    const actTh = document.createElement("th"); actTh.textContent = ""; tr.appendChild(actTh);
    outflowTableHead.appendChild(tr);
    outflowTableBody.innerHTML = "";
    if (outflowEmptyState) outflowEmptyState.classList.toggle("visible", entries.length === 0);
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") { td.textContent = formatMoney(Number(item[f.id] || 0)); td.className = "amount"; }
            else { td.textContent = esc(item[f.id] || "—"); }
            row.appendChild(td);
        });
        const durTd = document.createElement("td"); durTd.textContent = calcDurationFromToday(item.endDate); row.appendChild(durTd);
        const actTd = document.createElement("td"); actTd.innerHTML = renderRowActions(item.id); row.appendChild(actTd);
        outflowTableBody.appendChild(row);
    });
}

function renderOutflowPreviewCards(entries) {
    const toolbarEl = document.getElementById("outflowSortFilter");
    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        toolbarEl.innerHTML = buildSortFilterToolbar("outflow");
    }
    const displayEntries = applyListSortFilter("outflow", entries);
    if (!outflowList) return;
    outflowList.innerHTML = "";
    if (displayEntries.length === 0) {
        outflowList.innerHTML = entries.length === 0
            ? `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No outflow items yet. Click Edit to add.</div>`
            : `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No results match the current filters.</div>`;
        return;
    }

    // Group by type
    const groups = {};
    displayEntries.forEach(item => {
        const type = item.type || "Expenditure";
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
    });

    Object.entries(groups).forEach(([type, items]) => {
        const groupTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
        const groupDiv = document.createElement("div");
        groupDiv.className = "outflow-group";
        const typeLower = type.toLowerCase().replace(/\s+/g, "");
        const isPaid = items.every(item => item.endDate && new Date(item.endDate) < new Date());
        groupDiv.innerHTML = `<div class="outflow-group-header">
            <span class="expense-card-type ${typeLower}" style="${semanticBadgeStyle(type, isPaid)}">${esc(type)}</span>
            <span class="outflow-group-count">${items.length} item${items.length > 1 ? "s" : ""}</span>
            <strong class="outflow-group-total">${formatMoney(groupTotal)}</strong>
        </div>`;
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "expense-card";
            card.innerHTML = `
                <div class="expense-card-info">
                    <div class="expense-card-title">${esc(item.name)}</div>
                    <div class="expense-card-details">
                        <span style="color:var(--muted);font-size:0.75rem;">${esc(item.frequency || "Monthly")}</span>
                        | Bank: ${esc(item.bankName || "—")}
                        | End: ${esc(item.endDate || "—")}
                        | Duration: ${calcDurationFromToday(item.endDate)}
                        ${item.details ? `<br>${esc(item.details)}` : ""}
                    </div>
                </div>
                <div class="expense-card-amount">${formatMoney(Number(item.amount || 0))}</div>`;
            groupDiv.appendChild(card);
        });
        outflowList.appendChild(groupDiv);
    });
}

function calculateOutflowSummary(entries) {
    const totalMonthly = entries.filter(e => e.frequency === "Monthly").reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalAll     = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const income       = Number(appData.fixedMonthlyIncome || 0);
    const remaining    = income - totalMonthly;
    const el1 = document.getElementById("totalOutflowDeductions");
    const el2 = document.getElementById("outflowDisplayIncome");
    const el3 = document.getElementById("outflowRemainingToSpend");
    const el4 = document.getElementById("totalOutflowItems");
    if (el1) el1.textContent = formatMoney(totalMonthly);
    if (el2) el2.textContent = formatMoney(income);
    if (el3) { el3.textContent = formatMoney(remaining); el3.className = "remaining-amount " + (remaining >= 0 ? "positive" : "negative"); }
    if (el4) el4.textContent = entries.length;
}

function renderOutflowCharts(entries) {
    if (outflowBankChart) { outflowBankChart.destroy(); outflowBankChart = null; }
    if (outflowTypeChart) { outflowTypeChart.destroy(); outflowTypeChart = null; }
    if (entries.length === 0) return;

    // Bank chart
    const bankData = {};
    entries.forEach(e => { const bank = e.bankName || "Unknown"; bankData[bank] = (bankData[bank] || 0) + Number(e.amount || 0); });
    if (outflowBankChartCanvas) {
        const bankCtx = outflowBankChartCanvas.getContext("2d");
        outflowBankChart = new Chart(bankCtx, {
            type: "bar", data: { labels: Object.keys(bankData), datasets: [{ label: "Amount (₹)", data: Object.values(bankData), backgroundColor: getChartThemeColors().bar, borderWidth: 0, borderRadius: 6, borderSkipped: false, maxBarThickness: 36 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } }, y: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } } } }
        });
    }

    // Type chart
    const typeData = { "Insurance": { amount: 0, color: SEMANTIC_COLORS.insurance.color }, "Investment": { amount: 0, color: SEMANTIC_COLORS.investment.color }, "Savings": { amount: 0, color: SEMANTIC_COLORS.savings.color }, "Liability": { amount: 0, color: SEMANTIC_COLORS.liability.color }, "Expenditure": { amount: 0, color: SEMANTIC_COLORS.expenditure.color }, "Others": { amount: 0, color: SEMANTIC_COLORS.others.color } };
    entries.forEach(e => { let type = e.type || "Expenditure"; if (type === "Saving") type = "Savings"; if (typeData[type]) typeData[type].amount += Number(e.amount || 0); });
    if (outflowTypeChartCanvas) {
        const typeCtx = outflowTypeChartCanvas.getContext("2d");
        outflowTypeChart = new Chart(typeCtx, {
            type: "bar", data: { labels: Object.keys(typeData), datasets: [{ label: "Amount (₹)", data: Object.keys(typeData).map(t => typeData[t].amount), backgroundColor: Object.keys(typeData).map(t => typeData[t].color), borderWidth: 0, borderRadius: 6, borderSkipped: false, maxBarThickness: 36 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } }, y: { ticks: { color: getChartThemeColors().text }, grid: { color: getChartThemeColors().grid } } } }
        });
    }
}

function renderCards() {
    const entries = activeEntries();
    
    // Account setup guidance banner
    const hasPrimary = entries.some(c => c.isPrimary === "Yes");
    const hasSalary = entries.some(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    let setupBanner = document.getElementById("accountSetupBanner");
    if (!setupBanner) {
        setupBanner = document.createElement("div");
        setupBanner.id = "accountSetupBanner";
        setupBanner.className = "budget-status";
        const parent = document.getElementById("cardsUI");
        if (parent) parent.insertBefore(setupBanner, parent.firstChild);
    }
    if (!hasPrimary || !hasSalary) {
        const missing = [];
        if (!hasPrimary) missing.push("Primary (Expenditure) account");
        if (!hasSalary) missing.push("Salary account");
        setupBanner.hidden = false;
        setupBanner.className = "budget-status negative";
        setupBanner.textContent = `Account setup incomplete — add: ${missing.join(" + ")}`;
    } else {
        setupBanner.hidden = true;
    }

    // Update toggle button text
    setToggleButtonIconText(toggleCardEdit, isCardEditMode, 'Edit');
    
    // Hide card summary and chart in edit mode
    const cardSummary = document.querySelector('.card-summary');
    const chartSection = document.querySelector('.cards-ui .chart-section');
    if (cardSummary) cardSummary.hidden = isCardEditMode;
    if (chartSection) chartSection.hidden = isCardEditMode;
    
    // Show/hide preview/edit modes
    if (isCardEditMode) {
        cardPreview.hidden = true;
        cardEdit.hidden = false;
        
        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!cardDynamicFields?.hasChildNodes()) {
            renderCardDynamicFields();
        }
        updateSectionSubmitButton("cards");
        
        // Render table
        renderCardTable(entries);
    } else {
        cardPreview.hidden = false;
        cardEdit.hidden = true;
        
        // Show summary in preview mode
        if (cardSummary) cardSummary.hidden = false;
        if (chartSection) chartSection.hidden = false;
        
        // Render preview cards
        renderCardPreviewCards(entries);
        
        // Calculate and display summary
        calculateCardSummary(entries);
    }
}

function renderCardDynamicFields() {
    cardDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.cards || TAB_FIELDS.monthlyBudget;
    const entries = activeEntries();
    const editingId = editingEntryIds.cards;
    const primaryExists = entries.some(c => c.isPrimary === "Yes" && c.id !== editingId);

    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";

        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);

        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                if (field.id === "isPrimary" && opt === "Yes" && primaryExists) {
                    option.disabled = true;
                    option.textContent = "Yes (already set)";
                }
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `card_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);

        if (field.id === "isPrimary" && primaryExists) {
            const hint = document.createElement("small");
            hint.style.cssText = "color: var(--muted); margin-top: 2px; display: block;";
            hint.textContent = "A primary account already exists.";
            div.appendChild(hint);
        }

        div.dataset.fieldId = field.id;
        cardDynamicFields.appendChild(div);
    });

    // Conditional field visibility
    function updateCardConditionals() {
        const accountVal     = document.getElementById("card_accountPresent")?.value || "No";
        const creditCardVal  = document.getElementById("card_creditCardPresent")?.value || "No";
        const primaryVal     = document.getElementById("card_isPrimary")?.value || "No";
        const purposeInput   = document.getElementById("card_purpose");
        cardDynamicFields.querySelectorAll("[data-field-id]").forEach(div => {
            const fid = div.dataset.fieldId;
            if (fid === "balance")      div.hidden = (accountVal    !== "Yes");
            if (fid === "creditLimit")  div.hidden = (creditCardVal !== "Yes");
            if (fid === "purposeOther") div.hidden = (document.getElementById("card_purpose")?.value !== "Others");
        });
        if (purposeInput) {
            if (primaryVal === "Yes") {
                purposeInput.value = "Expenditure";
                purposeInput.disabled = true;
            } else {
                purposeInput.disabled = false;
            }
        }
    }
    updateCardConditionals();
    const acctSel    = document.getElementById("card_accountPresent");
    const ccSel      = document.getElementById("card_creditCardPresent");
    const primarySel = document.getElementById("card_isPrimary");
    const purposeSel = document.getElementById("card_purpose");
    if (acctSel)    acctSel.addEventListener("change",    updateCardConditionals);
    if (ccSel)      ccSel.addEventListener("change",      updateCardConditionals);
    if (primarySel) primarySel.addEventListener("change", updateCardConditionals);
    if (purposeSel) purposeSel.addEventListener("change", updateCardConditionals);
}

function renderCardTable(entries) {
    const fields = (TAB_FIELDS.cards || TAB_FIELDS.monthlyBudget).filter(f => !f.noTable);
    
    cardTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "";
    tr.appendChild(actionTh);
    cardTableHead.appendChild(tr);
    
    cardTableBody.innerHTML = "";
    cardEmptyState.classList.toggle("visible", entries.length === 0);
    
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                td.textContent = formatMoney(Number(item[f.id] || 0));
                td.className = "amount";
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        cardTableBody.appendChild(row);
    });
}

function sortCardEntries(entries) {
    const purposeOrder = { "Salary": 1, "Savings": 2, "Saving": 2 };
    return [...entries].sort((a, b) => {
        // Primary (Expenditure) always first
        if (a.isPrimary === "Yes" && b.isPrimary !== "Yes") return -1;
        if (b.isPrimary === "Yes" && a.isPrimary !== "Yes") return 1;
        // Then Salary, then Saving, then others
        const aOrder = purposeOrder[a.purpose] || 3;
        const bOrder = purposeOrder[b.purpose] || 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(b.balance || 0) - Number(a.balance || 0);
    });
}

function renderCardPreviewCards(entries) {
    const sorted = sortCardEntries(entries);
    cardsList.innerHTML = "";
    
    if (sorted.length === 0) {
        cardsList.innerHTML = `<div class="empty-state visible" style="background: var(--surf1); border: 1px solid var(--border2); border-radius: 12px;">No accounts yet. Click Edit to add accounts.</div>`;
        return;
    }
    
    sorted.forEach(card => {
        const item = document.createElement("div");
        item.className = "card-item" + (card.isPrimary === "Yes" ? " card-item-primary" : "");

        const accountClass  = card.accountPresent?.toLowerCase()  === "yes" ? "yes" : "no";
        const creditCardClass = card.creditCardPresent?.toLowerCase() === "yes" ? "yes" : "no";
        const kycClass      = card.kycUpdated?.toLowerCase()      === "yes" ? "yes" : "no";
        const nomineeClass  = card.nomineeAdded?.toLowerCase()    === "yes" ? "yes" : "no";
        const displayPurpose = card.purpose === "Others" && card.purposeOther ? card.purposeOther : (card.purpose || "—");
        const primaryBadge  = card.isPrimary === "Yes"
            ? `<span class="card-item-badge semantic-expenditure">PRIMARY</span>` : "";
        const purposeBadge = card.purpose && card.purpose !== "Others"
            ? `<span class="card-item-badge semantic-insurance">${esc(card.purpose.toUpperCase())}</span>` : "";
        const customPurposeBadge = card.purpose === "Others" && card.purposeOther
            ? `<span class="card-item-badge semantic-insurance">${esc(card.purposeOther.toUpperCase())}</span>` : "";
        const savingBadge = (card.purpose === "Savings" || card.purpose === "Saving")
            ? `<span class="card-item-badge semantic-savings">SAVINGS</span>` : "";

        item.innerHTML = `
            <div class="card-item-info">
                <div class="card-item-title-row">
                    <div class="card-item-title">${esc(card.bankName)}</div>
                    <div class="card-item-title-badges">
                        ${primaryBadge}${purposeBadge || customPurposeBadge || savingBadge}
                    </div>
                </div>
                <div class="card-item-details">
                    <span class="card-item-badge ${accountClass} ${accountClass === "yes" ? "semantic-saving" : "semantic-liability"}">Account: ${esc(card.accountPresent || "No")}</span>
                    <span class="card-item-badge ${creditCardClass} ${creditCardClass === "yes" ? "semantic-liability" : "semantic-saving"}">Credit Card: ${esc(card.creditCardPresent || "No")}</span>
                    <span class="card-item-badge ${kycClass} ${kycClass === "yes" ? "semantic-saving" : "semantic-insurance"}">KYC: ${esc(card.kycUpdated || "No")}</span>
                    <span class="card-item-badge ${nomineeClass} ${nomineeClass === "yes" ? "semantic-saving" : "semantic-insurance"}">Nominee: ${esc(card.nomineeAdded || "No")}</span><br>
                    ${esc(displayPurpose)}
                </div>
            </div>
            <div class="card-item-amounts">
                <div><span>Balance</span><strong>${formatMoney(Number(card.balance || 0))}</strong></div>
                <div><span>Credit Limit</span><strong>${formatMoney(Number(card.creditLimit || 0))}</strong></div>
            </div>
        `;

        cardsList.appendChild(item);
    });
}

function calculateCardSummary(entries) {
    const totalBanks = entries.filter(c => c.accountPresent?.toLowerCase() === "yes").length;
    const totalDebitCards = entries.filter(c => c.debitCardPresent?.toLowerCase() === "yes").length;
    const totalBalance = entries.filter(c => c.accountPresent?.toLowerCase() === "yes")
        .reduce((s, c) => s + Number(c.balance || 0), 0);
    const totalCreditLimit = entries.filter(c => c.creditCardPresent?.toLowerCase() === "yes")
        .reduce((s, c) => s + Number(c.creditLimit || 0), 0);
    const totalCreditCards = entries.filter(c => c.creditCardPresent?.toLowerCase() === "yes").length;

    document.getElementById("totalBanks").textContent = totalBanks;
    document.getElementById("totalDebitCards").textContent = totalDebitCards;
    document.getElementById("totalBalance").textContent = formatMoney(totalBalance);
    document.getElementById("totalCreditLimit").textContent = formatMoney(totalCreditLimit);
    document.getElementById("totalCreditCards").textContent = totalCreditCards;

    // Render accounts chart
    renderAccountsChart(entries);
}

async function renderAccountsChart(entries) {
    if (accountsChart) { accountsChart.destroy(); accountsChart = null; }
    if (!accountsChartCanvas || entries.length === 0) return;

    // Lazy-load Chart.js if needed
    if (typeof Chart === 'undefined') {
        try {
            await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        } catch (err) {
            console.error('Failed to load Chart.js:', err);
            return;
        }
    }

    // Prepare data for chart
    const labels = [];
    const balanceData = [];
    const creditLimitData = [];

    entries.forEach(card => {
        const name = card.name || card.bankName || 'Unknown';
        const hasAccount = card.accountPresent?.toLowerCase() === "yes";
        const hasCreditCard = card.creditCardPresent?.toLowerCase() === "yes";

        // Only add if account or credit card is present
        if (hasAccount || hasCreditCard) {
            labels.push(name);
            balanceData.push(hasAccount ? Number(card.balance || 0) : 0);
            creditLimitData.push(hasCreditCard ? Number(card.creditLimit || 0) : 0);
        }
    });

    if (labels.length === 0) return;

    const ctx = accountsChartCanvas.getContext("2d");
    const themeColors = getChartThemeColors();

    accountsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Balance",
                    data: balanceData,
                    backgroundColor: "#22c55e",
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                },
                {
                    label: "Credit Limit",
                    data: creditLimitData,
                    backgroundColor: "#3b82f6",
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        color: themeColors.text,
                        font: { size: 12 },
                        padding: 12
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: themeColors.text, font: { size: 11 } },
                    grid: { color: themeColors.grid }
                },
                y: {
                    ticks: { color: themeColors.text },
                    grid: { color: themeColors.grid }
                }
            }
        }
    });
}

function getAutoNetWorthEntries() {
    const auto = [];
    // Inflow items → Assets
    const inflowItems = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);
    inflowItems.forEach(item => {
        const val = getInflowCurrentValue(item);
        if (val > 0) {
            const freq = item.frequency || "Monthly";
            const amt = Number(item.amount || 0);
            let annualContrib = 0;
            if (freq !== "One-Time") {
                if (freq === "Monthly") annualContrib = amt * 12;
                else if (freq === "Quarterly") annualContrib = amt * 4;
                else if (freq === "Semi-Annual") annualContrib = amt * 2;
                else if (freq === "Annual") annualContrib = amt;
                else annualContrib = amt * 12;
            }
            auto.push({
                id: 'auto_inv_' + item.id,
                name: item.name || 'Investment',
                type: 'Asset',
                value: val,
                growthRate: item.interestRate || '',
                frequency: freq,
                annualContribution: annualContrib,
                details: 'From Inflow tab',
                auto: true
            });
        }
    });
    // Outflow items with type Liability → Liabilities (amount × remaining months)
    const outflowItems = (appData.tabData || {}).outflow || [];
    outflowItems.filter(e => (e.type || '') === 'Liability').forEach(item => {
        const monthly = Number(item.amount || 0);
        const months  = Number(item.duration || 1);
        const outstanding = monthly * months;
        if (outstanding > 0) {
            auto.push({
                id: 'auto_exp_' + item.id,
                name: item.name || 'Liability',
                type: 'Liability',
                value: outstanding,
                growthRate: '',
                details: `From Outflow (${formatMoney(monthly)}/mo × ${months} mo remaining)`,
                auto: true
            });
        }
    });
    return auto;
}

function getAllNetWorthEntries() {
    return [...getAutoNetWorthEntries(), ...activeEntries()];
}

function renderNetWorth() {
    const manualEntries = activeEntries();
    const allEntries    = getAllNetWorthEntries();
    const calculatedAge = calculateAgeFromDob(appData.dateOfBirth);

    // Update toggle button text
    setToggleButtonIconText(toggleNetWorthEdit, isNetWorthEditMode, "Edit");

    // Hide net worth summary cards in edit mode
    const netWorthSummaryCards = document.getElementById('netWorthSummaryCards');
    if (netWorthSummaryCards) netWorthSummaryCards.hidden = isNetWorthEditMode;

    // Show/hide preview/edit modes
    if (isNetWorthEditMode) {
        netWorthPreview.hidden = true;
        netWorthEdit.hidden = false;

        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!netWorthDynamicFields?.hasChildNodes()) {
            renderNetWorthDynamicFields();
        }
        updateSectionSubmitButton("netWorth");

        // Render table (manual entries only)
        renderNetWorthTable(manualEntries);
    } else {
        netWorthPreview.hidden = false;
        netWorthEdit.hidden = true;
        
        // Show net worth summary cards in preview mode
        if (netWorthSummaryCards) netWorthSummaryCards.hidden = false;
        
        currentAgeDisplay.textContent = calculatedAge ? calculatedAge + " yrs" : "—";
        currentLocationDisplay.textContent = (appData.userLocation || "").trim() || "—";

        // Calculate and display summary using combined entries
        calculateNetWorthSummary(allEntries);

        // Render assets and liabilities lists
        renderAssetsLiabilitiesLists(allEntries);

        // Render projection chart
        renderNetWorthProjectionChart(allEntries);
    }
}

function renderNetWorthDynamicFields() {
    netWorthDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.netWorth || TAB_FIELDS.monthlyBudget;
    
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `netWorth_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        
        netWorthDynamicFields.appendChild(div);
    });
}

function renderNetWorthTable(entries) {
    const fields = TAB_FIELDS.netWorth || TAB_FIELDS.monthlyBudget;
    
    netWorthTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "";
    tr.appendChild(actionTh);
    netWorthTableHead.appendChild(tr);
    
    netWorthTableBody.innerHTML = "";
    netWorthEmptyState.classList.toggle("visible", entries.length === 0);
    
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                // Special handling for percentage fields
                if (f.id === "growthRate") {
                    td.textContent = Number(item[f.id] || 0).toFixed(2) + "%";
                    td.className = "amount";
                } else {
                    td.textContent = formatMoney(Number(item[f.id] || 0));
                    td.className = "amount";
                }
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        netWorthTableBody.appendChild(row);
    });
}

function calculateNetWorthSummary(entries) {
    const assets = entries.filter(e => e.type === "Asset");
    const liabilities = entries.filter(e => e.type === "Liability");

    const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.value || 0), 0);
    const netWorthToday = totalAssets - totalLiabilities;

    document.getElementById("totalAssets").textContent = formatMoney(totalAssets);
    document.getElementById("totalLiabilities").textContent = formatMoney(totalLiabilities);
    document.getElementById("netWorthToday").textContent = formatMoney(netWorthToday);
}

function renderAssetsLiabilitiesLists(entries) {
    const assets      = entries.filter(e => e.type === "Asset");
    const liabilities = entries.filter(e => e.type === "Liability");
    const currentAge = calculateAgeFromDob(appData.dateOfBirth) || DEFAULT_CURRENT_AGE;
    const yearsTo70 = Math.max(0, DEFAULT_RETIREMENT_AGE - currentAge);
    const inflationRate = DEFAULT_INFLATION_RATE;

    function calcProjectedValue(entry) {
        const val = Number(entry.value || 0);
        const gr = Number(entry.growthRate || 0) / 100;
        const annual = Number(entry.annualContribution || 0);
        if (yearsTo70 <= 0) return val;
        if (annual > 0 && gr > 0) {
            return val * Math.pow(1 + gr, yearsTo70) + annual * ((Math.pow(1 + gr, yearsTo70) - 1) / gr);
        } else if (annual > 0) {
            return val + annual * yearsTo70;
        }
        return val * Math.pow(1 + gr, yearsTo70);
    }

    function makeItem(entry) {
        const item = document.createElement("div");
        item.className = "asset-liability-item";
        const autoBadge = entry.auto
            ? `<span class="auto-badge" title="${esc(entry.details || 'Auto-calculated')}">Auto</span>`
            : `<span class="manual-badge">Manual</span>`;
        const currentVal = Number(entry.value || 0);
        const projectedVal = calcProjectedValue(entry);
        const inflationAdjVal = yearsTo70 > 0 ? projectedVal / Math.pow(1 + inflationRate, yearsTo70) : projectedVal;
        const showProjected = yearsTo70 > 0 && Math.round(projectedVal) !== Math.round(currentVal);
        const gr = Number(entry.growthRate || 0);
        const annual = Number(entry.annualContribution || 0);
        const freq = entry.frequency || "";
        const metaParts = [];
        if (gr > 0) metaParts.push(`${gr}% p.a.`);
        if (freq && freq !== "One-Time" && annual > 0) metaParts.push(`${freq}`);
        const metaStr = metaParts.length > 0 ? metaParts.join(' · ') : '';
        item.innerHTML = `
            <div class="asset-label-group">
                ${autoBadge}
                <span class="label">${esc(entry.name)}</span>
                ${entry.auto ? `<span class="auto-source">${esc(entry.details)}</span>` : ''}
                ${metaStr ? `<span class="growth">${metaStr}</span>` : ''}
            </div>
            <div class="nw-values">
                <span class="nw-val-row"><span class="nw-val-label">Current</span><span class="value">${formatMoney(currentVal)}</span></span>
                ${showProjected ? `<span class="nw-val-row"><span class="nw-val-label">@ ${DEFAULT_RETIREMENT_AGE} yrs</span><span class="projected-value">${formatMoney(projectedVal)}</span></span>` : ''}
                ${showProjected ? `<span class="nw-val-row"><span class="nw-val-label">@ ${DEFAULT_RETIREMENT_AGE} yrs real</span><span class="inflation-adj-value">${formatMoney(inflationAdjVal)}</span></span>` : ''}
            </div>
        `;
        return item;
    }

    assetsList.innerHTML = "";
    if (assets.length === 0) {
        assetsList.innerHTML = `<div class="empty-state visible">No assets yet. Add inflow items to see them here.</div>`;
    } else {
        assets.forEach(a => assetsList.appendChild(makeItem(a)));
    }

    liabilitiesList.innerHTML = "";
    if (liabilities.length === 0) {
        liabilitiesList.innerHTML = `<div class="empty-state visible">No liabilities yet.</div>`;
    } else {
        liabilities.forEach(l => liabilitiesList.appendChild(makeItem(l)));
    }
}

function renderNetWorthProjectionChart(entries) {
    // Destroy existing chart
    if (netWorthProjectionChart) netWorthProjectionChart.destroy();

    const currentAge = calculateAgeFromDob(appData.dateOfBirth) || DEFAULT_CURRENT_AGE;
    const targetAge = DEFAULT_RETIREMENT_AGE;
    const years = targetAge - currentAge;

    if (years <= 0 || entries.length === 0) return;
    
    const assets = entries.filter(e => e.type === "Asset");
    const liabilities = entries.filter(e => e.type === "Liability");
    
    // Calculate net worth projection
    const labels = [];
    const projectedValues = [];
    const inflationAdjustedValues = [];
    
    const inflationRate = DEFAULT_INFLATION_RATE; // 6% inflation
    
    for (let year = 0; year <= years; year++) {
        labels.push(`Age ${currentAge + year}`);
        
        let projectedAssets = 0;
        let projectedLiabilities = 0;
        
        // Calculate asset growth (with recurring contributions for investment assets)
        assets.forEach(asset => {
            const growthRate = (Number(asset.growthRate || 0) / 100);
            const currentVal = Number(asset.value || 0);
            const annualContrib = Number(asset.annualContribution || 0);
            
            if (annualContrib > 0 && growthRate > 0) {
                // FV of current value + FV of annual contributions (annuity)
                const fvCurrent = currentVal * Math.pow(1 + growthRate, year);
                const fvContrib = year > 0 ? annualContrib * ((Math.pow(1 + growthRate, year) - 1) / growthRate) : 0;
                projectedAssets += fvCurrent + fvContrib;
            } else if (annualContrib > 0) {
                // No growth but recurring contributions
                projectedAssets += currentVal + (annualContrib * year);
            } else {
                // Simple compound growth on current value
                const futureValue = currentVal * Math.pow(1 + growthRate, year);
                projectedAssets += futureValue;
            }
        });
        
        // Calculate liability reduction/growth
        liabilities.forEach(liability => {
            const growthRate = (Number(liability.growthRate || 0) / 100);
            const futureValue = Number(liability.value || 0) * Math.pow(1 + growthRate, year);
            projectedLiabilities += futureValue;
        });
        
        const projectedNetWorth = projectedAssets - projectedLiabilities;
        const inflationAdjustedValue = projectedNetWorth / Math.pow(1 + inflationRate, year);
        
        projectedValues.push(projectedNetWorth);
        inflationAdjustedValues.push(inflationAdjustedValue);
    }
    
    // Update projection details
    const finalProjectedNetWorth = projectedValues[projectedValues.length - 1];
    const finalInflationAdjusted = inflationAdjustedValues[inflationAdjustedValues.length - 1];
    
    document.getElementById("projectedNetWorth").textContent = formatMoney(finalProjectedNetWorth);
    document.getElementById("inflationAdjustedNetWorth").textContent = formatMoney(finalInflationAdjusted);
    
    // Create chart with modern styling matching dashboard 6-Month Trend
    const ctx = netWorthProjectionChartCanvas.getContext("2d");
    netWorthProjectionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Projected Net Worth",
                    data: projectedValues,
                    borderColor: "#3b82f6",
                    backgroundColor: "#3b82f622",
                    fill: false,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: "Inflation-Adjusted",
                    data: inflationAdjustedValues,
                    borderColor: COLOR_NEGATIVE,
                    backgroundColor: "#ef444422",
                    fill: false,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: getChartThemeColors().text, boxWidth: 12, padding: 14 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${formatMoney(value)}`;
                        }
                    }
                },
                datalabels: { display: false }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: { color: getChartThemeColors().text },
                    grid: { color: getChartThemeColors().grid }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getChartThemeColors().text,
                        callback: function(value) {
                            if (value >= 10000000) {
                                // Show in Crores (1 Cr = 10,000,000)
                                return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                            } else {
                                // Show in Lakhs (1 L = 100,000)
                                return '₹' + (value / 100000).toFixed(1) + 'L';
                            }
                        }
                    },
                    grid: { color: getChartThemeColors().grid }
                }
            }
        }
    });
}

// ── Tax Plan auto-population helpers ────────────────────────────────────────
function getSelectedTaxFyStartYear() {
    const selected = financialYearSelect?.value || "";
    const match = selected.match(/^(\d{4})/);
    return match ? Number(match[1]) : getFinancialYearStartYear(new Date());
}

function populateFinancialYearOptions() {
    if (!financialYearSelect) return;
    const currentFy = getFinancialYearStartYear(new Date());
    const existing = financialYearSelect.value;
    financialYearSelect.innerHTML = "";
    for (let year = currentFy - 3; year <= currentFy + 1; year++) {
        const option = document.createElement("option");
        option.value = `${year}-${String(year + 1).slice(-2)}`;
        option.textContent = getFinancialYearLabel(year);
        if (existing ? option.value === existing : year === currentFy) option.selected = true;
        financialYearSelect.appendChild(option);
    }
}

function getAnnualIncomeFromBudget(fyStartYear = getFinancialYearStartYear(new Date())) {
    const mbData = appData.monthlyBudgetData || {};
    const fyMonthSet = new Set(getFinancialYearMonthKeys(fyStartYear));
    const fyMonths = Object.keys(mbData).filter(k => fyMonthSet.has(k));
    const pool = fyMonths.length > 0 ? fyMonths : Object.keys(mbData).sort().reverse().slice(0, 1);
    if (pool.length === 0) return 0;
    let total = 0;
    pool.forEach(k => { total += Object.values((mbData[k] || {}).inflow || {}).reduce((s, v) => s + (Number(v) || 0), 0); });
    return (total / pool.length) * 12;
}

function getAutoTaxDeductions() {
    const auto = [];
    const fyStartYear = getSelectedTaxFyStartYear();
    const fyStartDate = new Date(fyStartYear, 3, 1); // April 1
    const fyEndDate = new Date(fyStartYear + 1, 2, 31); // March 31
    
    // Outflow items with type Insurance → 80D
    const outflowItems = (appData.tabData || {}).outflow || [];
    outflowItems.filter(e => e.type === 'Insurance').forEach(item => {
        const amount = Number(item.amount || 0);
        const freq = item.frequency || "Monthly";
        let fyAmount = 0;
        
        // Calculate amount for current financial year only
        if (freq === "One-Time") {
            // One-time payment - check if it falls in current FY
            // Outflow doesn't have startDate, so we can't filter by date accurately
            // For now, include all one-time payments (user can manually adjust if needed)
            fyAmount = amount;
        } else if (freq === "Monthly") {
            // Monthly - assume full year for now (can be refined with date tracking)
            fyAmount = amount * 12;
        } else if (freq === "Quarterly") {
            fyAmount = amount * 4;
        } else if (freq === "Semi-Annual") {
            fyAmount = amount * 2;
        } else if (freq === "Annual") {
            fyAmount = amount;
        } else {
            fyAmount = amount;
        }
        
        if (fyAmount > 0) auto.push({ id: 'atax_ins_' + item.id, name: item.name || 'Insurance', amount: fyAmount, section: '80D', details: 'From Outflow tab', auto: true });
    });
    
    // Inflow items → 80C
    const inflowItems = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);
    inflowItems.forEach(item => {
        const freq = (item.frequency || '').toLowerCase();
        const base = Number(item.amount || 0);
        
        // Calculate amount for current financial year only
        let fyAmount = 0;
        
        if (freq === 'one-time' || freq === 'annual') {
            // One-time or annual investment - check if it falls in current FY
            const startDate = item.startDate ? new Date(item.startDate) : null;
            if (startDate && startDate >= fyStartDate && startDate <= fyEndDate) {
                fyAmount = base;
            }
        } else if (freq === 'monthly') {
            // Monthly - calculate based on months in current FY
            const startDate = item.startDate ? new Date(item.startDate) : null;
            const endDate = item.endDate ? new Date(item.endDate) : null;
            
            // If no start date, assume started before current FY (use full 12 months)
            if (!startDate) {
                fyAmount = base * 12;
            } else {
                // Calculate months within FY
                const startMonth = startDate >= fyStartDate ? startDate.getMonth() : 3; // April = 3
                const endMonth = (endDate && endDate < fyEndDate) ? endDate.getMonth() : 14; // March = 14 (exclusive)
                const monthsInFY = Math.max(0, Math.min(12, endMonth - startMonth));
                fyAmount = base * monthsInFY;
            }
        } else if (freq === 'quarterly') {
            // Quarterly - 4 payments per year
            fyAmount = base * 4;
        } else if (freq === 'semi-annual') {
            // Semi-annual - 2 payments per year
            fyAmount = base * 2;
        } else {
            // Default to full annual amount for other frequencies
            fyAmount = freq === 'monthly' ? base * 12 : base;
        }
        
        if (fyAmount > 0) {
            auto.push({ id: 'atax_inv_' + item.id, name: item.name || 'Investment', amount: fyAmount, section: '80C', details: 'From Inflow tab', auto: true });
        }
    });
    
    return auto;
}

function getAllTaxDeductions() {
    try {
        const manualEntries = (appData.tabData || {}).taxPlan || [];
        const autoDeductions = getAutoTaxDeductions();
        return [...autoDeductions, ...manualEntries];
    } catch (error) {
        console.error("Error in getAllTaxDeductions:", error);
        return [];
    }
}

function getEffectiveDeductions(allEntries, regime) {
    if (regime === 'new') return { total80C: 0, total80D: 0, totalOther: 0, totalDeductions: 0, stdDeduction: 75000, hraExemption: 0, housePropertyLoss: 0 };
    
    const raw80C  = allEntries.filter(e => e.section === '80C').reduce((s, e) => s + Number(e.amount || 0), 0);
    const raw80D  = allEntries.filter(e => e.section === '80D').reduce((s, e) => s + Number(e.amount || 0), 0);
    const raw24b  = allEntries.filter(e => e.section === '24(b)').reduce((s, e) => s + Number(e.amount || 0), 0);
    const raw80TTA = allEntries.filter(e => e.section === '80TTA').reduce((s, e) => s + Number(e.amount || 0), 0);
    const other   = allEntries.filter(e => !['80C','80D','24(b)','80TTA','HRA'].includes(e.section || '')).reduce((s, e) => s + Number(e.amount || 0), 0);
    
    const total80C = Math.min(150000, raw80C);
    const total80D = Math.min(50000,  raw80D);
    const total24b = Math.min(200000, raw24b); // Section 24(b) limit for self-occupied
    const total80TTA = Math.min(10000, raw80TTA); // Section 80TTA limit
    
    // Calculate HRA exemption from salary details
    const salary = (appData.taxData || {}).salary || {};
    const hraExemption = calculateHRAExemption(salary);
    
    // Calculate house property loss (can be set off up to ₹2L)
    const hp = (appData.taxData || {}).houseProperty || {};
    const housePropertyIncome = calculateIncomeFromHouseProperty(hp);
    const housePropertyLoss = Math.min(200000, Math.max(0, -housePropertyIncome)); // Max ₹2L loss set-off
    
    const totalDeductions = total80C + total80D + total24b + total80TTA + other + hraExemption + housePropertyLoss;
    
    return { 
        total80C, 
        total80D, 
        total24b,
        total80TTA,
        totalOther: other, 
        totalDeductions, 
        stdDeduction: 50000,
        hraExemption,
        housePropertyLoss
    };
}

function renderTaxPlan() {
    try {
        // Check if elements are initialized
        if (!taxRegimeSelect || !taxPlanPreview || !taxPlanEdit) {
            console.error("Tax plan elements not initialized. Initializing now...");
            initTaxPlanElements();
            if (!taxRegimeSelect || !taxPlanPreview || !taxPlanEdit) {
                console.error("Failed to initialize tax plan elements");
                alert("Failed to initialize tax plan. Please refresh the page.");
                return;
            }
        }
        
        // Get tax plan entries specifically
        const entries = (appData.tabData || {}).taxPlan || [];
        const taxRegime = taxRegimeSelect.value || 'new';
        populateFinancialYearOptions();
        
        // Update toggle button text
        if (toggleTaxPlanEdit) {
            setToggleButtonIconText(toggleTaxPlanEdit, isTaxPlanEditMode, "Edit");
        }
        
        // Hide tax summary and chart in edit mode
        const taxSummary = document.getElementById('taxSummary');
        if (taxSummary) taxSummary.hidden = isTaxPlanEditMode;
        const taxChartSection = document.querySelector('.tax-plan-ui .chart-section');
        if (taxChartSection) taxChartSection.hidden = isTaxPlanEditMode;
        
        // Show/hide preview/edit modes
        if (isTaxPlanEditMode) {
            if (taxPlanPreview) taxPlanPreview.hidden = true;
            if (taxPlanEdit) taxPlanEdit.hidden = false;
            
            // Populate salary details form
            populateSalaryDetailsForm();
            
            // Populate house property form
            populateHousePropertyForm();
            
            // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
            if (!taxPlanDynamicFields?.hasChildNodes()) {
                renderTaxPlanDynamicFields();
            }
            updateSectionSubmitButton("taxPlan");
            
            // Render table
            renderTaxPlanTable(entries);
        } else {
            if (taxPlanPreview) taxPlanPreview.hidden = false;
            if (taxPlanEdit) taxPlanEdit.hidden = true;
            
            // Show tax summary in preview mode
            if (taxSummary) taxSummary.hidden = false;

            // Render salary details
            renderSalaryDetails();

            // Render house property details
            renderHousePropertyDetails();

            // Calculate and display tax summary
            calculateTaxSummary(taxRegime);

            // Render tax deductions list
            renderTaxDeductionsList();

            // Render tax deductions chart
            renderTaxDeductionsChart();

            // Render tax breakdown
            renderTaxBreakdown(taxRegime);

            // Render tax saving banner
            renderTaxSavingBanner(taxRegime);
        }
    } catch (error) {
        console.error("Error rendering tax plan:", error);
        console.error("Error stack:", error.stack);
        logger.error("Tax plan render error", { error: error.message, stack: error.stack });
        alert("An error occurred while rendering tax plan. Check console for details.");
    }
}

function renderTaxPlanDynamicFields() {
    if (!taxPlanDynamicFields) {
        console.error("taxPlanDynamicFields element not found");
        return;
    }
    
    taxPlanDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.taxPlan || TAB_FIELDS.monthlyBudget;
    
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `taxPlan_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        
        taxPlanDynamicFields.appendChild(div);
    });
}

function renderTaxPlanTable(entries) {
    if (!taxPlanTableHead || !taxPlanTableBody || !taxPlanEmptyState) {
        console.error("Tax plan table elements not found");
        return;
    }
    
    const fields = TAB_FIELDS.taxPlan || TAB_FIELDS.monthlyBudget;
    
    taxPlanTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "Actions";
    tr.appendChild(actionTh);
    taxPlanTableHead.appendChild(tr);
    
    taxPlanTableBody.innerHTML = "";
    taxPlanEmptyState.classList.toggle("visible", entries.length === 0);
    
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                td.textContent = formatMoney(Number(item[f.id] || 0));
                td.className = "amount";
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        taxPlanTableBody.appendChild(row);
    });
}

function calculateTaxSummary(taxRegime) {
    try {
        const fyStartYear = getSelectedTaxFyStartYear();
        const annualIncome  = getAnnualIncomeFromBudget(fyStartYear);
        const allDeductions = getAllTaxDeductions();
        const ded = getEffectiveDeductions(allDeductions, taxRegime);
    
    // Add house property income to gross income
    const hp = (appData.taxData || {}).houseProperty || {};
    const housePropertyIncome = calculateIncomeFromHouseProperty(hp);
    const grossTotalIncome = annualIncome + Math.max(0, housePropertyIncome);
    
    const taxableIncome = Math.max(0, grossTotalIncome - ded.stdDeduction - ded.totalDeductions);
    const annualTaxLiability = calculateTax(taxableIncome, taxRegime);

    // YTD: based on FY month index (Apr=1, May=2 … Mar=12)
    const now = new Date();
    const currentFyStart = getFinancialYearStartYear(now);
    const m = now.getMonth();
    const fyMonth = fyStartYear < currentFyStart ? 12 : (fyStartYear > currentFyStart ? 0 : (m >= 3 ? m - 2 : m + 10));
    const taxLiabilityYTD = (annualTaxLiability * fyMonth) / 12;

    // Regime comparison
    const oldDed  = getEffectiveDeductions(allDeductions, 'old');
    const newDed  = getEffectiveDeductions(allDeductions, 'new');
    const oldTax  = calculateTax(Math.max(0, grossTotalIncome - oldDed.stdDeduction - oldDed.totalDeductions), 'old') * 1.04;
    const newTax  = calculateTax(Math.max(0, grossTotalIncome - newDed.stdDeduction), 'new') * 1.04;
    const bestRegime = oldTax <= newTax ? 'Old Regime' : 'New Regime';
    const saved = Math.abs(oldTax - newTax);

    const annualIncomeEl = document.getElementById("annualIncome");
    const totalDeductionsEl = document.getElementById("totalDeductions");
    const taxableIncomeEl = document.getElementById("taxableIncome");
    const annualTaxLiabilityEl = document.getElementById("annualTaxLiability");
    const taxLiabilityYTDEl = document.getElementById("taxLiabilityYTD");
    const recommendedRegimeEl = document.getElementById("recommendedRegime");
    const regimeSavingsNoteEl = document.getElementById("regimeSavingsNote");

    if (annualIncomeEl) annualIncomeEl.textContent = formatMoney(grossTotalIncome);
    if (totalDeductionsEl) totalDeductionsEl.textContent = formatMoney(ded.stdDeduction + ded.totalDeductions);
    if (taxableIncomeEl) taxableIncomeEl.textContent = formatMoney(taxableIncome);
    if (annualTaxLiabilityEl) annualTaxLiabilityEl.textContent = formatMoney(annualTaxLiability * 1.04);
    if (taxLiabilityYTDEl) taxLiabilityYTDEl.textContent = formatMoney(taxLiabilityYTD * 1.04);
    if (recommendedRegimeEl) recommendedRegimeEl.textContent = bestRegime;
    if (regimeSavingsNoteEl) regimeSavingsNoteEl.textContent = saved > 0 ? `saves ${formatMoney(saved)}/yr` : 'Equal tax';
    } catch (error) {
        console.error("Error in calculateTaxSummary:", error);
        throw error;
    }
}

function calculateTax(income, regime) {
    if (regime === "new") {
        // New Tax Regime (FY 2025-26, Budget 2025)
        let tax = 0;
        if (income <= 400000) tax = 0;
        else if (income <= 800000) tax = (income - 400000) * 0.05;
        else if (income <= 1200000) tax = 20000 + (income - 800000) * 0.10;
        else if (income <= 1600000) tax = 60000 + (income - 1200000) * 0.15;
        else if (income <= 2000000) tax = 120000 + (income - 1600000) * 0.20;
        else if (income <= 2400000) tax = 200000 + (income - 2000000) * 0.25;
        else tax = 300000 + (income - 2400000) * 0.30;
        // Rebate u/s 87A: if taxable income ≤ ₹12L, rebate up to ₹60,000
        if (income <= 1200000) tax = Math.max(0, tax - 60000);
        return tax;
    } else {
        // Old Tax Regime
        if (income <= 250000) return 0;
        if (income <= 500000) return (income - 250000) * 0.05;
        if (income <= 1000000) return 12500 + (income - 500000) * 0.20;
        return 112500 + (income - 1000000) * 0.30;
    }
}

function renderTaxDeductionsList() {
    if (!taxDeductionsList) {
        console.error("taxDeductionsList element not found");
        return;
    }
    taxDeductionsList.innerHTML = "";
    const allDeductions = getAllTaxDeductions();
    if (allDeductions.length === 0) {
        taxDeductionsList.innerHTML = `<div class="empty-state visible">No deductions found. Add inflow or outflow items to see auto-pulled deductions here.</div>`;
        return;
    }
    allDeductions.forEach(item => {
        const div = document.createElement("div");
        div.className = "tax-deduction-item";
        const badge = item.auto
            ? `<span class="auto-badge" title="${esc(item.details || '')}">Auto</span>`
            : `<span class="manual-badge">Manual</span>`;
        div.innerHTML = `
            <div class="asset-label-group">
                ${badge}
                <span class="label">${esc(item.name)}</span>
                ${item.auto ? `<span class="auto-source">${esc(item.details || '')}</span>` : ''}
            </div>
            <div>
                <span class="value">${formatMoney(Number(item.amount || 0))}</span>
                <span class="section">${esc(item.section || '')}</span>
            </div>
        `;
        taxDeductionsList.appendChild(div);
    });
}

async function renderTaxDeductionsChart() {
    if (taxDeductionsChart) { taxDeductionsChart.destroy(); taxDeductionsChart = null; }
    if (!taxDeductionsChartCanvas) return;

    // Lazy-load Chart.js if needed
    if (typeof Chart === 'undefined') {
        try {
            await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        } catch (err) {
            console.error('Failed to load Chart.js:', err);
            return;
        }
    }

    try {
        const allDeductions = getAllTaxDeductions();
        if (allDeductions.length === 0) {
            // Show empty state
            taxDeductionsChartCanvas.style.display = 'none';
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state visible';
            emptyState.textContent = 'No deductions to display';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '40px 20px';
            taxDeductionsChartCanvas.parentNode.insertBefore(emptyState, taxDeductionsChartCanvas);
            return;
        }

        // Remove empty state if exists
        const existingEmpty = taxDeductionsChartCanvas.parentNode.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        taxDeductionsChartCanvas.style.display = 'block';

        // Group deductions by section
        const deductionsBySection = {};
        allDeductions.forEach(item => {
            const section = item.section || 'Others';
            deductionsBySection[section] = (deductionsBySection[section] || 0) + Number(item.amount || 0);
        });

        // Sort by amount (descending)
        const sortedSections = Object.entries(deductionsBySection).sort((a, b) => b[1] - a[1]);
        const labels = sortedSections.map(([section]) => section);
        const values = sortedSections.map(([, value]) => value);

        if (labels.length === 0) return;

        const ctx = taxDeductionsChartCanvas.getContext("2d");
        const themeColors = getChartThemeColors();

        // Color palette for different sections (modern gradient-like colors)
        const sectionColors = {
            '80C': '#22c55e',
            '80D': '#3b82f6',
            '80CCD': '#8b5cf6',
            '80E': '#f59e0b',
            '80G': '#10b981',
            '80TTA': '#ef4444',
            '24(b)': '#ec4899',
            'HRA': '#06b6d4',
            'Others': '#6b7280'
        };

        const backgroundColors = labels.map(label => sectionColors[label] || sectionColors['Others']);

        taxDeductionsChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Deduction Amount (₹)",
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bar chart for better label readability
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: themeColors.tooltip,
                        titleColor: themeColors.text,
                        bodyColor: themeColors.text,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = values.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${formatMoney(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: themeColors.text,
                            font: { size: 11 },
                            callback: function(value) {
                                return formatMoney(value);
                            }
                        },
                        grid: { color: themeColors.grid }
                    },
                    y: {
                        ticks: { 
                            color: themeColors.text,
                            font: { size: 12 }
                        },
                        grid: { 
                            color: themeColors.grid,
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering tax deductions chart:', error);
        logger.error('Tax deductions chart render error', { error: error.message });
    }
}

function renderTaxBreakdown(taxRegime) {
    if (!taxBreakdown) {
        console.error("taxBreakdown element not found");
        return;
    }
    taxBreakdown.innerHTML = "";
    const annualIncome  = getAnnualIncomeFromBudget(getSelectedTaxFyStartYear());
    const allDeductions = getAllTaxDeductions();
    const ded = getEffectiveDeductions(allDeductions, taxRegime);

    // Add house property income
    const hp = (appData.taxData || {}).houseProperty || {};
    const housePropertyIncome = calculateIncomeFromHouseProperty(hp);
    const grossTotalIncome = annualIncome + Math.max(0, housePropertyIncome);

    const taxableIncome = Math.max(0, grossTotalIncome - ded.stdDeduction - ded.totalDeductions);
    const tax      = calculateTax(taxableIncome, taxRegime);
    const cess     = tax * 0.04;
    const totalTax = tax + cess;

    // Regime comparison
    const oldDed = getEffectiveDeductions(allDeductions, 'old');
    const newDed = getEffectiveDeductions(allDeductions, 'new');
    const oldTotalTax = calculateTax(Math.max(0, grossTotalIncome - oldDed.stdDeduction - oldDed.totalDeductions), 'old') * 1.04;
    const newTotalTax = calculateTax(Math.max(0, grossTotalIncome - newDed.stdDeduction), 'new') * 1.04;
    const bestRegime  = oldTotalTax <= newTotalTax ? 'Old Regime' : 'New Regime';
    const saving      = Math.abs(oldTotalTax - newTotalTax);

    const breakdown = [
        { label: 'Gross Annual Income (from budget)', value: formatMoney(annualIncome) },
        ...(housePropertyIncome > 0 ? [{ label: 'Income from House Property', value: formatMoney(housePropertyIncome) }] : []),
        ...(housePropertyIncome < 0 ? [{ label: 'Loss from House Property (set off)', value: formatMoney(housePropertyIncome) }] : []),
        { label: `Standard Deduction (${taxRegime === 'new' ? 'New' : 'Old'} Regime)`, value: formatMoney(ded.stdDeduction) },
        ...(taxRegime === 'old' ? [
            { label: '80C Deductions (auto+manual, cap ₹1.5L)', value: formatMoney(ded.total80C) },
            { label: '80D Deductions (auto+manual, cap ₹50K)',  value: formatMoney(ded.total80D) },
            ...(ded.total24b > 0 ? [{ label: '24(b) Home Loan Interest (cap ₹2L)', value: formatMoney(ded.total24b) }] : []),
            ...(ded.total80TTA > 0 ? [{ label: '80TTA Savings Account Interest (cap ₹10K)', value: formatMoney(ded.total80TTA) }] : []),
            ...(ded.hraExemption > 0 ? [{ label: 'HRA Exemption (Section 10(13A))', value: formatMoney(ded.hraExemption) }] : []),
            ...(ded.housePropertyLoss > 0 ? [{ label: 'House Property Loss Set-off (max ₹2L)', value: formatMoney(ded.housePropertyLoss) }] : []),
            ...(ded.totalOther > 0 ? [{ label: 'Other Deductions', value: formatMoney(ded.totalOther) }] : [])
        ] : []),
        { label: 'Taxable Income', value: formatMoney(taxableIncome), highlight: true },
        { label: 'Base Tax', value: formatMoney(tax) },
        { label: 'Cess (4%)', value: formatMoney(cess) },
        { label: 'Total Tax Liability', value: formatMoney(totalTax), highlight: true },
        { label: `💡 Best regime: ${bestRegime}`, value: saving > 0 ? `saves ${formatMoney(saving)}/yr` : 'Equal', tip: true }
    ];

    breakdown.forEach(item => {
        const div = document.createElement("div");
        div.className = `tax-breakdown-item${item.highlight ? " highlight" : ""}${item.tip ? " regime-tip" : ""}`;
        div.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
        taxBreakdown.appendChild(div);
    });
}

function renderTaxSavingBanner(taxRegime) {
    const bannerEl = document.getElementById("taxSavingBanner");
    if (!bannerEl) return;

    // Show banner for both regimes
    const annualIncome = getAnnualIncomeFromBudget(getSelectedTaxFyStartYear());
    const allDeductions = getAllTaxDeductions();
    const ded = getEffectiveDeductions(allDeductions, taxRegime);

    if (taxRegime === 'new') {
        // New regime banner
        bannerEl.style.display = 'block';
        bannerEl.innerHTML = `
            <h3>New Tax Regime - Tax Saving Scope</h3>
            <p><strong>New Regime offers lower tax rates but limited deductions.</strong></p>
            <p><strong>Available Deductions:</strong></p>
            <ul>
                <li><strong>Standard Deduction:</strong> ₹75,000 (increased from ₹50K in Budget 2025)</li>
                <li><strong>Family Pension:</strong> ₹15,000 (if applicable)</li>
                <li><strong>Agneepath Scheme:</strong> 40% of corpus tax-exempt (if applicable)</li>
            </ul>
            <p><strong>Total Potential:</strong> ₹90,000+</p>
            <p style="margin-top:12px;font-size:0.9rem;opacity:0.9;">
                <strong>Best For:</strong> Low deductions, high income, simpler tax filing
            </p>
        `;
        return;
    }

    // Old regime banner
    const cap80C = 150000;
    const cap80D = 50000;
    const cap24b = 200000;
    const cap80TTA = 10000;

    const remaining80C = Math.max(0, cap80C - ded.total80C);
    const remaining80D = Math.max(0, cap80D - ded.total80D);
    const remaining24b = Math.max(0, cap24b - ded.total24b);
    const remaining80TTA = Math.max(0, cap80TTA - ded.total80TTA);

    // Calculate HRA exemption scope
    const salary = (appData.taxData || {}).salary || {};
    const currentHRAExemption = calculateHRAExemption(salary);
    const hraScope = salary.basicSalary ? (salary.basicSalary * (salary.isMetroCity === 'yes' ? 0.50 : 0.40)) - currentHRAExemption : 0;

    const totalRemainingScope = remaining80C + remaining80D + remaining24b + remaining80TTA + Math.max(0, hraScope);

    // Calculate potential tax savings (assuming 30% tax bracket for ITR-2 filers)
    const potentialTaxSavings = totalRemainingScope * 0.30 * 1.04; // 30% tax + 4% cess

    if (totalRemainingScope === 0) {
        bannerEl.style.display = 'none';
        return;
    }

    bannerEl.style.display = 'block';
    bannerEl.innerHTML = `
        <h3>Old Tax Regime - Tax Saving Scope</h3>
        <p><strong>You can save up to ${formatMoney(potentialTaxSavings)} in taxes</strong> by utilizing the remaining investment scope under the Old Tax Regime (ITR-2).</p>
        <p><strong>Maximum Tax Saving Potential: ₹5,85,000+</strong></p>
        <p><strong>Remaining Investment Scope:</strong></p>
        <ul>
            ${remaining80C > 0 ? `<li><strong>Section 80C:</strong> ${formatMoney(remaining80C)} available (PPF, ELSS, EPF, LIC, Tax Saver FD, NSC, SSY, Tuition fees, Home loan principal)</li>` : ''}
            ${remaining80D > 0 ? `<li><strong>Section 80D:</strong> ${formatMoney(remaining80D)} available (Health insurance for self/family/parents, Preventive health checkup ₹5K)</li>` : ''}
            ${remaining24b > 0 ? `<li><strong>Section 24(b):</strong> ${formatMoney(remaining24b)} available (Home loan interest for self-occupied property)</li>` : ''}
            ${remaining80TTA > 0 ? `<li><strong>Section 80TTA:</strong> ${formatMoney(remaining80TTA)} available (Savings account interest)</li>` : ''}
            ${hraScope > 0 ? `<li><strong>HRA Exemption:</strong> ${formatMoney(hraScope)} available (Add salary details to calculate)</li>` : ''}
        </ul>
        <p style="margin-top:12px;font-size:0.9rem;opacity:0.9;">
            <strong>Current Utilization:</strong> ${formatMoney(ded.totalDeductions)} / ₹5,85,000+<br>
            <strong>Remaining Scope:</strong> ${formatMoney(totalRemainingScope)}
        </p>
        <p style="margin-top:12px;font-size:0.9rem;opacity:0.9;">
            <strong>Note:</strong> This calculation assumes ITR-2 filing (income from salary/house property/capital gains).
            Add investments in the Investments tab or Fixed Outflow tab to automatically track your 80C/80D deductions.
            Add salary and house property details in Edit mode to calculate HRA and Section 24(b) exemptions.
        </p>
    `;
}

// ── Salary Details Functions ──────────────────────────────────────────────────
function populateSalaryDetailsForm() {
    const salary = (appData.taxData || {}).salary || {};
    if (document.getElementById("basicSalary")) document.getElementById("basicSalary").value = salary.basicSalary || '';
    if (document.getElementById("hraReceived")) document.getElementById("hraReceived").value = salary.hraReceived || '';
    if (document.getElementById("rentPaid")) document.getElementById("rentPaid").value = salary.rentPaid || '';
    if (document.getElementById("isMetroCity")) document.getElementById("isMetroCity").value = salary.isMetroCity || 'yes';
}

function saveSalaryDetailsAuto() {
    try {
        console.log('💼 Saving salary details...');
        const basicSalary = Number(document.getElementById("basicSalary")?.value) || 0;
        const hraReceived = Number(document.getElementById("hraReceived")?.value) || 0;
        const rentPaid = Number(document.getElementById("rentPaid")?.value) || 0;
        const isMetroCity = document.getElementById("isMetroCity")?.value || 'yes';
        
        console.log('Salary values:', { basicSalary, hraReceived, rentPaid, isMetroCity });
        
        if (!appData.taxData) appData.taxData = {};
        appData.taxData.salary = {
            basicSalary,
            hraReceived,
            rentPaid,
            isMetroCity
        };
        
        console.log('appData.taxData after update:', appData.taxData);
        scheduleSave();
        console.log('Salary save scheduled');
    } catch (error) {
        console.error("Error saving salary details:", error);
        logger.error("Salary details save error", { error: error.message });
    }
}

function renderSalaryDetails() {
    if (!salaryDetailsList) return;
    
    const salary = (appData.taxData || {}).salary || {};
    
    if (!salary.basicSalary) {
        salaryDetailsList.innerHTML = `<div class="empty-state visible">No salary details added. Add in Edit mode.</div>`;
        return;
    }
    
    // Calculate HRA exemption
    const hraExemption = calculateHRAExemption(salary);
    
    salaryDetailsList.innerHTML = `
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">Basic Salary</span>
            </div>
            <div>
                <span class="value">${formatMoney(salary.basicSalary)}</span>
            </div>
        </div>
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">HRA Received</span>
            </div>
            <div>
                <span class="value">${formatMoney(salary.hraReceived)}</span>
            </div>
        </div>
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">Rent Paid</span>
            </div>
            <div>
                <span class="value">${formatMoney(salary.rentPaid)}</span>
            </div>
        </div>
        <div class="tax-deduction-item" style="background: #10b98122; border-color: #10b981;">
            <div class="asset-label-group">
                <span class="auto-badge">Calculated</span>
                <span class="label">HRA Exemption (Section 10(13A))</span>
            </div>
            <div>
                <span class="value" style="color: #10b981;">${formatMoney(hraExemption)}</span>
            </div>
        </div>
    `;
}

function calculateHRAExemption(salary) {
    if (!salary || !salary.basicSalary) return 0;
    
    // HRA exemption is the minimum of:
    // 1. Actual HRA received
    // 2. Rent paid - 10% of basic salary
    // 3. 50% of basic salary (metro) or 40% (non-metro)
    
    const hraReceived = salary.hraReceived;
    const rentPaid = salary.rentPaid;
    const basicSalary = salary.basicSalary;
    const isMetro = salary.isMetroCity === 'yes';
    
    const option1 = hraReceived;
    const option2 = Math.max(0, rentPaid - (basicSalary * 0.10));
    const option3 = basicSalary * (isMetro ? 0.50 : 0.40);
    
    return Math.min(option1, option2, option3);
}

// ── House Property Functions ──────────────────────────────────────────────────
function populateHousePropertyForm() {
    const hp = (appData.taxData || {}).houseProperty || {};
    if (document.getElementById("rentalIncome")) document.getElementById("rentalIncome").value = hp.rentalIncome || '';
    if (document.getElementById("municipalTaxes")) document.getElementById("municipalTaxes").value = hp.municipalTaxes || '';
    if (document.getElementById("homeLoanInterest")) document.getElementById("homeLoanInterest").value = hp.homeLoanInterest || '';
    if (document.getElementById("isSelfOccupied")) document.getElementById("isSelfOccupied").value = hp.isSelfOccupied || 'yes';
}

function saveHousePropertyDetailsAuto() {
    try {
        const rentalIncome = Number(document.getElementById("rentalIncome")?.value) || 0;
        const municipalTaxes = Number(document.getElementById("municipalTaxes")?.value) || 0;
        const homeLoanInterest = Number(document.getElementById("homeLoanInterest")?.value) || 0;
        const isSelfOccupied = document.getElementById("isSelfOccupied")?.value || 'yes';
        
        if (!appData.taxData) appData.taxData = {};
        appData.taxData.houseProperty = {
            rentalIncome,
            municipalTaxes,
            homeLoanInterest,
            isSelfOccupied
        };
        
        scheduleSave();
    } catch (error) {
        console.error("Error saving house property details:", error);
        logger.error("House property save error", { error: error.message });
    }
}

function renderHousePropertyDetails() {
    if (!housePropertyList) return;
    
    const hp = (appData.taxData || {}).houseProperty || {};
    
    if (!hp.rentalIncome && !hp.homeLoanInterest) {
        housePropertyList.innerHTML = `<div class="empty-state visible">No house property details added. Add in Edit mode.</div>`;
        return;
    }
    
    // Calculate income from house property
    const incomeFromHP = calculateIncomeFromHouseProperty(hp);
    
    housePropertyList.innerHTML = `
        ${hp.rentalIncome ? `
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">Rental Income</span>
            </div>
            <div>
                <span class="value">${formatMoney(hp.rentalIncome)}</span>
            </div>
        </div>` : ''}
        ${hp.municipalTaxes ? `
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">Municipal Taxes</span>
            </div>
            <div>
                <span class="value" style="color: #ef4444;">-${formatMoney(hp.municipalTaxes)}</span>
            </div>
        </div>` : ''}
        ${hp.homeLoanInterest ? `
        <div class="tax-deduction-item">
            <div class="asset-label-group">
                <span class="manual-badge">Manual</span>
                <span class="label">Home Loan Interest</span>
            </div>
            <div>
                <span class="value" style="color: #ef4444;">-${formatMoney(hp.homeLoanInterest)}</span>
            </div>
        </div>` : ''}
        <div class="tax-deduction-item" style="background: ${incomeFromHP >= 0 ? '#10b98122' : '#ef444422'}; border-color: ${incomeFromHP >= 0 ? '#10b981' : '#ef4444'};">
            <div class="asset-label-group">
                <span class="auto-badge">Calculated</span>
                <span class="label">Income from House Property</span>
            </div>
            <div>
                <span class="value" style="color: ${incomeFromHP >= 0 ? '#10b981' : '#ef4444'};">${incomeFromHP >= 0 ? '+' : ''}${formatMoney(incomeFromHP)}</span>
            </div>
        </div>
    `;
}

function calculateIncomeFromHouseProperty(hp) {
    if (!hp) return 0;
    
    const rentalIncome = hp.rentalIncome || 0;
    const municipalTaxes = hp.municipalTaxes || 0;
    const homeLoanInterest = hp.homeLoanInterest || 0;
    const isSelfOccupied = hp.isSelfOccupied === 'yes';
    
    // Standard deduction: 30% of rental income
    const standardDeduction = rentalIncome * 0.30;
    
    // For self-occupied: Max ₹2L interest deduction
    // For let out: No limit on interest deduction
    const allowedInterest = isSelfOccupied ? Math.min(200000, homeLoanInterest) : homeLoanInterest;
    
    // Income from house property = Rental Income - Municipal Taxes - Standard Deduction - Interest
    let income = rentalIncome - municipalTaxes - standardDeduction - allowedInterest;
    
    // For self-occupied, if negative, it's a loss (can be set off up to ₹2L)
    // For let out, if negative, it's a loss (can be set off against other income)
    
    return income;
}

function renderGifts() {
    const entries = activeEntries();

    // Update toggle button text
    setToggleButtonIconText(toggleGiftsEdit, isGiftsEditMode, 'Edit');

    // Hide gifts summary in edit mode
    const giftsSummary = document.querySelector('.gifts-summary');
    if (giftsSummary) giftsSummary.hidden = isGiftsEditMode;

    // Hide monthly chart in edit mode
    const giftsMonthlyChartContainer = document.getElementById('giftsMonthlyChartContainer');
    if (giftsMonthlyChartContainer) giftsMonthlyChartContainer.hidden = isGiftsEditMode;

    // Show/hide preview/edit modes
    if (isGiftsEditMode) {
        giftsPreview.hidden = true;
        giftsEdit.hidden = false;

        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!giftsDynamicFields.hasChildNodes()) {
            renderGiftsDynamicFields();
        }
        updateSectionSubmitButton("gifts");

        // Render table
        renderGiftsTable(entries);
    } else {
        giftsPreview.hidden = false;
        giftsEdit.hidden = true;
        
        // Show summary in preview mode
        if (giftsSummary) giftsSummary.hidden = false;
        
        // Show chart in preview mode
        if (giftsMonthlyChartContainer) giftsMonthlyChartContainer.hidden = false;
        
        // Calculate and display summary
        calculateGiftsSummary(entries);
        
        // Render preview cards
        renderGiftsPreviewCards(entries);
        renderGiftsMonthlyChart(entries);
    }
}

function renderGiftsMonthlyChart(entries) {
    if (giftsMonthlyChart) {
        giftsMonthlyChart.destroy();
        giftsMonthlyChart = null;
    }

    if (!giftsMonthlyChartCanvas) return;

    const currentDate = new Date();
    const fyStartYear = currentDate.getMonth() < 3 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    const fyStart = new Date(fyStartYear, 3, 1);
    const fyEnd = new Date(fyStartYear + 1, 2, 31);

    const monthlyTotals = Array(12).fill(0);
    const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    entries.forEach(gift => {
        if (!gift.date) return;
        const giftDate = new Date(gift.date);
        if (giftDate < fyStart || giftDate > fyEnd) return;
        const monthIndex = (giftDate.getMonth() + 9) % 12;
        monthlyTotals[monthIndex] += Number(gift.amount || 0);
    });

    const ctx = giftsMonthlyChartCanvas.getContext("2d");
    const chartColors = getChartThemeColors();
    giftsMonthlyChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [{
                label: "Gift Spend (₹)",
                data: monthlyTotals,
                backgroundColor: chartColors.bar,
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 34
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: chartColors.text },
                    grid: { color: chartColors.grid }
                },
                y: {
                    ticks: { color: chartColors.text },
                    grid: { color: chartColors.grid }
                }
            }
        }
    });
}

function renderGiftsDynamicFields() {
    giftsDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.gifts || TAB_FIELDS.monthlyBudget;

    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";

        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);

        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `gifts_${field.id}`;
        if (field.required) input.required = true;
        if (field.type === "date") {
            input.value = getDefaultDateValue();
        }
        div.appendChild(input);

        giftsDynamicFields.appendChild(div);
    });
}

function renderGiftsTable(entries) {
    const fields = TAB_FIELDS.gifts || TAB_FIELDS.monthlyBudget;
    
    giftsTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "";
    tr.appendChild(actionTh);
    giftsTableHead.appendChild(tr);
    
    giftsTableBody.innerHTML = "";
    giftsEmptyState.classList.toggle("visible", entries.length === 0);
    
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                td.textContent = formatMoney(Number(item[f.id] || 0));
                td.className = "amount";
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        giftsTableBody.appendChild(row);
    });
}

function calculateGiftsSummary(entries) {
    // Total gifts count
    const totalGiftsCount = entries.length;

    // Fixed Every Year count and amount
    const fixedEveryYearEntries = entries.filter(g => g.category === "Fixed Every Year");
    const fixedEveryYearCount = fixedEveryYearEntries.length;
    const fixedEveryYearAmount = fixedEveryYearEntries.reduce((s, g) => s + Number(g.amount || 0), 0);

    // Calculate This Year spent (current financial year: April to March)
    const today = new Date();
    let fyStartYear = today.getFullYear();
    if (today.getMonth() < 3) { // Before April
        fyStartYear--;
    }
    const fyStart = new Date(fyStartYear, 3, 1); // April 1st
    const fyEnd = new Date(fyStartYear + 1, 2, 31); // March 31st next year

    const thisYearSpent = entries
        .filter(g => {
            if (!g.date) return false;
            const giftDate = new Date(g.date);
            return giftDate >= fyStart && giftDate <= fyEnd;
        })
        .reduce((s, g) => s + Number(g.amount || 0), 0);

    // Calculate Overall total
    const overallTotal = entries.reduce((s, g) => s + Number(g.amount || 0), 0);

    document.getElementById("totalGiftsCount").textContent = totalGiftsCount;
    document.getElementById("fixedEveryYearCount").textContent = fixedEveryYearCount;
    document.getElementById("fixedEveryYearAmount").textContent = formatMoney(fixedEveryYearAmount);
    document.getElementById("thisYearSpent").textContent = formatMoney(thisYearSpent);
    document.getElementById("overallTotal").textContent = formatMoney(overallTotal);

    // Return summary for testing
    return {
        totalCount: totalGiftsCount,
        fixedCount: fixedEveryYearCount,
        fixedAmount: fixedEveryYearAmount,
        spentThisYear: thisYearSpent,
        overallTotal: overallTotal
    };
}

function renderGiftsPreviewCards(entries) {
    const toolbarEl = document.getElementById("giftsSortFilter");
    const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        // Build custom toolbar with month filter
        const currentMonthFilter = listSortFilter.gifts.filters.month || "";
        const monthFilterHtml = monthOptions.map(m => `<option value="${m}"${currentMonthFilter === m ? " selected" : ""}>${m}</option>`).join("");

        toolbarEl.innerHTML = `
            <div class="list-toolbar">
                <div class="toolbar-search-item">
                    <input type="text" class="toolbar-search-input" data-tab="gifts" placeholder="Search all fields..." value="${esc(listSortFilter.gifts.searchText || "")}">
                </div>
                <div class="list-toolbar-sort">
                    <label>Sort by</label>
                    <select class="toolbar-sort-select" data-tab="gifts">
                        <option value="">None</option>
                        <option value="date"${listSortFilter.gifts.sortBy === "date" ? " selected" : ""}>Date</option>
                        <option value="amount"${listSortFilter.gifts.sortBy === "amount" ? " selected" : ""}>Amount</option>
                        <option value="transactionType"${listSortFilter.gifts.sortBy === "transactionType" ? " selected" : ""}>Transaction Type</option>
                        <option value="category"${listSortFilter.gifts.sortBy === "category" ? " selected" : ""}>Category</option>
                    </select>
                    <button type="button" class="toolbar-sort-dir" data-tab="gifts">${listSortFilter.gifts.sortDir === "asc" ? "↑ Asc" : "↓ Desc"}</button>
                </div>
                <div class="list-toolbar-divider"></div>
                <div class="list-toolbar-filters">
                    <div class="toolbar-filter-item">
                        <label>Month</label>
                        <select class="toolbar-filter-select" data-tab="gifts" data-field="month">
                            <option value="">All</option>
                            ${monthFilterHtml}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    // Apply custom month filter based on date field
    let filteredEntries = [...entries];
    const monthFilter = listSortFilter.gifts.filters.month;
    if (monthFilter) {
        const currentDate = new Date();
        const fyStartYear = currentDate.getMonth() < 3 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const fyStart = new Date(fyStartYear, 3, 1);
        const fyEnd = new Date(fyStartYear + 1, 2, 31);

        const targetMonthIndex = monthOptions.indexOf(monthFilter);

        filteredEntries = filteredEntries.filter(gift => {
            if (!gift.date) return false;
            const giftDate = new Date(gift.date);
            if (isNaN(giftDate.getTime())) return false;
            if (giftDate < fyStart || giftDate > fyEnd) return false;
            return giftDate.getMonth() === targetMonthIndex;
        });
    }

    // Apply sort/filter (skip built-in filters since we do custom month filtering)
    const displayEntries = applyListSortFilter("gifts", filteredEntries, true);
    giftsList.innerHTML = "";

    if (displayEntries.length === 0) {
        giftsList.innerHTML = entries.length === 0
            ? `<div class="empty-state visible" style="background: var(--surf1); border: 1px solid var(--border2); border-radius: 12px;">No gifts yet. Click Edit to add gifts.</div>`
            : `<div class="empty-state visible" style="background: var(--surf1); border: 1px solid var(--border2); border-radius: 12px;">No results match the current filters.</div>`;
        return;
    }

    // Default view: Group by category and sort by transaction type
    if (!listSortFilter.gifts.sortBy) {
        // Group by category
        const grouped = {};
        displayEntries.forEach(gift => {
            const category = gift.category || "On Demand";
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(gift);
        });

        // Sort categories (Fixed Every Year first, then On Demand)
        const categoryOrder = ["Fixed Every Year", "On Demand"];
        const sortedCategories = Object.keys(grouped).sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Render grouped gifts
        sortedCategories.forEach(category => {
            // Sort by transaction type within each category
            grouped[category].sort((a, b) => {
                const typeA = (a.transactionType || "").toLowerCase();
                const typeB = (b.transactionType || "").toLowerCase();
                return typeA.localeCompare(typeB);
            });

            // Add group header
            const groupHeader = document.createElement("div");
            groupHeader.style.cssText = "font-size:14px;font-weight:600;color:var(--text);margin:16px 0 8px 0;padding:8px 12px;background:var(--surf1);border-radius:8px;border-left:3px solid var(--primary);";
            groupHeader.textContent = `${category} (${grouped[category].length})`;
            giftsList.appendChild(groupHeader);

            // Render gifts in this category
            grouped[category].forEach(gift => {
                const item = renderGiftCard(gift);
                giftsList.appendChild(item);
            });
        });
    } else {
        // Render with selected sort
        displayEntries.forEach(gift => {
            const item = renderGiftCard(gift);
            giftsList.appendChild(item);
        });
    }
}

function renderGiftCard(gift) {
    const item = document.createElement("div");
    item.className = "gift-item";
    
    const categoryClass = gift.category === "Fixed Every Year" ? "fixed" : "demand";
    
    // Format date/month display
    let dateDisplay = "";
    if (gift.date) {
        const giftDate = new Date(gift.date);
        if (!isNaN(giftDate.getTime())) {
            if (gift.category === "Fixed Every Year") {
                // Show month for recurring gifts
                dateDisplay = giftDate.toLocaleDateString('en-IN', { month: 'long' });
            } else {
                // Show full date for on-demand gifts
                dateDisplay = giftDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            }
        }
    }
    
    item.innerHTML = `
        <div class="gift-item-info">
            <div class="gift-item-title">${esc(gift.name)}</div>
            <div class="gift-item-details">
                <span class="gift-item-category ${categoryClass}">${esc(gift.category || "On Demand")}</span>
                <span class="gift-item-transaction-type">${esc(gift.transactionType || "—")}</span><br>
                ${esc(gift.relativeName || "—")}<br>
                Occasion: ${esc(gift.occasion || "—")}${dateDisplay ? ` · ${dateDisplay}` : ""}<br>
                    ${gift.details ? `Details: ${esc(gift.details)}` : ""}
                </div>
            </div>
            <div class="gift-item-amount">${formatMoney(Number(gift.amount || 0))}</div>
        `;
    
    return item;
}

function renderEmergencyFund() {
    const entries = activeEntries();
    
    // Update toggle button text
    setToggleButtonIconText(toggleEmergencyFundEdit, isEmergencyFundEditMode, 'Edit');
    
    // Show/hide preview/edit modes
    if (isEmergencyFundEditMode) {
        if (emergencyFundPreview) emergencyFundPreview.hidden = true;
        emergencyFundEdit.hidden = false;
        
        // Render form fields
        renderEmergencyFundDynamicFields();
        
        // Pre-fill with current entry values if exists
        if (entries.length > 0) {
            const fields = TAB_FIELDS.emergencyFund || [];
            fields.forEach(f => {
                const input = document.getElementById(`emergencyFund_${f.id}`);
                if (input && entries[0][f.id] !== undefined) {
                    input.value = entries[0][f.id];
                }
            });
        }
    } else {
        if (emergencyFundPreview) emergencyFundPreview.hidden = false;
        emergencyFundEdit.hidden = true;
        
        // Calculate and display emergency fund summary
        calculateEmergencyFundSummary(entries);
    }
}

function renderEmergencyFundDynamicFields() {
    emergencyFundDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.emergencyFund || TAB_FIELDS.monthlyBudget;
    
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `emergencyFund_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        
        emergencyFundDynamicFields.appendChild(div);
    });
}

// ── Insurance Tab ─────────────────────────────────────────────────────────────
function renderInsurance() {
    const entries = (appData.tabData || {}).insurance || [];

    if (toggleInsuranceEdit) setToggleButtonIconText(toggleInsuranceEdit, isInsuranceEditMode, "Edit");
    
    // Hide insurance summary in edit mode
    const insuranceSummary = document.querySelector('.insurance-summary');
    if (insuranceSummary) insuranceSummary.hidden = isInsuranceEditMode;

    if (isInsuranceEditMode) {
        if (insuranceTabPreview) insuranceTabPreview.hidden = true;
        if (insuranceTabEdit) insuranceTabEdit.hidden = false;
        // Only render form fields if they don't exist yet (prevents losing user input during re-renders)
        if (!insuranceDynamicFields?.hasChildNodes()) {
            renderInsuranceDynamicFields();
        }
        updateSectionSubmitButton("insurance");
        renderInsuranceTable(entries);
    } else {
        if (insuranceTabPreview) insuranceTabPreview.hidden = false;
        if (insuranceTabEdit) insuranceTabEdit.hidden = true;
        if (insuranceSummary) insuranceSummary.hidden = false;
        renderInsurancePreviewCards(entries);
        calculateInsuranceSummary(entries);
    }
}

function renderInsuranceDynamicFields() {
    if (!insuranceDynamicFields) return;
    insuranceDynamicFields.innerHTML = "";
    const fields = TAB_FIELDS.insurance;
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        const label = document.createElement("label");
        label.textContent = field.label;
        div.appendChild(label);
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") { input.min = "0"; input.step = field.step || "1"; }
        }
        input.id = `insurance_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        insuranceDynamicFields.appendChild(div);
    });
}

function renderInsuranceTable(entries) {
    if (!insuranceTableHead || !insuranceTableBody) return;
    const fields = TAB_FIELDS.insurance;
    insuranceTableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => { const th = document.createElement("th"); th.textContent = f.label; tr.appendChild(th); });
    const actTh = document.createElement("th"); actTh.textContent = ""; tr.appendChild(actTh);
    insuranceTableHead.appendChild(tr);
    insuranceTableBody.innerHTML = "";
    if (insuranceEmptyState) insuranceEmptyState.classList.toggle("visible", entries.length === 0);
    entries.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") { td.textContent = formatMoney(Number(item[f.id] || 0)); td.className = "amount"; }
            else { td.textContent = esc(item[f.id] || "—"); }
            row.appendChild(td);
        });
        const actTd = document.createElement("td"); actTd.innerHTML = renderRowActions(item.id); row.appendChild(actTd);
        insuranceTableBody.appendChild(row);
    });
}

function getInsuranceAnnualPremium(item) {
    const amt = Number(item.premiumAmount || 0);
    const freq = (item.premiumFrequency || "").toLowerCase();
    if (freq === "monthly") return amt * 12;
    if (freq === "quarterly") return amt * 4;
    if (freq === "half-yearly") return amt * 2;
    if (freq === "annual") return amt;
    return 0; // None (Paid Up)
}

function renderInsurancePreviewCards(entries) {
    const toolbarEl = document.getElementById("insuranceSortFilter");
    // Only rebuild toolbar if it's empty or doesn't exist
    if (toolbarEl && !toolbarEl.querySelector('.list-toolbar')) {
        toolbarEl.innerHTML = buildSortFilterToolbar("insurance");
    }
    const displayEntries = applyListSortFilter("insurance", entries);
    if (!insuranceList) return;
    insuranceList.innerHTML = "";
    if (displayEntries.length === 0) {
        insuranceList.innerHTML = entries.length === 0
            ? `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No insurance policies yet. Click Edit to add.</div>`
            : `<div class="empty-state visible" style="background:var(--surf1);border:1px solid var(--border2);border-radius:12px;">No results match the current filters.</div>`;
        return;
    }
    displayEntries.forEach(item => {
        const card = document.createElement("div");
        card.className = "insurance-card";
        const annualPremium = getInsuranceAnnualPremium(item);
        const hasPremium = annualPremium > 0;
        card.innerHTML = `
            <div class="insurance-card-info">
                <div class="insurance-card-title">${esc(item.name)}</div>
                <div class="insurance-card-details">
                    <span class="policy-badge semantic-insurance">${esc(item.policyType || "Others")}</span>
                    ${hasPremium ? `<span class="premium-badge semantic-liability">${esc(item.premiumFrequency)} Premium</span>` : `<span class="no-premium-badge semantic-insurance is-paid">No Active Premium</span>`}
                    <br>Provider: ${esc(item.provider || "—")}
                    | Policy #: ${esc(item.policyNumber || "—")}
                    <br>Sum Assured: ${formatMoney(Number(item.sumAssured || 0))}
                    ${hasPremium ? `| Premium: ${formatMoney(Number(item.premiumAmount || 0))} (${esc(item.premiumFrequency)})` : ""}
                    <br>Period: ${esc(item.startDate || "—")} to ${esc(item.endDate || "—")}
                    | Nominee: ${esc(item.nominee || "—")}
                    ${item.details ? `<br>${esc(item.details)}` : ""}
                </div>
            </div>
            <div class="insurance-card-amount">${hasPremium ? formatMoney(annualPremium) + "/yr" : "Paid Up"}</div>`;
        insuranceList.appendChild(card);
    });
}

function calculateInsuranceSummary(entries) {
    const totalPolicies = entries.length;
    const totalAnnualPremium = entries.reduce((s, e) => s + getInsuranceAnnualPremium(e), 0);
    const monthlyPremiumLoad = totalAnnualPremium / 12;
    const totalSumAssured = entries.reduce((s, e) => s + Number(e.sumAssured || 0), 0);

    const el1 = document.getElementById("totalPolicies");
    const el2 = document.getElementById("totalAnnualPremium");
    const el3 = document.getElementById("monthlyPremiumLoad");
    const el4 = document.getElementById("totalSumAssured");
    if (el1) el1.textContent = totalPolicies;
    if (el2) el2.textContent = formatMoney(totalAnnualPremium);
    if (el3) el3.textContent = formatMoney(monthlyPremiumLoad);
    if (el4) el4.textContent = formatMoney(totalSumAssured);
}

function calculateEmergencyFundSummary(entries) {
    // ── 1. Fixed monthly obligations (from Outflow tab — can't stop these) ──
    const allOutflows = ((appData.tabData || {}).outflow || []);
    let fixedLiabilities = 0;
    let fixedExpenditure = 0;

    allOutflows.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = toMonthlyAmount(amount, freq);
        if (monthlyAmt <= 0) return;

        const t = e.type || "Expenditure";
        if (t === "Liability" || t === "Insurance") {
            fixedLiabilities += monthlyAmt;
        } else if (t === "Expenditure") {
            fixedExpenditure += monthlyAmt;
        }
        // Saving & Investment types excluded — can stop in emergency
    });

    // ── 2. Average variable monthly expenditure from budget history ──
    // Variable = utilityBills + familyExpenditure + miscExpenses + debtRepayment
    //          + creditCardOutstanding + midMonthCCOutstanding
    //          + ondemandExpenditure + ondemandLiability
    const monthlyBudgetData = appData.monthlyBudgetData || {};
    const availableMonths = Object.keys(monthlyBudgetData);
    let totalVariable = 0;
    let monthsWithData = 0;

    availableMonths.forEach(monthKey => {
        const md = monthlyBudgetData[monthKey] || {};
        const o = md.outflow || {};
        const inv = md.investing || {};
        const varExp = Number(o.utilityBills || 0)
            + Number(o.familyExpenditure || 0)
            + Number(o.miscExpenses || 0)
            + Number(o.debtRepayment || 0)
            + Number(o.creditCardOutstanding || 0)
            + Number(o.midMonthCCOutstanding || 0)
            + Number(inv.ondemandExpenditure || 0)
            + Number(inv.ondemandLiability || 0);
        if (varExp > 0) {
            totalVariable += varExp;
            monthsWithData++;
        }
    });

    const avgVariableExpenses = monthsWithData > 0 ? totalVariable / monthsWithData : 0;

    // ── 3. Minimum monthly survival amount ──
    const minMonthlyNeed = fixedLiabilities + fixedExpenditure + avgVariableExpenses;

    // ── 4. Practical scenarios ──
    const threeMonthsNeeded = minMonthlyNeed * 3;
    const sixMonthsNeeded = minMonthlyNeed * 6;
    const twelveMonthsNeeded = minMonthlyNeed * 12;

    // Get current emergency fund from saved entries
    let currentFund = 0;
    if (entries.length > 0) {
        currentFund = Number(entries[0].currentFund || 0);
    }
    currentEmergencyFundDisplay.textContent = formatMoney(currentFund);
    const notesEl = document.getElementById("currentEmergencyFundNotes");
    if (notesEl) {
        const notes = entries[0]?.details || "";
        notesEl.textContent = notes;
        notesEl.hidden = !notes;
    }

    // Update summary display
    const breakdownEl = document.getElementById("emergencyFundBreakdown");
    if (breakdownEl) {
        breakdownEl.innerHTML = `
            <div class="ef-breakdown-row"><span>Fixed Liabilities & Insurance</span><strong>${formatMoney(fixedLiabilities)}</strong></div>
            <div class="ef-breakdown-row"><span>Fixed Expenditure (rent, etc.)</span><strong>${formatMoney(fixedExpenditure)}</strong></div>
            <div class="ef-breakdown-row"><span>Avg Variable Expenses (${monthsWithData} mo)</span><strong>${formatMoney(avgVariableExpenses)}</strong></div>
            <div class="ef-breakdown-row ef-total"><span>Minimum Monthly Need</span><strong>${formatMoney(minMonthlyNeed)}</strong></div>
        `;
    }
    document.getElementById("averageMonthlyExpenses").textContent = formatMoney(minMonthlyNeed);
    document.getElementById("threeMonthsNeeded").textContent = formatMoney(threeMonthsNeeded);
    document.getElementById("sixMonthsNeeded").textContent = formatMoney(sixMonthsNeeded);
    document.getElementById("twelveMonthsNeeded").textContent = formatMoney(twelveMonthsNeeded);

    // Calculate status
    const monthsCovered = minMonthlyNeed > 0 ? currentFund / minMonthlyNeed : 0;
    const amountNeeded = Math.max(0, sixMonthsNeeded - currentFund);

    // Determine status color
    const statusBadge = document.getElementById("statusBadge");
    statusBadge.className = "status-badge";

    let statusText = "";
    if (minMonthlyNeed === 0) {
        statusBadge.classList.add("yellow");
        statusText = "NO DATA";
        document.getElementById("amountNeeded").textContent = "Add outflow entries & budget data first";
        document.getElementById("monthsCovered").textContent = "—";
        statusBadge.textContent = statusText;
        return;
    }

    if (monthsCovered >= 12) {
        statusBadge.classList.add("green");
        statusText = "EXCELLENT";
    } else if (monthsCovered >= 6) {
        statusBadge.classList.add("green");
        statusText = "READY";
    } else if (monthsCovered >= 3) {
        statusBadge.classList.add("yellow");
        statusText = "ADEQUATE";
    } else {
        statusBadge.classList.add("red");
        statusText = "LOW";
    }

    statusBadge.textContent = statusText;
    document.getElementById("amountNeeded").textContent = formatMoney(amountNeeded);
    document.getElementById("monthsCovered").textContent = monthsCovered.toFixed(1);
}

function calculateAnnualSummary() {
    try {
        const monthlyBudgetData = appData.monthlyBudgetData || {};
        const fyStartYear = getFinancialYearStartYear(currentMonth);
        const monthKeys = getFinancialYearMonthKeys(fyStartYear);
        currentMonthDisplay.textContent = getFinancialYearLabel(fyStartYear);
        
        if (!monthKeys.some(k => monthlyBudgetData[k])) {
            [annualTotalIncome, annualTotalExpenditure, annualTotalSavings, annualTotalInvestment, annualTotalLiability, annualTotalInsurance, annualTotalOther,
             avgMonthlyIncome, avgMonthlyExpenditure, avgMonthlySavings, avgMonthlyInvestment, avgMonthlyLiability, avgMonthlyInsurance, avgMonthlyOther]
                .forEach(el => { if (el) el.textContent = "₹0"; });
            annualMonthsList.innerHTML = "<p class='empty-state visible'>No monthly data available yet. Add data in Monthly view first.</p>";
            return;
        }
        
        const totals = {
            income: 0,
            expenditure: 0,
            saving: 0,
            investment: 0,
            liability: 0,
            insurance: 0,
            other: 0,
        };
        const monthDataList = [];

        // Determine earliest month (onboarding date) and latest valid month (current month)
        const onboardingMonth = appData.onboardingDate ? appData.onboardingDate.slice(0, 7) : null;
        const currentMonthKey = getMonthKey(new Date());
        
        monthKeys.forEach(monthKey => {
            // Skip months before onboarding
            if (onboardingMonth && monthKey < onboardingMonth) return;
            // Skip future months — only include up to current month
            if (monthKey > currentMonthKey) return;
            // Only process months that have actual data in monthlyBudgetData
            const storedData = monthlyBudgetData[monthKey];
            if (!storedData) return;
            const monthData = { ...storedData, inflow: { ...(storedData.inflow || {}) }, outflow: { ...(storedData.outflow || {}) }, investing: { ...(storedData.investing || {}) } };
            // Apply auto-values only for current/future months; for closed past months, use stored values as-is
            if (!storedData._monthClosed) {
                applyMonthlyAutoValues(monthKey, monthData);
            }
            const dist = getMonthlyDistribution(monthData);
            Object.keys(totals).forEach(key => { totals[key] += Number(dist[key] || 0); });
            monthDataList.push({ month: monthKey, ...dist });
        });
        
        const monthsWithData = monthDataList.filter(m => m.income > 0 || m.expenditure > 0 || m.saving > 0 || m.investment > 0 || m.liability > 0 || m.insurance > 0).length;
        const monthCount = Math.max(monthsWithData, 1);
        
        annualTotalIncome.textContent = formatMoney(totals.income);
        annualTotalExpenditure.textContent = formatMoney(totals.expenditure);
        annualTotalSavings.textContent = formatMoney(totals.saving);
        annualTotalInvestment.textContent = formatMoney(totals.investment);
        annualTotalLiability.textContent = formatMoney(totals.liability);
        if (annualTotalInsurance) annualTotalInsurance.textContent = formatMoney(totals.insurance);
        annualTotalOther.textContent = formatMoney(totals.other);
        avgMonthlyIncome.textContent = formatMoney(totals.income / monthCount);
        avgMonthlyExpenditure.textContent = formatMoney(totals.expenditure / monthCount);
        avgMonthlySavings.textContent = formatMoney(totals.saving / monthCount);
        avgMonthlyInvestment.textContent = formatMoney(totals.investment / monthCount);
        avgMonthlyLiability.textContent = formatMoney(totals.liability / monthCount);
        if (avgMonthlyInsurance) avgMonthlyInsurance.textContent = formatMoney(totals.insurance / monthCount);
        avgMonthlyOther.textContent = formatMoney(totals.other / monthCount);

        // Render annual pie chart
        renderAnnualPieChart(totals);
        
        // Render monthly breakdown
        annualMonthsList.innerHTML = "";
        monthDataList.sort((a, b) => new Date(a.month + "-01") - new Date(b.month + "-01")).reverse().forEach(month => {
            const date = new Date(month.month + "-01");
            const monthName = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
            
            // Calculate budget status for this month
            const storedMd = monthlyBudgetData[month.month] || {};
            let budgetStatusHtml = "";
            if (storedMd._closedBudgetStatus) {
                // Use saved status from when month was closed
                const statusType = storedMd._closedBudgetStatusType || "neutral";
                const statusColor = statusType === "positive" ? COLOR_POSITIVE : statusType === "negative" ? COLOR_NEGATIVE : COLOR_WARNING;
                budgetStatusHtml = `<span class="annual-month-budget-status" style="color:${statusColor};font-weight:600;font-size:0.78rem;">${storedMd._closedBudgetStatus}</span>`;
            } else if (month.income > 0) {
                // Use the same budget balance calculation as monthly view
                // This uses the stored _calculatedBudgetBalance if available, otherwise calculate it
                let budgetBalance = storedMd._calculatedBudgetBalance;
                if (budgetBalance === undefined) {
                    // Calculate budget balance using the same logic as monthly view
                    const allOutflows = ((appData.tabData || {}).outflow || []);
                    let fixedMonthlyOutflow = 0;
                    allOutflows.forEach(e => {
                        const amount = Number(e.amount || 0);
                        if (amount <= 0) return;
                        const freq = e.frequency || "Monthly";
                        const monthlyAmt = toMonthlyAmount(amount, freq);
                        fixedMonthlyOutflow += monthlyAmt;
                    });
                    // Exclude borrowing from spendable as it's not new income
                    const borrowing = Number(monthData.inflow?.borrowing || 0);
                    const inflowWithoutBorrowing = month.income - borrowing;
                    const spendable = inflowWithoutBorrowing - fixedMonthlyOutflow;
                    // Calculate actual variable expenditure and CC outstanding
                    const actualVariableExp = Number(monthData.outflow?.variableExpenditure || 0);
                    const actualCCOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0) + Number(monthData.outflow?.midMonthCCOutstanding || 0);
                    const totalOndemand = Number(monthData.investing?.onetimeSaving || 0) + Number(monthData.investing?.onetimeInvestment || 0) + Number(monthData.investing?.ondemandExpenditure || 0) + Number(monthData.investing?.ondemandLiability || 0);
                    budgetBalance = spendable - (actualVariableExp + actualCCOutstanding + totalOndemand);
                }
                
                if (budgetBalance > 0) {
                    budgetStatusHtml = `<span class="annual-month-budget-status" style="color:${COLOR_POSITIVE};font-weight:600;font-size:0.78rem;">Under Budget: +${formatMoney(budgetBalance)}</span>`;
                } else if (budgetBalance < 0) {
                    budgetStatusHtml = `<span class="annual-month-budget-status" style="color:${COLOR_NEGATIVE};font-weight:600;font-size:0.78rem;">Over Budget: ${formatMoney(Math.abs(budgetBalance))}</span>`;
                } else {
                    budgetStatusHtml = `<span class="annual-month-budget-status" style="color:${COLOR_WARNING};font-weight:600;font-size:0.78rem;">Balanced</span>`;
                }
            }

            const div = document.createElement("div");
            div.className = "annual-month-item";
            div.innerHTML = `
                <span class="annual-month-name">${monthName}${storedMd._monthClosed ? ' (Closed)' : ''}</span>
                <div class="annual-month-details">
                    <span class="annual-month-detail">Income: <strong>${formatMoney(month.income)}</strong></span>
                    <span class="annual-month-detail">Expenditure: <strong>${formatMoney(month.expenditure)}</strong></span>
                    <span class="annual-month-detail">Savings: <strong>${formatMoney(month.saving)}</strong></span>
                    <span class="annual-month-detail">Investment: <strong>${formatMoney(month.investment)}</strong></span>
                    <span class="annual-month-detail">Liability: <strong>${formatMoney(month.liability)}</strong></span>
                    <span class="annual-month-detail">Insurance: <strong>${formatMoney(month.insurance)}</strong></span>
                    <span class="annual-month-detail">Others: <strong>${formatMoney(month.other)}</strong></span>
                    ${budgetStatusHtml}
                </div>
            `;
            annualMonthsList.appendChild(div);
        });
    } catch (error) {
        console.error("Error calculating annual summary:", error);
        logger.error('Annual summary calculation failed', { error: error.message });
        annualTotalIncome.textContent = "₹0";
        annualTotalExpenditure.textContent = "₹0";
        annualTotalSavings.textContent = "₹0";
        avgMonthlyIncome.textContent = "₹0";
        avgMonthlyExpenditure.textContent = "₹0";
        annualMonthsList.innerHTML = "<p class='empty-state visible'>Error loading annual data. Please try again.</p>";
    }
}

function renderAnnualPieChart(totals) {
    if (annualPieChart) annualPieChart.destroy();
    const values = [totals.investment, totals.liability, totals.saving, totals.expenditure, totals.insurance, totals.other];
    if (values.every(v => Number(v || 0) === 0)) return;

    const ctx = annualPieChartCanvas.getContext("2d");
    annualPieChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Investment", "Liability", "Savings", "Expenditure", "Insurance", "Others"],
            datasets: [{
                data: values,
                backgroundColor: ["#3b82f6", COLOR_NEGATIVE, COLOR_POSITIVE, "#f97316", "#a855f7", COLOR_WARNING],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: getChartThemeColors().text,
                        font: { size: 12 },
                        padding: 16,
                        generateLabels: (chart) => {
                            const ds = chart.data.datasets[0];
                            const total = ds.data.reduce((a, b) => a + b, 0);
                            const textColor = getChartThemeColors().text;
                            return chart.data.labels.map((label, i) => ({
                                text: `${label} (${total > 0 ? Math.round(ds.data[i] / total * 100) : 0}%)`,
                                fillStyle: ds.backgroundColor[i],
                                strokeStyle: ds.backgroundColor[i],
                                fontColor: textColor,
                                color: textColor,
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatMoney(ctx.raw)}`
                    }
                }
            }
        }
    });
}

function showAutoCalcPopup(anchor, fieldLabel, breakdown) {
    // Remove any existing popup
    const existing = document.getElementById("autoCalcPopup");
    if (existing) existing.remove();

    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    
    // Cap the total at 0 for CC Outstanding (can't have negative outstanding)
    const displayTotal = fieldLabel === 'Previous Month CC Bill (Unpaid)' ? Math.max(0, total) : total;
    
    // Special handling for CC Outstanding to show calculation formula
    let formulaHtml = '';
    if (fieldLabel === 'Previous Month CC Bill (Unpaid)') {
        const positiveAmount = breakdown.find(b => b.amount > 0)?.amount || 0;
        const negativeAmount = Math.abs(breakdown.find(b => b.amount < 0)?.amount || 0);
        
        // Determine settlement status and color
        let statusColor = COLOR_WARNING; // yellow - default
        let statusMessage = '';
        
        if (negativeAmount === 0) {
            // Nothing settled
            statusColor = COLOR_NEGATIVE; // red
            statusMessage = 'No settlement made';
            formulaHtml = `
                <div class="auto-calc-popup-formula" style="background: rgba(239, 68, 68, 0.1);">
                    <span class="formula-label">Note:</span>
                    <span class="formula-expression" style="color: ${statusColor};">${statusMessage}</span>
                </div>
            `;
        } else if (displayTotal === 0) {
            // Fully settled
            statusColor = COLOR_POSITIVE; // green
            statusMessage = 'Fully settled';
            formulaHtml = `
                <div class="auto-calc-popup-formula" style="background: rgba(34, 197, 94, 0.1);">
                    <span class="formula-label">Note:</span>
                    <span class="formula-expression" style="color: ${statusColor};">${statusMessage}</span>
                </div>
            `;
        } else if (breakdown.length > 1) {
            // Partial settlement - show formula
            statusColor = COLOR_WARNING; // yellow
            statusMessage = 'Partially settled';
            formulaHtml = `
                <div class="auto-calc-popup-formula">
                    <span class="formula-label">Calculation:</span>
                    <span class="formula-expression">${formatMoney(positiveAmount)} - ${formatMoney(negativeAmount)} = ${formatMoney(displayTotal)}</span>
                    <span class="formula-status" style="color: ${statusColor};">(${statusMessage})</span>
                </div>
            `;
        }
    }
    
    const popup = document.createElement("div");
    popup.id = "autoCalcPopup";
    popup.className = "auto-calc-popup";
    popup.innerHTML = `
        <div class="auto-calc-popup-header">
            <strong>${esc(fieldLabel)} Breakdown</strong>
            <button type="button" class="auto-calc-popup-close">&times;</button>
        </div>
        <div class="auto-calc-popup-body">
            ${breakdown.map(b => {
                const isNegative = b.amount < 0;
                const amountClass = isNegative ? 'auto-calc-popup-amount-negative' : 'auto-calc-popup-amount';
                const amountPrefix = isNegative ? '-' : '';
                return `
                <div class="auto-calc-popup-row">
                    <span class="auto-calc-popup-name">${esc(b.name)}</span>
                    <span class="${amountClass}">${amountPrefix}${formatMoney(Math.abs(b.amount))}</span>
                    <span class="auto-calc-popup-source">${esc(b.source)}</span>
                </div>
                `;
            }).join("")}
            ${formulaHtml}
            <div class="auto-calc-popup-total">
                <strong>Total</strong>
                <strong>${formatMoney(displayTotal)}</strong>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Position near anchor with mobile-aware positioning
    const rect = anchor.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth < 768;

    popup.style.position = "fixed";
    popup.style.zIndex = "9999";

    // Calculate horizontal position
    let leftPosition;
    
    if (isMobile) {
        // On mobile, center the popup
        const popupWidth = Math.min(380, screenWidth - 16); // Max width with padding
        leftPosition = (screenWidth - popupWidth) / 2;
    } else {
        // On desktop, use the original logic
        leftPosition = Math.max(8, rect.left - 80);
        
        // Ensure it doesn't go off the right edge
        const popupWidth = Math.min(380, screenWidth - 16);
        if (leftPosition + popupWidth > screenWidth - 8) {
            leftPosition = screenWidth - popupWidth - 8;
        }
    }
    
    popup.style.left = leftPosition + "px";

    // Calculate vertical position
    let topPosition = rect.bottom + 6;
    
    // Estimate popup height (rough estimate based on content)
    const estimatedHeight = Math.min(300, screenHeight * 0.6);
    
    // Check if popup will go off the bottom edge
    if (topPosition + estimatedHeight > screenHeight - 8) {
        // Position above the anchor instead
        topPosition = rect.top - estimatedHeight - 6;
        
        // Ensure it doesn't go off the top edge
        if (topPosition < 8) {
            topPosition = 8;
        }
    }
    
    popup.style.top = topPosition + "px";
    
    // After positioning, check if the popup is still off-screen and adjust
    setTimeout(() => {
        const popupRect = popup.getBoundingClientRect();
        
        // Adjust horizontal position if needed
        if (popupRect.left < 8) {
            popup.style.left = "8px";
        } else if (popupRect.right > screenWidth - 8) {
            popup.style.left = (screenWidth - popupRect.width - 8) + "px";
        }
        
        // Adjust vertical position if needed
        if (popupRect.top < 8) {
            popup.style.top = "8px";
        } else if (popupRect.bottom > screenHeight - 8) {
            popup.style.top = (screenHeight - popupRect.height - 8) + "px";
        }
    }, 0);

    // Close handlers
    popup.querySelector(".auto-calc-popup-close").addEventListener("click", () => popup.remove());
    const closeOnOutside = (e) => {
        if (!popup.contains(e.target) && e.target !== anchor) {
            popup.remove();
            document.removeEventListener("click", closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener("click", closeOnOutside), OUTSIDE_CLICK_DELAY_MS);
}

function renderCategoryFields(container, fields, data, autoLinkedFields = {}, autoLinkedBreakdown = {}) {
    container.innerHTML = "";
    const categoryName = container.id.replace(/Fields$/, "");
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        const isAutoLinked = Boolean(autoLinkedFields[`${categoryName}.${field.id}`]);
        const fieldKey = `${categoryName}.${field.id}`;
        const breakdown = (autoLinkedBreakdown && autoLinkedBreakdown[fieldKey]) || [];
        
        const label = document.createElement("label");
        label.textContent = field.label;
        if (isAutoLinked) {
            const autoBadge = document.createElement("span");
            autoBadge.className = "auto-badge auto-badge-clickable";
            autoBadge.textContent = "auto-calculated";
            autoBadge.style.cursor = "pointer";
            if (breakdown && breakdown.length > 0) {
                autoBadge.addEventListener("click", (e) => {
                    e.stopPropagation();
                    showAutoCalcPopup(e.target, field.label, breakdown);
                });
                autoBadge.title = "Click to see breakdown";
            } else {
                autoBadge.title = "No source items found - add Outflow items (type=Liability, freq=Monthly) to auto-calculate";
            }
            label.appendChild(autoBadge);
        }
        // Special case: Always add auto-calculated badge for creditCardOutstanding
        if (field.id === "creditCardOutstanding" && !isAutoLinked) {
            const autoBadge = document.createElement("span");
            autoBadge.className = "auto-badge";
            autoBadge.textContent = "auto-calculated";
            autoBadge.title = "Auto-calculated from previous month's CC spending upon month close";
            label.appendChild(autoBadge);
        }
        div.appendChild(label);
        
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.placeholder = "0";
        input.value = data[field.id] !== undefined ? data[field.id] : (field.id === "onetimeSaving" ? 1000 : "");
        input.id = `${categoryName}_${field.id}`;
        input.dataset.fieldId = field.id;
        input.dataset.category = container.id;
        if (isAutoLinked) {
            input.disabled = true;
            // Custom tooltip for specific auto-linked fields
            if (field.id === "midMonthCCOutstanding") {
                input.title = "Auto-populated from Quick Update section. Update the value there to change it.";
            } else if (field.id === "creditCardOutstanding") {
                input.title = "Auto-calculated from previous month's CC spending. Updated immediately when you settle from savings.";
            } else {
                input.title = "Auto-populated from Inflow or Outflow tab. Edit the source item to change current/future months.";
            }
            div.classList.add("auto-linked-field");
        }
        // Special case: Always disable creditCardOutstanding as it should only be auto-calculated
        if (field.id === "creditCardOutstanding") {
            input.disabled = true;
            input.title = "Auto-calculated from previous month's CC spending. Updated immediately when you settle from savings.";
            div.classList.add("auto-linked-field");
        }
        
        div.appendChild(input);

        // Add "Settle from Saving" button for credit card outstanding field
        if (field.id === "creditCardOutstanding") {
            const settleBtn = document.createElement("button");
            settleBtn.type = "button";
            settleBtn.className = "btn-settle-saving";
            settleBtn.textContent = "Settle from Saving";
            settleBtn.title = "Move credit card outstanding to the Saving account balance";
            settleBtn.addEventListener("click", () => settleCreditCardFromSaving());
            div.appendChild(settleBtn);
        }

        // Add description text input for on-demand fields
        if (field.hasDescription) {
            const descInput = document.createElement("input");
            descInput.type = "text";
            descInput.className = "ondemand-desc-input";
            descInput.placeholder = "Description (optional)";
            descInput.value = data[field.id + "Desc"] || "";
            descInput.id = `${categoryName}_${field.id}Desc`;
            descInput.dataset.fieldId = field.id + "Desc";
            descInput.dataset.category = container.id;
            descInput.dataset.isDescription = "true";
            div.appendChild(descInput);
        }

        container.appendChild(div);
    });
}

async function settleCreditCardFromSaving() {
    logger.info('CC settlement initiated', { monthKey: getMonthKey(currentMonth) });
    
    const cards = getCardEntries();
    const savingAccount = cards.find(c => c.purpose === "Savings" || c.purpose === "Saving");
    if (!savingAccount) {
        logger.warning('No savings account found for CC settlement');
        showAlert('No Savings account found. Please set up a Savings account first.', { variant: 'warning' });
        return;
    }
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey];
    if (!monthData) {
        logger.warning('No month data found for CC settlement', { monthKey });
        return;
    }
    const outstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
    if (outstanding <= 0) {
        logger.warning('No outstanding CC bill to settle', { outstanding });
        showAlert('No outstanding credit card bill to settle.', { variant: 'info' });
        return;
    }
    const savingBalance = Number(savingAccount.balance || 0);
    if (savingBalance <= 0) {
        logger.warning('Saving account has no balance for CC settlement', { savingBalance });
        showAlert('Saving account has no balance to settle from.', { variant: 'warning' });
        return;
    }
    
    // Ask user for settlement amount (default to full settlement or available balance, whichever is less)
    const maxSettleAmount = Math.min(outstanding, savingBalance);
    const userInput = await showPrompt(
        `Outstanding CC Bill: ${formatMoney(outstanding)}\n` +
        `Saving Balance: ${formatMoney(savingBalance)}\n` +
        `Max you can settle: ${formatMoney(maxSettleAmount)}\n\n` +
        `Enter amount (or leave blank to settle maximum):`,
        { title: 'Settle CC Bill', inputType: 'number', placeholder: '0', defaultValue: maxSettleAmount.toString() }
    );
    
    if (userInput === null) {
        logger.info('CC settlement cancelled by user');
        return;
    }
    
    const settleAmount = userInput.trim() === "" ? maxSettleAmount : Number(userInput);
    
    if (isNaN(settleAmount) || settleAmount <= 0) {
        logger.warning('Invalid settlement amount entered', { userInput, settleAmount });
        showAlert('Please enter a valid amount greater than 0.', { variant: 'warning' });
        return;
    }
    
    if (settleAmount > maxSettleAmount) {
        logger.warning('Settlement amount exceeds maximum available', { settleAmount, maxSettleAmount, outstanding, savingBalance });
        showAlert(`Cannot settle ₹${settleAmount.toLocaleString("en-IN")}. Maximum available is ${formatMoney(maxSettleAmount)} (limited by outstanding CC bill).`, { variant: 'warning' });
        return;
    }
    
    const confirmed = await showConfirm(
        `Confirm settlement of ${formatMoney(settleAmount)} from your Saving account (${savingAccount.bankName})?\n\n` +
        `This will:\n• Track settlement of ${formatMoney(settleAmount)} against CC outstanding\n` +
        `• Reduce saving balance from ${formatMoney(savingBalance)} to ${formatMoney(savingBalance - settleAmount)}\n` +
        `• CC outstanding will be recalculated automatically`,
        { title: 'Confirm Settlement', confirmText: 'Settle' }
    );
    if (!confirmed) {
        logger.info('CC settlement confirmation cancelled by user', { settleAmount });
        return;
    }

    // Track the settlement amount for auto-calculation
    // The actual creditCardOutstanding will be calculated by applyMonthlyAutoValues
    if (!monthData._ccSettlementAmount) {
        monthData._ccSettlementAmount = 0;
    }
    
    // Cap the total settlement at the outstanding amount to prevent negative values
    const currentOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
    const totalSettlement = monthData._ccSettlementAmount + settleAmount;
    const effectiveSettlement = Math.min(totalSettlement, Math.max(currentOutstanding, outstanding));
    
    // If the effective settlement is less than the intended settlement (due to cap), adjust
    if (effectiveSettlement < totalSettlement) {
        logger.warning('Settlement amount capped at outstanding amount', { 
            intendedSettlement: settleAmount, 
            effectiveSettlement: effectiveSettlement - monthData._ccSettlementAmount,
            outstanding: Math.max(currentOutstanding, outstanding)
        });
        monthData._ccSettlementAmount = effectiveSettlement;
    } else {
        monthData._ccSettlementAmount += settleAmount;
    }

    // Update saving account balance
    savingAccount.balance = savingBalance - settleAmount;
    const updatedCards = cards.map(c => c.id === savingAccount.id ? savingAccount : c);
    if (!appData.tabData) appData.tabData = {};
    appData.tabData.cards = updatedCards;

    // Re-apply auto values to recalculate creditCardOutstanding with the new settlement amount
    applyMonthlyAutoValues(monthKey, monthData);

    logger.info('CC settlement successful', { 
        monthKey, 
        settleAmount, 
        totalSettled: monthData._ccSettlementAmount,
        previousBalance: savingBalance,
        newBalance: savingBalance - settleAmount
    });
    
    scheduleSave();
    // Re-render to update the UI immediately
    renderMonthlyBudget();
    showToast(`Successfully settled ${formatMoney(settleAmount)} from Saving account.`, { variant: 'success' });
}

function calculateAndDisplaySummary(monthData) {
    const cards = (appData.tabData || {}).cards || [];
    const salaryAccount = cards.find(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    const expenditureAccount = cards.find(c => c.isPrimary === "Yes");
    const savingAccount = cards.find(c => (c.purpose === "Savings" || c.purpose === "Saving") && c.isPrimary !== "Yes");
    const investmentAccount = cards.find(c => c.purpose === "Investment" && c.isPrimary !== "Yes");
    const rawSalaryBalance = Number(salaryAccount?.balance || 0);
    const expBalance = Number(expenditureAccount?.balance || 0);

    // Fixed outflows auto-debited from salary — all frequencies converted to monthly equivalent
    const allOutflows = ((appData.tabData || {}).outflow || []);
    const autoDebitByType = { Liability: 0, Insurance: 0, Savings: 0, Expenditure: 0, Investment: 0, Others: 0 };
    allOutflows.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = toMonthlyAmount(amount, freq);
        if (monthlyAmt <= 0) return;
        let t = e.type || "Expenditure";
        if (t === "Saving") t = "Savings";
        autoDebitByType[t] = (autoDebitByType[t] || 0) + monthlyAmt;
    });
    const fixedMonthlyOutflow = Object.values(autoDebitByType).reduce((s, v) => s + v, 0);

    // Category totals — Total Outflow uses only recurring outflow, excludes on-demand investing
    const inflowTotal = Object.values(monthData.inflow || {}).reduce((s, v) => s + Number(v || 0), 0);
    const outflowTotal = Object.values(monthData.outflow || {}).reduce((s, v) => s + Number(v || 0), 0);
    const investingTotal = sumCategoryNumericValues(monthData.investing);

    document.getElementById("inflowTotal").textContent = formatMoney(inflowTotal);
    document.getElementById("outflowTotal").textContent = formatMoney(outflowTotal);
    document.getElementById("investingTotal").textContent = formatMoney(investingTotal);

    // Summary grid — Total Outflow = only recurring outflow (no one-time investing items)
    document.getElementById("totalIncome").textContent = formatMoney(inflowTotal);
    document.getElementById("totalExpenses").textContent = formatMoney(outflowTotal);
    
    // Store calculated values for Dashboard to use (single source of truth)
    monthData._calculatedTotalIncome = inflowTotal;
    monthData._calculatedTotalOutflow = outflowTotal;

    // Account balances
    document.getElementById("initialBalance").textContent = formatMoney(rawSalaryBalance);
    const salaryLabelEl = document.getElementById("salaryBalanceLabel");
    const salaryHintEl = document.getElementById("salaryBalanceHint");
    if (salaryLabelEl) salaryLabelEl.textContent = "Salary A/c Balance";
    if (salaryHintEl) salaryHintEl.textContent = fixedMonthlyOutflow > 0
        ? `₹${fixedMonthlyOutflow.toLocaleString("en-IN")}/mo in fixed outflows from this account`
        : `Current balance in your salary account`;
    const expBalEl = document.getElementById("expenditureAccountBalance");
    if (expBalEl) expBalEl.textContent = formatMoney(expBalance);

    // Auto-debit breakdown by destination (with individual items)
    const breakdownEl = document.getElementById("autoDebitBreakdown");
    if (breakdownEl) {
        const lines = [];
        const itemsByType = {};
        allOutflows.forEach(e => {
            const amount = Number(e.amount || 0);
            if (amount <= 0) return;
            const freq = e.frequency || "Monthly";
            const monthlyAmt = toMonthlyAmount(amount, freq);
            if (monthlyAmt <= 0) return;
            let t = e.type || "Expenditure";
            if (t === "Saving") t = "Savings";
            if (!itemsByType[t]) itemsByType[t] = [];
            const freqNote = freq !== "Monthly" ? ` <span style="color:var(--muted);font-size:0.7rem">(${freq} ÷${freq === "Quarterly" ? 3 : freq === "Semi-Annual" ? 6 : 12})</span>` : "";
            itemsByType[t].push(`${esc(e.name)}${freqNote}: ${formatMoney(monthlyAmt)}`);
        });
        if (autoDebitByType.Liability > 0) {
            lines.push(`<strong>Liability: ${formatMoney(autoDebitByType.Liability)}</strong>`);
            (itemsByType.Liability || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        if (autoDebitByType.Insurance > 0) {
            lines.push(`<strong>Insurance: ${formatMoney(autoDebitByType.Insurance)}</strong>`);
            (itemsByType.Insurance || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        if (autoDebitByType.Savings > 0) {
            lines.push(`<strong>→ Savings A/c: ${formatMoney(autoDebitByType.Savings)}</strong>${savingAccount ? ` (${savingAccount.bankName})` : ""}`);
            (itemsByType.Savings || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        if (autoDebitByType.Investment > 0) {
            lines.push(`<strong>→ Investment A/c: ${formatMoney(autoDebitByType.Investment)}</strong>${investmentAccount ? ` (${investmentAccount.bankName})` : ""}`);
            (itemsByType.Investment || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        if (autoDebitByType.Expenditure > 0) {
            lines.push(`<strong>→ Primary A/c: ${formatMoney(autoDebitByType.Expenditure)}</strong>`);
            (itemsByType.Expenditure || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        if (autoDebitByType.Others > 0) {
            lines.push(`<strong>Others: ${formatMoney(autoDebitByType.Others)}</strong>`);
            (itemsByType.Others || []).forEach(l => lines.push(`&nbsp;&nbsp;${l}`));
        }
        breakdownEl.innerHTML = lines.length > 0
            ? lines.map(l => `<div class="auto-debit-line">${l}</div>`).join("")
            : `<div class="auto-debit-line" style="color:var(--dim)">No fixed outflows</div>`;
    }

    // TOTAL SPENDABLE = total cash inflow - all fixed obligations/outflows
    // Note: Borrowing from savings is excluded from spendable as it's not new income
    const borrowing = Number(monthData.inflow?.borrowing || 0);
    const inflowWithoutBorrowing = inflowTotal - borrowing;
    const spendable = inflowWithoutBorrowing - fixedMonthlyOutflow;
    
    // Store calculated values for Dashboard to use (single source of truth)
    monthData._calculatedSpendable = spendable;
    monthData._calculatedUsableIncome = inflowWithoutBorrowing;
    monthData._calculatedMonthlyCommitments = fixedMonthlyOutflow;
    const availableEl = document.getElementById("amountAvailableToSpend");
    const availableLabelEl = document.getElementById("amountAvailableLabel");
    if (availableEl) {
        // Don't show amount until income is entered
        if (inflowTotal === 0) {
            availableEl.textContent = "₹0";
            availableEl.style.color = "var(--dim)";
        } else {
            availableEl.textContent = formatMoney(Math.abs(spendable));
            availableEl.style.color = spendable >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
        }
    }
    if (availableLabelEl) {
        // Don't show label until income is entered
        if (inflowTotal === 0) {
            availableLabelEl.textContent = "";
        } else {
            availableLabelEl.textContent = spendable >= 0 ? "Total Spendable This Month" : "Amount Overspent";
        }
    }

    // UNTRACKED EXPENSES = variable expenditure (spent from exp account) + CC outstanding this month + on-demand items
    const variableExp = Number(monthData.outflow?.variableExpenditure || 0);
    const creditCardOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
    const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    const ccSettlementAmount = Number(monthData._ccSettlementAmount || 0);
    // Note: creditCardOutstanding is already reduced by settlements when user clicks "Settle from Saving"
    const actualCCOutstanding = creditCardOutstanding + midMonthCC;
    
    // On-demand items (saving, investment, expenditure, liability)
    const ondemandSaving = Number(monthData.investing?.onetimeSaving || 0);
    const ondemandInvestment = Number(monthData.investing?.onetimeInvestment || 0);
    const ondemandExpenditure = Number(monthData.investing?.ondemandExpenditure || 0);
    const ondemandLiability = Number(monthData.investing?.ondemandLiability || 0);
    const totalOndemand = ondemandSaving + ondemandInvestment + ondemandExpenditure + ondemandLiability;
    
    // Update the label to clarify it includes both variable expenses and on-demand items
    const untrackedLabelEl = document.getElementById("untrackedExpensesLabel");
    if (untrackedLabelEl) {
        untrackedLabelEl.textContent = "Total Allocated";
    }
    
    // Display variable expenses separately (exclude on-demand items from account spending)
    // Since on-demand items reduce account balance, variableExp includes them
    // To show actual spending, we subtract on-demand items
    const actualVariableExp = variableExp - totalOndemand;
    const variableExpEl = document.getElementById("variableExpensesTotal");
    if (variableExpEl) {
        variableExpEl.textContent = formatMoney(actualVariableExp + actualCCOutstanding);
    }
    
    // Display on-demand items separately
    const ondemandTotalEl = document.getElementById("ondemandItemsTotal");
    if (ondemandTotalEl) {
        ondemandTotalEl.textContent = formatMoney(totalOndemand);
    }
    
    // Total Allocated should be the sum of the two displayed values
    const totalAllocated = (actualVariableExp + actualCCOutstanding) + totalOndemand;
    const untrackedEl = document.getElementById("untrackedExpenses");
    if (untrackedEl) {
        untrackedEl.textContent = formatMoney(totalAllocated);
        untrackedEl.style.color = totalAllocated > 0 ? COLOR_WARNING : COLOR_POSITIVE;
    }
    
    // Store calculated values for Dashboard to use (single source of truth)
    monthData._calculatedUntracked = totalAllocated;
    monthData._calculatedVariableExp = actualVariableExp + actualCCOutstanding;
    monthData._calculatedTotalOndemand = totalOndemand;

    // Store globally for Quick Update calculations
    const monthKey = getMonthKey(currentMonth);
    const transferDone = Number(monthData._transferDone || 0);
    budgetState.trackedExpenses = totalAllocated;

    // Budget status banner — based on spendable vs untracked (hidden in edit mode)
    const isMonthClosed = Boolean(monthData._monthClosed);
    
    // Always calculate budget balance, even in edit mode, to ensure stored values are current
    let budgetBalance = 0;
    if (!salaryAccount || !expenditureAccount) {
        budgetBalance = 0;
    } else if (inflowTotal === 0 && fixedMonthlyOutflow === 0) {
        budgetBalance = 0;
    } else if (inflowTotal === 0) {
        budgetBalance = 0;
    } else {
        // Exclude borrowing from spendable as it's not new income
        const borrowing = Number(monthData.inflow?.borrowing || 0);
        const spendableWithoutBorrowing = spendable - borrowing;
        budgetBalance = spendableWithoutBorrowing - totalAllocated;
    }
    
    // Store calculated values for Dashboard to use (single source of truth)
    monthData._calculatedBudgetBalance = budgetBalance;
    
    // Only display budget status in preview mode (not edit mode)
    if (isBudgetEditMode) {
        // Completely hide budget status in edit mode
        if (budgetStatus) {
            budgetStatus.hidden = true;
            budgetStatus.innerHTML = "";
            budgetStatus.className = "budget-status"; // Remove any status classes
        }
    } else if (isMonthClosed && budgetStatus) {
        // For closed months, the status banner is already rendered in renderMonthlyBudget
        // Don't overwrite it here
    } else if (!isMonthClosed && budgetStatus) {
        budgetStatus.hidden = false;
        budgetStatus.className = "budget-status";
        // Guard: no accounts set up
        if (!salaryAccount || !expenditureAccount) {
            budgetStatus.classList.add("neutral");
            budgetStatus.innerHTML = `<div class="month-end-banner">Set up a <strong>Primary (Expenditure)</strong> and <strong>Salary</strong> account in the Accounts tab first.</div>`;
        } else if (inflowTotal === 0 && fixedMonthlyOutflow === 0) {
            // No data entered yet — don't show misleading "balanced"
            budgetStatus.textContent = "";
        } else if (inflowTotal === 0) {
            budgetStatus.classList.add("neutral");
            budgetStatus.textContent = "Enter your Primary Income to see budget status";
        } else {
            if (budgetBalance > 0) {
                budgetStatus.classList.add("positive");
                budgetStatus.textContent = `Budget Surplus: +${formatMoney(budgetBalance)} remaining`;
            } else if (budgetBalance < 0) {
                budgetStatus.classList.add("negative");
                budgetStatus.textContent = `Over Budget: ${formatMoney(Math.abs(budgetBalance))} overspent`;
            } else {
                budgetStatus.classList.add("neutral");
                budgetStatus.textContent = `Budget Balanced — all income allocated`;
            }
        }
    }

    // Transfer calculation: income - auto-debited fixed outflows = amount to transfer to expenditure
    const primaryIncome = Number(monthData.inflow?.primaryIncome || 0);
    const transferAmt = primaryIncome - fixedMonthlyOutflow;
    document.getElementById("transferPrimaryIncome").textContent = formatMoney(primaryIncome);
    document.getElementById("transferFixedExpenses").textContent = formatMoney(fixedMonthlyOutflow);
    const transferEl = document.getElementById("transferAmount");
    if (transferEl) {
        transferEl.textContent = formatMoney(Math.abs(transferAmt));
        transferEl.style.color = transferAmt >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
    }
    const transferLabelEl = transferEl?.previousElementSibling;
    if (transferLabelEl) {
        transferLabelEl.textContent = transferAmt >= 0
            ? "Salary Leftover → Expenditure A/c"
            : "Shortfall (Fixed Outflow exceeds Income)";
    }

    // Store transfer amount for Execute Transfer button
    budgetState.transferAmt = transferAmt;
    budgetState.salaryAccount = salaryAccount;
    budgetState.expAccount = expenditureAccount;
    budgetState.autoDebitByType = autoDebitByType;
    budgetState.transferDone = transferDone;

    // Hide Monthly Transfer Breakdown if transfer already done for this month OR month is closed
    const transferSection = document.getElementById("transferBreakdownSection");
    if (transferSection) {
        transferSection.hidden = Boolean(monthData._transferDone) || isMonthClosed;
    }

    // Transfer Mismatch Detection: warn if outflows changed after transfer was executed
    const mismatchEl = document.getElementById("transferMismatchWarning");
    if (mismatchEl) {
        if (transferDone > 0 && primaryIncome > 0 && !isMonthClosed) {
            const correctTransfer = Math.max(0, primaryIncome - fixedMonthlyOutflow);
            const diff = transferDone - correctTransfer;
            // Show warning if mismatch exceeds ₹1 (float tolerance)
            if (Math.abs(diff) > MISMATCH_TOLERANCE) {
                mismatchEl.hidden = false;
                document.getElementById("mismatchOldTransfer").textContent = formatMoney(transferDone);
                document.getElementById("mismatchNewTransfer").textContent = formatMoney(correctTransfer);
                document.getElementById("mismatchDifference").textContent = (diff > 0 ? "+" : "") + formatMoney(diff);
                // Store for recalc button
                budgetState.mismatchCorrectTransfer = correctTransfer;
                budgetState.mismatchFixedOutflow = fixedMonthlyOutflow;
            } else {
                mismatchEl.hidden = true;
            }
        } else {
            mismatchEl.hidden = true;
        }
    }

    // Close Current Month Budget section
    const carrySection = document.getElementById("carryforwardSection");
    if (carrySection) {
        const today = new Date();
        const isCurrentMonth = getMonthKey(currentMonth) === getMonthKey(today);
        const isPastMonth = getMonthKey(currentMonth) < getMonthKey(today);
        // Show close budget for current or past months that have transfer done but not closed
        if ((isCurrentMonth || isPastMonth) && monthData._transferDone && !isMonthClosed) {
            carrySection.hidden = false;
            const cfBalEl = document.getElementById("carryforwardBalance");
            if (cfBalEl) cfBalEl.textContent = formatMoney(expBalance);
        } else {
            carrySection.hidden = true;
        }
    }
}

function renderPieChart(monthData) {
    const ctx = pieCanvas.getContext("2d");
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    const dist = getMonthlyDistribution(monthData);
    
    // Prepare detailed breakdown for tooltips
    const getBreakdown = (label) => {
        const lines = [];
        if (label === "Investment") {
            const fixedInv = Number(monthData.outflow?.fixedInvestment || 0);
            const onetimeInv = Number(monthData.investing?.onetimeInvestment || 0);
            if (fixedInv > 0) lines.push(`Fixed Investment: ${formatMoney(fixedInv)}`);
            if (onetimeInv > 0) lines.push(`On-Demand Investment: ${formatMoney(onetimeInv)}`);
        } else if (label === "Liability") {
            const loanEMI = Number(monthData.outflow?.loanEMI || 0);
            const debtRepay = Number(monthData.outflow?.debtRepayment || 0);
            const ondemandLiab = Number(monthData.investing?.ondemandLiability || 0);
            if (loanEMI > 0) lines.push(`Loan EMI: ${formatMoney(loanEMI)}`);
            if (debtRepay > 0) lines.push(`Debt Repayment: ${formatMoney(debtRepay)}`);
            if (ondemandLiab > 0) lines.push(`On-Demand Liability: ${formatMoney(ondemandLiab)}`);
        } else if (label === "Savings") {
            const fixedSav = Number(monthData.outflow?.fixedSaving || 0);
            const onetimeSav = Number(monthData.investing?.onetimeSaving || 0);
            if (fixedSav > 0) lines.push(`Fixed Saving: ${formatMoney(fixedSav)}`);
            if (onetimeSav > 0) lines.push(`On-Demand Saving: ${formatMoney(onetimeSav)}`);
        } else if (label === "Expenditure") {
            const fixedExp = Number(monthData.outflow?.fixedExpenditure || 0);
            const varExp = Number(monthData.outflow?.variableExpenditure || 0);
            const utilBills = Number(monthData.outflow?.utilityBills || 0);
            const famExp = Number(monthData.outflow?.familyExpenditure || 0);
            const miscExp = Number(monthData.outflow?.miscExpenses || 0);
            const ccOut = Number(monthData.outflow?.creditCardOutstanding || 0);
            const midCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
            const ondemandExp = Number(monthData.investing?.ondemandExpenditure || 0);
            if (fixedExp > 0) lines.push(`Fixed Expenditure: ${formatMoney(fixedExp)}`);
            if (varExp > 0) lines.push(`Variable Expenditure: ${formatMoney(varExp)}`);
            if (utilBills > 0) lines.push(`Utility Bills: ${formatMoney(utilBills)}`);
            if (famExp > 0) lines.push(`Family Expenditure: ${formatMoney(famExp)}`);
            if (miscExp > 0) lines.push(`Misc Expenses: ${formatMoney(miscExp)}`);
            if (ccOut > 0) lines.push(`CC Outstanding: ${formatMoney(ccOut)}`);
            if (midCC > 0) lines.push(`Current Month CC: ${formatMoney(midCC)}`);
            if (ondemandExp > 0) lines.push(`On-Demand Expenditure: ${formatMoney(ondemandExp)}`);
        } else if (label === "Insurance") {
            const insPrem = Number(monthData.outflow?.insurancePremiums || 0);
            if (insPrem > 0) lines.push(`Insurance Premiums: ${formatMoney(insPrem)}`);
        } else if (label === "Others") {
            const fixedOthers = Number(monthData.outflow?.fixedOthers || 0);
            if (fixedOthers > 0) lines.push(`Fixed Others: ${formatMoney(fixedOthers)}`);
        } else if (label === "Untracked") {
            const untracked = dist.untracked || 0;
            if (untracked > 0) lines.push(`Untracked: ${formatMoney(untracked)}`);
            lines.push(`This is the difference between total income and all tracked outflows`);
        }
        return lines;
    };
    
    // Filter out categories with zero values, but always include Untracked if > 0
    const labels = [];
    const dataValues = [];
    const colors = [];
    
    const categories = [
        { label: "Investment", value: dist.investment, color: "#3b82f6" },
        { label: "Liability", value: dist.liability, color: COLOR_NEGATIVE },
        { label: "Savings", value: dist.saving, color: COLOR_POSITIVE },
        { label: "Expenditure", value: dist.expenditure, color: "#f97316" },
        { label: "Insurance", value: dist.insurance, color: "#a855f7" },
        { label: "Others", value: dist.other, color: COLOR_WARNING },
        { label: "Untracked", value: dist.untracked || 0, color: "#94a3b8" }
    ];
    
    categories.forEach(cat => {
        if (cat.value > 0) {
            labels.push(cat.label);
            dataValues.push(cat.value);
            colors.push(cat.color);
        }
    });
    
    const data = {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 6
        }]
    };
    
    const isMobile = window.innerWidth < 640;
    pieChart = new Chart(ctx, {
        type: "doughnut",
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '62%',
            plugins: {
                legend: {
                    position: isMobile ? "bottom" : "right",
                    align: "center",
                    labels: {
                        color: getChartThemeColors().text,
                        font: { size: 12 },
                        padding: 14,
                        boxWidth: 14,
                        boxHeight: 14,
                        generateLabels: (chart) => {
                            const ds = chart.data.datasets[0];
                            const total = ds.data.reduce((a, b) => a + b, 0);
                            const textColor = getChartThemeColors().text;
                            return chart.data.labels.map((label, i) => ({
                                text: `${label}  ${total > 0 ? Math.round(ds.data[i] / total * 100) : 0}%`,
                                fillStyle: ds.backgroundColor[i],
                                strokeStyle: ds.backgroundColor[i],
                                fontColor: textColor,
                                color: textColor,
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const item = items[0];
                            return item.label;
                        },
                        label: (ctx) => {
                            return ` Total: ${formatMoney(ctx.raw)}`;
                        },
                        afterLabel: (ctx) => {
                            const breakdown = getBreakdown(ctx.label);
                            return breakdown.length > 0 ? [' ', ...breakdown] : [];
                        }
                    }
                }
            }
        }
    });
}

function renderTableHead() {
    const fields = TAB_FIELDS[activeTabId] || TAB_FIELDS.monthlyBudget;
    tableHead.innerHTML = "";
    const tr = document.createElement("tr");
    fields.forEach(f => {
        const th = document.createElement("th");
        th.textContent = f.label;
        tr.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "";
    tr.appendChild(actionTh);
    tableHead.appendChild(tr);
}

function renderDynamicFields() {
    dynamicFields.innerHTML = "";
    const fields = TAB_FIELDS[activeTabId] || TAB_FIELDS.monthlyBudget;
    
    fields.forEach(field => {
        const div = document.createElement("div");
        div.className = "field";
        
        const label = document.createElement("label");
        label.textContent = field.label;
        label.htmlFor = `field_${field.id}`;
        div.appendChild(label);
        
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement("input");
            input.type = field.type;
            input.placeholder = field.placeholder || "";
            if (field.type === "number") {
                input.min = "0";
                input.step = field.step || "1";
            }
        }
        input.id = `field_${field.id}`;
        if (field.required) input.required = true;
        div.appendChild(input);
        
        dynamicFields.appendChild(div);
        fieldInputs[field.id] = input;
    });
}

function areAccountsSetUp() {
    const cards = (appData.tabData || {}).cards || [];
    const hasPrimary = cards.some(c => c.isPrimary === "Yes");
    const hasSalary = cards.some(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    return hasPrimary && hasSalary;
}

function getTabIcon(tabId) {
    const icons = {
        dashboard: 'layoutDashboard', cards: 'bank', inflow: 'trendingUp',
        outflow: 'receipt', insurance: 'shieldCheck', monthlyBudget: 'piggyBank',
        expenseTracking: 'wallet', financialGoal: 'target', netWorth: 'barChart',
        taxPlan: 'fileText', gifts: 'gift', emergencyFund: 'heartPulse'
    };
    return icons[tabId] || 'sparkles';
}

// ── Tab Bar Dynamic Resize Handler ─────────────────────────────────────────────
let resizeTimeout;
let tabResizeObserver;

function initTabBarResize() {
    // Use ResizeObserver for more accurate detection
    if (tabResizeObserver) {
        tabResizeObserver.disconnect();
    }
    
    tabResizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                renderTabs();
            }
        }, 100);
    });
    
    if (tabList) {
        tabResizeObserver.observe(tabList);
    }
}

// ── Tab Rendering ───────────────────────────────────────────────────────────────
function renderTabs() {
    tabList.innerHTML = "";
    const accountsReady = areAccountsSetUp();
    const tabs = getTabs();
    
    // Mobile: simple horizontal scroll
    if (window.innerWidth <= 768) {
        tabs.forEach(tab => {
            const btn = createTabButton(tab, accountsReady);
            tabList.appendChild(btn);
        });
    } else {
        // Desktop: measure and implement overflow with "More" button
        requestAnimationFrame(() => {
            const containerWidth = tabList.clientWidth;
            const visibleTabs = [];
            const hiddenTabs = [];
            
            // Render all tabs temporarily to measure them
            const tempButtons = [];
            tabs.forEach(tab => {
                const btn = createTabButton(tab, accountsReady);
                btn.style.visibility = 'hidden';
                tabList.appendChild(btn);
                tempButtons.push({ tab, btn, width: btn.offsetWidth });
            });
            
            // Clear and recalculate
            tabList.innerHTML = "";
            
            const moreButtonWidth = 100; // Reserve space for "More" button
            const gap = 3;
            let currentWidth = 24; // padding
            
            // Determine which tabs fit
            tempButtons.forEach(({ tab, width }) => {
                if (currentWidth + width + gap <= containerWidth - moreButtonWidth) {
                    visibleTabs.push(tab);
                    currentWidth += width + gap;
                } else {
                    hiddenTabs.push(tab);
                }
            });
            
            // If we have hidden tabs but enough space for all, show all
            if (hiddenTabs.length > 0) {
                const totalWidth = tempButtons.reduce((sum, { width }) => sum + width + gap, 24);
                if (totalWidth <= containerWidth) {
                    // All tabs fit, show them all
                    visibleTabs.push(...hiddenTabs);
                    hiddenTabs.length = 0;
                }
            }
            
            // Render visible tabs
            visibleTabs.forEach(tab => {
                const btn = createTabButton(tab, accountsReady);
                tabList.appendChild(btn);
            });
            
            // Render "More" button if needed
            if (hiddenTabs.length > 0) {
                renderMoreButton(hiddenTabs, accountsReady);
            }
        });
    }

    // Update mobile label
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (mobileActiveTab && activeTab) {
        mobileActiveTab.textContent = activeTab.label;
    }
}

function createTabButton(tab, accountsReady) {
    const btn = document.createElement("button");
    btn.type = "button";
    const disabled = !accountsReady && tab.id !== "cards";
    btn.className = "tab" + (tab.id === activeTabId ? " active" : "") + (disabled ? " tab-disabled" : "");
    btn.innerHTML = `${iconSvg(getTabIcon(tab.id), 'tab-icon')}<span>${esc(tab.label)}</span>`;
    
    if (disabled) {
        btn.title = "Set up a Primary (Expenditure) + Salary account first";
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
    }
    
    btn.addEventListener("click", () => {
        if (disabled) {
            showAlert('Please set up both a Primary (Expenditure) account and a Salary account in the Accounts tab before accessing other tabs.', { variant: 'warning' });
            return;
        }
        activeTabId = tab.id;
        searchInput.value = "";
        render();
        if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
            tabList.classList.remove("open");
        }
    });
    
    return btn;
}

function renderMoreButton(hiddenTabs, accountsReady) {
    const moreContainer = document.createElement("div");
    moreContainer.className = "tab-more-container";
    
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "tab-more-btn";
    moreBtn.innerHTML = `More (${hiddenTabs.length})`;
    moreContainer.appendChild(moreBtn);
    
    // Create dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "tab-more-dropdown";
    
    hiddenTabs.forEach(tab => {
        const item = document.createElement("div");
        item.className = "tab-more-dropdown-item" + (tab.id === activeTabId ? " active" : "");
        item.innerHTML = `${iconSvg(getTabIcon(tab.id), 'tab-icon')}<span>${esc(tab.label)}</span>`;
        item.addEventListener("click", () => {
            if (!accountsReady && tab.id !== "cards") {
                showAlert('Please set up both a Primary (Expenditure) account and a Salary account in the Accounts tab before accessing other tabs.', { variant: 'warning' });
                return;
            }
            activeTabId = tab.id;
            searchInput.value = "";
            render();
            dropdown.classList.remove("show");
        });
        dropdown.appendChild(item);
    });
    
    moreContainer.appendChild(dropdown);
    tabList.appendChild(moreContainer);
    
    // Toggle dropdown
    moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });
    
    // Close on outside click
    setTimeout(() => {
        const closeDropdown = (e) => {
            if (!moreContainer.contains(e.target)) {
                dropdown.classList.remove("show");
                document.removeEventListener("click", closeDropdown);
            }
        };
        document.addEventListener("click", closeDropdown);
    }, 0);
}

// Initialize resize observer
setTimeout(() => initTabBarResize(), 1000);

function renderSummary(entries) {
    const planned = entries.reduce((s, i) => s + Number(i.planned || 0), 0);
    const actual  = entries.reduce((s, i) => s + Number(i.actual  || 0), 0);
    totals.planned.textContent = formatMoney(planned);
    totals.actual.textContent  = formatMoney(actual);
    totals.balance.textContent = formatMoney(planned - actual);
    totals.count.textContent   = String(entries.length);
}

function renderRows(entries) {
    const q = searchInput.value.trim().toLowerCase();
    const fields = TAB_FIELDS[activeTabId] || TAB_FIELDS.monthlyBudget;
    const filtered = q
        ? entries.filter(i => fields.map(f => i[f.id]).join(" ").toLowerCase().includes(q))
        : entries;
    entryRows.innerHTML = "";
    emptyState.classList.toggle("visible", filtered.length === 0);
    filtered.forEach(item => {
        const row = document.createElement("tr");
        fields.forEach(f => {
            const td = document.createElement("td");
            if (f.type === "number") {
                td.textContent = formatMoney(Number(item[f.id] || 0));
                td.className = "amount";
            } else {
                td.textContent = esc(item[f.id] || "—");
            }
            row.appendChild(td);
        });
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `${renderRowActions(item.id)}`;
        row.appendChild(actionTd);
        entryRows.appendChild(row);
    });
}

// ── Entry actions ─────────────────────────────────────────────────────────────
function addEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("standard");
    if (!entry.name || entry.planned < 0) return;
    upsertSectionEntry("standard", entry);
    resetSectionForm("standard");
    render();
}

async function deleteEntry(id) {
    if (activeTabId === "cards") {
        const entry = activeEntries().find(i => i.id === id);
        if (entry && entry.isPrimary === "Yes") {
            const confirmed = await showConfirm(
                "You are about to delete your PRIMARY (Expenditure) account. This will affect budget transfers and reconciliation.",
                { title: 'Delete Primary Account', dangerous: true, confirmText: 'Delete' }
            );
            if (!confirmed) return;
        } else if (entry && entry.purpose === "Salary") {
            const confirmed = await showConfirm(
                "You are about to delete your SALARY account. This will affect monthly transfers.",
                { title: 'Delete Salary Account', dangerous: true, confirmText: 'Delete' }
            );
            if (!confirmed) return;
        } else {
            if (!(await showConfirm('Delete this account?', { title: 'Delete Account', dangerous: true, confirmText: 'Delete' }))) return;
        }
    } else {
        if (!(await showConfirm('Delete this entry?', { title: 'Delete Entry', dangerous: true, confirmText: 'Delete' }))) return;
    }
    // Save for undo
    const deletedEntry = activeEntries().find(i => i.id === id);
    const deletedTabId = activeTabId;
    setActiveEntries(activeEntries().filter(i => i.id !== id));
    Object.keys(editingEntryIds).forEach(tabId => {
        if (editingEntryIds[tabId] === id) editingEntryIds[tabId] = null;
    });
    render();
    // Trigger notification check after deleting entry
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }

    // Show undo toast (P1)
    if (deletedEntry) {
        _undoDeleteEntry = deletedEntry;
        _undoDeleteTabId = deletedTabId;
        showToast(`Deleted "${deletedEntry.name || 'entry'}"`, {
            variant: 'info',
            actionLabel: 'Undo',
            duration: UNDO_TOAST_DURATION_MS,
        }).then(undone => {
            if (undone && _undoDeleteEntry) {
                // Restore entry
                const entries = getSectionEntries(_undoDeleteTabId);
                setSectionEntries(_undoDeleteTabId, [_undoDeleteEntry, ...entries]);
                _undoDeleteEntry = null;
                _undoDeleteTabId = null;
                render();
                showToast('Entry restored.', { variant: 'success', duration: 2000 });
                // Trigger notification check after restoring entry
                if (window.triggerNotificationCheck) {
                    window.triggerNotificationCheck();
                }
            } else {
                _undoDeleteEntry = null;
                _undoDeleteTabId = null;
            }
        });
    }
}

async function clearActiveTab() {
    if (!activeEntries().length) return;
    if (await showConfirm('Clear all items in this tab?', { title: 'Clear Tab', dangerous: true, confirmText: 'Clear All' })) {
        setActiveEntries([]);
        render();
    }
}

// ── Export to Excel ─────────────────────────────────────────────────────────────
async function exportToExcel() {
    const entries = activeEntries();
    if (!entries.length) {
        logger.warning('Export attempted with no data', { activeTabId });
        showAlert('No data to export.', { variant: 'warning' });
        return;
    }
    
    // P2: Lazy-load SheetJS
    try {
        await ensureSheetJs();
    } catch {
        showAlert('Failed to load Excel export library. Check your connection.', { variant: 'error' });
        return;
    }
    
    const tab = getTabs().find(t => t.id === activeTabId) || DEFAULT_TABS[0];
    const fields = TAB_FIELDS[activeTabId] || TAB_FIELDS.monthlyBudget;
    
    const headers = fields.map(f => f.label);
    const data = entries.map(e => fields.map(f => e[f.id] || ""));
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab.label);
    XLSX.writeFile(wb, `${tab.label.replace(/\s+/g, "_")}_export.xlsx`);
}

// ── Export to PDF (P3) ──────────────────────────────────────────────────────
function exportToPdf() {
    const entries = activeEntries();
    if (!entries.length) {
        showAlert('No data to export.', { variant: 'warning' });
        return;
    }
    const tab = getTabs().find(t => t.id === activeTabId) || DEFAULT_TABS[0];
    const fields = TAB_FIELDS[activeTabId] || TAB_FIELDS.monthlyBudget;

    // Build printable HTML document
    const headerRow = fields.map(f => `<th>${esc(f.label)}</th>`).join('');
    const bodyRows = entries.map(e =>
        '<tr>' + fields.map(f => {
            const v = e[f.id];
            const display = f.type === 'number' ? formatMoney(Number(v || 0)) : esc(v || '');
            return `<td>${display}</td>`;
        }).join('') + '</tr>'
    ).join('');

    const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(tab.label)} – SmartFin Report</title>
<style>
body{font-family:system-ui,sans-serif;margin:30px;color:#222}
h1{font-size:1.3rem;margin-bottom:4px}
.meta{font-size:.8rem;color:#666;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th{background:#f5f5f5;text-align:left;padding:8px 10px;border:1px solid #ddd;font-weight:600}
td{padding:7px 10px;border:1px solid #ddd}
tr:nth-child(even){background:#fafafa}
@media print{body{margin:10mm}@page{size:landscape}}
</style></head><body>
<h1>${esc(tab.label)} – Financial Report</h1>
<p class="meta">Generated ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} &bull; SmartFin</p>
<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;

    const printWin = window.open('', '_blank');
    if (!printWin) { showAlert('Pop-up blocked. Please allow pop-ups for PDF export.', { variant: 'warning' }); return; }
    printWin.document.write(printHtml);
    printWin.document.close();
    printWin.addEventListener('afterprint', () => printWin.close());
    setTimeout(() => printWin.print(), 300);
}

// ── Reset All Data ─────────────────────────────────────────────────────────────
async function resetAllData() {
    const confirmation = await showConfirm(
        "This will delete ALL your data including:\n\n" +
        "• All budget entries\n" +
        "• All monthly budget data\n" +
        "• All financial goals\n" +
        "• All inflow items\n" +
        "• All outflow items\n" +
        "• All cards\n" +
        "• Net worth data\n" +
        "• Tax plan data\n" +
        "• Gifts\n" +
        "• Emergency fund data\n\n" +
        "This action CANNOT be undone!",
        { title: 'Reset All Data', dangerous: true, confirmText: 'Continue' }
    );
    
    if (!confirmation) return;
    
    const deleteConfirmation = await showTypedConfirm('Type DELETE to confirm permanent deletion of all data.', 'DELETE', { title: 'Final Confirmation' });
    if (!deleteConfirmation) {
        showToast('Reset cancelled. Data remains intact.', { variant: 'info' });
        return;
    }
    
    // P0: Auto-backup current data before resetting
    autoBackup('reset');

    // Clear all data but preserve user name
    appData = {
        tabData: {},
        monthlyBudgetData: {},
        customTabs: [],
        userName: appData.userName || "",
        fixedMonthlyIncome: 0,
        dateOfBirth: "",
        currentAge: 0,
        onboardingComplete: false,
        onboardingDate: "",
        dataMigrated: true
    };
    activeTabId = "cards";
    
    // Save the cleared data
    doSave();
    
    // Re-render
    render();
    
    showToast('All data has been permanently deleted.', { variant: 'success' });
}

// ── Delete Account ────────────────────────────────────────────────────────────
async function deleteAccount() {
    const confirmation = await showConfirm(
        "This will permanently:\n" +
        "• Delete ALL your financial data from our servers\n" +
        "• Delete your Firebase Authentication account\n" +
        "• Log you out immediately\n\n" +
        "This action CANNOT be undone. Your data CANNOT be recovered.",
        { title: 'Delete Account', dangerous: true }
    );
    if (!confirmation) return;

    const deleteConfirmation = await showTypedConfirm('Type DELETE ACCOUNT to confirm permanent account deletion.', 'DELETE ACCOUNT', { title: 'Final Confirmation' });
    if (!deleteConfirmation) {
        showToast('Account deletion cancelled. Your data remains intact.', { variant: 'info' });
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        logger.warning('Delete account attempted with no user signed in');
        showAlert('No user signed in.', { variant: 'error' });
        return;
    }

    logger.warning('Account deletion initiated', { userId: user.uid });

    // P0: Auto-backup before account deletion
    autoBackup('account-delete');

    // Step 1: Delete Firestore data
    db.collection("users").doc(user.uid).delete()
        .then(() => {
            // Step 2: Delete Firebase Auth user
            return user.delete();
        })
        .then(() => {
            logger.info('Account deleted successfully', { userId: user.uid });
            showToast('Your account and all data have been permanently deleted.', { variant: 'success' });
            // Auth state listener will handle redirect to login
        })
        .catch(err => {
            if (err.code === "auth/requires-recent-login") {
                logger.warning('Account deletion requires recent login', { userId: user.uid });
                showAlert('For security, you need to sign in again before deleting your account. Please log out, log back in, and try again.', { variant: 'warning' });
            } else {
                logger.error('Account deletion failed', { code: err.code, message: err.message });
                showAlert('Error deleting account: ' + err.message, { variant: 'error' });
                console.error("Delete account error:", err);
            }
        });
}

const deleteAccountBtn = document.getElementById("deleteAccountBtn");
if (deleteAccountBtn) deleteAccountBtn.addEventListener("click", deleteAccount);

// ── Event bindings ────────────────────────────────────────────────────────────
entryForm.addEventListener("submit", addEntry);
searchInput.addEventListener("input", debounce(render, SEARCH_DEBOUNCE_MS));
exportBtn.addEventListener("click", exportToExcel);
document.getElementById("exportPdfBtn")?.addEventListener("click", exportToPdf);
clearTabButton.addEventListener("click", clearActiveTab);
resetAllDataButton.addEventListener("click", resetAllData);
entryRows.addEventListener("click", e => {
    handleTableAction("standard", e);
});

// Monthly Budget event bindings
function getBudgetEarliestDate() {
    const od = appData.onboardingDate;
    if (!od) return null;
    const d = new Date(od);
    // Block navigation before the onboarding month (not just FY start)
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

prevMonthBtn.addEventListener("click", () => {
    const step = isAnnualBudgetView ? -12 : -1;
    const proposed = new Date(currentMonth);
    proposed.setMonth(proposed.getMonth() + step);
    const earliest = getBudgetEarliestDate();
    if (earliest && proposed < earliest) return; // Block navigation before onboarding month
    currentMonth.setMonth(currentMonth.getMonth() + step);
    renderMonthlyBudget();
});

nextMonthBtn.addEventListener("click", () => {
    const step = isAnnualBudgetView ? 12 : 1;
    const proposed = new Date(currentMonth);
    proposed.setMonth(proposed.getMonth() + step);
    
    // Block navigation beyond next month (or next FY)
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 1); // next month from today
    maxDate.setDate(1);

    if (!isAnnualBudgetView) {
        // Allow viewing next month if the current viewed month is closed
        const currentViewedMonthKey = getMonthKey(currentMonth);
        const currentViewedMonthData = (appData.monthlyBudgetData || {})[currentViewedMonthKey];
        const isCurrentViewedClosed = currentViewedMonthData && currentViewedMonthData._monthClosed;

        if (isCurrentViewedClosed) {
            // If current viewed month is closed, allow going to the very next month
            // But block going further than that
            const nextMonthAfterClosed = new Date(currentMonth);
            nextMonthAfterClosed.setMonth(nextMonthAfterClosed.getMonth() + 1);
            const maxAllowed = new Date(nextMonthAfterClosed.getFullYear(), nextMonthAfterClosed.getMonth() + 1, 1);
            if (proposed >= maxAllowed) return;
        } else {
            // Normal case: allow up to next month from today
            if (proposed > maxDate) return;
        }
    }
    if (isAnnualBudgetView) {
        const proposedFYStart = proposed.getMonth() >= 3 ? proposed.getFullYear() : proposed.getFullYear() - 1;
        const currentFYStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        if (proposedFYStart > currentFYStart) return;
    }
    currentMonth.setMonth(currentMonth.getMonth() + step);
    renderMonthlyBudget();
});

toggleBudgetView.addEventListener("click", () => {
    isAnnualBudgetView = !isAnnualBudgetView;
    renderBudgetViewToggle();
    prevMonthBtn.textContent = isAnnualBudgetView ? "← Previous FY" : "← Previous";
    nextMonthBtn.textContent = isAnnualBudgetView ? "Next FY →" : "Next →";
    
    // Hide edit and close buttons in annual view
    if (toggleBudgetEdit) toggleBudgetEdit.hidden = isAnnualBudgetView;
    if (btnCarryForward) btnCarryForward.hidden = isAnnualBudgetView;
    
    renderMonthlyBudget();
});

toggleBudgetEdit.addEventListener("click", () => {
    // Block edit for closed months
    const monthKey = getMonthKey(currentMonth);
    const md = (appData.monthlyBudgetData || {})[monthKey];
    if (md && md._monthClosed) return;
    // If in annual view, switch to monthly first before editing
    if (isAnnualBudgetView) {
        isAnnualBudgetView = false;
        renderBudgetViewToggle();
        prevMonthBtn.textContent = "← Previous";
        nextMonthBtn.textContent = "Next →";
    }
    if (!isBudgetEditMode) {
        // Entering edit mode – snapshot current data so cancel can revert
        const monthKey = getMonthKey(currentMonth);
        const current = (appData.monthlyBudgetData || {})[monthKey];
        budgetEditSnapshot = { monthKey, data: current ? JSON.parse(JSON.stringify(current)) : null };
    } else {
        // Leaving edit mode (Save)
        // Adjust expenditure account balance based on on-demand item changes
        if (budgetEditSnapshot && budgetEditSnapshot.data) {
            const oldInvesting = budgetEditSnapshot.data.investing || {};
            const newInvesting = (appData.monthlyBudgetData || {})[monthKey]?.investing || {};
            
            const oldOnDemand = Number(oldInvesting.onetimeSaving || 0) + Number(oldInvesting.onetimeInvestment || 0) + Number(oldInvesting.ondemandExpenditure || 0);
            const newOnDemand = Number(newInvesting.onetimeSaving || 0) + Number(newInvesting.onetimeInvestment || 0) + Number(newInvesting.ondemandExpenditure || 0);
            
            const onDemandDiff = newOnDemand - oldOnDemand;
            
            if (onDemandDiff !== 0) {
                // Adjust expenditure account balance
                const cards = (appData.tabData || {}).cards || [];
                const expAccount = cards.find(c => c.isPrimary === "Yes");
                if (expAccount) {
                    const currentBalance = Number(expAccount.balance || 0);
                    expAccount.balance = Math.max(0, currentBalance - onDemandDiff);
                    logger.info('Adjusted expenditure account balance for on-demand changes', { 
                        oldOnDemand, 
                        newOnDemand, 
                        onDemandDiff, 
                        oldBalance: currentBalance, 
                        newBalance: expAccount.balance 
                    });
                }
            }
        }
        scheduleSave();
    }
    isBudgetEditMode = !isBudgetEditMode;
    setToggleButtonIconText(toggleBudgetEdit, isBudgetEditMode, "Edit");
    renderMonthlyBudget();
});

// ── Execute Transfer button ───────────────────────────────────────────────────
const btnDoTransfer = document.getElementById("btnDoTransfer");
if (btnDoTransfer) btnDoTransfer.addEventListener("click", async () => {
    const amt = budgetState.transferAmt;
    const salary = budgetState.salaryAccount;
    const exp = budgetState.expAccount;
    const autoDebitByType = budgetState.autoDebitByType || {};
    if (!salary) { showAlert("No Salary account found. Add one with purpose 'Salary' in Accounts tab.", { variant: 'warning' }); return; }
    if (!exp) { showAlert('No Primary (Expenditure) account found. Set an account as Primary in the Accounts tab.', { variant: 'warning' }); return; }
    // Block if primaryIncome not defined or transfer already done
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};
    if (monthData._transferDone) { showAlert('Transfer already executed for this month.', { variant: 'info' }); return; }
    if (monthData._monthClosed) { showAlert('This month is already closed.', { variant: 'info' }); return; }
    const primaryIncome = Number(monthData.inflow?.primaryIncome || 0);
    if (primaryIncome <= 0) { showAlert('Please enter your Primary Income (salary credited this month) before executing transfer.', { variant: 'warning' }); return; }
    if (amt <= 0) { showAlert("Nothing to transfer — fixed outflow exceeds or equals income.", { variant: 'info' }); return; }

    const cards = (appData.tabData || {}).cards || [];
    const savingAccount = cards.find(c => (c.purpose === "Savings" || c.purpose === "Saving") && c.isPrimary !== "Yes");
    const investmentAccount = cards.find(c => c.purpose === "Investment" && c.isPrimary !== "Yes");

    const fixedTotal = (autoDebitByType.Liability || 0)
        + (autoDebitByType.Insurance || 0)
        + (autoDebitByType.Savings || 0)
        + (autoDebitByType.Investment || 0)
        + (autoDebitByType.Expenditure || 0)
        + (autoDebitByType.Others || 0);
    const expBalBefore = Number(exp.balance || 0);
    const expBalAfter = expBalBefore + amt;
    const savBalBefore = Number(savingAccount?.balance || 0);
    const invBalBefore = Number(investmentAccount?.balance || 0);

    let confirmMsg = ``;
    confirmMsg += `EXECUTE MONTHLY TRANSFER\n`;
    confirmMsg += `════════════════════════════════\n\n`;

    // Section 1: Income
    confirmMsg += `INCOME\n`;
    confirmMsg += `────────────────────────────────\n`;
    confirmMsg += `  Salary Credited:  ${formatMoney(primaryIncome)}\n\n`;

    // Section 2: Deductions (paid from salary, leaves system)
    const leavesSystem = (autoDebitByType.Liability || 0) + (autoDebitByType.Insurance || 0) + (autoDebitByType.Expenditure || 0) + (autoDebitByType.Others || 0);
    if (leavesSystem > 0) {
        confirmMsg += `DEDUCTIONS (paid from salary)\n`;
        confirmMsg += `────────────────────────────────\n`;
        if (autoDebitByType.Liability > 0)  confirmMsg += `  Liability:        ${formatMoney(autoDebitByType.Liability)}\n`;
        if (autoDebitByType.Insurance > 0)  confirmMsg += `  Insurance:        ${formatMoney(autoDebitByType.Insurance)}\n`;
        if (autoDebitByType.Expenditure > 0) confirmMsg += `  Fixed Expenditure: ${formatMoney(autoDebitByType.Expenditure)}\n`;
        if (autoDebitByType.Others > 0)     confirmMsg += `  Others:           ${formatMoney(autoDebitByType.Others)}\n`;
        confirmMsg += `\n`;
    }

    // Section 3: Internal Transfers (to other accounts)
    const internalTransfers = (autoDebitByType.Savings || 0) + (autoDebitByType.Investment || 0);
    if (internalTransfers > 0) {
        confirmMsg += `INTERNAL TRANSFERS\n`;
        confirmMsg += `────────────────────────────────\n`;
        if (autoDebitByType.Savings > 0) {
            confirmMsg += `  Savings A/c${savingAccount ? ` (${savingAccount.bankName})` : ''}:\n`;
            confirmMsg += `      ${formatMoney(savBalBefore)} + ${formatMoney(autoDebitByType.Savings)} = ${formatMoney(savBalBefore + autoDebitByType.Savings)}\n`;
        }
        if (autoDebitByType.Investment > 0) {
            confirmMsg += `  Investment A/c${investmentAccount ? ` (${investmentAccount.bankName})` : ''}:\n`;
            confirmMsg += `      ${formatMoney(invBalBefore)} + ${formatMoney(autoDebitByType.Investment)} = ${formatMoney(invBalBefore + autoDebitByType.Investment)}\n`;
        }
        confirmMsg += `\n`;
    }

    // Section 4: Summary
    confirmMsg += `SUMMARY\n`;
    confirmMsg += `────────────────────────────────\n`;
    confirmMsg += `  Total Deducted:   ${formatMoney(fixedTotal)}\n`;
    confirmMsg += `  Salary Leftover:  ${formatMoney(amt)}\n\n`;

    // Section 5: Expenditure Account
    confirmMsg += `EXPENDITURE A/C (${exp.bankName || 'Primary'})\n`;
    confirmMsg += `────────────────────────────────\n`;
    if (expBalBefore > 0) {
        confirmMsg += `  Existing Balance: ${formatMoney(expBalBefore)} (carry forward)\n`;
    }
    confirmMsg += `  + Transfer:       ${formatMoney(amt)}\n`;
    confirmMsg += `  = New Balance:    ${formatMoney(expBalAfter)}\n\n`;

    // Section 6: Salary Account
    confirmMsg += `SALARY A/C (${salary.bankName || 'Salary'})\n`;
    confirmMsg += `────────────────────────────────\n`;
    confirmMsg += `  ${formatMoney(Number(salary.balance || 0))} → ₹0 (fully allocated)`;

    if (!(await showConfirm(confirmMsg, { title: 'Execute Monthly Transfer', confirmText: 'Execute Transfer' }))) {
        logger.info('Execute Transfer cancelled by user');
        return;
    }

    // Deduct full primaryIncome from salary (all obligations + transfer)
    salary.balance = 0;
    // Credit expenditure account with transfer amount
    exp.balance = Number(exp.balance || 0) + amt;
    // Credit savings account with auto-debit savings amount
    if (savingAccount && autoDebitByType.Savings > 0) {
        savingAccount.balance = Number(savingAccount.balance || 0) + autoDebitByType.Savings;
    }
    // Reset investment account to zero for the new month, then add current month's investment transfer
    if (investmentAccount) {
        investmentAccount.balance = 0;
    }
    if (investmentAccount && autoDebitByType.Investment > 0) {
        investmentAccount.balance = Number(investmentAccount.balance || 0) + autoDebitByType.Investment;
    }

    // Update all account balances
    appData.tabData.cards = cards.map(c => {
        if (c.id === salary.id) return salary;
        if (c.id === exp.id) return exp;
        if (savingAccount && c.id === savingAccount.id) return savingAccount;
        if (investmentAccount && c.id === investmentAccount.id) return investmentAccount;
        return c;
    });

    // Record transfer done for this month
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    if (!appData.monthlyBudgetData[monthKey]) appData.monthlyBudgetData[monthKey] = { inflow: {}, outflow: {}, investing: {} };
    appData.monthlyBudgetData[monthKey]._transferDone = (appData.monthlyBudgetData[monthKey]._transferDone || 0) + amt;
    // Record actual expenditure account balance after transfer for variable expenditure tracking
    appData.monthlyBudgetData[monthKey]._initialBalance = exp.balance;
    // Snapshot: fixed outflow total at time of transfer (for mismatch detection)
    appData.monthlyBudgetData[monthKey]._transferOutflowSnapshot = fixedTotal;
    logger.info('Execute Transfer completed', { monthKey, transferAmount: amt, fixedTotal, primaryIncome });
    scheduleSave();
    renderMonthlyBudget();
    renderCards();
});

// ── Recalculate Transfer (fix mismatch) ──────────────────────────────────────
const btnRecalcTransfer = document.getElementById("btnRecalcTransfer");
if (btnRecalcTransfer) btnRecalcTransfer.addEventListener("click", async () => {
    const monthKey = getMonthKey(currentMonth);
    const monthData = (appData.monthlyBudgetData || {})[monthKey];
    if (!monthData || !monthData._transferDone) { showAlert('No transfer to recalculate.', { variant: 'info' }); return; }
    if (monthData._monthClosed) { showAlert('Cannot recalculate — month is already closed.', { variant: 'info' }); return; }

    const primaryIncome = Number(monthData.inflow?.primaryIncome || 0);
    const correctTransfer = budgetState.mismatchCorrectTransfer;
    const fixedOutflow = budgetState.mismatchFixedOutflow;
    if (correctTransfer == null || fixedOutflow == null) { showAlert('No mismatch detected.', { variant: 'info' }); return; }

    const oldTransfer = Number(monthData._transferDone || 0);
    const oldInitial = Number(monthData._initialBalance || 0);

    // New _initialBalance: recalculate based on correct transfer + any pre-existing balance
    // preExisting = old _initialBalance - old _transferDone
    // This already includes carry forward and any account balance before transfer
    const preExisting = Math.max(0, oldInitial - oldTransfer);
    const newInitial = preExisting + correctTransfer;

    const cards = (appData.tabData || {}).cards || [];
    const expAccount = cards.find(c => c.isPrimary === "Yes");
    const currentExpBal = Number(expAccount?.balance || 0);
    const newVarExp = Math.max(0, newInitial - currentExpBal);

    let msg = `Recalculate Transfer\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Primary Income: ${formatMoney(primaryIncome)}\n`;
    msg += `Current Fixed Outflows: ${formatMoney(fixedOutflow)}\n\n`;
    msg += `OLD Transfer Amount: ${formatMoney(oldTransfer)}\n`;
    msg += `NEW Transfer Amount: ${formatMoney(correctTransfer)}\n`;
    msg += `Difference: ${formatMoney(oldTransfer - correctTransfer)}\n\n`;
    if (preExisting > 0) {
        msg += `Pre-existing Exp Balance: ${formatMoney(preExisting)}\n`;
    }
    msg += `OLD _initialBalance: ${formatMoney(oldInitial)}\n`;
    msg += `NEW _initialBalance: ${formatMoney(newInitial)}\n\n`;
    msg += `Current Exp Balance: ${formatMoney(currentExpBal)}\n`;
    msg += `NEW Variable Expenditure: ${formatMoney(newVarExp)}\n\n`;
    msg += `Warning: This does not change account balances.\n`;
    msg += `Only budget metadata (_transferDone, _initialBalance) will be corrected.\n\n`;
    msg += `Proceed?`;

    if (!(await showConfirm(msg, { title: 'Recalculate Transfer', confirmText: 'Recalculate' }))) return;

    monthData._transferDone = correctTransfer;
    monthData._initialBalance = newInitial;
    monthData._transferOutflowSnapshot = fixedOutflow;
    logger.info('Transfer recalculated', { monthKey, oldTransfer, correctTransfer, oldInitial, newInitial, fixedOutflow });
    scheduleSave();
    renderMonthlyBudget();
    showToast('Transfer recalculated. Variable expenditure has been corrected.', { variant: 'success' });
});

// ── Reconcile button ─────────────────────────────────────────────────────────
const btnReconcile = document.getElementById("btnReconcile");
if (btnReconcile) btnReconcile.addEventListener("click", () => {
    const input = document.getElementById("currentExpAccBalanceInput");
    const actualBalance = Number(input?.value || 0);
    const transferDone = budgetState.transferDone || 0;
    const trackedExp = budgetState.trackedExpenses || 0;
    // Previous month carryforward adds to expected starting balance
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthData = (appData.monthlyBudgetData || {})[getMonthKey(prevMonth)];
    const prevCarryForward = Number(prevMonthData?._carryForwardDone || 0);
    const expectedBalance = prevCarryForward + transferDone - trackedExp;
    const untracked = Math.max(0, expectedBalance - actualBalance);

    const grid = document.getElementById("reconciliationGrid");
    if (grid) grid.hidden = false;
    const el1 = document.getElementById("expectedExpBalance");
    const el2 = document.getElementById("actualExpBalance");
    const el3 = document.getElementById("reconciledUntracked");
    if (el1) el1.textContent = formatMoney(expectedBalance);
    if (el2) el2.textContent = formatMoney(actualBalance);
    if (el3) {
        el3.textContent = formatMoney(untracked);
        el3.style.color = untracked > 0 ? COLOR_WARNING : COLOR_POSITIVE;
    }

    // Also update expenditure account balance in Accounts
    const exp = budgetState.expAccount;
    if (exp) {
        exp.balance = actualBalance;
        const cards = (appData.tabData || {}).cards || [];
        appData.tabData.cards = cards.map(c => c.id === exp.id ? exp : c);
        scheduleSave();
    }
});

// ── Close Current Month Budget button ─────────────────────────────────────────
const btnCarryForward = document.getElementById("btnCarryForward");
if (btnCarryForward) btnCarryForward.addEventListener("click", async () => {
    const exp = budgetState.expAccount;
    if (!exp) { showAlert('No Expenditure account found.', { variant: 'warning' }); return; }

    const monthKey = getMonthKey(currentMonth);
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    if (!appData.monthlyBudgetData[monthKey]) appData.monthlyBudgetData[monthKey] = { inflow: {}, outflow: {}, investing: {} };
    const monthData = appData.monthlyBudgetData[monthKey];
    if (monthData._monthClosed) { showAlert('This month is already closed.', { variant: 'info' }); return; }
    if (!monthData._transferDone) { showAlert('Execute the monthly transfer first before closing the month.', { variant: 'warning' }); return; }
    const balance = Number(exp.balance || 0);

    const creditCardOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
    const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    const ccSettlementAmount = Number(monthData._ccSettlementAmount || 0);
    
    // Calculate actual outstanding: previous month's CC (already reduced by settlements) + current month's new spending
    // Note: creditCardOutstanding is already reduced by settlements when user clicks "Settle from Saving"
    const actualCCOutstanding = creditCardOutstanding + midMonthCC;
    const monthLabel = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    let confirmMsg = `Close ${monthLabel} Budget?\n\nThis will:\n`;
    confirmMsg += `• Mark this month as read-only (no more edits)\n`;
    if (balance > 0) {
        confirmMsg += `• Carry forward ₹${balance.toLocaleString("en-IN")} expenditure balance as next month's initial balance\n`;
    }
    if (actualCCOutstanding > 0) {
        confirmMsg += `• Set ₹${actualCCOutstanding.toLocaleString("en-IN")} as next month's "Previous Month CC Bill (Unpaid)"\n`;
    }
    if (ccSettlementAmount > 0) {
        confirmMsg += `• (₹${ccSettlementAmount.toLocaleString("en-IN")} was settled from savings during this month)\n`;
    }
    confirmMsg += `• Navigate to next month\n\nProceed?`;
    if (!(await showConfirm(confirmMsg, { title: 'Close Month', dangerous: true, confirmText: 'Close Month' }))) return;

    // Save the budget status before closing
    const inflowTotalClose = Object.values(monthData.inflow || {}).reduce((s, v) => s + Number(v || 0), 0);
    const allOutflowsClose = ((appData.tabData || {}).outflow || []);
    let fixedMonthlyOutflowClose = 0;
    allOutflowsClose.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = toMonthlyAmount(amount, freq);
        fixedMonthlyOutflowClose += monthlyAmt;
    });
    const spendableClose = inflowTotalClose - fixedMonthlyOutflowClose;
    const variableExpClose = Number(monthData.outflow?.variableExpenditure || 0);
    const creditCardOutstandingClose = Number(monthData.outflow?.creditCardOutstanding || 0);
    const midMonthCCClose = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    const ccSettlementAmountClose = Number(monthData._ccSettlementAmount || 0);
    // Note: creditCardOutstanding is already reduced by settlements when user clicks "Settle from Saving"
    const actualCCOutstandingClose = creditCardOutstandingClose + midMonthCCClose;
    const untrackedClose = variableExpClose + actualCCOutstandingClose;
    // Exclude borrowing from spendable as it's not new income
    const borrowingClose = Number(monthData.inflow?.borrowing || 0);
    const spendableCloseWithoutBorrowing = spendableClose - borrowingClose;
    const budgetBalanceClose = spendableCloseWithoutBorrowing - untrackedClose;
    if (budgetBalanceClose > 0) {
        monthData._closedBudgetStatus = `Budget Surplus: +${formatMoney(budgetBalanceClose)} remaining`;
        monthData._closedBudgetStatusType = "positive";
    } else if (budgetBalanceClose < 0) {
        monthData._closedBudgetStatus = `Over Budget: ${formatMoney(Math.abs(budgetBalanceClose))} overspent`;
        monthData._closedBudgetStatusType = "negative";
    } else {
        monthData._closedBudgetStatus = `Budget Balanced — all income allocated`;
        monthData._closedBudgetStatusType = "neutral";
    }

    // Close the current month
    monthData._monthClosed = true;
    monthData._carryForwardDone = balance;
    
    // Store the actual CC outstanding amount after settlements for next month's auto-calculation
    monthData._actualCCOutstanding = actualCCOutstanding;
    
    // Reset investment account balance to 0 when closing month
    const cards = (appData.tabData || {}).cards || [];
    const investmentAccount = cards.find(c => c.purpose === "Investment" && c.isPrimary !== "Yes");
    if (investmentAccount) {
        investmentAccount.balance = 0;
        appData.tabData.cards = cards.map(c => c.id === investmentAccount.id ? investmentAccount : c);
    }

    logger.info('Month closed successfully', { monthKey, carryForward: balance, budgetStatus: monthData._closedBudgetStatusType });

    // Navigate to next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    
    // Sync expense tracking month with budget month
    currentExpenseMonth = new Date(currentMonth);
    
    scheduleSave();
    renderMonthlyBudget();
});

// ── Mid-Month Quick Updates ──────────────────────────────────────────────────
const btnUpdateSalaryBalance = document.getElementById("btnUpdateSalaryBalance");
if (btnUpdateSalaryBalance) btnUpdateSalaryBalance.addEventListener("click", () => {
    logger.info('Salary balance quick update initiated');
    const input = document.getElementById("midMonthSalaryBalance");
    const newBalance = Number(input?.value);
    if (isNaN(newBalance) || newBalance < 0) { 
        logger.warning('Invalid salary balance entered', { newBalance });
        showAlert('Enter a valid salary balance.', { variant: 'warning' }); 
        return; 
    }
    const cards = (appData.tabData || {}).cards || [];
    const salary = cards.find(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    if (!salary) { 
        logger.warning('No salary account found for quick update');
        showAlert('No Salary account found.', { variant: 'warning' }); 
        return; 
    }
    const oldBalance = salary.balance;
    salary.balance = newBalance;
    appData.tabData.cards = cards.map(c => c.id === salary.id ? salary : c);
    
    scheduleSave();
    input.value = "";
    // Re-render to update the summary cards
    if (!isBudgetEditMode) renderMonthlyBudget();
    
    logger.info('Salary balance updated successfully', { 
        oldBalance, 
        newBalance,
        savedToFirebase: true
    });
    showToast(`Salary account balance updated to ${formatMoney(newBalance)}`, { variant: 'success' });
});

// Quick Update: Expenditure Account Balance
const btnUpdateExpBalance = document.getElementById("btnUpdateExpBalance");
if (btnUpdateExpBalance) btnUpdateExpBalance.addEventListener("click", () => {
    logger.info('Expenditure balance quick update initiated');
    const input = document.getElementById("midMonthExpBalance");
    const newBalance = Number(input?.value);
    if (isNaN(newBalance) || newBalance < 0) { 
        logger.warning('Invalid expenditure balance entered', { newBalance });
        showAlert('Enter a valid expenditure balance.', { variant: 'warning' }); 
        return; 
    }
    const cards = (appData.tabData || {}).cards || [];
    const exp = cards.find(c => c.isPrimary === "Yes");
    if (!exp) { 
        logger.warning('No expenditure account found for quick update');
        showAlert('No Primary (Expenditure) account found.', { variant: 'warning' }); 
        return; 
    }
    const oldBalance = exp.balance;
    exp.balance = newBalance;
    appData.tabData.cards = cards.map(c => c.id === exp.id ? exp : c);
    
    // Calculate and update variable expenditure in monthData
    const monthKey = getMonthKey(currentMonth);
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    const monthData = appData.monthlyBudgetData[monthKey] || {
        inflow: {},
        outflow: {},
        investing: {},
        monthEndBalance: 0
    };
    appData.monthlyBudgetData[monthKey] = monthData;
    
    // P2: Deduplicated — use shared helper with overridden balance
    const prevMonthForCarry = new Date(currentMonth);
    prevMonthForCarry.setMonth(prevMonthForCarry.getMonth() - 1);
    const prevKey = getMonthKey(prevMonthForCarry);
    const { varExp, totalFunded } = calcVariableExpenditure(monthData, prevKey, newBalance);
    
    // Ensure monthData is saved back to appData
    appData.monthlyBudgetData[monthKey] = monthData;
    
    scheduleSave();
    input.value = "";
    // Show variable expenditure in quick update result
    const resultEl = document.getElementById("quickUpdateResult");
    const untrackedEl = document.getElementById("quickUpdateUntracked");
    if (resultEl) resultEl.hidden = false;
    if (untrackedEl) { untrackedEl.textContent = formatMoney(varExp); untrackedEl.style.color = varExp > 0 ? COLOR_WARNING : COLOR_POSITIVE; }
    
    // Re-render to update the summary cards
    if (!isBudgetEditMode) renderMonthlyBudget();
    
    logger.info('Expenditure balance updated successfully', { 
        oldBalance, 
        newBalance, 
        variableExpenditure: varExp,
        totalFunded,
        monthKey,
        savedToFirebase: true
    });
    
    showToast(`Expenditure account balance updated to ${formatMoney(newBalance)}`, { variant: 'success' });
});

// Quick Update: Current Month CC Spending (stored as midMonthCCOutstanding)
const btnUpdateCCOutstanding = document.getElementById("btnUpdateCCOutstanding");
if (btnUpdateCCOutstanding) btnUpdateCCOutstanding.addEventListener("click", () => {
    logger.info('CC spending quick update initiated');
    const input = document.getElementById("midMonthCCOutstanding");
    const newCC = Number(input?.value);
    if (isNaN(newCC) || newCC < 0) { 
        logger.warning('Invalid CC spending amount entered', { newCC });
        showAlert('Enter a valid CC spending amount.', { variant: 'warning' }); 
        return; 
    }
    const monthKey = getMonthKey(currentMonth);
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    if (!appData.monthlyBudgetData[monthKey]) appData.monthlyBudgetData[monthKey] = { inflow: {}, outflow: {}, investing: {} };
    const oldCC = appData.monthlyBudgetData[monthKey].outflow.midMonthCCOutstanding || 0;
    appData.monthlyBudgetData[monthKey].outflow.midMonthCCOutstanding = newCC;
    
    // Update breakdown for CC spending
    appData.monthlyBudgetData[monthKey].autoLinkedFields = appData.monthlyBudgetData[monthKey].autoLinkedFields || {};
    appData.monthlyBudgetData[monthKey].autoLinkedFields["outflow.midMonthCCOutstanding"] = true;
    appData.monthlyBudgetData[monthKey].autoLinkedBreakdown = appData.monthlyBudgetData[monthKey].autoLinkedBreakdown || {};
    appData.monthlyBudgetData[monthKey].autoLinkedBreakdown["outflow.midMonthCCOutstanding"] = [
        { name: "Current Month CC Spending", amount: newCC, source: "Quick Update (Mid-Month)" }
    ];
    
    scheduleSave();
    input.value = "";
    renderMonthlyBudget();
    
    logger.info('CC spending updated successfully', { 
        oldCC, 
        newCC, 
        monthKey,
        savedToFirebase: true
    });
    showToast(`Current month CC spending for ${currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} updated to ${formatMoney(newCC)}`, { variant: 'success' });
});

// ── Sort/Filter toolbar event delegation ─────────────────────────────────────
(function () {
    const previewMap = {
        goalPreview:        { tabId: "financialGoal", render: () => renderFinancialGoal() },
        inflowTabPreview:   { tabId: "inflow",        render: () => renderInflow() },
        outflowTabPreview:  { tabId: "outflow",       render: () => renderOutflow() },
        giftsPreview:       { tabId: "gifts",         render: () => renderGifts() },
        insuranceTabPreview:{ tabId: "insurance",     render: () => renderInsurance() },
        expensePreview:     { tabId: "expenseTracking", render: () => renderExpenseTracking() },
    };

    Object.entries(previewMap).forEach(([containerId, { tabId, render }]) => {
        const el = document.getElementById(containerId);
        if (!el) return;

        el.addEventListener("change", e => {
            if (e.target.classList.contains("toolbar-sort-select")) {
                listSortFilter[tabId].sortBy = e.target.value;
                saveListSortFilter();
                render();
            } else if (e.target.classList.contains("toolbar-filter-select")) {
                const fieldId = e.target.dataset.field;
                listSortFilter[tabId].filters[fieldId] = e.target.value;
                saveListSortFilter();
                render();
            } else if (e.target.classList.contains("toolbar-hide-completed")) {
                listSortFilter[tabId].hideCompleted = e.target.checked;
                saveListSortFilter();
                render();
            }
        });

        el.addEventListener("input", e => {
            if (e.target.classList.contains("toolbar-search-input")) {
                listSortFilter[tabId].searchText = e.target.value;
                saveListSortFilter();
                render();
            }
        });

        el.addEventListener("click", e => {
            if (e.target.classList.contains("toolbar-sort-dir")) {
                listSortFilter[tabId].sortDir = listSortFilter[tabId].sortDir === "asc" ? "desc" : "asc";
                saveListSortFilter();
                render();
            }
        });
    });
}());

// Financial Goal event bindings
toggleGoalEdit.addEventListener("click", () => {
    isGoalEditMode = !isGoalEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (goalDynamicFields) goalDynamicFields.innerHTML = "";
    clearEditing("financialGoal");
    renderFinancialGoal();
});

goalForm.addEventListener("submit", addGoalEntry);
goalTableBody.addEventListener("click", e => {
    handleTableAction("financialGoal", e);
});

// Inflow event bindings
if (toggleInflowEdit) toggleInflowEdit.addEventListener("click", () => {
    isInflowEditMode = !isInflowEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (inflowDynamicFields) inflowDynamicFields.innerHTML = "";
    clearEditing("inflow");
    renderInflow();
});
if (inflowForm) inflowForm.addEventListener("submit", addInflowEntry);
if (inflowTableBody) inflowTableBody.addEventListener("click", e => handleTableAction("inflow", e));

// Outflow event bindings
if (toggleOutflowEdit) toggleOutflowEdit.addEventListener("click", () => {
    isOutflowEditMode = !isOutflowEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (outflowDynamicFields) outflowDynamicFields.innerHTML = "";
    clearEditing("outflow");
    if (isOutflowEditMode && monthlyIncomeInput) {
        // Entering edit mode - populate the field
        monthlyIncomeInput.value = appData.fixedMonthlyIncome || "";
    }
    if (!isOutflowEditMode) {
        // Exiting edit mode (Done clicked) - save the income
        if (monthlyIncomeInput) {
            appData.fixedMonthlyIncome = Number(monthlyIncomeInput.value || 0);
        }
        scheduleSave();
    }
    renderOutflow();
});
if (outflowForm) outflowForm.addEventListener("submit", addOutflowEntry);
if (outflowTableBody) outflowTableBody.addEventListener("click", e => handleTableAction("outflow", e));

// Cards event bindings
toggleCardEdit.addEventListener("click", () => {
    isCardEditMode = !isCardEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (cardDynamicFields) cardDynamicFields.innerHTML = "";
    clearEditing("cards");
    renderCards();
});

cardForm.addEventListener("submit", addCardEntry);
cardTableBody.addEventListener("click", e => {
    handleTableAction("cards", e);
});

// Net Worth event bindings
toggleNetWorthEdit.addEventListener("click", () => {
    isNetWorthEditMode = !isNetWorthEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (netWorthDynamicFields) netWorthDynamicFields.innerHTML = "";
    clearEditing("netWorth");
    renderNetWorth();
});

netWorthForm.addEventListener("submit", addNetWorthEntry);
netWorthTableBody.addEventListener("click", e => {
    handleTableAction("netWorth", e);
});

// Tax Plan event bindings
function initTaxPlanEventListeners() {
    if (toggleTaxPlanEdit) {
        toggleTaxPlanEdit.addEventListener("click", () => {
            try {
                if (isTaxPlanEditMode) {
                    // Switching from Edit to Preview - save salary and house property data
                    saveSalaryDetailsAuto();
                    saveHousePropertyDetailsAuto();
                }
                isTaxPlanEditMode = !isTaxPlanEditMode;
                // Clear dynamic fields when toggling edit mode to ensure fresh render
                if (taxPlanDynamicFields) taxPlanDynamicFields.innerHTML = "";
                clearEditing("taxPlan");
                renderTaxPlan();
            } catch (error) {
                console.error("Error toggling tax plan edit mode:", error);
                logger.error("Tax plan toggle error", { error: error.message, stack: error.stack });
                alert("Error switching modes. Please try again.");
            }
        });
    }
    
    if (taxRegimeSelect) {
        taxRegimeSelect.addEventListener("change", () => {
            if (!isTaxPlanEditMode) {
                renderTaxPlan();
            }
        });
    }
    
    if (financialYearSelect) {
        financialYearSelect.addEventListener("change", () => {
            if (!isTaxPlanEditMode) renderTaxPlan();
        });
    }
    
    if (taxPlanForm) {
        taxPlanForm.addEventListener("submit", addTaxPlanEntry);
    }
    
    if (taxPlanTableBody) {
        taxPlanTableBody.addEventListener("click", e => {
            handleTableAction("taxPlan", e);
        });
    }
}

// Tax plan event listeners are now initialized in initTaxPlanEventListeners()

// Gifts event bindings
toggleGiftsEdit.addEventListener("click", () => {
    isGiftsEditMode = !isGiftsEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (giftsDynamicFields) giftsDynamicFields.innerHTML = "";
    clearEditing("gifts");
    renderGifts();
});

giftsForm.addEventListener("submit", addGiftsEntry);
giftsTableBody.addEventListener("click", e => {
    handleTableAction("gifts", e);
});

// Emergency Fund event bindings
toggleEmergencyFundEdit.addEventListener("click", () => {
    if (isEmergencyFundEditMode) {
        // Exiting edit mode (Done) — save the emergency fund data
        saveEmergencyFundFromForm();
    }
    isEmergencyFundEditMode = !isEmergencyFundEditMode;
    renderEmergencyFund();
});

emergencyFundForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveEmergencyFundFromForm();
    isEmergencyFundEditMode = false;
    renderEmergencyFund();
});

// Insurance event bindings
if (toggleInsuranceEdit) toggleInsuranceEdit.addEventListener("click", () => {
    isInsuranceEditMode = !isInsuranceEditMode;
    // Clear dynamic fields when toggling edit mode to ensure fresh render
    if (insuranceDynamicFields) insuranceDynamicFields.innerHTML = "";
    clearEditing("insurance");
    if (!isInsuranceEditMode) scheduleSave();
    renderInsurance();
});
if (insuranceForm) insuranceForm.addEventListener("submit", addInsuranceEntry);
if (insuranceTableBody) insuranceTableBody.addEventListener("click", e => handleTableAction("insurance", e));

// Investment sub-tab bindings
const investmentSubTabs = document.getElementById("investmentSubTabs");
if (investmentSubTabs) investmentSubTabs.addEventListener("click", e => {
    if (!e.target.matches("[data-inv-view]")) return;
    activeInvestmentView = e.target.dataset.invView;
    investmentSubTabs.querySelectorAll(".inv-sub-tab").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    renderInflow();
});

// Auto-save on category field changes
inflowFields.addEventListener("input", handleCategoryFieldChange);
outflowFields.addEventListener("input", handleCategoryFieldChange);
investingFields.addEventListener("input", handleCategoryFieldChange);

function handleCategoryFieldChange(e) {
    if (e.target.disabled) return;
    if (!e.target.dataset.fieldId) return;
    
    const monthKey = getMonthKey(currentMonth);
    if (!appData.monthlyBudgetData) appData.monthlyBudgetData = {};
    if (!appData.monthlyBudgetData[monthKey]) {
        appData.monthlyBudgetData[monthKey] = {
            inflow: {},
            outflow: {},
            investing: {},
            monthEndBalance: 0
        };
    }
    
    const monthData = appData.monthlyBudgetData[monthKey];
    
    const category = e.target.dataset.category
        ? e.target.dataset.category.replace(/Fields$/, "")
        : e.target.parentElement.parentElement.id;
    const fieldId = e.target.dataset.fieldId;
    if (!monthData[category]) {
        monthData[category] = {};
    }
    // Store description fields as strings, numeric fields as numbers
    if (e.target.dataset.isDescription === "true") {
        monthData[category][fieldId] = e.target.value || "";
    } else {
        monthData[category][fieldId] = Number(e.target.value) || 0;
    }

    // When PRIMARY INCOME changes, auto-update salary account balance only before transfer is executed.
    if (fieldId === "primaryIncome") {
        const newIncome = Number(e.target.value) || 0;
        const cards = (appData.tabData || {}).cards || [];
        const salary = cards.find(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
        const monthData = (appData.monthlyBudgetData || {})[monthKey] || {};
        const transferDone = Number(monthData._transferDone || 0);
        if (salary && transferDone <= 0) {
            salary.balance = newIncome;
            appData.tabData.cards = cards.map(c => c.id === salary.id ? salary : c);
        }
    }
    
    // Update edit mode totals
    const inflowTotal = Object.values(monthData.inflow).reduce((s, v) => s + Number(v || 0), 0);
    const outflowTotal = Object.values(monthData.outflow).reduce((s, v) => s + Number(v || 0), 0);
    const investingTotal = sumCategoryNumericValues(monthData.investing);
    document.getElementById("inflowTotalEdit").textContent = formatMoney(inflowTotal);
    document.getElementById("outflowTotalEdit").textContent = formatMoney(outflowTotal);
    document.getElementById("investingTotalEdit").textContent = formatMoney(investingTotal);
    
    calculateAndDisplaySummary(monthData);
    if (!isBudgetEditMode) renderPieChart(monthData);
    scheduleSave();
}

function addGoalEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("financialGoal");
    if (!entry.name || entry.amountNeeded < 0) return;
    upsertSectionEntry("financialGoal", entry);
    resetSectionForm("financialGoal");
    renderFinancialGoal();
    // Trigger notification check after adding/updating goal
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addInflowEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("inflow");
    if (!entry.name || Number(entry.amount || 0) < 0) return;
    upsertSectionEntry("inflow", entry);
    resetSectionForm("inflow");
    renderInflow();
    // Trigger notification check after adding/updating inflow
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addOutflowEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("outflow");
    if (!entry.name || Number(entry.amount || 0) < 0) return;
    upsertSectionEntry("outflow", entry);
    resetSectionForm("outflow");
    renderOutflow();
    // Trigger notification check after adding/updating outflow
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addInsuranceEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("insurance");
    if (!entry.name) return;
    upsertSectionEntry("insurance", entry);
    resetSectionForm("insurance");
    renderInsurance();
    // Trigger notification check after adding/updating insurance
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addCardEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("cards");
    if (!entry.bankName) return;

    const entries = activeEntries();
    const editingId = editingEntryIds.cards;

    // Enforce: only one Primary (Expenditure) account
    if (entry.isPrimary === "Yes" && entries.some(c => c.isPrimary === "Yes" && c.id !== editingId)) {
        showAlert("A Primary (Expenditure) account already exists.\nOnly one primary account is allowed. Edit the existing one instead.", { variant: 'warning' });
        renderCardDynamicFields();
        return;
    }
    // Enforce: only one Salary account
    if (entry.purpose === "Salary" && entries.some(c => c.purpose === "Salary" && c.id !== editingId)) {
        showAlert("A Salary account already exists.\nOnly one Salary account is allowed.", { variant: 'warning' });
        return;
    }
    // Enforce: only one Saving account
    if ((entry.purpose === "Savings" || entry.purpose === "Saving") && entries.some(c => (c.purpose === "Savings" || c.purpose === "Saving") && c.id !== editingId)) {
        showAlert("A Savings account already exists.\nOnly one Savings account is allowed.", { variant: 'warning' });
        return;
    }

    upsertSectionEntry("cards", entry);
    resetSectionForm("cards");

    // Mark onboarding complete only when both Primary (Expenditure) + Salary accounts exist
    const updatedEntries = getSectionEntries("cards");
    const hasPrimaryAcc = updatedEntries.some(c => c.isPrimary === "Yes");
    const hasSalaryAcc = updatedEntries.some(c => c.purpose === "Salary" && c.isPrimary !== "Yes");
    if (hasPrimaryAcc && hasSalaryAcc) {
        if (!appData.onboardingComplete) {
            appData.onboardingComplete = true;
            if (!appData.onboardingDate) appData.onboardingDate = new Date().toISOString().slice(0, 10);
        }
    } else {
        appData.onboardingComplete = false;
    }
    scheduleSave();
    renderTabs();
    renderCards();
    // Trigger notification check after adding/updating card
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addNetWorthEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("netWorth");
    if (!entry.name || entry.value < 0) return;
    upsertSectionEntry("netWorth", entry);
    resetSectionForm("netWorth");
    renderNetWorth();
    // Trigger notification check after adding/updating net worth
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addTaxPlanEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("taxPlan");
    if (!entry.name || entry.amount < 0) return;
    upsertSectionEntry("taxPlan", entry);
    resetSectionForm("taxPlan");
    renderTaxPlan();
    // Trigger notification check after adding/updating tax plan
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addGiftsEntry(event) {
    event.preventDefault();
    const entry = readSectionFormEntry("gifts");
    if (!entry.name) return;
    upsertSectionEntry("gifts", entry);
    resetSectionForm("gifts");
    renderGifts();
    // Trigger notification check after adding/updating gifts
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function saveEmergencyFundFromForm() {
    const fields = TAB_FIELDS.emergencyFund || TAB_FIELDS.monthlyBudget;
    const existingEntries = activeEntries();
    const entry = { id: (existingEntries.length > 0 ? existingEntries[0].id : crypto.randomUUID()) };
    
    fields.forEach(f => {
        const input = document.getElementById(`emergencyFund_${f.id}`);
        if (!input) return;
        if (f.type === "number") {
            entry[f.id] = Number(input.value || 0);
        } else {
            entry[f.id] = input.value.trim();
        }
    });
    
    // Emergency fund is a single entry, replace existing
    setActiveEntries([entry]);
    emergencyFundForm.reset();
    // Trigger notification check after saving emergency fund
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }
}

function addEmergencyFundEntry(event) {
    event.preventDefault();
    saveEmergencyFundFromForm();
    isEmergencyFundEditMode = false;
    renderEmergencyFund();
}

// saveMonthBudgetData removed – was dead code wrapping scheduleSave()

// ── Version Display ──────────────────────────────────────────────────────────
(function initVersionDisplay() {
    const versionEl = document.getElementById("appVersionDisplay");
    if (versionEl) {
        versionEl.textContent = `SmartFin ${getAppVersion()}`;
        versionEl.title = `Major: ${APP_VERSION.major} | Minor: ${APP_VERSION.minor} | Build: ${APP_VERSION.build}`;
        versionEl.style.background = "transparent";
    }
})();
