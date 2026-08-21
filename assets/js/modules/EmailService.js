/**
 * EmailService - Email Service Abstraction Layer
 * 
 * Provides a reusable email service abstraction that isolates the rest of the application
 * from EmailJS-specific implementation details.
 * 
 * Features:
 * - Rate limiting and abuse prevention
 * - Automatic retry with exponential backoff
 * - Error handling and user-friendly messages
 * - File attachment support
 * - Email delivery tracking
 * 
 * @module EmailService
 */

// EmailJS Configuration (inline to avoid module loading issues)
const EMAIL_CONFIG = {
    // EmailJS Service Configuration
    SERVICE_ID: 'smart_personal_finance',
    PUBLIC_KEY: 'ImSsUAPyw3LyjSQ8y',
    
    // Template IDs for different email types
    TEMPLATES: {
        CONTACT_US: 'smartfin_contact_us',
        DASHBOARD_REPORT: 'smartfin_contact_us', // Using same template for now
        BUG_REPORT: 'smartfin_contact_us'        // Using same template for now
    },
    
    // Email Recipients
    RECIPIENTS: {
        BUG_REPORTS: 'mrunaltemp01@gmail.com',
        ADMIN: 'mrunaltemp01@gmail.com'
    },
    
    // Rate Limiting Configuration (in milliseconds)
    RATE_LIMITS: {
        DASHBOARD_REPORT: 60000,      // 1 minute between dashboard reports
        BUG_REPORT: 120000,            // 2 minutes between bug reports
        GENERAL: 30000                 // 30 seconds for other emails
    },
    
    // Retry Configuration
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY_MS: 2000,                // 2 seconds between retries
        BACKOFF_MULTIPLIER: 2          // Exponential backoff
    },
    
    // File Upload Limits
    FILE_LIMITS: {
        MAX_SIZE_MB: 5,
        ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/plain']
    }
};

// Simple HTML sanitization function (inline to avoid circular dependencies)
function sanitizeInput(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
}

class EmailService {
    constructor() {
        this.initialized = false;
        this.lastEmailTimes = new Map(); // Track last email time by type for rate limiting
        this.bugIdCounter = this.loadBugIdCounter();
    }

    /**
     * Initialize EmailJS
     * Must be called before sending any emails
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Check if EmailJS is loaded
            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS SDK not loaded. Please include the EmailJS script in your HTML.');
            }

            // Initialize EmailJS with public key
            emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
            this.initialized = true;
            console.log('EmailJS initialized successfully');
            
            // Log to application logger if available
            if (typeof logger !== 'undefined') {
                logger.info('EmailJS initialized successfully');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            
            // Log to application logger if available
            if (typeof logger !== 'undefined') {
                logger.error('EmailJS initialization failed', { error: error.message });
            }
            
            return false;
        }
    }

    /**
     * Check rate limiting for a specific email type
     * @param {string} emailType - Type of email (e.g., 'DASHBOARD_REPORT', 'BUG_REPORT')
     * @returns {boolean} - True if allowed, false if rate limited
     */
    checkRateLimit(emailType) {
        const now = Date.now();
        const lastTime = this.lastEmailTimes.get(emailType) || 0;
        const rateLimit = EMAIL_CONFIG.RATE_LIMITS[emailType] || EMAIL_CONFIG.RATE_LIMITS.GENERAL;

        if (now - lastTime < rateLimit) {
            const waitTime = Math.ceil((rateLimit - (now - lastTime)) / 1000);
            return { allowed: false, waitTime };
        }

        return { allowed: true, waitTime: 0 };
    }

    /**
     * Update rate limit tracker
     * @param {string} emailType - Type of email
     */
    updateRateLimit(emailType) {
        this.lastEmailTimes.set(emailType, Date.now());
    }

