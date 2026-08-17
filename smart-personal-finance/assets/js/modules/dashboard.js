// ── SmartFin Dashboard Module ────────────────────────────────────────────────
// A deliberately compact, decision-oriented summary of the detailed tabs.
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_WARNING, toMonthlyAmount } from './constants.js';
import { iconSvg } from './icons.js';
import { getMonthlyBudgetDistribution } from './budget-distribution.js';
import { DateUtils, CurrencyFormatter } from '../../../src/core/index.js';

// Global variable to track the dashboard trend chart instance
let dashboardTrendChartInstance = null;

// Helper to determine current month phase for context-aware quick actions
function getMonthPhase(monthData) {
    const day = new Date().getDate();
    const transferDone = Boolean(monthData?._transferDone);
    const monthClosed = Boolean(monthData?._monthClosed);
    
    if (monthClosed) return 'closed';
    if (day <= 5) return transferDone ? 'beginning_done' : 'beginning_pending';
    if (day <= 25) return 'mid_month';
    return 'end_month';
}

// Helper to get auto tax deductions (calls the function from app.js)
function getAutoTaxDeductionsFromAppData(appData) {
    // This function is defined in app.js and is available globally
    // We need to replicate the logic here since we can't import from app.js
    const auto = [];
    
    // Helper function for annual amount calculation
    function getOutflowAnnualAmount(item) {
        const amount = Number(item.amount || 0);
        const freq = item.frequency || "Monthly";
        if (freq === "Monthly") return amount * 12;
        if (freq === "Quarterly") return amount * 4;
        if (freq === "Semi-Annual") return amount * 2;
        if (freq === "Annual") return amount;
        return amount; // One-Time
    }
    
    function normalizeInvestmentFrequency(item = {}) {
        if (item.frequency) return item.frequency === "Annually" ? "Annual" : item.frequency;
        if (item.category === "Monthly") return "Monthly";
        return "One-Time";
    }

    function normalizeInvestmentEntry(entry = {}) {
        const normalized = { ...entry };
        normalized.frequency = normalizeInvestmentFrequency(normalized);
        delete normalized.category;
        return normalized;
    }

    function normalizeInvestmentEntries(entries = []) {
        return entries.map(normalizeInvestmentEntry);
    }
    
    // Outflow items with type Insurance → 80D (annual premiums only)
    const outflowItems = (appData.tabData || {}).outflow || [];
    outflowItems.filter(e => e.type === 'Insurance').forEach(item => {
        const annual = getOutflowAnnualAmount(item);
        if (annual > 0) auto.push({ id: 'atax_ins_' + item.id, name: item.name || 'Insurance', amount: annual, section: '80D', details: 'From Outflow tab', auto: true });
    });
    
    // Inflow items → 80C (only recurring contributions, exclude One-Time)
    const inflowItems = normalizeInvestmentEntries((appData.tabData || {}).inflow || []);
    inflowItems.forEach(item => {
        const freq = (item.frequency || '').toLowerCase();
        const base = Number(item.amount || 0);
        
        // Skip One-Time investments as they represent current value, not annual contribution
        if (freq === 'one-time') return;
        
        // Only count recurring contributions (Monthly, Quarterly, Semi-Annual, Annual)
        let annual = 0;
        if (freq === 'monthly') {
            annual = base * 12;
        } else if (freq === 'quarterly') {
            annual = base * 4;
        } else if (freq === 'semi-annual') {
            annual = base * 2;
        } else if (freq === 'annual') {
            annual = base;
        }
        
        if (annual > 0) auto.push({ id: 'atax_inv_' + item.id, name: item.name || 'Investment', amount: annual, section: '80C', details: 'From Inflow tab', auto: true });
    });
    return auto;
}

function fmtMoney(value) {
    return CurrencyFormatter.format(value || 0);
}

function getMonthKey(date) {
    return DateUtils.getMonthKey(date);
}

function sumNumbers(values) {
    return Object.entries(values || {}).reduce((total, [key, value]) => (
        key.endsWith('Desc') ? total : total + (Number(value) || 0)
    ), 0);
}

function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = value == null ? '' : String(value);
    return element.innerHTML;
}

