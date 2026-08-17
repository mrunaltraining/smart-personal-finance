/**
 * BudgetCalculator - Core budget calculation logic
 * Pure functions with no side effects - platform independent
 */

import { FrequencyConverter } from '../utils/FrequencyConverter.js';

export class BudgetCalculator {
    /**
     * Calculate fixed monthly outflow from outflow entries
     * @param {Array} outflowEntries - Array of outflow entries
     * @returns {Object} Fixed outflow breakdown by type
     */
    static calculateFixedMonthlyOutflow(outflowEntries) {
        const autoDebitByType = {
            Liability: 0,
            Insurance: 0,
            Savings: 0,
            Expenditure: 0,
            Investment: 0,
            Others: 0
        };

        outflowEntries.forEach(entry => {
            const amount = Number(entry.amount || 0);
            if (amount <= 0) return;

            const frequency = entry.frequency || 'Monthly';
            const monthlyAmount = FrequencyConverter.toMonthly(amount, frequency);
            if (monthlyAmount <= 0) return;

            // Normalize type
            let type = entry.type || 'Expenditure';
            if (type === 'Saving') type = 'Savings';

            autoDebitByType[type] = (autoDebitByType[type] || 0) + monthlyAmount;
        });

        const total = Object.values(autoDebitByType).reduce((sum, val) => sum + val, 0);

        return {
            byType: autoDebitByType,
            total,
            breakdown: this.getOutflowBreakdown(outflowEntries)
        };
    }

    /**
     * Get detailed breakdown of outflow entries by type
     * @param {Array} outflowEntries - Array of outflow entries
     * @returns {Object} Breakdown by type with individual items
     */
    static getOutflowBreakdown(outflowEntries) {
        const itemsByType = {};

        outflowEntries.forEach(entry => {
            const amount = Number(entry.amount || 0);
            if (amount <= 0) return;

            const frequency = entry.frequency || 'Monthly';
            const monthlyAmount = FrequencyConverter.toMonthly(amount, frequency);
            if (monthlyAmount <= 0) return;

            let type = entry.type || 'Expenditure';
            if (type === 'Saving') type = 'Savings';

            if (!itemsByType[type]) itemsByType[type] = [];

            itemsByType[type].push({
                name: entry.name,
                amount: monthlyAmount,
                originalAmount: amount,
                frequency: frequency
            });
        });

        return itemsByType;
    }

    /**
     * Calculate transfer amount (income - fixed outflow)
     * @param {number} primaryIncome - Primary income amount
     * @param {number} fixedMonthlyOutflow - Fixed monthly outflow
     * @returns {number} Transfer amount
     */
    static calculateTransferAmount(primaryIncome, fixedMonthlyOutflow) {
        return primaryIncome - fixedMonthlyOutflow;
    }

    /**
     * Calculate variable expenditure
     * @param {number} totalFunded - Total funded amount
     * @param {number} currentBalance - Current balance
     * @returns {number} Variable expenditure
     */
    static calculateVariableExpenditure(totalFunded, currentBalance) {
        return Math.max(totalFunded - currentBalance, 0);
    }

    /**
     * Sum numeric values in a category object (excludes description fields)
     * @param {Object} category - Category object
     * @returns {number} Sum of numeric values
     */
    static sumCategoryNumericValues(category) {
        if (!category) return 0;

        return Object.entries(category).reduce((sum, [key, value]) => {
            // Skip description fields (ending with 'Desc')
            if (key.endsWith('Desc')) return sum;
            // Only sum numeric values
            if (typeof value === 'number') return sum + value;
            return sum;
        }, 0);
    }

    /**
     * Calculate monthly budget summary
     * @param {Object} monthData - Monthly budget data
     * @param {Array} outflowEntries - Outflow entries
     * @param {Object} accounts - User accounts
     * @returns {Object} Complete budget summary
     */
    static calculateMonthlySummary(monthData, outflowEntries, accounts = {}) {
        // Calculate category totals
        const inflowTotal = this.sumCategoryNumericValues(monthData.inflow);
        const outflowTotal = this.sumCategoryNumericValues(monthData.outflow);
        const investingTotal = this.sumCategoryNumericValues(monthData.investing);

        // Calculate fixed monthly outflow
        const fixedOutflow = this.calculateFixedMonthlyOutflow(outflowEntries);

        // Calculate spendable amount (excluding borrowing)
        const borrowing = Number(monthData.inflow?.borrowing || 0);
        const inflowWithoutBorrowing = inflowTotal - borrowing;
        const spendable = inflowWithoutBorrowing - fixedOutflow.total;

        // Calculate tracked expenses
        const variableExp = Number(monthData.outflow?.variableExpenditure || 0);
        const creditCardOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
        const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
        const actualCCOutstanding = creditCardOutstanding + midMonthCC;

        // On-demand items
        const ondemandSaving = Number(monthData.investing?.onetimeSaving || 0);
        const ondemandInvestment = Number(monthData.investing?.onetimeInvestment || 0);
        const ondemandExpenditure = Number(monthData.investing?.ondemandExpenditure || 0);
        const ondemandLiability = Number(monthData.investing?.ondemandLiability || 0);
        const totalOndemand = ondemandSaving + ondemandInvestment + ondemandExpenditure + ondemandLiability;

        // Actual variable expenses (excluding on-demand items)
        const actualVariableExp = variableExp - totalOndemand;
        const variableExpenses = actualVariableExp + actualCCOutstanding;
        const totalAllocated = variableExpenses + totalOndemand;

        // Budget balance
        const budgetBalance = spendable - totalAllocated;

        // Transfer calculation
        const primaryIncome = Number(monthData.inflow?.primaryIncome || 0);
        const transferAmount = this.calculateTransferAmount(primaryIncome, fixedOutflow.total);

        return {
            // Category totals
            inflowTotal,
            outflowTotal,
            investingTotal,

            // Fixed outflow
            fixedMonthlyOutflow: fixedOutflow.total,
            autoDebitByType: fixedOutflow.byType,
            outflowBreakdown: fixedOutflow.breakdown,

            // Spendable
            borrowing,
            inflowWithoutBorrowing,
            spendable,

            // Expenses
            variableExpenditure: variableExp,
            actualVariableExp,
            creditCardOutstanding: actualCCOutstanding,
            ondemandItems: {
                saving: ondemandSaving,
                investment: ondemandInvestment,
                expenditure: ondemandExpenditure,
                liability: ondemandLiability,
                total: totalOndemand
            },
            variableExpenses,
            totalAllocated,

            // Budget status
            budgetBalance,
            budgetStatus: this.getBudgetStatus(budgetBalance, inflowTotal, fixedOutflow.total),

            // Transfer
            primaryIncome,
            transferAmount,

            // Accounts
            accounts: this.getAccountSummary(accounts)
        };
    }

