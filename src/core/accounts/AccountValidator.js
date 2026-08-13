/**
 * AccountValidator - Account validation logic
 * Pure functions with no side effects - platform independent
 */

export class AccountValidator {
    /**
     * Validate account data
     * @param {Object} accountData - Account data to validate
     * @returns {Object} Validation result
     */
    static validateAccount(accountData) {
        const errors = [];

        // Required fields
        if (!accountData.bankName || accountData.bankName.trim() === '') {
            errors.push('Bank/NBFC name is required');
        }

        // Validate balance
        if (accountData.balance !== undefined && accountData.balance !== null) {
            const balance = Number(accountData.balance);
            if (isNaN(balance)) {
                errors.push('Balance must be a valid number');
            } else if (balance < 0) {
                errors.push('Balance cannot be negative');
            }
        }

        // Validate credit card limit
        if (accountData.creditCardPresent === 'Yes') {
            if (accountData.creditCardLimit === undefined || accountData.creditCardLimit === null) {
                errors.push('Credit card limit is required when credit card is present');
            } else {
                const limit = Number(accountData.creditCardLimit);
                if (isNaN(limit)) {
                    errors.push('Credit card limit must be a valid number');
                } else if (limit < 0) {
                    errors.push('Credit card limit cannot be negative');
                }
            }
        }

        // Validate purpose
        const validPurposes = ['Salary', 'Expenditure', 'Saving', 'Savings', 'Investment', 'Loan', 'Others'];
        if (accountData.purpose && !validPurposes.includes(accountData.purpose)) {
            errors.push(`Purpose must be one of: ${validPurposes.join(', ')}`);
        }

        // Validate isPrimary
        const validYesNo = ['Yes', 'No', undefined, null, ''];
        if (accountData.isPrimary && !validYesNo.includes(accountData.isPrimary)) {
            errors.push('isPrimary must be "Yes" or "No"');
        }

        // Validate accountPresent
        if (accountData.accountPresent && !validYesNo.includes(accountData.accountPresent)) {
            errors.push('accountPresent must be "Yes" or "No"');
        }

        // Validate debitCardPresent
        if (accountData.debitCardPresent && !validYesNo.includes(accountData.debitCardPresent)) {
            errors.push('debitCardPresent must be "Yes" or "No"');
        }

        // Validate creditCardPresent
        if (accountData.creditCardPresent && !validYesNo.includes(accountData.creditCardPresent)) {
            errors.push('creditCardPresent must be "Yes" or "No"');
        }

        // Validate kycUpdated
        if (accountData.kycUpdated && !validYesNo.includes(accountData.kycUpdated)) {
            errors.push('kycUpdated must be "Yes" or "No"');
        }

        // Validate nomineeAdded
        if (accountData.nomineeAdded && !validYesNo.includes(accountData.nomineeAdded)) {
            errors.push('nomineeAdded must be "Yes" or "No"');
        }

        // Business rule: Primary account should have Expenditure purpose
        if (accountData.isPrimary === 'Yes' && accountData.purpose && accountData.purpose !== 'Expenditure') {
            // This is a warning, not an error (will be auto-corrected)
            // errors.push('Primary account must have Expenditure purpose');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate account for creation
     * @param {Object} accountData - Account data to validate
     * @returns {Object} Validation result
     */
    static validateForCreation(accountData) {
        const baseValidation = this.validateAccount(accountData);

        // Additional creation-specific validations
        if (!accountData.id) {
            baseValidation.errors.push('Account ID is required');
            baseValidation.isValid = false;
        }

        return baseValidation;
    }

    /**
     * Validate account for update
     * @param {Object} accountData - Account data to validate
     * @param {Object} existingAccount - Existing account data
     * @returns {Object} Validation result
     */
    static validateForUpdate(accountData, existingAccount) {
        const baseValidation = this.validateAccount(accountData);

        // Ensure ID matches
        if (accountData.id !== existingAccount.id) {
            baseValidation.errors.push('Account ID cannot be changed');
            baseValidation.isValid = false;
        }

        return baseValidation;
    }

    /**
     * Sanitize account data
     * @param {Object} accountData - Account data to sanitize
     * @returns {Object} Sanitized account data
     */
    static sanitizeAccountData(accountData) {
        const sanitized = { ...accountData };

        // Trim string fields
        if (sanitized.bankName) {
            sanitized.bankName = sanitized.bankName.trim();
        }

        if (sanitized.purposeOther) {
            sanitized.purposeOther = sanitized.purposeOther.trim();
        }

        // Convert numeric fields
        if (sanitized.balance !== undefined && sanitized.balance !== null) {
            sanitized.balance = Number(sanitized.balance) || 0;
        }

        if (sanitized.creditCardLimit !== undefined && sanitized.creditCardLimit !== null) {
            sanitized.creditCardLimit = Number(sanitized.creditCardLimit) || 0;
        }

        // Normalize purpose
        if (sanitized.purpose === 'Saving') {
            sanitized.purpose = 'Savings';
        }

        // Auto-correct primary account purpose
        if (sanitized.isPrimary === 'Yes') {
            sanitized.purpose = 'Expenditure';
        }

        // Set defaults
        if (!sanitized.isPrimary) {
            sanitized.isPrimary = 'No';
        }

        if (!sanitized.accountPresent) {
            sanitized.accountPresent = 'Yes';
        }

        if (!sanitized.debitCardPresent) {
            sanitized.debitCardPresent = 'No';
        }

        if (!sanitized.creditCardPresent) {
            sanitized.creditCardPresent = 'No';
        }

        if (!sanitized.kycUpdated) {
            sanitized.kycUpdated = 'No';
        }

        if (!sanitized.nomineeAdded) {
            sanitized.nomineeAdded = 'No';
        }

        return sanitized;
    }

    /**
     * Check if account is complete (has all recommended fields)
     * @param {Object} accountData - Account data to check
     * @returns {Object} Completeness check result
     */
    static checkCompleteness(accountData) {
        const missing = [];
        const warnings = [];

        if (!accountData.bankName) {
            missing.push('Bank name');
        }

        if (accountData.balance === undefined || accountData.balance === null) {
            warnings.push('Balance not set');
        }

        if (accountData.kycUpdated !== 'Yes') {
            warnings.push('KYC not updated');
        }

        if (accountData.nomineeAdded !== 'Yes') {
            warnings.push('Nominee not added');
        }

        if (accountData.creditCardPresent === 'Yes' && !accountData.creditCardLimit) {
            warnings.push('Credit card limit not set');
        }

        const completeness = Math.max(0, 100 - (missing.length * 25) - (warnings.length * 10));

        return {
            isComplete: missing.length === 0 && warnings.length === 0,
            completeness,
            missing,
            warnings
        };
    }
}