function formatGoalDate(value) {
    if (!value) return 'No target date';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? 'No target date'
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFinancialYearMonthKeys(date = new Date()) {
    const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return Array.from({ length: 12 }, (_, index) => getMonthKey(new Date(startYear, 3 + index, 1)));
}

function getFinancialYearTotals(appData, date = new Date()) {
    return getFinancialYearMonthKeys(date).reduce((totals, monthKey) => {
        const distribution = getMonthlyBudgetDistribution((appData.monthlyBudgetData || {})[monthKey] || {});
        // Use fixedOthers explicitly if available, otherwise use the catch-all other calculation
        const otherValue = Number(distribution.fixedOthers || 0) > 0 ? Number(distribution.fixedOthers) : Number(distribution.other || 0);
        totals.income += Number(distribution.income || 0);
        totals.expenditure += Number(distribution.expenditure || 0);
        totals.saving += Number(distribution.saving || 0);
        totals.investment += Number(distribution.investment || 0);
        totals.liability += Number(distribution.liability || 0);
        totals.insurance += Number(distribution.insurance || 0);
        totals.other += otherValue;
        return totals;
    }, { income: 0, expenditure: 0, saving: 0, investment: 0, liability: 0, insurance: 0, other: 0 });
}

function groupExpenses(expenses, field) {
    return expenses.reduce((groups, expense) => {
        const label = expense[field] || (field === 'paymentMethod' ? 'Not specified' : 'Other');
        groups[label] = (groups[label] || 0) + Number(expense.amount || 0);
        return groups;
    }, {});
}

function renderDistributionRows(groups, limit = 5, excludeOthers = false, useTwoColumns = false) {
    // Filter out 'Others' and 'Not specified' categories if requested
    let entries = Object.entries(groups);
    if (excludeOthers) {
        entries = entries.filter(([label]) => label !== 'Others' && label !== 'Not specified');
    }
    
    // Sort by amount descending
    entries = entries.sort(([, a], [, b]) => b - a);
    
    // Calculate total for percentage calculation
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    if (!entries.length || total <= 0) return '<p class="dash-empty-state">No expense entries recorded this month.</p>';
    
    const renderRow = ([label, amount]) => `
        <div class="dash-distribution-row">
            <span class="dash-distribution-label">${escapeHtml(label)}</span>
            <span class="dash-distribution-value">${fmtMoney(amount)}</span>
            <span class="dash-distribution-track"><span style="width:${Math.max(3, (amount / total) * 100)}%"></span></span>
        </div>
    `;
    
    // If useTwoColumns and more than limit items, show in 2 columns with vertical separator
    if (useTwoColumns && entries.length > limit) {
        const firstHalf = entries.slice(0, Math.ceil(entries.length / 2));
        const secondHalf = entries.slice(Math.ceil(entries.length / 2));
        
        return `
            <div class="dash-distribution-columns">
                <div class="dash-distribution-column">
                    ${firstHalf.map(renderRow).join('')}
                </div>
                <div class="dash-distribution-column-separator"></div>
                <div class="dash-distribution-column">
                    ${secondHalf.map(renderRow).join('')}
                </div>
            </div>
        `;
    }
    
    // If limit or fewer items, show normally (or show all if excludeOthers is true)
    const entriesToShow = excludeOthers ? entries : entries.slice(0, limit);
    return entriesToShow.map(renderRow).join('');
}

function calculateIdealHealthInsurance(age, location, monthlyIncome) {
    // More realistic formula: Base on income and age
    // Rule of thumb: Health cover should be 50% of annual income or minimum ₹5L
    const metroCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Gurgaon', 'Noida'];
    const cityName = (location || '').split(',')[0].trim();
    const isMetro = metroCities.some(metro => cityName.includes(metro));
    
    // Base calculation: 50% of annual income
    const annualIncome = monthlyIncome * 12;
    let idealCover = annualIncome * 0.5;
    
    // Minimum coverage based on city
    const minCover = isMetro ? 500000 : 300000; // ₹5L metro, ₹3L non-metro
    idealCover = Math.max(idealCover, minCover);
    
    // Age-based adjustment (medical costs increase with age)
    if (age >= 45) {
        idealCover = idealCover * 1.5; // 50% more for 45+
    } else if (age >= 35) {
        idealCover = idealCover * 1.2; // 20% more for 35-44
    }
    
    // Cap at reasonable maximum
    return Math.min(idealCover, 2000000); // Cap at ₹20L for individual
}

function calculateIdealTermInsurance(age, monthlyIncome, currentSavings) {
    // More realistic formula: 10-15x annual income minus existing savings
    // This ensures family can maintain lifestyle for 10-15 years
    const annualIncome = monthlyIncome * 12;
    const multiplier = age < 35 ? 15 : age < 45 ? 12 : 10; // Younger = higher multiplier
    const idealCover = Math.max(0, (annualIncome * multiplier) - currentSavings);
    
    // Minimum cover should be at least ₹50L
    return Math.max(idealCover, 5000000);
}

function calculateIdealEmergencyFund(appData) {
    // Use the same calculation as Emergency Fund tab for consistency
    // 1. Fixed monthly obligations (from Outflow tab)
    const allOutflows = (appData.tabData || {}).outflow || [];
    let fixedLiabilities = 0;
    let fixedExpenditure = 0;

    allOutflows.forEach(e => {
        const amount = Number(e.amount || 0);
        if (amount <= 0) return;
        const freq = e.frequency || "Monthly";
        const monthlyAmt = toMonthlyAmount(amount, freq);
        if (monthlyAmt <= 0) return;

        const t = e.type || "Expenditure";
        if (t === "Liability" || t === "Insurance") {
            fixedLiabilities += monthlyAmt;
        } else if (t === "Expenditure") {
            fixedExpenditure += monthlyAmt;
        }
    });

    // 2. Average variable monthly expenditure from budget history
    const monthlyBudgetData = appData.monthlyBudgetData || {};
    const availableMonths = Object.keys(monthlyBudgetData);
    let totalVariable = 0;
    let monthsWithData = 0;

    availableMonths.forEach(monthKey => {
        const md = monthlyBudgetData[monthKey] || {};
        const o = md.outflow || {};
        const inv = md.investing || {};
        const varExp = Number(o.utilityBills || 0)
            + Number(o.familyExpenditure || 0)
            + Number(o.miscExpenses || 0)
            + Number(o.debtRepayment || 0)
            + Number(o.creditCardOutstanding || 0)
            + Number(o.midMonthCCOutstanding || 0)
            + Number(inv.ondemandExpenditure || 0)
            + Number(inv.ondemandLiability || 0);
        if (varExp > 0) {
            totalVariable += varExp;
            monthsWithData++;
        }
    });

    const avgVariableExpenses = monthsWithData > 0 ? totalVariable / monthsWithData : 0;

    // 3. Minimum monthly survival amount
    const minMonthlyNeed = fixedLiabilities + fixedExpenditure + avgVariableExpenses;

    // 4. Standard recommendation: 6 months of expenses
    const ideal = minMonthlyNeed * 6;
    
    console.log('Emergency Fund Debug:', {
        fixedLiabilities,
        fixedExpenditure,
        avgVariableExpenses,
        minMonthlyNeed,
        ideal
    });

    return ideal;
}

// Calculate Financial Health Score using existing data - updated with modern metrics
function calculateFinancialHealthScore(data) {
    const { emergencyFund, idealEmergencyFund, totalAssets, totalLiabilities, 
            usableIncome, monthlyCommitments, healthInsurance, idealHealthInsurance,
            termInsurance, idealTermInsurance, ongoingGoals, monthlyInvestment, monthData, assets } = data;
    
    let score = 0;
    const breakdown = [];
    
    // 1. Emergency Fund Coverage (15 points) - Reduced weight, still important
    let efCoverage = 0;
    if (idealEmergencyFund > 0) {
        const ratio = emergencyFund / idealEmergencyFund;
        // Gradual scoring: 0-3 months = 0-50%, 3-6 months = 50-100%
        if (ratio < 0.5) {
            efCoverage = ratio * 1; // 0-50% coverage = 0-50% score
        } else {
            efCoverage = 0.5 + (Math.min(1, ratio) - 0.5) * 1; // 50-100% coverage = 50-100% score
        }
    }
    const efScore = Math.round(efCoverage * 15);
    score += efScore;
    const efTooltip = `Emergency Fund (15 points max)
Current: ₹${Math.round(emergencyFund).toLocaleString('en-IN')}
Ideal: ₹${Math.round(idealEmergencyFund).toLocaleString('en-IN')}
Coverage: ${Math.round(efCoverage * 100)}%

Scoring:
• 0-50% coverage = 0-50% score (gradual)
• 50-100% coverage = 50-100% score
• Based on 6 months of expenses`;
    breakdown.push({ label: 'Emergency Fund', score: efScore, max: 15, percentage: Math.round(efCoverage * 100), tooltip: efTooltip });
    
    // 2. Debt-to-Income Ratio (20 points) - Reduced weight, added credit card consideration
    let debtScore = 0;
    if (usableIncome > 0) {
        const debtRatio = monthlyCommitments / usableIncome;
        // Excellent: <30%, Good: 30-40%, Fair: 40-50%, Poor: >50%
        if (debtRatio < 0.3) {
            debtScore = 20; // Excellent
        } else if (debtRatio < 0.4) {
            debtScore = 15; // Good
        } else if (debtRatio < 0.5) {
            debtScore = 10; // Fair
        } else if (debtRatio < 0.7) {
            debtScore = 5; // Poor
        } else {
            debtScore = 0; // Critical
        }
    }
    score += debtScore;
    const debtRatio = usableIncome > 0 ? monthlyCommitments / usableIncome : 1;
    const debtTooltip = `Debt Management (20 points max)
Monthly Commitments: ₹${Math.round(monthlyCommitments).toLocaleString('en-IN')}
Usable Income: ₹${Math.round(usableIncome).toLocaleString('en-IN')}
Debt-to-Income Ratio: ${Math.round(debtRatio * 100)}%

Scoring:
• <30% = 20 points (Excellent)
• 30-40% = 15 points (Good)
• 40-50% = 10 points (Fair)
• 50-70% = 5 points (Poor)
• ≥70% = 0 points (Critical)

Note: Includes liabilities, expenditures & credit card payments`;
    breakdown.push({ label: 'Debt Management', score: debtScore, max: 20, percentage: Math.round(Math.max(0, (1 - Math.min(1, debtRatio)) * 100)), tooltip: debtTooltip });
    
    // 3. Savings & Investment Rate (25 points) - Increased weight, combined metric
    let savingsScore = 0;
    if (usableIncome > 0) {
        const { saving: totalActualSavings, investment: totalInvestment } = getMonthlyBudgetDistribution(monthData);
        const totalSavingsAndInvestment = totalActualSavings + totalInvestment;
        const savingsRate = Math.max(0, totalSavingsAndInvestment / usableIncome);
        
        // Excellent: >30%, Good: 20-30%, Fair: 10-20%, Poor: <10%
        if (savingsRate >= 0.3) {
            savingsScore = 25;
        } else if (savingsRate >= 0.2) {
            savingsScore = 20;
        } else if (savingsRate >= 0.1) {
            savingsScore = 12;
        } else if (savingsRate > 0) {
            savingsScore = 5;
        }
    }
    score += savingsScore;
    const { saving: totalActualSavings, investment: totalInvestment } = getMonthlyBudgetDistribution(monthData);
    const totalSavingsAndInvestment = totalActualSavings + totalInvestment;
    const savingsRate = usableIncome > 0 ? Math.max(0, totalSavingsAndInvestment / usableIncome) : 0;
    const savingsTooltip = `Savings & Investment (25 points max)
Savings: ₹${Math.round(totalActualSavings).toLocaleString('en-IN')}
Investments: ₹${Math.round(totalInvestment).toLocaleString('en-IN')}
Total: ₹${Math.round(totalSavingsAndInvestment).toLocaleString('en-IN')}
Rate: ${Math.round(savingsRate * 100)}%

Combined metric: Savings + Investments for wealth building.

Scoring:
• ≥30% = 25 points (Excellent)
• 20-30% = 20 points (Good)
• 10-20% = 12 points (Fair)
• <10% = 5 points (Poor)`;
    breakdown.push({ label: 'Savings & Investment', score: savingsScore, max: 25, percentage: Math.round(savingsRate * 100), tooltip: savingsTooltip });
    
    // 4. Insurance Coverage (15 points) - Reduced weight
    let insuranceScore = 0;
    const healthCoverage = idealHealthInsurance > 0 ? Math.min(1, healthInsurance / idealHealthInsurance) : 0;
    const termCoverage = idealTermInsurance > 0 ? Math.min(1, termInsurance / idealTermInsurance) : 0;
    
    // Health insurance is critical (9 points), term insurance important (6 points)
    insuranceScore += Math.round(healthCoverage * 9);
    insuranceScore += Math.round(termCoverage * 6);
    score += insuranceScore;
    const insuranceTooltip = `Insurance Coverage (15 points max)
Health Insurance: ₹${Math.round(healthInsurance).toLocaleString('en-IN')}
Ideal Health: ₹${Math.round(idealHealthInsurance).toLocaleString('en-IN')}
Coverage: ${Math.round(healthCoverage * 100)}%

Term Insurance: ₹${Math.round(termInsurance).toLocaleString('en-IN')}
Ideal Term: ₹${Math.round(idealTermInsurance).toLocaleString('en-IN')}
Coverage: ${Math.round(termCoverage * 100)}%

Scoring:
• Health Insurance: 9 points max (critical)
• Term Insurance: 6 points max (important)
• Weighted by importance (60% health, 40% term)`;
    breakdown.push({ label: 'Insurance Coverage', score: insuranceScore, max: 15, percentage: Math.round(((healthCoverage * 0.6) + (termCoverage * 0.4)) * 100), tooltip: insuranceTooltip });
    
    // 5. Net Worth Position (15 points) - Increased weight, added asset diversification
    let netWorthScore = 0;
    const netWorth = totalAssets - totalLiabilities;
    if (netWorth > 0) {
        // Positive net worth gets base points
        netWorthScore = 5;
        // Additional points if net worth > 6 months expenses
        const sixMonthsExpenses = monthlyCommitments * 6;
        if (netWorth > sixMonthsExpenses) {
            netWorthScore = 15;
        } else if (netWorth > sixMonthsExpenses * 0.5) {
            netWorthScore = 10;
        }
    }
    
    // Asset diversification bonus
    const assetTypes = new Set(assets.map(a => a.purpose || 'Other'));
    if (assetTypes.size >= 3 && netWorth > 0) {
        netWorthScore = Math.min(15, netWorthScore + 2); // Bonus for diversification
    }
    
    score += netWorthScore;
    const sixMonthsExpenses = monthlyCommitments * 6;
    const netWorthTooltip = `Net Worth Position (15 points max)
Net Worth: ₹${Math.round(netWorth).toLocaleString('en-IN')}
Total Assets: ₹${Math.round(totalAssets).toLocaleString('en-IN')}
Total Liabilities: ₹${Math.round(totalLiabilities).toLocaleString('en-IN')}
Asset Types: ${assetTypes.size}

6 Months Expenses: ₹${Math.round(sixMonthsExpenses).toLocaleString('en-IN')}

Scoring:
• Net Worth > 6 months expenses = 15 points
• Net Worth > 3 months expenses = 10 points
• Positive net worth = 5 points
• Negative net worth = 0 points
• +2 bonus for asset diversification (≥3 types)`;
    breakdown.push({ label: 'Net Worth Position', score: netWorthScore, max: 15, percentage: netWorth > 0 ? Math.min(100, Math.round((netWorth / sixMonthsExpenses) * 100)) : 0, tooltip: netWorthTooltip });
    
    // 6. Goal Progress & Planning (10 points) - Increased weight
    let goalScore = 0;
    if (ongoingGoals.length > 0) {
        const totalNeeded = ongoingGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
        const totalAccumulated = ongoingGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
        const goalProgress = totalNeeded > 0 ? Math.min(1, totalAccumulated / totalNeeded) : 0;
        goalScore = Math.round(goalProgress * 8);
        
        // Bonus for having goals defined
        goalScore += 2;
    } else {
        // No goals defined
        goalScore = 0;
    }
    score += goalScore;
    const goalProgress = ongoingGoals.length > 0 ? Math.min(1, ongoingGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0) / Math.max(1, ongoingGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0))) : 0;
    const totalNeeded = ongoingGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
    const totalAccumulated = ongoingGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
    const goalTooltip = `Goal Progress (10 points max)
Ongoing Goals: ${ongoingGoals.length}
Total Needed: ₹${Math.round(totalNeeded).toLocaleString('en-IN')}
Total Accumulated: ₹${Math.round(totalAccumulated).toLocaleString('en-IN')}
Progress: ${Math.round(goalProgress * 100)}%

Scoring:
• Based on overall goal completion (8 points max)
• +2 bonus for having goals defined
• Points = Progress % × 8 + 2`;
    breakdown.push({ label: 'Goal Progress', score: goalScore, max: 10, percentage: Math.round(goalProgress * 100), tooltip: goalTooltip });
    
    // Determine health level with more realistic thresholds
    let healthLevel = 'Needs Work';
    let healthColor = '#ef4444';
    if (score >= 85) {
        healthLevel = 'Excellent';
        healthColor = '#10b981';
    } else if (score >= 70) {
        healthLevel = 'Good';
        healthColor = '#3b82f6';
    } else if (score >= 50) {
        healthLevel = 'Fair';
        healthColor = '#f59e0b';
    } else if (score >= 30) {
        healthLevel = 'Needs Improvement';
        healthColor = '#f97316';
    }
    
    return { score, breakdown, healthLevel, healthColor };
}

