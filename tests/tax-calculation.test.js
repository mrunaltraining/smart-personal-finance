/**
 * Tax Calculation Test Suite for SmartFin
 * Tests the tax calculation logic for both Old and New Tax Regimes
 * 
 * To run these tests:
 * 1. Include this file in a test runner (e.g., Jest, Mocha)
 * 2. Or open in browser console and run: runAllTaxTests()
 */

// Mock calculateTax function (copy from app.js for testing)
function calculateTax(income, regime) {
    if (regime === "new") {
        // New Tax Regime (FY 2025-26, Budget 2025)
        let tax = 0;
        if (income <= 400000) tax = 0;
        else if (income <= 800000) tax = (income - 400000) * 0.05;
        else if (income <= 1200000) tax = 20000 + (income - 800000) * 0.10;
        else if (income <= 1600000) tax = 60000 + (income - 1200000) * 0.15;
        else if (income <= 2000000) tax = 120000 + (income - 1600000) * 0.20;
        else if (income <= 2400000) tax = 200000 + (income - 2000000) * 0.25;
        else tax = 300000 + (income - 2400000) * 0.30;
        // Rebate u/s 87A: if taxable income ≤ ₹12L, rebate up to ₹60,000
        if (income <= 1200000) tax = Math.max(0, tax - 60000);
        return tax;
    } else {
        // Old Tax Regime
        if (income <= 250000) return 0;
        if (income <= 500000) return (income - 250000) * 0.05;
        if (income <= 1000000) return 12500 + (income - 500000) * 0.20;
        return 112500 + (income - 1000000) * 0.30;
    }
}

// Mock getEffectiveDeductions function
function getEffectiveDeductions(allEntries, regime) {
    if (regime === 'new') return { total80C: 0, total80D: 0, totalOther: 0, totalDeductions: 0, stdDeduction: 75000 };
    const raw80C  = allEntries.filter(e => e.section === '80C').reduce((s, e) => s + Number(e.amount || 0), 0);
    const raw80D  = allEntries.filter(e => e.section === '80D').reduce((s, e) => s + Number(e.amount || 0), 0);
    const rawOther = allEntries.filter(e => e.section && e.section !== '80C' && e.section !== '80D').reduce((s, e) => s + Number(e.amount || 0), 0);
    const total80C = Math.min(raw80C, 150000);
    const total80D = Math.min(raw80D, 50000);
    const totalOther = rawOther;
    return { total80C, total80D, totalOther, totalDeductions: total80C + total80D + totalOther, stdDeduction: 50000 };
}

