/**
 * Unit tests for BudgetCalculator
 * Run in browser console or with Jest
 */

import { BudgetCalculator } from '../../../src/core/budget/BudgetCalculator.js';

// Simple test runner for browser
function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        return true;
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  ${error.message}`);
        return false;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toBeCloseTo(expected, precision = 2) {
            const diff = Math.abs(actual - expected);
            const tolerance = Math.pow(10, -precision);
            if (diff > tolerance) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toEqual(expected) {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
            }
        },
        toHaveLength(expected) {
            if (actual.length !== expected) {
                throw new Error(`Expected length ${expected}, got ${actual.length}`);
            }
        }
    };
}

// Tests
export function runBudgetCalculatorTests() {
    console.log('Running BudgetCalculator Tests...\n');
    let passed = 0;
    let total = 0;

    // calculateFixedMonthlyOutflow tests
    total++; if (test('calculateFixedMonthlyOutflow: Empty array', () => {
        const result = BudgetCalculator.calculateFixedMonthlyOutflow([]);
        expect(result.total).toBe(0);
    })) passed++;

    total++; if (test('calculateFixedMonthlyOutflow: Monthly outflows', () => {
        const outflows = [
            { name: 'Rent', amount: 15000, frequency: 'Monthly', type: 'Expenditure' },
            { name: 'Insurance', amount: 2000, frequency: 'Monthly', type: 'Insurance' }
        ];
        const result = BudgetCalculator.calculateFixedMonthlyOutflow(outflows);
        expect(result.total).toBe(17000);
        expect(result.byType.Expenditure).toBe(15000);
        expect(result.byType.Insurance).toBe(2000);
    })) passed++;

    total++; if (test('calculateFixedMonthlyOutflow: Mixed frequencies', () => {
        const outflows = [
            { name: 'Monthly', amount: 12000, frequency: 'Monthly', type: 'Expenditure' },
            { name: 'Quarterly', amount: 6000, frequency: 'Quarterly', type: 'Savings' },
            { name: 'Annual', amount: 12000, frequency: 'Annual', type: 'Insurance' }
        ];
        const result = BudgetCalculator.calculateFixedMonthlyOutflow(outflows);
        // 12000 + (6000/3) + (12000/12) = 12000 + 2000 + 1000 = 15000
        expect(result.total).toBeCloseTo(15000);
    })) passed++;

    total++; if (test('calculateFixedMonthlyOutflow: Excludes One-Time', () => {
        const outflows = [
            { name: 'Monthly', amount: 10000, frequency: 'Monthly', type: 'Expenditure' },
            { name: 'One-Time', amount: 5000, frequency: 'One-Time', type: 'Expenditure' }
        ];
        const result = BudgetCalculator.calculateFixedMonthlyOutflow(outflows);
        expect(result.total).toBe(10000);
    })) passed++;

    total++; if (test('calculateFixedMonthlyOutflow: Normalizes Saving to Savings', () => {
        const outflows = [
            { name: 'SIP', amount: 5000, frequency: 'Monthly', type: 'Saving' }
        ];
        const result = BudgetCalculator.calculateFixedMonthlyOutflow(outflows);
        expect(result.byType.Savings).toBe(5000);
        expect(result.byType.Saving || 0).toBe(0);
    })) passed++;

    // calculateTransferAmount tests
    total++; if (test('calculateTransferAmount: Positive transfer', () => {
        const result = BudgetCalculator.calculateTransferAmount(100000, 60000);
        expect(result).toBe(40000);
    })) passed++;

    total++; if (test('calculateTransferAmount: Negative transfer (shortfall)', () => {
        const result = BudgetCalculator.calculateTransferAmount(50000, 70000);
        expect(result).toBe(-20000);
    })) passed++;

    total++; if (test('calculateTransferAmount: Zero transfer', () => {
        const result = BudgetCalculator.calculateTransferAmount(60000, 60000);
        expect(result).toBe(0);
    })) passed++;

    // calculateVariableExpenditure tests
    total++; if (test('calculateVariableExpenditure: Normal case', () => {
        const result = BudgetCalculator.calculateVariableExpenditure(50000, 30000);
        expect(result).toBe(20000);
    })) passed++;

    total++; if (test('calculateVariableExpenditure: No spending', () => {
        const result = BudgetCalculator.calculateVariableExpenditure(50000, 50000);
        expect(result).toBe(0);
    })) passed++;

    total++; if (test('calculateVariableExpenditure: Never negative', () => {
        const result = BudgetCalculator.calculateVariableExpenditure(30000, 50000);
        expect(result).toBe(0);
    })) passed++;

    // sumCategoryNumericValues tests
    total++; if (test('sumCategoryNumericValues: Sums numeric values', () => {
        const category = {
            primaryIncome: 100000,
            secondaryIncome: 20000,
            borrowing: 5000
        };
        const result = BudgetCalculator.sumCategoryNumericValues(category);
        expect(result).toBe(125000);
    })) passed++;

    total++; if (test('sumCategoryNumericValues: Excludes description fields', () => {
        const category = {
            onetimeSaving: 10000,
            onetimeSavingDesc: 'Emergency fund',
            onetimeInvestment: 5000,
            onetimeInvestmentDesc: 'Stocks'
        };
        const result = BudgetCalculator.sumCategoryNumericValues(category);
        expect(result).toBe(15000);
    })) passed++;

    total++; if (test('sumCategoryNumericValues: Handles null/undefined', () => {
        const result = BudgetCalculator.sumCategoryNumericValues(null);
        expect(result).toBe(0);
    })) passed++;

    // getBudgetStatus tests
    total++; if (test('getBudgetStatus: Surplus', () => {
        const result = BudgetCalculator.getBudgetStatus(10000, 100000, 50000);
        expect(result.type).toBe('positive');
    })) passed++;

    total++; if (test('getBudgetStatus: Deficit', () => {
        const result = BudgetCalculator.getBudgetStatus(-5000, 100000, 50000);
        expect(result.type).toBe('negative');
    })) passed++;

    total++; if (test('getBudgetStatus: Balanced', () => {
        const result = BudgetCalculator.getBudgetStatus(0, 100000, 50000);
        expect(result.type).toBe('neutral');
    })) passed++;

    total++; if (test('getBudgetStatus: No income', () => {
        const result = BudgetCalculator.getBudgetStatus(0, 0, 0);
        expect(result.type).toBe('neutral');
        expect(result.message).toBe('');
    })) passed++;

    // validateTransferPrerequisites tests
    total++; if (test('validateTransferPrerequisites: Valid', () => {
        const accounts = {
            salary: { id: '1', balance: 100000 },
            expenditure: { id: '2', balance: 50000 }
        };
        const monthData = {
            inflow: { primaryIncome: 100000 }
        };
        const result = BudgetCalculator.validateTransferPrerequisites(accounts, monthData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    })) passed++;

    total++; if (test('validateTransferPrerequisites: Missing salary account', () => {
        const accounts = {
            expenditure: { id: '2', balance: 50000 }
        };
        const monthData = {
            inflow: { primaryIncome: 100000 }
        };
        const result = BudgetCalculator.validateTransferPrerequisites(accounts, monthData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBe(true);
    })) passed++;

    total++; if (test('validateTransferPrerequisites: Transfer already done', () => {
        const accounts = {
            salary: { id: '1', balance: 100000 },
            expenditure: { id: '2', balance: 50000 }
        };
        const monthData = {
            inflow: { primaryIncome: 100000 },
            _transferDone: 40000
        };
        const result = BudgetCalculator.validateTransferPrerequisites(accounts, monthData);
        expect(result.isValid).toBe(false);
    })) passed++;

    total++; if (test('validateTransferPrerequisites: Month closed', () => {
        const accounts = {
            salary: { id: '1', balance: 100000 },
            expenditure: { id: '2', balance: 50000 }
        };
        const monthData = {
            inflow: { primaryIncome: 100000 },
            _monthClosed: true
        };
        const result = BudgetCalculator.validateTransferPrerequisites(accounts, monthData);
        expect(result.isValid).toBe(false);
    })) passed++;

    // calculateTotalFunded tests
    total++; if (test('calculateTotalFunded: Uses initialBalance when set', () => {
        const monthData = {
            _initialBalance: 50000,
            _transferDone: 40000,
            _carryForwardDone: 5000
        };
        const result = BudgetCalculator.calculateTotalFunded(monthData, 30000);
        expect(result.totalFunded).toBe(50000);
        expect(result.variableExpenditure).toBe(20000);
    })) passed++;

    total++; if (test('calculateTotalFunded: Calculates from transfer + carryForward', () => {
        const monthData = {
            _transferDone: 40000,
            _carryForwardDone: 5000
        };
        const result = BudgetCalculator.calculateTotalFunded(monthData, 30000);
        expect(result.totalFunded).toBe(45000);
        expect(result.variableExpenditure).toBe(15000);
    })) passed++;

    // checkTransferMismatch tests
    total++; if (test('checkTransferMismatch: No mismatch', () => {
        const result = BudgetCalculator.checkTransferMismatch(60000, 60000);
        expect(result.hasMismatch).toBe(false);
    })) passed++;

    total++; if (test('checkTransferMismatch: Has mismatch', () => {
        const result = BudgetCalculator.checkTransferMismatch(60000, 65000, 1);
        expect(result.hasMismatch).toBe(true);
        expect(result.difference).toBe(5000);
    })) passed++;

    total++; if (test('checkTransferMismatch: Within tolerance', () => {
        const result = BudgetCalculator.checkTransferMismatch(60000, 60000.5, 1);
        expect(result.hasMismatch).toBe(false);
    })) passed++;

    total++; if (test('checkTransferMismatch: No snapshot', () => {
        const result = BudgetCalculator.checkTransferMismatch(null, 60000);
        expect(result.hasMismatch).toBe(false);
    })) passed++;

    console.log(`\n${passed}/${total} tests passed`);
    return { passed, total };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    runBudgetCalculatorTests();
}
