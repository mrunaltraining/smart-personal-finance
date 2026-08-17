/**
 * AccountManager - Core account management logic
 * Pure functions with no side effects - platform independent
 */

export class AccountManager {
    /**
     * Find account by purpose
     * @param {Array} accounts - Array of account objects
     * @param {string} purpose - Purpose to search for
     * @returns {Object|null} Account object or null
     */
    static findAccountByPurpose(accounts, purpose) {
        if (!accounts || !Array.isArray(accounts)) return null;
        
        // Normalize purpose (handle both "Saving" and "Savings")
        const normalizedPurpose = purpose === 'Saving' ? 'Savings' : purpose;
        
        return accounts.find(account => {
            const accountPurpose = account.purpose === 'Saving' ? 'Savings' : account.purpose;
            return accountPurpose === normalizedPurpose && account.isPrimary !== 'Yes';
        }) || null;
    }

    /**
     * Find primary (expenditure) account
     * @param {Array} accounts - Array of account objects
     * @returns {Object|null} Primary account or null
     */
    static findPrimaryAccount(accounts) {
        if (!accounts || !Array.isArray(accounts)) return null;
        return accounts.find(account => account.isPrimary === 'Yes') || null;
    }

    /**
     * Find salary account
     * @param {Array} accounts - Array of account objects
     * @returns {Object|null} Salary account or null
     */
    static findSalaryAccount(accounts) {
        return this.findAccountByPurpose(accounts, 'Salary');
    }

    /**
     * Find saving account
     * @param {Array} accounts - Array of account objects
     * @returns {Object|null} Saving account or null
     */
    static findSavingAccount(accounts) {
        return this.findAccountByPurpose(accounts, 'Savings');
    }

    /**
     * Find investment account
     * @param {Array} accounts - Array of account objects
     * @returns {Object|null} Investment account or null
     */
    static findInvestmentAccount(accounts) {
        return this.findAccountByPurpose(accounts, 'Investment');
    }

    /**
     * Get all special accounts (Primary, Salary, Saving, Investment)
     * @param {Array} accounts - Array of account objects
     * @returns {Object} Object with all special accounts
     */
    static getSpecialAccounts(accounts) {
        return {
            primary: this.findPrimaryAccount(accounts),
            salary: this.findSalaryAccount(accounts),
            saving: this.findSavingAccount(accounts),
            investment: this.findInvestmentAccount(accounts)
        };
    }

    /**
     * Calculate total balance across all accounts
     * @param {Array} accounts - Array of account objects
     * @returns {number} Total balance
     */
    static calculateTotalBalance(accounts) {
        if (!accounts || !Array.isArray(accounts)) return 0;
        
        return accounts.reduce((total, account) => {
            const balance = Number(account.balance || 0);
            return total + balance;
        }, 0);
    }

    /**
     * Calculate total credit card limit
     * @param {Array} accounts - Array of account objects
     * @returns {number} Total credit card limit
     */
    static calculateTotalCreditLimit(accounts) {
        if (!accounts || !Array.isArray(accounts)) return 0;
        
        return accounts.reduce((total, account) => {
            if (account.creditCardPresent === 'Yes') {
                const limit = Number(account.creditCardLimit || 0);
                return total + limit;
            }
            return total;
        }, 0);
    }

    /**
     * Get accounts by purpose
     * @param {Array} accounts - Array of account objects
     * @param {string} purpose - Purpose to filter by
     * @returns {Array} Filtered accounts
     */
    static getAccountsByPurpose(accounts, purpose) {
        if (!accounts || !Array.isArray(accounts)) return [];
        
        const normalizedPurpose = purpose === 'Saving' ? 'Savings' : purpose;
        
        return accounts.filter(account => {
            const accountPurpose = account.purpose === 'Saving' ? 'Savings' : account.purpose;
            return accountPurpose === normalizedPurpose;
        });
    }

    /**
     * Validate account constraints
     * @param {Array} existingAccounts - Existing accounts
     * @param {Object} newAccount - New account to validate
     * @returns {Object} Validation result
     */
    static validateAccountConstraints(existingAccounts, newAccount) {
        const errors = [];

        // Only one primary account allowed
        if (newAccount.isPrimary === 'Yes') {
            const existingPrimary = this.findPrimaryAccount(existingAccounts);
            if (existingPrimary && existingPrimary.id !== newAccount.id) {
                errors.push('Only one Primary account is allowed. Please update the existing Primary account instead.');
            }
        }

        // Only one salary account allowed
        if (newAccount.purpose === 'Salary') {
            const existingSalary = this.findSalaryAccount(existingAccounts);
            if (existingSalary && existingSalary.id !== newAccount.id) {
                errors.push('Only one Salary account is allowed. Please update the existing Salary account instead.');
            }
        }

        // Only one saving account allowed
        if (newAccount.purpose === 'Saving' || newAccount.purpose === 'Savings') {
            const existingSaving = this.findSavingAccount(existingAccounts);
            if (existingSaving && existingSaving.id !== newAccount.id) {
                errors.push('Only one Saving account is allowed. Please update the existing Saving account instead.');
            }
        }

        // Only one investment account allowed
        if (newAccount.purpose === 'Investment') {
            const existingInvestment = this.findInvestmentAccount(existingAccounts);
            if (existingInvestment && existingInvestment.id !== newAccount.id) {
                errors.push('Only one Investment account is allowed. Please update the existing Investment account instead.');
            }
        }

        // Primary account must have purpose = Expenditure
        if (newAccount.isPrimary === 'Yes' && newAccount.purpose !== 'Expenditure') {
            // This is auto-corrected, not an error
            newAccount.purpose = 'Expenditure';
        }

        return {
            isValid: errors.length === 0,
            errors,
            account: newAccount
        };
    }