    /**
     * Get budget status based on balance
     * @param {number} budgetBalance - Budget balance
     * @param {number} inflowTotal - Total inflow
     * @param {number} fixedOutflow - Fixed outflow
     * @returns {Object} Budget status
     */
    static getBudgetStatus(budgetBalance, inflowTotal, fixedOutflow) {
        // No data entered yet
        if (inflowTotal === 0 && fixedOutflow === 0) {
            return {
                type: 'neutral',
                message: '',
                color: null
            };
        }

        // No income entered
        if (inflowTotal === 0) {
            return {
                type: 'neutral',
                message: 'Enter your Primary Income to see budget status',
                color: null
            };
        }

        // Calculate status
        if (budgetBalance > 0) {
            return {
                type: 'positive',
                message: `Budget Surplus: +₹${budgetBalance.toLocaleString('en-IN')} remaining`,
                color: '#22c55e'
            };
        } else if (budgetBalance < 0) {
            return {
                type: 'negative',
                message: `Over Budget: ₹${Math.abs(budgetBalance).toLocaleString('en-IN')} overspent`,
                color: '#ef4444'
            };
        } else {
            return {
                type: 'neutral',
                message: 'Budget Balanced — all income allocated',
                color: null
            };
        }
    }

    /**
     * Get account summary
     * @param {Object} accounts - Accounts object
     * @returns {Object} Account summary
     */
    static getAccountSummary(accounts) {
        return {
            salary: accounts.salary || null,
            expenditure: accounts.expenditure || null,
            saving: accounts.saving || null,
            investment: accounts.investment || null,
            hasSalary: Boolean(accounts.salary),
            hasExpenditure: Boolean(accounts.expenditure),
            hasSaving: Boolean(accounts.saving),
            hasInvestment: Boolean(accounts.investment)
        };
    }

    /**
     * Validate transfer prerequisites
     * @param {Object} accounts - User accounts
     * @param {Object} monthData - Monthly budget data
     * @returns {Object} Validation result
     */
    static validateTransferPrerequisites(accounts, monthData) {
        const errors = [];

        if (!accounts.salary) {
            errors.push('Salary account not found. Please add a Salary account first.');
        }

        if (!accounts.expenditure) {
            errors.push('Expenditure account not found. Please add a Primary account first.');
        }

        const primaryIncome = Number(monthData.inflow?.primaryIncome || 0);
        if (primaryIncome <= 0) {
            errors.push('Primary income must be greater than 0.');
        }

        if (monthData._transferDone) {
            errors.push('Transfer already executed for this month.');
        }

        if (monthData._monthClosed) {
            errors.push('Month is closed. Cannot execute transfer.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Calculate total funded amount for variable expenditure calculation
     * @param {Object} monthData - Monthly budget data
     * @param {number} expenditureBalance - Current expenditure balance
     * @returns {Object} Funded calculation
     */
    static calculateTotalFunded(monthData, expenditureBalance) {
        const initialBalance = Number(monthData._initialBalance || 0);
        const carryForward = Number(monthData._carryForwardDone || 0);
        const transferDone = Number(monthData._transferDone || 0);

        // If initialBalance is set (post-transfer), use it
        // Otherwise, calculate from transfer + carry forward
        const totalFunded = initialBalance > 0
            ? initialBalance
            : transferDone + carryForward;

        const variableExpenditure = this.calculateVariableExpenditure(totalFunded, expenditureBalance);

        return {
            initialBalance,
            carryForward,
            transferDone,
            totalFunded,
            currentBalance: expenditureBalance,
            variableExpenditure
        };
    }

    /**
     * Check for transfer mismatch (when outflows change after transfer)
     * @param {number} transferOutflowSnapshot - Snapshot at transfer time
     * @param {number} currentFixedOutflow - Current fixed outflow
     * @param {number} tolerance - Tolerance for mismatch (default: 1)
     * @returns {Object} Mismatch check result
     */
    static checkTransferMismatch(transferOutflowSnapshot, currentFixedOutflow, tolerance = 1) {
        if (!transferOutflowSnapshot) {
            return { hasMismatch: false };
        }

        const diff = Math.abs(transferOutflowSnapshot - currentFixedOutflow);
        const hasMismatch = diff > tolerance;

        return {
            hasMismatch,
            difference: diff,
            snapshotOutflow: transferOutflowSnapshot,
            currentOutflow: currentFixedOutflow
        };
    }
}
