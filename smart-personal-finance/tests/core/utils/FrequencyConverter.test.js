/**
 * Unit tests for FrequencyConverter
 * Run in browser console or with Jest
 */

import { FrequencyConverter } from '../../../src/core/utils/FrequencyConverter.js';

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
        }
    };
}

// Tests
export function runFrequencyConverterTests() {
    console.log('Running FrequencyConverter Tests...\n');
    let passed = 0;
    let total = 0;

    // toMonthly tests
    total++; if (test('toMonthly: Monthly amount unchanged', () => {
        expect(FrequencyConverter.toMonthly(12000, 'Monthly')).toBe(12000);
    })) passed++;

    total++; if (test('toMonthly: Quarterly to monthly', () => {
        expect(FrequencyConverter.toMonthly(6000, 'Quarterly')).toBeCloseTo(2000);
    })) passed++;

    total++; if (test('toMonthly: Semi-Annual to monthly', () => {
        expect(FrequencyConverter.toMonthly(12000, 'Semi-Annual')).toBeCloseTo(2000);
    })) passed++;

    total++; if (test('toMonthly: Annual to monthly', () => {
        expect(FrequencyConverter.toMonthly(120000, 'Annual')).toBeCloseTo(10000);
    })) passed++;

    total++; if (test('toMonthly: One-Time returns 0', () => {
        expect(FrequencyConverter.toMonthly(5000, 'One-Time')).toBe(0);
    })) passed++;

    // fromMonthly tests
    total++; if (test('fromMonthly: Monthly unchanged', () => {
        expect(FrequencyConverter.fromMonthly(10000, 'Monthly')).toBe(120000);
    })) passed++;

    total++; if (test('fromMonthly: Monthly to Quarterly', () => {
        expect(FrequencyConverter.fromMonthly(10000, 'Quarterly')).toBe(40000);
    })) passed++;

    total++; if (test('fromMonthly: Monthly to Annual', () => {
        expect(FrequencyConverter.fromMonthly(10000, 'Annual')).toBe(10000);
    })) passed++;

    // getPeriodsPerYear tests
    total++; if (test('getPeriodsPerYear: Monthly = 12', () => {
        expect(FrequencyConverter.getPeriodsPerYear('Monthly')).toBe(12);
    })) passed++;

    total++; if (test('getPeriodsPerYear: Quarterly = 4', () => {
        expect(FrequencyConverter.getPeriodsPerYear('Quarterly')).toBe(4);
    })) passed++;

    total++; if (test('getPeriodsPerYear: Annual = 1', () => {
        expect(FrequencyConverter.getPeriodsPerYear('Annual')).toBe(1);
    })) passed++;

    // isValidFrequency tests
    total++; if (test('isValidFrequency: Monthly is valid', () => {
        expect(FrequencyConverter.isValidFrequency('Monthly')).toBe(true);
    })) passed++;

    total++; if (test('isValidFrequency: Invalid frequency', () => {
        expect(FrequencyConverter.isValidFrequency('Weekly')).toBe(false);
    })) passed++;

    console.log(`\n${passed}/${total} tests passed`);
    return { passed, total };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    runFrequencyConverterTests();
}