// Generate insights and recommendations based on existing data
function generateInsights(data) {
    const insights = [];
    const { budgetBalance, emergencyFund, idealEmergencyFund, savingsRate, healthInsurance, 
            idealHealthInsurance, termInsurance, idealTermInsurance, ongoingGoals, 
            monthlyInvestment, usableIncome, monthlyCommitments, totalAssets, totalLiabilities, assets, taxPlan } = data;
    
    // Positive insights (encouragement)
    if (budgetBalance > 0) {
        insights.push({
            type: 'positive',
            icon: 'starSmall',
            message: `Great job! You have ${fmtMoney(budgetBalance)} surplus this month. Consider investing it.`
        });
    }
    
    if (savingsRate >= 0.3) {
        insights.push({
            type: 'positive',
            icon: 'checkSmall',
            message: `Excellent savings rate of ${Math.round(savingsRate * 100)}%! You're on track for financial independence.`
        });
    }
    
    if (emergencyFund >= idealEmergencyFund) {
        insights.push({
            type: 'positive',
            icon: 'checkSmall',
            message: `Your emergency fund is fully funded! You're well-prepared for unexpected expenses.`
        });
    }
    
    if (totalAssets > totalLiabilities * 2) {
        insights.push({
            type: 'positive',
            icon: 'checkSmall',
            message: `Strong net worth position. Your assets are ${Math.round((totalAssets / totalLiabilities) * 100)}% of liabilities.`
        });
    }
    
    if (monthlyInvestment > 0 && savingsRate >= 0.2) {
        insights.push({
            type: 'positive',
            icon: 'trendingUpSmall',
            message: `Consistent investing! You're building wealth with ${fmtMoney(monthlyInvestment)} monthly investments.`
        });
    }
    
    // Improvement suggestions
    if (emergencyFund < idealEmergencyFund && budgetBalance > 0) {
        const gap = idealEmergencyFund - emergencyFund;
        insights.push({
            type: 'suggestion',
            icon: 'lightbulbSmall',
            message: `Build your emergency fund by ${fmtMoney(gap)}. Start with ${fmtMoney(Math.min(budgetBalance, gap / 6))} this month.`
        });
    }
    
    if (healthInsurance < idealHealthInsurance * 0.7) {
        insights.push({
            type: 'suggestion',
            icon: 'hospitalSmall',
            message: `Consider increasing health insurance by ${fmtMoney(idealHealthInsurance - healthInsurance)} for better protection.`
        });
    }
    
    if (termInsurance < idealTermInsurance * 0.7) {
        insights.push({
            type: 'suggestion',
            icon: 'shieldCheckSmall',
            message: `Your term insurance is below recommended. Consider increasing coverage to protect your family.`
        });
    }
    
    if (monthlyInvestment === 0 && usableIncome > monthlyCommitments) {
        insights.push({
            type: 'suggestion',
            icon: 'trendingUpSmall',
            message: `Start investing! Even ${fmtMoney(Math.min(5000, (usableIncome - monthlyCommitments) * 0.1))} per month can grow significantly over time.`
        });
    }
    
    if (ongoingGoals.length > 0) {
        const behindGoals = ongoingGoals.filter(g => {
            const needed = Number(g.amountNeeded || 0);
            const accumulated = Number(g.amountAccumulated || 0);
            return accumulated < needed * 0.5 && g.targetDate;
        });
        if (behindGoals.length > 0) {
            insights.push({
                type: 'suggestion',
                icon: 'targetSmall',
                message: `${behindGoals.length} goal${behindGoals.length > 1 ? 's are' : ' is'} behind schedule. Review and adjust your savings plan.`
            });
        }
    }
    
    if (ongoingGoals.length === 0) {
        insights.push({
            type: 'suggestion',
            icon: 'targetSmall',
            message: `Set financial goals to track progress and stay motivated. Start with short-term goals.`
        });
    }
    
    // Asset diversification
    const assetTypes = new Set(assets.map(a => a.purpose || 'Other'));
    if (assetTypes.size < 3 && assets.length > 0) {
        insights.push({
            type: 'suggestion',
            icon: 'trendingUpSmall',
            message: `Diversify your assets across different types (equity, debt, gold, real estate) to reduce risk.`
        });
    }
    
    // Spending optimization
    const debtRatio = usableIncome > 0 ? monthlyCommitments / usableIncome : 0;
    if (debtRatio > 0.5) {
        insights.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `${Math.round(debtRatio * 100)}% of income goes to commitments. Consider debt consolidation or refinancing.`
        });
    }
    
    if (savingsRate < 0.1 && usableIncome > 0) {
        insights.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Low savings rate of ${Math.round(savingsRate * 100)}%. Aim to save at least 20% of your income.`
        });
    }
    
    if (totalLiabilities > totalAssets) {
        insights.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Negative net worth. Focus on reducing liabilities to improve your financial health.`
        });
    }
    
    // Tax planning
    if (taxPlan && taxPlan.length === 0 && usableIncome > 500000) {
        insights.push({
            type: 'suggestion',
            icon: 'calendarSmall',
            message: `Plan your tax deductions under 80C, 80D, etc. to reduce your tax liability significantly.`
        });
    }
    
    return insights.slice(0, 6); // Limit to 6 most relevant insights
}