// Test Suite
const tests = {
    // New Regime Tests
    newRegime: [
        {
            name: "New Regime: Income ₹4L (Below threshold, zero tax)",
            income: 400000,
            regime: "new",
            expected: 0,
            description: "Income up to ₹4L is tax-free in new regime"
        },
        {
            name: "New Regime: Income ₹6L (5% slab with rebate)",
            income: 600000,
            regime: "new",
            expected: 0, // 10000 tax - 10000 rebate (income <= 12L) = 0
            description: "₹6L income: (600000-400000)*0.05 = 10000, but rebate applies"
        },
        {
            name: "New Regime: Income ₹10L (Multiple slabs with rebate)",
            income: 1000000,
            regime: "new",
            expected: 0, // 50000 tax - 50000 rebate = 0
            description: "₹10L income gets full rebate as income <= ₹12L"
        },
        {
            name: "New Regime: Income ₹12L (Maximum rebate threshold)",
            income: 1200000,
            regime: "new",
            expected: 0, // 60000 tax - 60000 rebate = 0
            description: "₹12L is the maximum income for rebate eligibility"
        },
        {
            name: "New Regime: Income ₹15L (Above rebate threshold)",
            income: 1500000,
            regime: "new",
            expected: 105000, // No rebate as income > 12L
            description: "Income above ₹12L doesn't get rebate"
        },
        {
            name: "New Regime: Income ₹20L (20% slab)",
            income: 2000000,
            regime: "new",
            expected: 200000,
            description: "₹20L income in 20% tax slab"
        },
        {
            name: "New Regime: Income ₹30L (30% slab)",
            income: 3000000,
            regime: "new",
            expected: 600000,
            description: "₹30L income in highest 30% tax slab"
        }
    ],
    
    // Old Regime Tests
    oldRegime: [
        {
            name: "Old Regime: Income ₹2.5L (Below threshold, zero tax)",
            income: 250000,
            regime: "old",
            expected: 0,
            description: "Income up to ₹2.5L is tax-free in old regime"
        },
        {
            name: "Old Regime: Income ₹4L (5% slab)",
            income: 400000,
            regime: "old",
            expected: 7500, // (400000-250000)*0.05 = 7500
            description: "₹4L income: (400000-250000)*0.05 = 7500"
        },
        {
            name: "Old Regime: Income ₹7L (20% slab)",
            income: 700000,
            regime: "old",
            expected: 52500, // 12500 + (700000-500000)*0.20 = 52500
            description: "₹7L income in 20% tax slab"
        },
        {
            name: "Old Regime: Income ₹12L (30% slab)",
            income: 1200000,
            regime: "old",
            expected: 172500, // 112500 + (1200000-1000000)*0.30 = 172500
            description: "₹12L income in 30% tax slab"
        },
        {
            name: "Old Regime: Income ₹20L (30% slab)",
            income: 2000000,
            regime: "old",
            expected: 412500, // 112500 + (2000000-1000000)*0.30 = 412500
            description: "₹20L income in highest 30% tax slab"
        }
    ],
    
    // Deduction Tests
    deductions: [
        {
            name: "80C Deduction: Within limit (₹1L)",
            deductions: [{ section: '80C', amount: 100000 }],
            regime: 'old',
            expected80C: 100000,
            description: "80C deduction of ₹1L should be fully allowed"
        },
        {
            name: "80C Deduction: At limit (₹1.5L)",
            deductions: [{ section: '80C', amount: 150000 }],
            regime: 'old',
            expected80C: 150000,
            description: "80C deduction capped at ₹1.5L"
        },
        {
            name: "80C Deduction: Above limit (₹2L capped to ₹1.5L)",
            deductions: [{ section: '80C', amount: 200000 }],
            regime: 'old',
            expected80C: 150000,
            description: "80C deduction above ₹1.5L should be capped"
        },
        {
            name: "80D Deduction: Within limit (₹25K)",
            deductions: [{ section: '80D', amount: 25000 }],
            regime: 'old',
            expected80D: 25000,
            description: "80D deduction of ₹25K should be fully allowed"
        },
        {
            name: "80D Deduction: At limit (₹50K)",
            deductions: [{ section: '80D', amount: 50000 }],
            regime: 'old',
            expected80D: 50000,
            description: "80D deduction capped at ₹50K"
        },
        {
            name: "80D Deduction: Above limit (₹75K capped to ₹50K)",
            deductions: [{ section: '80D', amount: 75000 }],
            regime: 'old',
            expected80D: 50000,
            description: "80D deduction above ₹50K should be capped"
        },
        {
            name: "Multiple Deductions: 80C + 80D",
            deductions: [
                { section: '80C', amount: 150000 },
                { section: '80D', amount: 50000 }
            ],
            regime: 'old',
            expected80C: 150000,
            expected80D: 50000,
            expectedTotal: 200000,
            description: "Both 80C and 80D deductions should be applied"
        },
        {
            name: "New Regime: No deductions allowed",
            deductions: [
                { section: '80C', amount: 150000 },
                { section: '80D', amount: 50000 }
            ],
            regime: 'new',
            expectedTotal: 0,
            description: "New regime doesn't allow 80C/80D deductions"
        }
    ],
    
    // Comprehensive Tax Calculation Tests
    comprehensive: [
        {
            name: "Comprehensive: ₹10L income, ₹1.5L 80C, ₹50K 80D (Old Regime)",
            income: 1000000,
            deductions: [
                { section: '80C', amount: 150000 },
                { section: '80D', amount: 50000 }
            ],
            regime: 'old',
            expectedTaxableIncome: 750000, // 1000000 - 50000 (std) - 150000 (80C) - 50000 (80D)
            expectedTax: 62500, // 12500 + (750000-500000)*0.20
            description: "₹10L income with maximum deductions in old regime"
        },
        {
            name: "Comprehensive: ₹10L income (New Regime with rebate)",
            income: 1000000,
            deductions: [],
            regime: 'new',
            expectedTaxableIncome: 1000000,
            expectedTax: 0, // Tax calculated but rebate applies as income <= 12L
            description: "₹10L income in new regime gets rebate"
        },
        {
            name: "Comprehensive: ₹15L income, ₹1L 80C (Old Regime)",
            income: 1500000,
            deductions: [{ section: '80C', amount: 100000 }],
            regime: 'old',
            expectedTaxableIncome: 1350000, // 1500000 - 50000 (std) - 100000 (80C)
            expectedTax: 217500, // 112500 + (1350000-1000000)*0.30
            description: "₹15L income with partial 80C deduction"
        }
    ]
};

