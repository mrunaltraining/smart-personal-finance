/**
 * CurrencyFormatter - Utility for formatting currency values
 * Pure functions with no side effects - platform independent
 */

export class CurrencyFormatter {
    /**
     * Format number as Indian currency
     * @param {number} amount - Amount to format
     * @param {Object} options - Formatting options
     * @param {boolean} options.showSymbol - Show ₹ symbol (default: true)
     * @param {number} options.decimals - Number of decimal places (default: 0)
     * @param {boolean} options.compact - Use compact format (L, Cr) (default: false)
     * @returns {string} Formatted currency string
     */
    static format(amount, options = {}) {
        const {
            showSymbol = true,
            decimals = 0,
            compact = false
        } = options;

        if (amount === null || amount === undefined || isNaN(amount)) {
            return showSymbol ? '₹0' : '0';
        }

        if (compact && Math.abs(amount) >= 100000) {
            return this.formatCompact(amount, showSymbol);
        }

        const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);

        return showSymbol ? `₹${formatted}` : formatted;
    }

    /**
     * Format in compact form (L, Cr)
     * @param {number} amount - Amount to format
     * @param {boolean} showSymbol - Show ₹ symbol
     * @returns {string} Formatted compact string
     */
    static formatCompact(amount, showSymbol = true) {
        const absAmount = Math.abs(amount);
        let value, suffix;

        if (absAmount >= 10000000) { // 1 Crore
            value = amount / 10000000;
            suffix = 'Cr';
        } else if (absAmount >= 100000) { // 1 Lakh
            value = amount / 100000;
            suffix = 'L';
        } else {
            return this.format(amount, { showSymbol, decimals: 0 });
        }

        const formatted = value.toFixed(2);
        return showSymbol ? `₹${formatted}${suffix}` : `${formatted}${suffix}`;
    }

    /**
     * Parse formatted currency string to number
     * @param {string} str - Formatted currency string
     * @returns {number} Parsed number
     */
    static parse(str) {
        if (typeof str === 'number') return str;
        if (!str) return 0;

        // Remove currency symbol and commas
        const cleaned = str.replace(/[₹,]/g, '').trim();

        // Handle compact format
        if (cleaned.endsWith('Cr')) {
            return parseFloat(cleaned.replace('Cr', '')) * 10000000;
        } else if (cleaned.endsWith('L')) {
            return parseFloat(cleaned.replace('L', '')) * 100000;
        }

        return parseFloat(cleaned) || 0;
    }

    /**
     * Format as percentage
     * @param {number} value - Value to format (e.g., 0.15 for 15%)
     * @param {number} decimals - Number of decimal places (default: 2)
     * @returns {string} Formatted percentage string
     */
    static formatPercentage(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return '0%';
        }
        return `${(value * 100).toFixed(decimals)}%`;
    }

    /**
     * Format with sign (+ or -)
     * @param {number} amount - Amount to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted string with sign
     */
    static formatWithSign(amount, options = {}) {
        const formatted = this.format(Math.abs(amount), options);
        if (amount > 0) {
            return `+${formatted}`;
        } else if (amount < 0) {
            return `-${formatted}`;
        }
        return formatted;
    }

    /**
     * Format as short form (K, M, B)
     * @param {number} amount - Amount to format
     * @param {boolean} showSymbol - Show ₹ symbol
     * @returns {string} Formatted short string
     */
    static formatShort(amount, showSymbol = true) {
        const absAmount = Math.abs(amount);
        let value, suffix;

        if (absAmount >= 1000000000) { // 1 Billion
            value = amount / 1000000000;
            suffix = 'B';
        } else if (absAmount >= 1000000) { // 1 Million
            value = amount / 1000000;
            suffix = 'M';
        } else if (absAmount >= 1000) { // 1 Thousand
            value = amount / 1000;
            suffix = 'K';
        } else {
            return this.format(amount, { showSymbol, decimals: 0 });
        }

        const formatted = value.toFixed(1);
        return showSymbol ? `₹${formatted}${suffix}` : `${formatted}${suffix}`;
    }
}
