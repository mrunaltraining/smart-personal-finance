/**
 * HTML Utilities Module
 * 
 * Provides utility functions for handling HTML entity encoding/decoding
 * to prevent XSS attacks and ensure proper data rendering.
 */

/**
 * Escape HTML entities to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };
    return String(text).replace(/[&<>"'/]/g, char => map[char]);
}

/**
 * Unescape HTML entities
 * @param {string} text - Text to unescape
 * @returns {string} - Unescaped text
 */
export function unescapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/',
        '&#x27;': "'",
        '&apos;': "'"
    };
    return String(text).replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x27;|&apos;/g, entity => map[entity]);
}

/**
 * Sanitize user input for safe storage and display
 * @param {string} text - User input to sanitize
 * @returns {string} - Sanitized text
 */
export function sanitizeInput(text) {
    if (text === null || text === undefined) return '';
    // Remove any script tags and potentially dangerous content
    let sanitized = String(text)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .replace(/javascript:/gi, ''); // Remove javascript: protocol
    
    return escapeHtml(sanitized);
}

/**
 * Prepare data for storage (escape HTML entities)
 * @param {object} data - Data object to prepare
 * @returns {object} - Prepared data object
 */
export function prepareDataForStorage(data) {
    if (!data || typeof data !== 'object') return data;
    
    const prepared = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            if (typeof value === 'string') {
                prepared[key] = escapeHtml(value);
            } else if (Array.isArray(value)) {
                prepared[key] = value.map(item => 
                    typeof item === 'string' ? escapeHtml(item) : prepareDataForStorage(item)
                );
            } else if (typeof value === 'object' && value !== null) {
                prepared[key] = prepareDataForStorage(value);
            } else {
                prepared[key] = value;
            }
        }
    }
    return prepared;
}

/**
 * Prepare data for display (unescape HTML entities)
 * @param {object} data - Data object to prepare
 * @returns {object} - Prepared data object
 */
export function prepareDataForDisplay(data) {
    if (!data || typeof data !== 'object') return data;
    
    const prepared = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            if (typeof value === 'string') {
                prepared[key] = unescapeHtml(value);
            } else if (Array.isArray(value)) {
                prepared[key] = value.map(item => 
                    typeof item === 'string' ? unescapeHtml(item) : prepareDataForDisplay(item)
                );
            } else if (typeof value === 'object' && value !== null) {
                prepared[key] = prepareDataForDisplay(value);
            } else {
                prepared[key] = value;
            }
        }
    }
    return prepared;
}

/**
 * Safe HTML rendering for text content
 * @param {string} text - Text to render safely
 * @returns {string} - Safe HTML string
 */
export function safeHtml(text) {
    if (text === null || text === undefined) return '';
    return escapeHtml(String(text));
}

export default {
    escapeHtml,
    unescapeHtml,
    sanitizeInput,
    prepareDataForStorage,
    prepareDataForDisplay,
    safeHtml
};
