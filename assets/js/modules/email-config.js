/**
 * EmailJS Configuration
 * 
 * Configuration for EmailJS email service integration.
 * Uses environment-safe configuration that can be exposed to the browser.
 * 
 * SECURITY NOTE: These values are safe for client-side use as per EmailJS documentation.
 * Never expose private API secrets, database credentials, or authentication tokens here.
 */

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

// Freeze configuration to prevent accidental modifications
Object.freeze(EMAIL_CONFIG);
Object.freeze(EMAIL_CONFIG.TEMPLATES);
Object.freeze(EMAIL_CONFIG.RECIPIENTS);
Object.freeze(EMAIL_CONFIG.RATE_LIMITS);
Object.freeze(EMAIL_CONFIG.RETRY);
Object.freeze(EMAIL_CONFIG.FILE_LIMITS);

export default EMAIL_CONFIG;