// Generate alerts based on existing data - no duplicate calculations
function generateAlerts(data) {
    const alerts = [];
    const { budgetBalance, emergencyFund, idealEmergencyFund, ongoingGoals, insurancePolicies, 
            idealHealthInsurance, idealTermInsurance, healthInsurance, termInsurance, 
            totalCreditCardUsage, outflows, now } = data;
    
    // Over budget alert
    if (budgetBalance < 0) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Over budget by ${fmtMoney(Math.abs(budgetBalance))} this month`,
            action: 'monthlyBudget'
        });
    }
    
    // Low emergency fund alert
    if (emergencyFund < idealEmergencyFund * 0.5) {
        alerts.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `Emergency fund below 50% of ideal (${fmtMoney(emergencyFund)} / ${fmtMoney(idealEmergencyFund)})`,
            action: 'emergencyFund'
        });
    }
    
    // Goals behind schedule
    const behindGoals = ongoingGoals.filter(g => {
        if (!g.targetDate) return false;
        const targetDate = new Date(g.targetDate);
        const needed = Number(g.amountNeeded || 0);
        const accumulated = Number(g.amountAccumulated || 0);
        const daysToTarget = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        const expectedProgress = needed > 0 ? (accumulated / needed) * 100 : 0;
        const timeProgress = daysToTarget > 0 ? 100 - (daysToTarget / 365) * 100 : 100;
        return expectedProgress < timeProgress - 10; // 10% tolerance
    });
    if (behindGoals.length > 0) {
        alerts.push({
            type: 'info',
            icon: 'trendingUpSmall',
            message: `${behindGoals.length} goal${behindGoals.length > 1 ? 's' : ''} behind schedule`,
            action: 'financialGoal'
        });
    }
    
    // Insurance coverage alerts
    if (healthInsurance < idealHealthInsurance * 0.7) {
        alerts.push({
            type: 'warning',
            icon: 'hospitalSmall',
            message: `Health insurance below recommended level`,
            action: 'insurance'
        });
    }
    if (termInsurance < idealTermInsurance * 0.7) {
        alerts.push({
            type: 'warning',
            icon: 'shieldCheckSmall',
            message: `Term insurance below recommended level`,
            action: 'insurance'
        });
    }
    
    // High credit card usage
    if (totalCreditCardUsage > 50000) {
        alerts.push({
            type: 'info',
            icon: 'creditCardSmall',
            message: `High credit card usage: ${fmtMoney(totalCreditCardUsage)}`,
            action: 'monthlyBudget'
        });
    }
    
    // Upcoming recurring expenses (next 7 days)
    const upcomingExpenses = outflows.filter(item => {
        if ((item.frequency || 'Monthly') === 'One-Time') return false;
        // Check if any recurring expense is due in next 7 days (simplified check)
        return Number(item.amount || 0) > 0;
    });
    if (upcomingExpenses.length > 3) {
        alerts.push({
            type: 'info',
            icon: 'calendarSmall',
            message: `${upcomingExpenses.length} recurring commitments this month`,
            action: 'outflow'
        });
    }
    
    return alerts.slice(0, 5); // Limit to 5 most important alerts
}

// `netWorthSummary` is calculated in app.js from the exact combined entries used
// by the Net Worth tab. Keeping this module presentation-only prevents drift.
export function renderDashboard(appData, netWorthSummary = {}) {
    const grid = document.getElementById('dashboardGrid');
    if (!grid) return;

    const tabData = appData.tabData || {};
    const accounts = tabData.cards || [];
    const investments = tabData.inflow || [];
    const goals = tabData.financialGoal || [];
    const outflows = tabData.outflow || [];
    const emergencyFunds = tabData.emergencyFund || [];
    const taxItems = tabData.taxPlan || [];
    const gifts = tabData.gifts || [];
    const now = new Date();
    const monthData = (appData.monthlyBudgetData || {})[getMonthKey(now)] || {};

    // Get all tax deductions including auto-calculated ones (now correctly calculated)
    const autoTaxDeductions = getAutoTaxDeductionsFromAppData(appData);
    const allTaxDeductions = [...autoTaxDeductions, ...taxItems];
    const taxPlanned = allTaxDeductions.reduce((total, item) => total + Number(item.amount || 0), 0);

    // Use Budget page calculated values if available, otherwise calculate on-the-fly
    // This ensures Dashboard always shows correct values even if Budget page wasn't visited
    const totalIncome = Number(monthData._calculatedTotalIncome || sumNumbers(monthData.inflow));
    const totalOutflow = Number(monthData._calculatedTotalOutflow || sumNumbers(monthData.outflow));
    const borrowing = Number(monthData.inflow?.borrowing || 0);
    const usableIncome = totalIncome - borrowing;
    const budgetDistribution = getMonthlyBudgetDistribution(monthData);
    const actualSavings = budgetDistribution.saving;
    const actualExpenditure = budgetDistribution.expenditure;
    const savingsRate = usableIncome > 0 ? Math.max(0, actualSavings / usableIncome) : 0;
    const expenditureRate = usableIncome > 0 ? Math.max(0, actualExpenditure / usableIncome) : 0;
    
    // Calculate monthly commitments (all recurring outflows)
    const recurringOutflows = outflows.filter(item => Number(item.amount || 0) > 0 && (item.frequency || 'Monthly') !== 'One-Time');
    const monthlyCommitments = Number(monthData._calculatedMonthlyCommitments || recurringOutflows.reduce((total, item) => (
        total + toMonthlyAmount(Number(item.amount || 0), item.frequency || 'Monthly')
    ), 0));
    
    const spendable = Number(monthData._calculatedSpendable || usableIncome - monthlyCommitments);
    
    // Calculate on-demand items
    const ondemandSaving = Number(monthData.investing?.onetimeSaving || 0);
    const ondemandInvestment = Number(monthData.investing?.onetimeInvestment || 0);
    const ondemandExpenditure = Number(monthData.investing?.ondemandExpenditure || 0);
    const ondemandLiability = Number(monthData.investing?.ondemandLiability || 0);
    const totalOndemand = Number(monthData._calculatedTotalOndemand || ondemandSaving + ondemandInvestment + ondemandExpenditure + ondemandLiability);
    
    // Calculate variable expenses
    const variableExp = Number(monthData.outflow?.variableExpenditure || 0);
    const creditCardOutstanding = Number(monthData.outflow?.creditCardOutstanding || 0);
    const midMonthCC = Number(monthData.outflow?.midMonthCCOutstanding || 0);
    const actualCCOutstanding = creditCardOutstanding + midMonthCC;
    
    // Use stored values if available, otherwise calculate corrected values
    const storedVariableExp = Number(monthData._calculatedVariableExp || 0);
    const variableExpDisplay = storedVariableExp > 0 ? storedVariableExp : (variableExp - totalOndemand) + actualCCOutstanding;
    const untracked = Number(monthData._calculatedUntracked || variableExpDisplay + totalOndemand);
    const budgetBalance = Number(monthData._calculatedBudgetBalance || spendable - untracked);
    
    const transferred = Number(monthData._transferDone || 0);
    const monthClosed = Boolean(monthData._monthClosed);
    const budgetState = monthClosed ? 'Closed' : transferred > 0 ? 'In progress' : 'Needs setup';
    const budgetColor = monthClosed ? COLOR_POSITIVE : transferred > 0 ? '#3b82f6' : COLOR_WARNING;
    let budgetSurplusText = '';
    let budgetSurplusColor = COLOR_POSITIVE;
    if (totalIncome > 0) {
        if (budgetBalance > 0) {
            budgetSurplusText = `+${fmtMoney(budgetBalance)} surplus`;
            budgetSurplusColor = COLOR_POSITIVE;
        } else if (budgetBalance < 0) {
            budgetSurplusText = `${fmtMoney(Math.abs(budgetBalance))} over budget`;
            budgetSurplusColor = COLOR_NEGATIVE;
        } else {
            budgetSurplusText = 'Balanced';
            budgetSurplusColor = COLOR_POSITIVE;
        }
    }

    // Get credit card usage and expenditure account info
    const expenditureAccount = accounts.find(c => c.isPrimary === "Yes");
    const totalCreditCardUsage = creditCardOutstanding + midMonthCC;
    const expenditureAccountBalance = Number(expenditureAccount?.balance || 0);

    // Categorize goals by status (using stored status from goal entries)
    const ongoingGoals = goals.filter(goal => goal.status === 'Ongoing');
    const plannedGoals = goals.filter(goal => goal.status === 'Planned');
    const missedGoals = goals.filter(goal => goal.status === 'Missed');
    const achievedGoals = goals.filter(goal => goal.status === 'Achieved');
    const coveredGoals = goals.filter(goal => goal.status === 'Covered');

    // For compatibility with existing code
    const activeGoals = ongoingGoals;
    const totalGoals = goals.filter(goal => {
        const needed = Number(goal.amountNeeded || 0);
        return needed > 0;
    });
    
    // Categorize goals by type (handle both formats: with/without spaces)
    // Treat unspecified types as LongTerm (default)
    const shortTermGoals = goals.filter(goal => {
        const type = (goal.goalType || '').toLowerCase().trim();
        return type === 'shortterm' || type === 'short term';
    });
    const midTermGoals = goals.filter(goal => {
        const type = (goal.goalType || '').toLowerCase().trim();
        return type === 'midterm' || type === 'mid term';
    });
    const longTermGoals = goals.filter(goal => {
        const type = (goal.goalType || '').toLowerCase().trim();
        // Include explicit longterm types and unspecified types (default to longterm)
        return type === 'longterm' || type === 'long term' || !type;
    });
    
    // Helper function to convert stored goal type to display value
    const formatGoalType = (type) => {
        const displayMap = {
            'ShortTerm': 'Short Term',
            'MidTerm': 'Mid Term',
            'LongTerm': 'Long Term'
        };
        return displayMap[type] || type;
    };
    const nextGoal = [...activeGoals].sort((a, b) => {
        const aDate = a.targetDate ? new Date(`${a.targetDate}T00:00:00`).getTime() : Infinity;
        const bDate = b.targetDate ? new Date(`${b.targetDate}T00:00:00`).getTime() : Infinity;
        return aDate - bDate;
    })[0];
    const totalGoalGap = activeGoals.reduce((total, goal) => (
        total + Math.max(0, Number(goal.amountNeeded || 0) - Number(goal.amountAccumulated || 0))
    ), 0);
    const nextGoalProgress = nextGoal
        ? Math.min(100, (Number(nextGoal.amountAccumulated || 0) / Number(nextGoal.amountNeeded || 0)) * 100)
        : 0;

    const emergencyFund = Number(emergencyFunds[0]?.currentFund || 0);
    const insurancePolicies = tabData.insurance || [];
    const insuranceCount = insurancePolicies.length;
    const insuranceCover = insurancePolicies.reduce((total, policy) => total + Number(policy.sumAssured || 0), 0);
    
    // Calculate age from DOB
    let userAge = 30; // Default age
    if (appData.dateOfBirth) {
        const dob = new Date(appData.dateOfBirth);
        const today = new Date();
        userAge = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            userAge--;
        }
    }
    
    // Calculate monthly income and expenses
    const monthlyIncome = sumNumbers(monthData.inflow) || appData.fixedMonthlyIncome || 50000;
    const monthlyExpenses = sumNumbers(monthData.outflow) || 30000; // Default to 30k if no data
    
    // Calculate current savings (from accounts with purpose = Savings)
    const currentSavings = accounts
        .filter(acc => acc.purpose === 'Savings' || acc.purpose === 'Savings')
        .reduce((total, acc) => total + Number(acc.balance || 0), 0);
    
    // Calculate ideal insurance amounts with realistic formulas
    const idealHealthInsurance = calculateIdealHealthInsurance(userAge, appData.userLocation, monthlyIncome);
    const idealTermInsurance = calculateIdealTermInsurance(userAge, monthlyIncome, currentSavings);
    const idealEmergencyFund = calculateIdealEmergencyFund(appData);
    
    // Determine if user is in a metro city for tooltip
    const metroCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Gurgaon', 'Noida'];
    const cityName = (appData.userLocation || '').split(',')[0].trim();
    const isMetro = metroCities.some(metro => cityName.includes(metro));
    
    // Get current health and term insurance
    const healthInsurance = insurancePolicies
        .filter(p => p.policyType === 'Health')
        .reduce((total, p) => total + Number(p.sumAssured || 0), 0);
    const termInsurance = insurancePolicies
        .filter(p => p.policyType === 'Term Life' || p.policyType === 'Whole Life')
        .reduce((total, p) => total + Number(p.sumAssured || 0), 0);
    
    // Calculate progress percentages
    const healthInsuranceProgress = idealHealthInsurance > 0 ? Math.min(100, (healthInsurance / idealHealthInsurance) * 100) : 0;
    const termInsuranceProgress = idealTermInsurance > 0 ? Math.min(100, (termInsurance / idealTermInsurance) * 100) : 0;
    const emergencyFundProgress = idealEmergencyFund > 0 ? Math.min(100, (emergencyFund / idealEmergencyFund) * 100) : 0;
    const accountBalance = accounts.reduce((total, account) => total + Number(account.balance || 0), 0);
    const totalCreditLimit = accounts.filter(account => account.creditCardPresent?.toLowerCase() === 'yes')
        .reduce((total, account) => total + Number(account.creditLimit || 0), 0);
    const primaryAccount = accounts.find(account => account.isPrimary === 'Yes');
    const salaryAccount = accounts.find(account => account.purpose === 'Salary' && account.isPrimary !== 'Yes');
    const savingAccount = accounts.find(account => (account.purpose === 'Savings' || account.purpose === 'Saving') && account.isPrimary !== 'Yes');
    const investmentAccount = accounts.find(account => account.purpose === 'Investment' && account.isPrimary !== 'Yes');
    const monthlyInvestment = investments.reduce((total, investment) => {
        if ((investment.frequency || 'Monthly') === 'One-Time') return total;
        return total + toMonthlyAmount(Number(investment.amount || 0), investment.frequency || 'Monthly');
    }, 0);
    const plannedGifts = gifts.reduce((total, gift) => total + Number(gift.amount || 0), 0);
    const netWorth = Number(netWorthSummary.netWorth || 0);
    const totalAssets = Number(netWorthSummary.totalAssets || 0);
    const totalLiabilities = Number(netWorthSummary.totalLiabilities || 0);
    // Portfolio value = total assets - total liabilities (net worth)
    const portfolioValue = totalAssets - totalLiabilities;
    const assetCount = Number(netWorthSummary.assetCount || 0);
    const financialYearTotals = getFinancialYearTotals(appData, now);
    const currentExpenses = (appData.expenseTrackingData || {})[getMonthKey(now)]?.expenses || [];
    const expensesByCategory = groupExpenses(currentExpenses, 'category');
    const expensesByPaymentMethod = groupExpenses(currentExpenses, 'paymentMethod');

    // Calculate 6-month trend data
    const sixMonthData = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = getMonthKey(date);
        const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
        const mData = (appData.monthlyBudgetData || {})[monthKey] || {};
        
        const distribution = getMonthlyBudgetDistribution(mData);
        const { income, investment, expenditure, saving, liability, other: others } = distribution;
        
        sixMonthData.push({ monthName, income, investment, expenditure, saving, liability, others });
    }
    
    const maxValue = Math.max(...sixMonthData.flatMap(m => [m.investment, m.expenditure, m.saving, m.liability, m.others])) || 1;

    // Calculate Financial Health Score using existing data
    const healthScore = calculateFinancialHealthScore({
        emergencyFund, idealEmergencyFund, totalAssets, totalLiabilities,
        usableIncome, monthlyCommitments, healthInsurance, idealHealthInsurance,
        termInsurance, idealTermInsurance, ongoingGoals, monthlyInvestment, monthData,
        assets: accounts
    });
    
    // Generate insights and recommendations
    const insights = generateInsights({
        budgetBalance, emergencyFund, idealEmergencyFund, savingsRate, healthInsurance,
        idealHealthInsurance, termInsurance, idealTermInsurance, ongoingGoals,
        monthlyInvestment, usableIncome, monthlyCommitments, totalAssets, totalLiabilities,
        assets: accounts, taxPlan: taxItems
    });
    
    // Trigger notification check
    if (window.triggerNotificationCheck) {
        window.triggerNotificationCheck();
    }

    // Prepare Health Score HTML (to be placed after Insights)
    const healthScoreHTML = `
        <article class="dash-card dash-health-score" style="grid-column: 1 / -1;">
            <div class="dash-card-header">
                <span class="dash-card-title" title="Overall financial health based on 6 key metrics. Hover over each component below for details." style="cursor: help;">${iconSvg('heartPulse', 'dash-title-icon')} Financial Health Score</span>
                <span class="dash-card-badge" style="background:${healthScore.healthColor}22;color:${healthScore.healthColor}">${healthScore.healthLevel}</span>
            </div>
            <div class="dash-health-score-main">
                <div class="dash-health-score-circle">
                    <svg viewBox="0 0 100 100" class="dash-health-score-svg">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surf3)" stroke-width="8"/>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="${healthScore.healthColor}" stroke-width="8" 
                                stroke-dasharray="${(healthScore.score / 100) * 283} 283" 
                                stroke-dashoffset="0" 
                                transform="rotate(-90 50 50)"
                                style="transition: stroke-dasharray 0.6s ease;"/>
                    </svg>
                    <div class="dash-health-score-number">${healthScore.score}</div>
                </div>
                <div class="dash-health-breakdown">
                    ${healthScore.breakdown.map((item, index) => `
                        <div class="dash-health-item" style="cursor: help;">
                            <div class="dash-health-item-header">
                                <span class="dash-health-item-label" title="${item.tooltip || ''}">${item.label}</span>
                                <span class="dash-health-item-score">${item.score}/${item.max}</span>
                            </div>
                            <div class="dash-health-item-bar">
                                <div class="dash-health-item-fill" style="width:${item.percentage}%;background:${item.percentage >= 70 ? '#10b981' : item.percentage >= 40 ? '#f59e0b' : '#ef4444'}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </article>
    `;

    // Determine quick actions based on month phase
    const phase = getMonthPhase(monthData);
    const budgetActions = [];
    
    if (phase === 'beginning_pending') {
        budgetActions.push({ icon: 'edit', label: 'Edit', action: "switchToTab('monthlyBudget'); setTimeout(() => document.getElementById('toggleBudgetEdit')?.click(), 100); return false;" });
        budgetActions.push({ icon: 'check', label: 'Transfer', action: "switchToTab('monthlyBudget'); setTimeout(() => document.getElementById('btnDoTransfer')?.click(), 100); return false;" });
    } else if (phase === 'beginning_done' || phase === 'mid_month') {
        budgetActions.push({ icon: 'refresh', label: 'Update', action: "openQuickUpdatePopup(); return false;" });
    } else if (phase === 'end_month') {
        budgetActions.push({ icon: 'lock', label: 'Close', action: "switchToTab('monthlyBudget'); setTimeout(() => document.getElementById('btnCarryForward')?.click(), 100); return false;" });
        budgetActions.push({ icon: 'refresh', label: 'Update', action: "openQuickUpdatePopup(); return false;" });
    }
    
    // Always add Budget icon
    budgetActions.push({ icon: 'wallet', label: 'Budget', action: "switchToTab('monthlyBudget'); return false;" });

    grid.innerHTML = `
        <article class="dash-card dash-card-primary">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('calendar', 'dash-title-icon')} This month</span>
                <span class="dash-card-badge" style="background:${budgetColor}22;color:${budgetColor}">${budgetState}</span>
                <div class="dash-card-header-actions">
                    ${budgetActions.map(a => `
                        <button onclick="${a.action}" class="dash-card-action-btn" title="${a.label}">
                            ${iconSvg(a.icon, 'dash-action-icon')}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="dash-primary-value" style="color:${spendable >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">${fmtMoney(spendable)}</div>
            <p class="dash-primary-label">available after recurring commitments</p>
            ${budgetSurplusText ? `<div class="dash-stat-row"><span class="dash-stat-label">Budget status</span><span class="dash-stat-value" style="color:${budgetSurplusColor}">${budgetSurplusText}</span></div>` : ''}
            <div class="dash-stat-row"><span class="dash-stat-label">Total Inflow</span><span class="dash-stat-value">${fmtMoney(totalIncome)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Total Outflow</span><span class="dash-stat-value">${fmtMoney(totalOutflow)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Monthly commitments</span><span class="dash-stat-value">${fmtMoney(monthlyCommitments)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Variable Expenses</span><span class="dash-stat-value" style="color:${COLOR_NEGATIVE}">${fmtMoney(variableExpDisplay)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">On-Demand Expense</span><span class="dash-stat-value" style="color:${COLOR_WARNING}">${fmtMoney(totalOndemand)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Credit card usage</span><span class="dash-stat-value" style="color:${totalCreditLimit > 0 ? (totalCreditCardUsage / totalCreditLimit > 0.5 ? '#ef4444' : totalCreditCardUsage / totalCreditLimit > 0.3 ? '#f97316' : totalCreditCardUsage / totalCreditLimit > 0.1 ? COLOR_WARNING : COLOR_POSITIVE) : COLOR_POSITIVE}">${fmtMoney(totalCreditCardUsage)}</span></div>
            <div class="dash-card-note">Values from Budget tab</div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('users', 'dash-title-icon')} Accounts & Net Worth</span>
                <span class="dash-card-badge" style="background:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}22;color:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">Current</span>
                <div class="dash-card-header-actions">
                    <button onclick="switchToTab('cards'); return false;" class="dash-card-action-btn" title="View Accounts">
                        ${iconSvg('bank', 'dash-action-icon')}
                    </button>
                    <button onclick="switchToTab('netWorth'); return false;" class="dash-card-action-btn" title="View Net Worth">
                        ${iconSvg('barChart', 'dash-action-icon')}
                    </button>
                </div>
            </div>
            <div class="dash-primary-value" style="color:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">${fmtMoney(netWorth)}</div>
            <p class="dash-primary-label">net worth (assets less liabilities)</p>
            <div class="dash-stat-row"><span class="dash-stat-label">Total balance (all accounts)</span><span class="dash-stat-value">${fmtMoney(accountBalance)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Salary credited this month</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(monthData.inflow?.primaryIncome || 0)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Primary spending</span><span class="dash-stat-value">${expenditureAccount ? fmtMoney(expenditureAccount.balance || 0) : 'Not set'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Savings account</span><span class="dash-stat-value">${savingAccount ? fmtMoney(savingAccount.balance || 0) : 'Not set'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Total credit limit</span><span class="dash-stat-value" style="color:#3b82f6">${fmtMoney(totalCreditLimit)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Assets</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(totalAssets)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Liabilities</span><span class="dash-stat-value" style="color:${COLOR_NEGATIVE}">${fmtMoney(totalLiabilities)}</span></div>
            <div class="dash-card-note">${accounts.length} account${accounts.length === 1 ? '' : 's'} · ${assetCount} asset${assetCount === 1 ? '' : 's'} tracked</div>
        </article>

        <article class="dash-card dash-spend-breakdown">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('pieChart', 'dash-title-icon')} Spending breakdown</span>
                <span class="dash-card-badge" style="background:#f9731622;color:#f97316">This month</span>
                <div class="dash-card-header-actions">
                    <button onclick="switchToTab('expenseTracking'); return false;" class="dash-card-action-btn" title="View Expenses">
                        ${iconSvg('shoppingCart', 'dash-action-icon')}
                    </button>
                </div>
            </div>
            <div class="dash-distribution-section">
                <span class="dash-distribution-heading">By category</span>
                ${renderDistributionRows(expensesByCategory, 5, true, true)}
            </div>
            ${Object.keys(expensesByPaymentMethod).some(method => method !== 'Not specified') ? `
                <div class="dash-distribution-section">
                    <span class="dash-distribution-heading">By payment method</span>
                    ${renderDistributionRows(expensesByPaymentMethod, 0, true, false)}
                </div>` : ''}
            <div class="dash-card-note">Recorded transactions only</div>
        </article>

        <article class="dash-card dash-kpi-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('trendingUp', 'dash-title-icon')} Savings Rate</span>
            </div>
            <div class="dash-primary-value" style="color:${savingsRate >= 0.2 ? COLOR_POSITIVE : savingsRate >= 0.1 ? '#f59e0b' : COLOR_NEGATIVE}">${Math.round(savingsRate * 100)}%</div>
            <p class="dash-primary-label">of usable income actually saved</p>
            <div class="dash-stat-row"><span class="dash-stat-label">Usable Income</span><span class="dash-stat-value">${fmtMoney(usableIncome)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Saved Monthly</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(actualSavings)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Benchmark</span><span class="dash-stat-value">${savingsRate >= 0.2 ? 'Excellent (≥20%)' : savingsRate >= 0.1 ? 'Good (≥10%)' : 'Below target'}</span></div>
            <div class="dash-card-note dash-rate-note">Budget Savings category: automatic/fixed saving + on-demand saving.</div>
            <div class="dash-rate-divider" role="separator"></div>
            <div class="dash-card-header dash-secondary-rate-header">
                <span class="dash-card-title">${iconSvg('trendingDown', 'dash-title-icon')} Expenditure Rate</span>
            </div>
            <div class="dash-secondary-value" style="color:${expenditureRate <= 0.5 ? COLOR_POSITIVE : expenditureRate <= 0.7 ? '#f59e0b' : COLOR_NEGATIVE}">${Math.round(expenditureRate * 100)}%</div>
            <p class="dash-primary-label">of usable income spent</p>
            <div class="dash-stat-row"><span class="dash-stat-label">Monthly Expenditure</span><span class="dash-stat-value" style="color:${COLOR_NEGATIVE}">${fmtMoney(actualExpenditure)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Benchmark</span><span class="dash-stat-value">${expenditureRate <= 0.5 ? 'Healthy (≤50%)' : expenditureRate <= 0.7 ? 'Watch (≤70%)' : 'High (>70%)'}</span></div>
            <div class="dash-card-note dash-rate-note">Budget Expenditure category: fixed, variable, manual, card, and on-demand expenditure.</div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('target', 'dash-title-icon')} Goals & Investment</span>
                <span class="dash-card-badge" style="background:#3b82f622;color:#3b82f6">${goals.length} total</span>
                <div class="dash-card-header-actions">
                    <button onclick="switchToTab('financialGoal'); return false;" class="dash-card-action-btn" title="View Goals">
                        ${iconSvg('target', 'dash-action-icon')}
                    </button>
                    <button onclick="switchToTab('inflow'); return false;" class="dash-card-action-btn" title="View Investments">
                        ${iconSvg('trendingUp', 'dash-action-icon')}
                    </button>
                    <button onclick="switchToTab('gifts'); return false;" class="dash-card-action-btn" title="View Gifts">
                        ${iconSvg('star', 'dash-action-icon')}
                    </button>
                </div>
            </div>
            ${ongoingGoals.length > 0 ? `
                <div class="dash-goal-focus">
                    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:start;">
                        <div>
                            <div class="dash-goal-name">All Goals Combined</div>
                            <div class="dash-goal-meta">${ongoingGoals.length} ongoing · ${plannedGoals.length} planned · ${achievedGoals.length} achieved · ${missedGoals.length} missed${coveredGoals.length > 0 ? ` · ${coveredGoals.length} covered` : ''}</div>
                            <div class="dash-goal-meta" style="margin-top:4px;">${shortTermGoals.length} short-term · ${midTermGoals.length} mid-term · ${longTermGoals.length} long-term</div>
                            ${(() => {
                                const totalNeeded = ongoingGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
                                const totalAccumulated = ongoingGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
                                const overallProgress = totalNeeded > 0 ? Math.min(100, (totalAccumulated / totalNeeded) * 100) : 0;
                                const totalRemaining = Math.max(0, totalNeeded - totalAccumulated);
                                return `
                                    <div style="margin-top:4px;">
                                        <span style="font-size:13px;font-weight:500;color:${totalRemaining > 0 ? COLOR_WARNING : COLOR_POSITIVE}">${fmtMoney(totalRemaining)} remaining</span>
                                    </div>
                                `;
                            })()}
                        </div>
                        <div class="dash-rate-divider" style="height:60px;margin:0;"></div>
                        <div>
                            ${(() => {
                                const totalNeeded = ongoingGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
                                const totalAccumulated = ongoingGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
                                const overallProgress = totalNeeded > 0 ? Math.min(100, (totalAccumulated / totalNeeded) * 100) : 0;
                                return `
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <span class="dash-goal-name" style="font-weight:600;">Combined Progress</span>
                                        <span style="font-size:13px;font-weight:600;color:#3b82f6">${Math.round(overallProgress)}%</span>
                                    </div>
                                    <div class="dash-progress-bar" style="height:12px;"><div class="dash-progress-fill" style="width:${overallProgress}%;background:#3b82f6"></div></div>
                                    <div style="display:flex;justify-content:space-between;margin-top:8px;">
                                        <span class="dash-goal-meta">Accumulated: ${fmtMoney(totalAccumulated)}</span>
                                        <span class="dash-goal-meta">Target: ${fmtMoney(totalNeeded)}</span>
                                    </div>
                                `;
                            })()}
                        </div>
                    </div>
                </div>` : '<p class="dash-empty-state">No ongoing goals.</p>'}
            <div class="dash-stat-row"><span class="dash-stat-label">Portfolio value</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(portfolioValue)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Monthly investment</span><span class="dash-stat-value">${fmtMoney(monthlyInvestment)}</span></div>
            <div class="dash-card-note">${ongoingGoals.length} ongoing · ${plannedGoals.length} planned · ${achievedGoals.length} achieved · ${missedGoals.length} missed${coveredGoals.length > 0 ? ` · ${coveredGoals.length} covered` : ''} · ${shortTermGoals.length} short-term · ${midTermGoals.length} mid-term · ${longTermGoals.length} long-term</div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('shield', 'dash-title-icon')} Preparedness & Budget Planning</span>
                <div class="dash-card-header-actions">
                    <button onclick="switchToTab('taxPlan'); return false;" class="dash-card-action-btn" title="View Tax Plan">
                        ${iconSvg('fileText', 'dash-action-icon')}
                    </button>
                    <button onclick="switchToTab('insurance'); return false;" class="dash-card-action-btn" title="Review Insurance">
                        ${iconSvg('shield', 'dash-action-icon')}
                    </button>
                </div>
            </div>
            <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:16px;">
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:13px;font-weight:500;color:var(--text)">Emergency Fund</span>
                        <span style="font-size:12px;color:var(--dim)">${Math.round(emergencyFundProgress)}%</span>
                    </div>
                    <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${emergencyFundProgress}%;background:${emergencyFundProgress >= 100 ? COLOR_POSITIVE : COLOR_WARNING}"></div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;">
                        <span class="dash-goal-meta">Current: ${fmtMoney(emergencyFund)}</span>
                        <span class="dash-goal-meta" style="cursor:help;" title="Formula: (Fixed Liabilities + Fixed Expenditure + Average Variable Expenses) × 6\nBased on your Outflow tab and budget history\nIdeal: ${fmtMoney(idealEmergencyFund)}">Ideal: ${fmtMoney(idealEmergencyFund)}</span>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:13px;font-weight:500;color:var(--text)">Health Insurance</span>
                        <span style="font-size:12px;color:var(--dim)">${Math.round(healthInsuranceProgress)}%</span>
                    </div>
                    <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${healthInsuranceProgress}%;background:${healthInsuranceProgress >= 100 ? COLOR_POSITIVE : COLOR_WARNING}"></div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;">
                        <span class="dash-goal-meta">Current: ${fmtMoney(healthInsurance)}</span>
                        <span class="dash-goal-meta" style="cursor:help;" title="Formula: 50% of Annual Income (minimum ₹${isMetro ? '5L' : '3L'})\nAge adjustment: ${userAge >= 45 ? '1.5x' : userAge >= 35 ? '1.2x' : '1.0x'}\nYour income: ${fmtMoney(monthlyIncome)}/month (${fmtMoney(monthlyIncome * 12)}/year)\nBase: ${fmtMoney(monthlyIncome * 12 * 0.5)}\nAfter age adjustment: ${fmtMoney(monthlyIncome * 12 * 0.5 * (userAge >= 45 ? 1.5 : userAge >= 35 ? 1.2 : 1.0))}\nIdeal: ${fmtMoney(idealHealthInsurance)}">Ideal: ${fmtMoney(idealHealthInsurance)}</span>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:13px;font-weight:500;color:var(--text)">Term Insurance</span>
                        <span style="font-size:12px;color:var(--dim)">${Math.round(termInsuranceProgress)}%</span>
                    </div>
                    <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${termInsuranceProgress}%;background:${termInsuranceProgress >= 100 ? COLOR_POSITIVE : COLOR_WARNING}"></div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;">
                        <span class="dash-goal-meta">Current: ${fmtMoney(termInsurance)}</span>
                        <span class="dash-goal-meta" style="cursor:help;" title="Formula: (Annual Income × Multiplier) - Current Savings\nMultiplier based on age: ${userAge < 35 ? '15x' : userAge < 45 ? '12x' : '10x'}\nYour income: ${fmtMoney(monthlyIncome)}/month (${fmtMoney(monthlyIncome * 12)}/year)\nBase cover: ${fmtMoney(monthlyIncome * 12)} × ${userAge < 35 ? '15' : userAge < 45 ? '12' : '10'} = ${fmtMoney(monthlyIncome * 12 * (userAge < 35 ? 15 : userAge < 45 ? 12 : 10))}\nLess savings: ${fmtMoney(currentSavings)}\nIdeal: ${fmtMoney(monthlyIncome * 12 * (userAge < 35 ? 15 : userAge < 45 ? 12 : 10) - currentSavings)}">Ideal: ${fmtMoney(idealTermInsurance)}</span>
                    </div>
                </div>
            </div>
            <div class="dash-stat-row"><span class="dash-stat-label">Debt-to-Income Ratio</span><span class="dash-stat-value" style="color:${budgetDistribution.liability > 0 && totalIncome > 0 ? (budgetDistribution.liability / totalIncome > 0.4 ? COLOR_NEGATIVE : budgetDistribution.liability / totalIncome > 0.3 ? COLOR_WARNING : COLOR_POSITIVE) : COLOR_POSITIVE};cursor:help;" title="Formula: (Monthly Liabilities / Total Income) × 100\nMonthly Liabilities: Fixed Liabilities (EMI, Rent, Maintenance, etc.) + Debt Repayment + On-demand Liability\nTotal Income: All income sources including primary, secondary, and other inflows\nPercentage shows what portion of income goes toward debt obligations\nGreen (≤30%): Healthy debt level\nYellow (31-40%): Moderate debt burden\nRed (>40%): High debt burden - concerning">${totalIncome > 0 ? Math.round((budgetDistribution.liability / totalIncome) * 100) + '%' : 'N/A'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Tax items logged</span><span class="dash-stat-value" style="cursor:help;" title="Sum of all tax deductions from:\n• Outflow tab: Insurance premiums (Section 80D)\n• Inflow tab: Recurring investments (Section 80C)\n• Tax Plan tab: Manual tax planning entries\nIncludes both auto-calculated and manually entered deductions\nUsed for ITR-2 tax planning and savings calculation">${fmtMoney(taxPlanned)}</span></div>
            <div class="dash-card-note">${insuranceCount} polic${insuranceCount === 1 ? 'y' : 'ies'} tracked</div>
        </article>
        
        <article class="dash-card dash-fy-overview" style="grid-column: 1 / -1;">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('barChart', 'dash-title-icon')} Financial Year overview</span>
                <span class="dash-card-badge" style="background:#3b82f622;color:#3b82f6">FY ${now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1}-${String((now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + 1).slice(-2)}</span>
                <div class="dash-card-header-actions">
                    <button onclick="switchToTab('monthlyBudget'); setTimeout(() => { if (typeof setAnnualBudgetView === 'function') setAnnualBudgetView(); }, 100); return false;" class="dash-card-action-btn" title="View Annual Budget">
                        ${iconSvg('barChart', 'dash-action-icon')}
                    </button>
                </div>
            </div>
            <div class="dash-fy-kpis">
                <div><span>Income</span><strong>${fmtMoney(financialYearTotals.income)}</strong></div>
                <div><span>Invested</span><strong style="color:#3b82f6">${fmtMoney(financialYearTotals.investment)}</strong></div>
                <div><span>Liabilities</span><strong style="color:#ef4444">${fmtMoney(financialYearTotals.liability)}</strong></div>
                <div><span>Saved</span><strong style="color:#22c55e">${fmtMoney(financialYearTotals.saving)}</strong></div>
                <div><span>Spent</span><strong style="color:#f97316">${fmtMoney(financialYearTotals.expenditure)}</strong></div>
                <div><span>Insurance</span><strong style="color:#a855f7">${fmtMoney(financialYearTotals.insurance)}</strong></div>
                <div><span>Others</span><strong style="color:#eab308">${fmtMoney(financialYearTotals.other)}</strong></div>
            </div>
        </article>
        
        ${insights.length > 0 ? `
        <article class="dash-card dash-insights" style="grid-column: 1 / -1;">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('lightbulb', 'dash-title-icon')} Insights & Recommendations</span>
                <span class="dash-card-badge" style="background:#3b82f622;color:#3b82f6">${insights.length} tip${insights.length > 1 ? 's' : ''}</span>
            </div>
            <div class="dash-insights-list">
                ${insights.map(insight => `
                    <div class="dash-insight-item dash-insight-${insight.type}">
                        <span class="dash-insight-icon">${iconSvg(insight.icon, 'dash-insight-svg')}</span>
                        <span class="dash-insight-message">${insight.message}</span>
                    </div>
                `).join('')}
            </div>
        </article>
        ` : ''}
        
        ${healthScoreHTML}
        
        <article class="dash-card" style="grid-column: 1 / -1;">
            <div class="dash-card-header"><span class="dash-card-title">6-Month Trend</span></div>
            <canvas id="dashboardTrendChart" style="margin-top:16px;max-height:250px;"></canvas>
        </article>
        </article>`;
    
    // Render the 6-month trend chart using Chart.js
    setTimeout(async () => {
        const canvas = document.getElementById('dashboardTrendChart');
        if (!canvas) return;
        
        // Lazy-load Chart.js if needed
        if (typeof Chart === 'undefined') {
            try {
                await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
            } catch (err) {
                console.error('Failed to load Chart.js:', err);
                return;
            }
        }
        
        // Destroy existing chart instance to prevent canvas reuse error
        if (dashboardTrendChartInstance) {
            dashboardTrendChartInstance.destroy();
            dashboardTrendChartInstance = null;
        }
        
        const ctx = canvas.getContext('2d');
        dashboardTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sixMonthData.map(m => m.monthName),
                datasets: [
                    {
                        label: 'Income',
                        data: sixMonthData.map(m => m.income),
                        borderColor: '#22c55e',
                        backgroundColor: '#22c55e22',
                        borderWidth: 3,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Saving',
                        data: sixMonthData.map(m => m.saving),
                        borderColor: '#eab308',
                        backgroundColor: '#eab30822',
                        borderWidth: 3,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Expenditure',
                        data: sixMonthData.map(m => m.expenditure),
                        borderColor: '#ef4444',
                        backgroundColor: '#ef444422',
                        borderWidth: 3,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Investment',
                        data: sixMonthData.map(m => m.investment),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f622',
                        borderWidth: 3,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Liability',
                        data: sixMonthData.map(m => m.liability),
                        borderColor: '#f97316',
                        backgroundColor: '#f9731622',
                        borderWidth: 3,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${fmtMoney(value)}`;
                            }
                        }
                    },
                    datalabels: { display: false }
                },
                scales: {
                    x: {
                        stacked: false
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000) + 'K';
                            }
                        }
                    }
                }
            }
        });
    }, 100);
}