    /**
     * Check onboarding completion status
     * @param {Array} accounts - Array of account objects
     * @returns {Object} Onboarding status
     */
    static checkOnboardingStatus(accounts) {
        const primary = this.findPrimaryAccount(accounts);
        const salary = this.findSalaryAccount(accounts);

        const isComplete = Boolean(primary && salary);

        return {
            isComplete,
            hasPrimary: Boolean(primary),
            hasSalary: Boolean(salary),
            missingAccounts: [
                !primary && 'Primary (Expenditure)',
                !salary && 'Salary'
            ].filter(Boolean)
        };
    }

    /**
     * Get account summary statistics
     * @param {Array} accounts - Array of account objects
     * @returns {Object} Account statistics
     */
    static getAccountStatistics(accounts) {
        if (!accounts || !Array.isArray(accounts)) {
            return {
                totalAccounts: 0,
                totalBalance: 0,
                totalCreditLimit: 0,
                accountsWithDebitCard: 0,
                accountsWithCreditCard: 0,
                accountsWithKYC: 0,
                accountsWithNominee: 0
            };
        }

        return {
            totalAccounts: accounts.length,
            totalBalance: this.calculateTotalBalance(accounts),
            totalCreditLimit: this.calculateTotalCreditLimit(accounts),
            accountsWithDebitCard: accounts.filter(a => a.debitCardPresent === 'Yes').length,
            accountsWithCreditCard: accounts.filter(a => a.creditCardPresent === 'Yes').length,
            accountsWithKYC: accounts.filter(a => a.kycUpdated === 'Yes').length,
            accountsWithNominee: accounts.filter(a => a.nomineeAdded === 'Yes').length
        };
    }

    /**
     * Get accounts breakdown by purpose
     * @param {Array} accounts - Array of account objects
     * @returns {Object} Breakdown by purpose
     */
    static getAccountsBreakdownByPurpose(accounts) {
        if (!accounts || !Array.isArray(accounts)) return {};

        const breakdown = {};

        accounts.forEach(account => {
            const purpose = account.purpose || 'Others';
            if (!breakdown[purpose]) {
                breakdown[purpose] = {
                    count: 0,
                    totalBalance: 0,
                    accounts: []
                };
            }

            breakdown[purpose].count++;
            breakdown[purpose].totalBalance += Number(account.balance || 0);
            breakdown[purpose].accounts.push(account);
        });

        return breakdown;
    }

    /**
     * Sort accounts by criteria
     * @param {Array} accounts - Array of account objects
     * @param {string} sortBy - Field to sort by
     * @param {string} direction - 'asc' or 'desc'
     * @returns {Array} Sorted accounts
     */
    static sortAccounts(accounts, sortBy = 'bankName', direction = 'asc') {
        if (!accounts || !Array.isArray(accounts)) return [];

        const sorted = [...accounts].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle numeric fields
            if (sortBy === 'balance' || sortBy === 'creditCardLimit') {
                aVal = Number(aVal || 0);
                bVal = Number(bVal || 0);
            }

            // Handle string fields
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }

    /**
     * Filter accounts by criteria
     * @param {Array} accounts - Array of account objects
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered accounts
     */
    static filterAccounts(accounts, filters = {}) {
        if (!accounts || !Array.isArray(accounts)) return [];

        return accounts.filter(account => {
            // Filter by purpose
            if (filters.purpose && account.purpose !== filters.purpose) {
                return false;
            }

            // Filter by primary status
            if (filters.isPrimary !== undefined && account.isPrimary !== filters.isPrimary) {
                return false;
            }

            // Filter by credit card presence
            if (filters.hasCreditCard !== undefined) {
                const hasCreditCard = account.creditCardPresent === 'Yes';
                if (hasCreditCard !== filters.hasCreditCard) {
                    return false;
                }
            }

            // Filter by minimum balance
            if (filters.minBalance !== undefined) {
                const balance = Number(account.balance || 0);
                if (balance < filters.minBalance) {
                    return false;
                }
            }

            return true;
        });
    }
}
