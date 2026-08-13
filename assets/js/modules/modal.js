// ── SmartFin Custom Modal System ─────────────────────────────────────────────
// Replaces native alert(), confirm(), prompt() with styled async modals

let _modalContainer = null;

function getContainer() {
    if (_modalContainer) return _modalContainer;
    _modalContainer = document.getElementById('smartfin-modal');
    if (!_modalContainer) {
        _modalContainer = document.createElement('div');
        _modalContainer.id = 'smartfin-modal';
        _modalContainer.className = 'sf-modal-overlay';
        _modalContainer.hidden = true;
        document.body.appendChild(_modalContainer);
    }
    return _modalContainer;
}

function renderModal(html) {
    const container = getContainer();
    container.innerHTML = html;
    container.hidden = false;
    container.classList.add('sf-modal-open');
    document.body.classList.add('sf-modal-active');
    // Focus the first interactive element
    requestAnimationFrame(() => {
        const focusTarget = container.querySelector('.sf-modal-input, .sf-modal-btn-primary, .sf-modal-btn-confirm');
        if (focusTarget) focusTarget.focus();
    });
}

function closeModal() {
    const container = getContainer();
    container.classList.remove('sf-modal-open');
    document.body.classList.remove('sf-modal-active');
    setTimeout(() => {
        container.hidden = true;
        container.innerHTML = '';
    }, 200);
}

function iconSvg(variant) {
    const icons = {
        success: '<svg class="sf-modal-icon sf-modal-icon-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
        error: '<svg class="sf-modal-icon sf-modal-icon-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg class="sf-modal-icon sf-modal-icon-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg class="sf-modal-icon sf-modal-icon-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };
    return icons[variant] || icons.info;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMessage(msg) {
    return escapeHtml(msg).replace(/\n/g, '<br>');
}

// ── showAlert ────────────────────────────────────────────────────────────────
// Replaces alert(). Returns a Promise that resolves when dismissed.
export function showAlert(message, options = {}) {
    const variant = options.variant || 'info';
    const title = options.title || (variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Notice');

    return new Promise(resolve => {
        const html = `
            <div class="sf-modal-card sf-modal-${variant}" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="sf-modal-header">
                    ${iconSvg(variant)}
                    <h3 class="sf-modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="sf-modal-body">
                    <p>${formatMessage(message)}</p>
                </div>
                <div class="sf-modal-footer">
                    <button class="sf-modal-btn sf-modal-btn-primary" id="sfModalOk">OK</button>
                </div>
            </div>`;
        renderModal(html);

        const okBtn = document.getElementById('sfModalOk');
        let resolved = false;
        const handleKey = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') handleOk();
        };
        const handleOk = () => {
            if (resolved) return;
            resolved = true;
            document.removeEventListener('keydown', handleKey);
            closeModal(); resolve();
        };
        okBtn.addEventListener('click', handleOk);
        document.addEventListener('keydown', handleKey);
    });
}

// ── showConfirm ──────────────────────────────────────────────────────────────
// Replaces confirm(). Returns Promise<boolean>.
export function showConfirm(message, options = {}) {
    const variant = options.variant || 'warning';
    const title = options.title || 'Confirm';
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';
    const isDangerous = options.dangerous || false;

    return new Promise(resolve => {
        const html = `
            <div class="sf-modal-card sf-modal-${variant}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="sf-modal-header">
                    ${iconSvg(variant)}
                    <h3 class="sf-modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="sf-modal-body">
                    <p>${formatMessage(message)}</p>
                </div>
                <div class="sf-modal-footer sf-modal-footer-split">
                    <button class="sf-modal-btn sf-modal-btn-cancel" id="sfModalCancel">${escapeHtml(cancelText)}</button>
                    <button class="sf-modal-btn ${isDangerous ? 'sf-modal-btn-danger' : 'sf-modal-btn-confirm'}" id="sfModalConfirm">${escapeHtml(confirmText)}</button>
                </div>
            </div>`;
        renderModal(html);

        let resolved = false;
        const handleKey = (e) => {
            if (e.key === 'Escape') finish(false);
        };
        const finish = (val) => {
            if (resolved) return; resolved = true;
            document.removeEventListener('keydown', handleKey);
            closeModal(); resolve(val);
        };

        document.getElementById('sfModalConfirm').addEventListener('click', () => finish(true));
        document.getElementById('sfModalCancel').addEventListener('click', () => finish(false));
        document.addEventListener('keydown', handleKey);
    });
}

// ── showPrompt ───────────────────────────────────────────────────────────────
// Replaces prompt(). Returns Promise<string|null>.
export function showPrompt(message, options = {}) {
    const variant = options.variant || 'info';
    const title = options.title || 'Input';
    const placeholder = options.placeholder || '';
    const defaultValue = options.defaultValue || '';
    const inputType = options.inputType || 'text';
    const submitText = options.submitText || 'Submit';

    return new Promise(resolve => {
        const html = `
            <div class="sf-modal-card sf-modal-${variant}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="sf-modal-header">
                    ${iconSvg(variant)}
                    <h3 class="sf-modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="sf-modal-body">
                    <p>${formatMessage(message)}</p>
                    <input class="sf-modal-input" id="sfModalInput" type="${inputType}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" autocomplete="off">
                </div>
                <div class="sf-modal-footer sf-modal-footer-split">
                    <button class="sf-modal-btn sf-modal-btn-cancel" id="sfModalCancel">Cancel</button>
                    <button class="sf-modal-btn sf-modal-btn-confirm" id="sfModalSubmit">${escapeHtml(submitText)}</button>
                </div>
            </div>`;
        renderModal(html);

        let resolved = false;
        const input = document.getElementById('sfModalInput');
        const handleKey = (e) => {
            if (e.key === 'Escape') finish(null);
        };
        const finish = (val) => {
            if (resolved) return; resolved = true;
            document.removeEventListener('keydown', handleKey);
            closeModal(); resolve(val);
        };

        document.getElementById('sfModalSubmit').addEventListener('click', () => finish(input.value));
        document.getElementById('sfModalCancel').addEventListener('click', () => finish(null));
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value); });
        document.addEventListener('keydown', handleKey);
    });
}