// Alert carousel navigation - circular rotation with touch/swipe support
let currentAlertIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

window.rotateAlert = function(direction) {
    const cards = document.querySelectorAll('.dash-alert-card');
    const dots = document.querySelectorAll('.dash-carousel-dot');
    if (cards.length === 0) return;
    
    // Remove active class from current
    cards[currentAlertIndex].classList.remove('active');
    dots[currentAlertIndex].classList.remove('active');
    
    // Calculate new index with circular rotation
    currentAlertIndex = (currentAlertIndex + direction + cards.length) % cards.length;
    
    // Add active class to new
    cards[currentAlertIndex].classList.add('active');
    dots[currentAlertIndex].classList.add('active');
};

window.goToAlert = function(index) {
    const cards = document.querySelectorAll('.dash-alert-card');
    const dots = document.querySelectorAll('.dash-carousel-dot');
    if (cards.length === 0) return;
    
    // Remove active class from current
    cards[currentAlertIndex].classList.remove('active');
    dots[currentAlertIndex].classList.remove('active');
    
    // Set new index
    currentAlertIndex = index;
    
    // Add active class to new
    cards[currentAlertIndex].classList.add('active');
    dots[currentAlertIndex].classList.add('active');
};

// Initialize touch/swipe support for carousel
function initCarouselTouchSupport() {
    const track = document.querySelector('.dash-alerts-carousel-track');
    if (!track) return;
    
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    // Also support mouse drag on desktop
    let mouseDown = false;
    track.addEventListener('mousedown', (e) => {
        mouseDown = true;
        touchStartX = e.screenX;
    });
    
    track.addEventListener('mouseup', (e) => {
        if (mouseDown) {
            touchEndX = e.screenX;
            handleSwipe();
            mouseDown = false;
        }
    });
    
    track.addEventListener('mouseleave', () => {
        mouseDown = false;
    });
    
    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance for swipe
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left - go to next
                rotateAlert(1);
            } else {
                // Swiped right - go to previous
                rotateAlert(-1);
            }
        }
    }
}