// Test Runner
function runAllTaxTests() {
    console.log("=== SmartFin Tax Calculation Test Suite ===\n");
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Run New Regime Tests
    console.log("--- New Tax Regime Tests ---");
    tests.newRegime.forEach(test => {
        totalTests++;
        const result = calculateTax(test.income, test.regime);
        const passed = Math.abs(result - test.expected) < 0.01; // Allow for floating point errors
        
        if (passed) {
            passedTests++;
            console.log(`✓ PASS: ${test.name}`);
        } else {
            failedTests++;
            console.log(`✗ FAIL: ${test.name}`);
            console.log(`  Expected: ${test.expected}, Got: ${result}`);
            console.log(`  Description: ${test.description}`);
        }
    });
    
    // Run Old Regime Tests
    console.log("\n--- Old Tax Regime Tests ---");
    tests.oldRegime.forEach(test => {
        totalTests++;
        const result = calculateTax(test.income, test.regime);
        const passed = Math.abs(result - test.expected) < 0.01;
        
        if (passed) {
            passedTests++;
            console.log(`✓ PASS: ${test.name}`);
        } else {
            failedTests++;
            console.log(`✗ FAIL: ${test.name}`);
            console.log(`  Expected: ${test.expected}, Got: ${result}`);
            console.log(`  Description: ${test.description}`);
        }
    });
    
    // Run Deduction Tests
    console.log("\n--- Deduction Calculation Tests ---");
    tests.deductions.forEach(test => {
        totalTests++;
        const result = getEffectiveDeductions(test.deductions, test.regime);
        let passed = true;
        
        if (test.expected80C !== undefined && Math.abs(result.total80C - test.expected80C) >= 0.01) passed = false;
        if (test.expected80D !== undefined && Math.abs(result.total80D - test.expected80D) >= 0.01) passed = false;
        if (test.expectedTotal !== undefined && Math.abs(result.totalDeductions - test.expectedTotal) >= 0.01) passed = false;
        
        if (passed) {
            passedTests++;
            console.log(`✓ PASS: ${test.name}`);
        } else {
            failedTests++;
            console.log(`✗ FAIL: ${test.name}`);
            console.log(`  Expected 80C: ${test.expected80C}, Got: ${result.total80C}`);
            console.log(`  Expected 80D: ${test.expected80D}, Got: ${result.total80D}`);
            console.log(`  Expected Total: ${test.expectedTotal}, Got: ${result.totalDeductions}`);
            console.log(`  Description: ${test.description}`);
        }
    });
    
    // Run Comprehensive Tests
    console.log("\n--- Comprehensive Tax Calculation Tests ---");
    tests.comprehensive.forEach(test => {
        totalTests++;
        const ded = getEffectiveDeductions(test.deductions, test.regime);
        const taxableIncome = test.income - ded.stdDeduction - ded.totalDeductions;
        const tax = calculateTax(taxableIncome, test.regime);
        
        let passed = true;
        if (test.expectedTaxableIncome !== undefined && Math.abs(taxableIncome - test.expectedTaxableIncome) >= 0.01) passed = false;
        if (test.expectedTax !== undefined && Math.abs(tax - test.expectedTax) >= 0.01) passed = false;
        
        if (passed) {
            passedTests++;
            console.log(`✓ PASS: ${test.name}`);
        } else {
            failedTests++;
            console.log(`✗ FAIL: ${test.name}`);
            if (test.expectedTaxableIncome !== undefined) {
                console.log(`  Expected Taxable Income: ${test.expectedTaxableIncome}, Got: ${taxableIncome}`);
            }
            if (test.expectedTax !== undefined) {
                console.log(`  Expected Tax: ${test.expectedTax}, Got: ${tax}`);
            }
            console.log(`  Description: ${test.description}`);
        }
    });
    
    // Summary
    console.log("\n=== Test Summary ===");
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✓`);
    console.log(`Failed: ${failedTests} ✗`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    
    return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: (passedTests / totalTests) * 100
    };
}

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTaxTests, calculateTax, getEffectiveDeductions, tests };
}

// Auto-run if loaded in browser console
if (typeof window !== 'undefined') {
    console.log("Tax calculation tests loaded. Run 'runAllTaxTests()' to execute all tests.");
}
