/**
 * Logger - Standardized logging utility for SmartFin
 * Provides consistent, filterable logging throughout the application
 */

export class Logger {
    static LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    static currentLevel = this.LOG_LEVELS.INFO;
    static enableTimestamps = true;
    static enablePrefix = true;
    static appPrefix = '[SmartFin]';

    /**
     * Set the minimum log level
     * @param {number} level - Minimum log level
     */
    static setLogLevel(level) {
        this.currentLevel = level;
    }

    /**
     * Enable or disable timestamps
     * @param {boolean} enabled - Enable timestamps
     */
    static setTimestamps(enabled) {
        this.enableTimestamps = enabled;
    }

    /**
     * Enable or disable prefix
     * @param {boolean} enabled - Enable prefix
     */
    static setPrefix(enabled) {
        this.enablePrefix = enabled;
    }

    /**
     * Set custom prefix
     * @param {string} prefix - Custom prefix
     */
    static setPrefix(prefix) {
        this.appPrefix = prefix;
    }

    /**
     * Get formatted timestamp
     * @returns {string} Formatted timestamp
     */
    static getTimestamp() {
        if (!this.enableTimestamps) return '';
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
        return `[${timestamp}]`;
    }

    /**
     * Get formatted prefix
     * @returns {string} Formatted prefix
     */
    static getPrefix() {
        if (!this.enablePrefix) return '';
        return this.appPrefix;
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {Array} args - Additional arguments
     * @returns {string} Formatted message
     */
    static formatMessage(level, category, message, args) {
        const timestamp = this.getTimestamp();
        const prefix = this.getPrefix();
        const categoryStr = category ? `[${category}]` : '';
        
        let formatted = `${timestamp} ${prefix} ${level} ${categoryStr} ${message}`;
        
        if (args && args.length > 0) {
            formatted += ' ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
        }
        
        return formatted;
    }

    /**
     * Log debug message
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    static debug(category, message, ...args) {
        if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
            const formatted = this.formatMessage('DEBUG', category, message, args);
            console.log(formatted);
        }
    }

    /**
     * Log info message
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    static info(category, message, ...args) {
        if (this.currentLevel <= this.LOG_LEVELS.INFO) {
            const formatted = this.formatMessage('INFO', category, message, args);
            console.log(formatted);
        }
    }

    /**
     * Log warning message
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    static warn(category, message, ...args) {
        if (this.currentLevel <= this.LOG_LEVELS.WARN) {
            const formatted = this.formatMessage('WARN', category, message, args);
            console.warn(formatted);
        }
    }

    /**
     * Log error message
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    static error(category, message, ...args) {
        if (this.currentLevel <= this.LOG_LEVELS.ERROR) {
            const formatted = this.formatMessage('ERROR', category, message, args);
            console.error(formatted);
        }
    }

    /**
     * Log success message (info level with green color)
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    static success(category, message, ...args) {
        if (this.currentLevel <= this.LOG_LEVELS.INFO) {
            const formatted = this.formatMessage('SUCCESS', category, message, args);
            console.log(`%c${formatted}`, 'color: #22c55e; font-weight: bold;');
        }
    }

    /**
     * Log module initialization
     * @param {string} moduleName - Name of the module
     */
    static moduleInit(moduleName) {
        this.info('MODULE', `Initialized: ${moduleName}`);
    }

    /**
     * Log function entry
     * @param {string} functionName - Name of the function
     * @param {Object} params - Function parameters
     */
    static functionEntry(functionName, params = {}) {
        this.debug('FUNCTION', `Entering: ${functionName}`, params);
    }

    /**
     * Log function exit
     * @param {string} functionName - Name of the function
     * @param {*} result - Function result
     */
    static functionExit(functionName, result) {
        this.debug('FUNCTION', `Exiting: ${functionName}`, result);
    }

    /**
     * Log API call
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     */
    static apiCall(method, endpoint, params = {}) {
        this.debug('API', `${method} ${endpoint}`, params);
    }

    /**
     * Log API response
     * @param {string} endpoint - API endpoint
     * @param {number} status - HTTP status
     * @param {Object} data - Response data
     */
    static apiResponse(endpoint, status, data = {}) {
        this.debug('API', `${endpoint} - Status: ${status}`, data);
    }

    /**
     * Log data operation
     * @param {string} operation - Operation type (READ, WRITE, UPDATE, DELETE)
     * @param {string} collection - Collection name
     * @param {string} id - Document ID
     */
    static dataOperation(operation, collection, id) {
        this.debug('DATA', `${operation} ${collection}/${id}`);
    }

    /**
     * Log user action
     * @param {string} action - User action
     * @param {Object} details - Action details
     */
    static userAction(action, details = {}) {
        this.info('USER', action, details);
    }

    /**
     * Log performance metric
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     * @param {string} unit - Unit of measurement
     */
    static performance(metric, value, unit = 'ms') {
        this.debug('PERF', `${metric}: ${value}${unit}`);
    }

    /**
     * Log validation error
     * @param {string} field - Field name
     * @param {string} error - Error message
     */
    static validationError(field, error) {
        this.warn('VALIDATION', `${field}: ${error}`);
    }

    /**
     * Log state change
     * @param {string} stateName - State name
     * @param {*} oldValue - Old value
     * @param {*} newValue - New value
     */
    static stateChange(stateName, oldValue, newValue) {
        this.debug('STATE', `${stateName}:`, { oldValue, newValue });
    }

    /**
     * Log UI event
     * @param {string} eventType - Event type
     * @param {string} element - Element identifier
     * @param {Object} details - Event details
     */
    static uiEvent(eventType, element, details = {}) {
        this.debug('UI', `${eventType} on ${element}`, details);
    }

    /**
     * Log error with stack trace
     * @param {string} category - Log category
     * @param {Error} error - Error object
     * @param {string} message - Error message
     */
    static errorWithStack(category, error, message) {
        if (this.currentLevel <= this.LOG_LEVELS.ERROR) {
            const formatted = this.formatMessage('ERROR', category, message);
            console.error(formatted);
            console.error(error);
        }
    }

    /**
     * Group related logs
     * @param {string} label - Group label
     */
    static group(label) {
        console.group(`${this.getPrefix()} ${label}`);
    }

    /**
     * End log group
     */
    static groupEnd() {
        console.groupEnd();
    }

    /**
     * Create a scoped logger for a specific category
     * @param {string} category - Default category for this logger
     * @returns {Object} Scoped logger
     */
    static createScoped(category) {
        return {
            debug: (message, ...args) => this.debug(category, message, ...args),
            info: (message, ...args) => this.info(category, message, ...args),
            warn: (message, ...args) => this.warn(category, message, ...args),
            error: (message, ...args) => this.error(category, message, ...args),
            success: (message, ...args) => this.success(category, message, ...args)
        };
    }
}

// Initialize with default settings
Logger.setLogLevel(Logger.LOG_LEVELS.INFO);
Logger.setTimestamps(true);
Logger.setPrefix(true);
