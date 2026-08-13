// ── SmartFin Constants & Configuration ───────────────────────────────────────
// Extracted from app.js for maintainability

// ── Timing Constants ─────────────────────────────────────────────────────────
export const SAVE_DEBOUNCE_MS = 600;
export const PANEL_CLOSE_ANIMATION_MS = 280;
export const SAVE_RETRY_DELAY_MS = 2000;
export const LOGS_REFRESH_INTERVAL_MS = 10000;
export const LOG_FLUSH_INTERVAL_MS = 30000;
export const OUTSIDE_CLICK_DELAY_MS = 10;
export const UNDO_TOAST_DURATION_MS = 5000;
export const SEARCH_DEBOUNCE_MS = 300;
export const PIE_CHART_DEBOUNCE_MS = 500;

// ── Queue/Limit Constants ────────────────────────────────────────────────────
export const MAX_LOG_QUEUE_SIZE = 100;
export const MAX_LOCAL_LOGS = 1000;
export const LOG_QUERY_LIMIT = 500;

// ── UI/Layout Constants ──────────────────────────────────────────────────────
export const MOBILE_BREAKPOINT_PX = 768;

// ── Financial/Domain Constants ───────────────────────────────────────────────
export const DEFAULT_INFLATION_RATE = 0.06;
export const DEFAULT_RETIREMENT_AGE = 70;
export const DEFAULT_CURRENT_AGE = 30;
export const MISMATCH_TOLERANCE = 1;
export const DAYS_PER_YEAR = 365.25;

// ── Color Constants ──────────────────────────────────────────────────────────
export const COLOR_POSITIVE = '#22c55e';
export const COLOR_NEGATIVE = '#ef4444';
export const COLOR_WARNING = '#eab308';

// ── Frequency Helpers ────────────────────────────────────────────────────────
export const FREQ_DIVISORS = { Monthly: 1, Quarterly: 3, 'Semi-Annual': 6, Annual: 12 };

export function toMonthlyAmount(amount, frequency) {
    return amount / (FREQ_DIVISORS[frequency] || 1);
}

export function getPeriodsPerYear(frequency) {
    const map = { Monthly: 12, Quarterly: 4, 'Semi-Annual': 2, Annual: 1 };
    return map[frequency] || 12;
}