// ── showTypedConfirm ─────────────────────────────────────────────────────────
// For "Type DELETE to confirm" flows. Returns Promise<boolean>.
export function showTypedConfirm(message, requiredText, options = {}) {
    const variant = options.variant || 'error';
    const title = options.title || 'Confirm Action';

    return new Promise(resolve => {
        const html = `
            <div class="sf-modal-card sf-modal-${variant}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="sf-modal-header">
                    ${iconSvg(variant)}
                    <h3 class="sf-modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="sf-modal-body">
                    <p>${formatMessage(message)}</p>
                    <p class="sf-modal-hint">Type <strong>${escapeHtml(requiredText)}</strong> to confirm:</p>
                    <input class="sf-modal-input" id="sfModalInput" type="text" placeholder="${escapeHtml(requiredText)}" autocomplete="off">
                </div>
                <div class="sf-modal-footer sf-modal-footer-split">
                    <button class="sf-modal-btn sf-modal-btn-cancel" id="sfModalCancel">Cancel</button>
                    <button class="sf-modal-btn sf-modal-btn-danger" id="sfModalConfirm" disabled>Confirm</button>
                </div>
            </div>`;
        renderModal(html);

        let resolved = false;
        const input = document.getElementById('sfModalInput');
        const confirmBtn = document.getElementById('sfModalConfirm');
        const handleKey = (e) => {
            if (e.key === 'Escape') finish(false);
        };
        const finish = (val) => {
            if (resolved) return; resolved = true;
            document.removeEventListener('keydown', handleKey);
            closeModal(); resolve(val);
        };

        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value !== requiredText;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value === requiredText) finish(true);
        });
        confirmBtn.addEventListener('click', () => finish(true));
        document.getElementById('sfModalCancel').addEventListener('click', () => finish(false));
        document.addEventListener('keydown', handleKey);
    });
}

// ── showToast ────────────────────────────────────────────────────────────────
// Non-blocking notification toast (for success messages, undo)
export function showToast(message, options = {}) {
    const variant = options.variant || 'success';
    const duration = options.duration || 3000;
    const actionLabel = options.actionLabel || null;

    return new Promise(resolve => {
        let toastContainer = document.getElementById('sf-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'sf-toast-container';
            toastContainer.className = 'sf-toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `sf-toast sf-toast-${variant}`;
        toast.innerHTML = `
            <span class="sf-toast-message">${formatMessage(message)}</span>
            ${actionLabel ? `<button class="sf-toast-action" id="sfToastAction">${escapeHtml(actionLabel)}</button>` : ''}
            <button class="sf-toast-close" aria-label="Close">&times;</button>
        `;
        toastContainer.appendChild(toast);

        // Trigger entrance animation
        requestAnimationFrame(() => toast.classList.add('sf-toast-show'));

        let dismissed = false;
        const dismiss = (action) => {
            if (dismissed) return;
            dismissed = true;
            toast.classList.remove('sf-toast-show');
            setTimeout(() => { toast.remove(); resolve(action || false); }, 200);
        };

        toast.querySelector('.sf-toast-close').addEventListener('click', () => dismiss(false));
        if (actionLabel) {
            toast.querySelector('.sf-toast-action')?.addEventListener('click', () => dismiss(true));
        }
        setTimeout(() => dismiss(false), duration);
    });
}