    /**
     * Send email with retry logic
     * @param {string} templateId - EmailJS template ID
     * @param {object} templateParams - Template parameters
     * @param {number} attempt - Current attempt number (for retry)
     * @returns {Promise<object>} - Result object with success status and message
     */
    async sendEmailWithRetry(templateId, templateParams, attempt = 1) {
        try {
            const response = await emailjs.send(
                EMAIL_CONFIG.SERVICE_ID,
                templateId,
                templateParams
            );

            // Log success
            if (typeof logger !== 'undefined') {
                logger.info('Email sent successfully', { templateId, attempt });
            }

            return {
                success: true,
                message: 'Email sent successfully',
                response
            };
        } catch (error) {
            console.error(`Email send attempt ${attempt} failed:`, error);
            
            // Log error
            if (typeof logger !== 'undefined') {
                logger.error('Email send failed', { templateId, attempt, error: error.message });
            }

            // Retry logic
            if (attempt < EMAIL_CONFIG.RETRY.MAX_ATTEMPTS) {
                const delay = EMAIL_CONFIG.RETRY.DELAY_MS * Math.pow(EMAIL_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
                console.log(`Retrying in ${delay}ms...`);
                
                if (typeof logger !== 'undefined') {
                    logger.info('Retrying email send', { delay, nextAttempt: attempt + 1 });
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendEmailWithRetry(templateId, templateParams, attempt + 1);
            }

            return {
                success: false,
                message: this.getUserFriendlyError(error),
                error
            };
        }
    }

    /**
     * Convert technical errors to user-friendly messages
     * @param {Error} error - Error object
     * @returns {string} - User-friendly error message
     */
    getUserFriendlyError(error) {
        const errorText = error.text || error.message || '';

        if (errorText.includes('quota')) {
            return 'Email service quota exceeded. Please try again later or contact support.';
        }
        if (errorText.includes('network') || errorText.includes('offline')) {
            return 'Network error. Please check your connection and try again.';
        }
        if (errorText.includes('permission') || errorText.includes('unauthorized')) {
            return 'Email service authorization error. Please contact support.';
        }

        return 'Failed to send email. Please try again later.';
    }

    /**
     * Generate unique bug ID
     * Format: DEF-XXX (e.g., DEF-001, DEF-100)
     * @returns {string} - Unique bug ID
     */
    generateBugId() {
        this.bugIdCounter++;
        this.saveBugIdCounter();
        return `DEF-${String(this.bugIdCounter).padStart(3, '0')}`;
    }

    /**
     * Load bug ID counter from localStorage
     * @returns {number} - Current bug ID counter
     */
    loadBugIdCounter() {
        try {
            const stored = localStorage.getItem('smartfin_bug_id_counter');
            return stored ? parseInt(stored, 10) : 0;
        } catch (error) {
            console.error('Failed to load bug ID counter:', error);
            return 0;
        }
    }

    /**
     * Save bug ID counter to localStorage
     */
    saveBugIdCounter() {
        try {
            localStorage.setItem('smartfin_bug_id_counter', String(this.bugIdCounter));
        } catch (error) {
            console.error('Failed to save bug ID counter:', error);
        }
    }

    /**
     * Sanitize log data before sending
     * Removes sensitive information from logs
     * @param {string} logData - Raw log data
     * @returns {string} - Sanitized log data
     */
    sanitizeLogs(logData) {
        if (!logData) return '';

        let sanitized = logData;

        // Remove potential sensitive patterns
        const patterns = [
            /password[:\s]*[^\s,}]*/gi,
            /token[:\s]*[^\s,}]*/gi,
            /api[_-]?key[:\s]*[^\s,}]*/gi,
            /secret[:\s]*[^\s,}]*/gi,
            /auth[:\s]*[^\s,}]*/gi,
            /bearer\s+[^\s,}]*/gi,
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
            /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g // Credit card patterns
        ];

        patterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });

        return sanitized;
    }

    /**
     * Validate file attachment
     * @param {File|FileList} files - File or files to validate
     * @returns {object} - Validation result with success status and message
     */
    validateAttachment(files) {
        if (!files || files.length === 0) {
            return { valid: true };
        }

        const fileArray = Array.from(files);
        
        // Check file count
        if (fileArray.length > 2) {
            return {
                valid: false,
                message: 'Maximum 2 files allowed'
            };
        }

        // Validate each file
        for (const file of fileArray) {
            // Check file size
            const maxSizeBytes = EMAIL_CONFIG.FILE_LIMITS.MAX_SIZE_MB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
                return {
                    valid: false,
                    message: `File "${file.name}" exceeds ${EMAIL_CONFIG.FILE_LIMITS.MAX_SIZE_MB}MB limit`
                };
            }

            // Check file type
            if (!EMAIL_CONFIG.FILE_LIMITS.ALLOWED_TYPES.includes(file.type)) {
                return {
                    valid: false,
                    message: `File "${file.name}" type not allowed. Please use PNG, JPEG, GIF, PDF, or TXT files.`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Send Dashboard Report Email
     * @param {object} params - Email parameters
     * @param {string} params.userEmail - User's email address
     * @param {string} params.userName - User's name
     * @param {string} params.reportPeriod - Report period (e.g., "August 2026")
     * @param {string} params.reportData - Report data/summary
     * @returns {Promise<object>} - Result object
     */
    async sendDashboardReport({ userEmail, userName, reportPeriod, reportData }) {
        // Check initialization
        if (!this.initialized) {
            await this.initialize();
        }

        // Check rate limiting
        const rateCheck = this.checkRateLimit('DASHBOARD_REPORT');
        if (!rateCheck.allowed) {
            const message = `Please wait ${rateCheck.waitTime} seconds before sending another report.`;
            
            if (typeof logger !== 'undefined') {
                logger.warning('Dashboard report rate limited', { userEmail, waitTime: rateCheck.waitTime });
            }
            
            return {
                success: false,
                message
            };
        }

        // Prepare template parameters
        const templateParams = {
            to_email: userEmail,
            user_name: userName || 'User',
            subject: `SmartFin Dashboard Report - ${reportPeriod}`,
            message: `Dashboard Report for ${reportPeriod}\n\n${reportData}`,
            from_name: 'SmartFin',
            reply_to: EMAIL_CONFIG.RECIPIENTS.ADMIN
        };

        // Log attempt
        if (typeof logger !== 'undefined') {
            logger.info('Sending dashboard report email', { userEmail, reportPeriod });
        }

        // Send email
        const result = await this.sendEmailWithRetry(
            EMAIL_CONFIG.TEMPLATES.DASHBOARD_REPORT,
            templateParams
        );

        // Update rate limit if successful
        if (result.success) {
            this.updateRateLimit('DASHBOARD_REPORT');
            
            if (typeof logger !== 'undefined') {
                logger.info('Dashboard report email sent successfully', { userEmail, reportPeriod });
            }
        } else {
            if (typeof logger !== 'undefined') {
                logger.error('Dashboard report email failed', { userEmail, reportPeriod, error: result.message });
            }
        }

        return result;
    }

    /**
     * Collect application logs for bug report
     * @returns {string} - Sanitized log data
     */
    collectAppLogs() {
        try {
            // Try to get logs from the logger if available
            if (typeof logger !== 'undefined' && logger.getLogs) {
                const logs = logger.getLogs();
                return this.sanitizeLogs(JSON.stringify(logs, null, 2));
            }
            
            // Fallback: collect basic diagnostic info
            return JSON.stringify({
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    availWidth: window.screen.availWidth,
                    availHeight: window.screen.availHeight
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                localStorage: {
                    available: typeof Storage !== 'undefined',
                    used: JSON.stringify(localStorage).length
                }
            }, null, 2);
        } catch (error) {
            console.error('Failed to collect app logs:', error);
            return 'Error collecting logs: ' + error.message;
        }
    }

    /**
     * Send Bug Report Email
     * @param {object} params - Bug report parameters
     * @param {string} params.userEmail - User's email address
     * @param {string} params.title - Bug title
     * @param {string} params.description - Bug description
     * @param {string} params.stepsToReproduce - Steps to reproduce
     * @param {string} params.expectedBehavior - Expected behavior
     * @param {string} params.actualBehavior - Actual behavior
     * @param {string} params.browserInfo - Browser information
     * @param {string} params.appVersion - Application version
     * @param {File} params.screenshot - Optional screenshot file
     * @param {boolean} params.includeLogs - Whether to include logs (default: true)
     * @returns {Promise<object>} - Result object with bug ID
     */
    async sendBugReport({
        userEmail,
        title,
        description,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        browserInfo,
        appVersion,
        screenshot,
        includeLogs = true
    }) {
        // Check initialization
        if (!this.initialized) {
            await this.initialize();
        }

        // Check rate limiting
        const rateCheck = this.checkRateLimit('BUG_REPORT');
        if (!rateCheck.allowed) {
            const message = `Please wait ${rateCheck.waitTime} seconds before submitting another bug report.`;
            
            if (typeof logger !== 'undefined') {
                logger.warning('Bug report rate limited', { userEmail, waitTime: rateCheck.waitTime });
            }
            
            return {
                success: false,
                message
            };
        }

        // Sanitize user inputs
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedDescription = sanitizeInput(description);
        const sanitizedSteps = sanitizeInput(stepsToReproduce);
        const sanitizedExpected = sanitizeInput(expectedBehavior);
        const sanitizedActual = sanitizeInput(actualBehavior);

        // Validate screenshot if provided
        if (screenshot) {
            const validation = this.validateAttachment(screenshot);
            if (!validation.valid) {
                if (typeof logger !== 'undefined') {
                    logger.warning('Bug report attachment validation failed', { userEmail, error: validation.message });
                }
                
                return {
                    success: false,
                    message: validation.message
                };
            }
        }

        // Generate unique bug ID
        const bugId = this.generateBugId();

        // Collect logs if requested
        let logsSection = '';
        if (includeLogs) {
            const logs = this.collectAppLogs();
            logsSection = `
Application Logs:
-----------------
${logs}
            `.trim();
        }

        // Prepare bug report content
        const bugReport = `
BUG REPORT: ${bugId}
===================

Title: ${sanitizedTitle}

Description:
${sanitizedDescription}

Steps to Reproduce:
${sanitizedSteps || 'Not provided'}

Expected Behavior:
${sanitizedExpected || 'Not provided'}

Actual Behavior:
${sanitizedActual || 'Not provided'}

System Information:
-------------------
Browser: ${browserInfo}
App Version: ${appVersion}
Timestamp: ${new Date().toISOString()}
User Email: ${userEmail}

${logsSection}
        `.trim();

        // Prepare template parameters
        const templateParams = {
            to_email: EMAIL_CONFIG.RECIPIENTS.BUG_REPORTS,
            user_name: 'SmartFin Team',
            subject: `[${bugId}] ${sanitizedTitle}`,
            message: bugReport,
            from_name: userEmail,
            reply_to: userEmail
        };

        // Log attempt
        if (typeof logger !== 'undefined') {
            logger.info('Sending bug report email', { bugId, userEmail, title: sanitizedTitle });
        }

        // Send email
        const result = await this.sendEmailWithRetry(
            EMAIL_CONFIG.TEMPLATES.BUG_REPORT,
            templateParams
        );

        // Update rate limit if successful
        if (result.success) {
            this.updateRateLimit('BUG_REPORT');
            
            if (typeof logger !== 'undefined') {
                logger.info('Bug report email sent successfully', { bugId, userEmail, title: sanitizedTitle });
            }
        } else {
            if (typeof logger !== 'undefined') {
                logger.error('Bug report email failed', { bugId, userEmail, title: sanitizedTitle, error: result.message });
            }
        }

        // Add bug ID to result
        result.bugId = bugId;

        return result;
    }

    /**
     * Send Welcome Email
     * @param {object} params - Email parameters
     * @param {string} params.userEmail - User's email address
     * @param {string} params.userName - User's name
     * @returns {Promise<object>} - Result object
     */
    async sendWelcomeEmail({ userEmail, userName }) {
        if (!this.initialized) {
            await this.initialize();
        }

        const templateParams = {
            to_email: userEmail,
            user_name: userName || 'User',
            subject: 'Welcome to SmartFin!',
            message: `Welcome to SmartFin, ${userName}!\n\nThank you for joining us. We're excited to help you manage your finances better.`,
            from_name: 'SmartFin',
            reply_to: EMAIL_CONFIG.RECIPIENTS.ADMIN
        };

        return await this.sendEmailWithRetry(
            EMAIL_CONFIG.TEMPLATES.CONTACT_US,
            templateParams
        );
    }

    /**
     * Get email service status
     * @returns {object} - Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            bugIdCounter: this.bugIdCounter,
            rateLimits: Object.fromEntries(this.lastEmailTimes)
        };
    }
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;