// Initialize description tooltip touch support for mobile
function initDescTooltipTouchSupport() {
    const tooltipWrappers = document.querySelectorAll('.desc-tooltip-wrapper');
    
    tooltipWrappers.forEach(wrapper => {
        const tooltip = wrapper.querySelector('.desc-tooltip-text');
        if (!tooltip) return;
        
        // Mobile: Toggle on tap
        wrapper.addEventListener('click', (e) => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                e.stopPropagation();
                tooltip.style.visibility = tooltip.style.visibility === 'visible' ? 'hidden' : 'visible';
                tooltip.style.opacity = tooltip.style.opacity === '1' ? '0' : '1';
            }
        });
    });
    
    // Hide tooltips when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            if (!e.target.closest('.desc-tooltip-wrapper')) {
                document.querySelectorAll('.desc-tooltip-text').forEach(t => {
                    t.style.visibility = 'hidden';
                    t.style.opacity = '0';
                });
            }
        }
    });
}

// Keyboard navigation support (arrow keys)
function initCarouselKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
        const carousel = document.querySelector('.dash-alerts-carousel');
        if (!carousel) return;
        
        // Only handle if carousel is visible
        const rect = carousel.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                rotateAlert(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                rotateAlert(1);
            }
        }
    });
}

// Initialize touch and keyboard support after dashboard renders
setTimeout(() => {
    initCarouselTouchSupport();
    initCarouselKeyboardSupport();
    initDescTooltipTouchSupport();
}, 500);
