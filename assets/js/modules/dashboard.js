// ── SmartFin Dashboard Module ────────────────────────────────────────────────
// A deliberately compact, decision-oriented summary of the detailed tabs.
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_WARNING, toMonthlyAmount } from './constants.js';
import { iconSvg } from './icons.js';

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
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(Number(value) || 0);
    } catch {
        return '₹0';
    }
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

// Calculate Financial Health Score using existing data - more realistic scoring
function calculateFinancialHealthScore(data) {
    const { emergencyFund, idealEmergencyFund, totalAssets, totalLiabilities, 
            usableIncome, monthlyCommitments, healthInsurance, idealHealthInsurance,
            termInsurance, idealTermInsurance, activeGoals, monthlyInvestment, monthData } = data;
    
    let score = 0;
    const breakdown = [];
    
    // 1. Emergency Fund Coverage (20 points) - More gradual scoring
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
    const efScore = Math.round(efCoverage * 20);
    score += efScore;
    const efTooltip = `Emergency Fund (20 points max)
Current: ₹${Math.round(emergencyFund).toLocaleString('en-IN')}
Ideal: ₹${Math.round(idealEmergencyFund).toLocaleString('en-IN')}
Coverage: ${Math.round(efCoverage * 100)}%

Scoring:
• 0-50% coverage = 0-50% score (gradual)
• 50-100% coverage = 50-100% score
• Based on 6 months of expenses`;
    breakdown.push({ label: 'Emergency Fund', score: efScore, max: 20, percentage: Math.round(efCoverage * 100), tooltip: efTooltip });
    
    // 2. Debt-to-Income Ratio (25 points) - More realistic thresholds
    let debtScore = 0;
    if (usableIncome > 0) {
        const debtRatio = monthlyCommitments / usableIncome;
        // Excellent: <30%, Good: 30-40%, Fair: 40-50%, Poor: >50%
        if (debtRatio < 0.3) {
            debtScore = 25; // Excellent
        } else if (debtRatio < 0.4) {
            debtScore = 20; // Good
        } else if (debtRatio < 0.5) {
            debtScore = 12; // Fair
        } else if (debtRatio < 0.7) {
            debtScore = 5; // Poor
        } else {
            debtScore = 0; // Critical
        }
    }
    score += debtScore;
    const debtRatio = usableIncome > 0 ? monthlyCommitments / usableIncome : 1;
    const debtTooltip = `Debt Management (25 points max)
Monthly Commitments: ₹${Math.round(monthlyCommitments).toLocaleString('en-IN')}
Usable Income: ₹${Math.round(usableIncome).toLocaleString('en-IN')}
Debt-to-Income Ratio: ${Math.round(debtRatio * 100)}%

Scoring:
• <30% = 25 points (Excellent)
• 30-40% = 20 points (Good)
• 40-50% = 12 points (Fair)
• 50-70% = 5 points (Poor)
• ≥70% = 0 points (Critical)

Note: Only includes liabilities & expenditures, NOT savings/investments`;
    breakdown.push({ label: 'Debt Management', score: debtScore, max: 25, percentage: Math.round(Math.max(0, (1 - Math.min(1, debtRatio)) * 100)), tooltip: debtTooltip });
    
    // 3. Savings Rate (20 points) - Actual savings made (not just available)
    let savingsScore = 0;
    if (usableIncome > 0) {
        // Calculate actual savings rate using actual savings and investments made
        const fixedSaving = Number(monthData.outflow?.fixedSaving || 0);
        const onetimeSaving = Number(monthData.investing?.onetimeSaving || 0);
        const fixedInvestment = Number(monthData.outflow?.fixedInvestment || 0);
        const onetimeInvestment = Number(monthData.investing?.onetimeInvestment || 0);
        const totalActualSavings = fixedSaving + onetimeSaving + fixedInvestment + onetimeInvestment;
        const savingsRate = Math.max(0, totalActualSavings / usableIncome);
        
        // Excellent: >30%, Good: 20-30%, Fair: 10-20%, Poor: <10%
        if (savingsRate >= 0.3) {
            savingsScore = 20;
        } else if (savingsRate >= 0.2) {
            savingsScore = 15;
        } else if (savingsRate >= 0.1) {
            savingsScore = 8;
        } else if (savingsRate > 0) {
            savingsScore = 3;
        }
    }
    score += savingsScore;
    const fixedSaving = Number(monthData.outflow?.fixedSaving || 0);
    const onetimeSaving = Number(monthData.investing?.onetimeSaving || 0);
    const fixedInvestment = Number(monthData.outflow?.fixedInvestment || 0);
    const onetimeInvestment = Number(monthData.investing?.onetimeInvestment || 0);
    const totalActualSavings = fixedSaving + onetimeSaving + fixedInvestment + onetimeInvestment;
    const savingsRate = usableIncome > 0 ? Math.max(0, totalActualSavings / usableIncome) : 0;
    const savingsTooltip = `Savings Rate (20 points max)
Actual Savings: ₹${Math.round(totalActualSavings).toLocaleString('en-IN')}
Usable Income: ₹${Math.round(usableIncome).toLocaleString('en-IN')}
Savings Rate: ${Math.round(savingsRate * 100)}%

Breakdown:
• Fixed Saving: ₹${Math.round(fixedSaving).toLocaleString('en-IN')}
• One-time Saving: ₹${Math.round(onetimeSaving).toLocaleString('en-IN')}
• Fixed Investment: ₹${Math.round(fixedInvestment).toLocaleString('en-IN')}
• One-time Investment: ₹${Math.round(onetimeInvestment).toLocaleString('en-IN')}

Scoring:
• ≥30% = 20 points (Excellent)
• 20-30% = 15 points (Good)
• 10-20% = 8 points (Fair)
• <10% = 3 points (Poor)`;
    breakdown.push({ label: 'Savings Rate', score: savingsScore, max: 20, percentage: Math.round(savingsRate * 100), tooltip: savingsTooltip });
    
    // 4. Insurance Coverage (20 points) - Weighted by importance
    let insuranceScore = 0;
    const healthCoverage = idealHealthInsurance > 0 ? Math.min(1, healthInsurance / idealHealthInsurance) : 0;
    const termCoverage = idealTermInsurance > 0 ? Math.min(1, termInsurance / idealTermInsurance) : 0;
    
    // Health insurance is critical (12 points), term insurance important (8 points)
    insuranceScore += Math.round(healthCoverage * 12);
    insuranceScore += Math.round(termCoverage * 8);
    score += insuranceScore;
    const insuranceTooltip = `Insurance Coverage (20 points max)
Health Insurance: ₹${Math.round(healthInsurance).toLocaleString('en-IN')}
Ideal Health: ₹${Math.round(idealHealthInsurance).toLocaleString('en-IN')}
Coverage: ${Math.round(healthCoverage * 100)}%

Term Insurance: ₹${Math.round(termInsurance).toLocaleString('en-IN')}
Ideal Term: ₹${Math.round(idealTermInsurance).toLocaleString('en-IN')}
Coverage: ${Math.round(termCoverage * 100)}%

Scoring:
• Health Insurance: 12 points max (critical)
• Term Insurance: 8 points max (important)
• Weighted by importance (60% health, 40% term)`;
    breakdown.push({ label: 'Insurance Coverage', score: insuranceScore, max: 20, percentage: Math.round(((healthCoverage * 0.6) + (termCoverage * 0.4)) * 100), tooltip: insuranceTooltip });
    
    // 5. Net Worth Position (10 points) - New realistic metric
    let netWorthScore = 0;
    const netWorth = totalAssets - totalLiabilities;
    if (netWorth > 0) {
        // Positive net worth gets base points
        netWorthScore = 5;
        // Additional points if net worth > 6 months expenses
        const sixMonthsExpenses = monthlyCommitments * 6;
        if (netWorth > sixMonthsExpenses) {
            netWorthScore = 10;
        } else if (netWorth > sixMonthsExpenses * 0.5) {
            netWorthScore = 7;
        }
    }
    score += netWorthScore;
    const sixMonthsExpenses = monthlyCommitments * 6;
    const netWorthTooltip = `Net Worth Position (10 points max)
Net Worth: ₹${Math.round(netWorth).toLocaleString('en-IN')}
Total Assets: ₹${Math.round(totalAssets).toLocaleString('en-IN')}
Total Liabilities: ₹${Math.round(totalLiabilities).toLocaleString('en-IN')}

6 Months Expenses: ₹${Math.round(sixMonthsExpenses).toLocaleString('en-IN')}

Scoring:
• Net Worth > 6 months expenses = 10 points
• Net Worth > 3 months expenses = 7 points
• Positive net worth = 5 points
• Negative net worth = 0 points`;
    breakdown.push({ label: 'Net Worth Position', score: netWorthScore, max: 10, percentage: netWorth > 0 ? Math.min(100, Math.round((netWorth / sixMonthsExpenses) * 100)) : 0, tooltip: netWorthTooltip });
    
    // 6. Goal Progress & Planning (5 points) - Realistic expectations
    let goalScore = 0;
    if (activeGoals.length > 0) {
        const totalNeeded = activeGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
        const totalAccumulated = activeGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
        const goalProgress = totalNeeded > 0 ? Math.min(1, totalAccumulated / totalNeeded) : 0;
        goalScore = Math.round(goalProgress * 5);
    } else {
        // Having goals defined is important
        goalScore = 0;
    }
    score += goalScore;
    const goalProgress = activeGoals.length > 0 ? Math.min(1, activeGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0) / Math.max(1, activeGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0))) : 0;
    const totalNeeded = activeGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
    const totalAccumulated = activeGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
    const goalTooltip = `Goal Progress (5 points max)
Active Goals: ${activeGoals.length}
Total Needed: ₹${Math.round(totalNeeded).toLocaleString('en-IN')}
Total Accumulated: ₹${Math.round(totalAccumulated).toLocaleString('en-IN')}
Progress: ${Math.round(goalProgress * 100)}%

Scoring:
• Based on overall goal completion
• Points = Progress % × 5
• Having goals defined is important`;
    breakdown.push({ label: 'Goal Progress', score: goalScore, max: 5, percentage: Math.round(goalProgress * 100), tooltip: goalTooltip });
    
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
            idealHealthInsurance, termInsurance, idealTermInsurance, activeGoals, 
            monthlyInvestment, usableIncome, monthlyCommitments } = data;
    
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
    
    if (monthlyInvestment === 0 && usableIncome > monthlyCommitments) {
        insights.push({
            type: 'suggestion',
            icon: 'trendingUpSmall',
            message: `Start investing! Even ${fmtMoney(Math.min(5000, (usableIncome - monthlyCommitments) * 0.1))} per month can grow significantly over time.`
        });
    }
    
    if (activeGoals.length > 0) {
        const behindGoals = activeGoals.filter(g => {
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
    
    // Spending optimization
    const debtRatio = usableIncome > 0 ? monthlyCommitments / usableIncome : 0;
    if (debtRatio > 0.5) {
        insights.push({
            type: 'warning',
            icon: 'alertSmall',
            message: `${Math.round(debtRatio * 100)}% of income goes to commitments. Consider debt consolidation or refinancing.`
        });
    }
    
    return insights.slice(0, 4); // Limit to 4 most relevant insights
}

// Generate alerts based on existing data - no duplicate calculations
function generateAlerts(data) {
    const alerts = [];
    const { budgetBalance, emergencyFund, idealEmergencyFund, activeGoals, insurancePolicies, 
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
    const behindGoals = activeGoals.filter(g => {
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

    const activeGoals = goals.filter(goal => {
        const needed = Number(goal.amountNeeded || 0);
        const accumulated = Number(goal.amountAccumulated || 0);
        return needed > 0 && accumulated < needed && goal.status !== 'Achieved';
    });
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
    const primaryAccount = accounts.find(account => account.isPrimary === 'Yes');
    const salaryAccount = accounts.find(account => account.purpose === 'Salary' && account.isPrimary !== 'Yes');
    const savingAccount = accounts.find(account => (account.purpose === 'Savings' || account.purpose === 'Saving') && account.isPrimary !== 'Yes');
    const investmentAccount = accounts.find(account => account.purpose === 'Investment' && account.isPrimary !== 'Yes');
    const portfolioValue = investments.reduce((total, investment) => (
        total + Number(investment.currentValue || investment.amount || 0)
    ), 0);
    const monthlyInvestment = investments.reduce((total, investment) => {
        if ((investment.frequency || 'Monthly') === 'One-Time') return total;
        return total + toMonthlyAmount(Number(investment.amount || 0), investment.frequency || 'Monthly');
    }, 0);
    const plannedGifts = gifts.reduce((total, gift) => total + Number(gift.amount || 0), 0);
    const netWorth = Number(netWorthSummary.netWorth || 0);
    const totalAssets = Number(netWorthSummary.totalAssets || 0);
    const totalLiabilities = Number(netWorthSummary.totalLiabilities || 0);
    const assetCount = Number(netWorthSummary.assetCount || 0);

    // Calculate 6-month trend data
    const sixMonthData = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = getMonthKey(date);
        const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
        const mData = (appData.monthlyBudgetData || {})[monthKey] || {};
        
        const investment = Number(mData.outflow?.fixedInvestment || 0) + Number(mData.investing?.onetimeInvestment || 0);
        const expenditure = Number(mData.outflow?.variableExpenditure || 0) + Number(mData.outflow?.fixedExpenditure || 0);
        const saving = Number(mData.outflow?.fixedSaving || 0) + Number(mData.investing?.onetimeSaving || 0);
        const liability = Number(mData.outflow?.loanEMI || 0) + Number(mData.investing?.ondemandLiability || 0);
        const others = Number(mData.outflow?.fixedOthers || 0);
        
        sixMonthData.push({ monthName, investment, expenditure, saving, liability, others });
    }
    
    const maxValue = Math.max(...sixMonthData.flatMap(m => [m.investment, m.expenditure, m.saving, m.liability, m.others])) || 1;

    // Generate alerts using existing calculations
    const alerts = generateAlerts({
        budgetBalance, emergencyFund, idealEmergencyFund, activeGoals, insurancePolicies,
        idealHealthInsurance, idealTermInsurance, healthInsurance, termInsurance,
        totalCreditCardUsage, outflows, now
    });
    
    // Calculate Financial Health Score using existing data
    const healthScore = calculateFinancialHealthScore({
        emergencyFund, idealEmergencyFund, totalAssets, totalLiabilities,
        usableIncome, monthlyCommitments, healthInsurance, idealHealthInsurance,
        termInsurance, idealTermInsurance, activeGoals, monthlyInvestment, monthData
    });
    
    // Generate insights and recommendations
    const savingsRate = usableIncome > 0 ? (usableIncome - monthlyCommitments) / usableIncome : 0;
    const insights = generateInsights({
        budgetBalance, emergencyFund, idealEmergencyFund, savingsRate, healthInsurance,
        idealHealthInsurance, termInsurance, idealTermInsurance, activeGoals,
        monthlyInvestment, usableIncome, monthlyCommitments
    });

    // Prepare Alerts HTML (to be placed after Insights)
    const alertsHTML = alerts.length > 0 ? `
        <article class="dash-card dash-alerts-carousel" style="grid-column: 1 / -1;">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('bellSmall', 'dash-title-icon')} Alerts & Notifications</span>
                <span class="dash-card-badge" style="background:#ef444422;color:#ef4444">${alerts.length} alert${alerts.length > 1 ? 's' : ''}</span>
            </div>
            <div class="dash-alerts-carousel-container">
                <button class="dash-carousel-btn dash-carousel-prev" onclick="rotateAlert(-1)">‹</button>
                <div class="dash-alerts-carousel-track">
                    ${alerts.map((alert, index) => `
                        <div class="dash-alert-card dash-alert-${alert.type} ${index === 0 ? 'active' : ''}" onclick="switchToTab('${alert.action}')">
                            <div class="dash-alert-icon">${iconSvg(alert.icon, 'dash-alert-svg')}</div>
                            <div class="dash-alert-content">
                                <div class="dash-alert-message">${alert.message}</div>
                                <div class="dash-alert-action">Tap to view →</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="dash-carousel-btn dash-carousel-next" onclick="rotateAlert(1)">›</button>
            </div>
            <div class="dash-carousel-dots">
                ${alerts.map((_, index) => `
                    <span class="dash-carousel-dot ${index === 0 ? 'active' : ''}" onclick="goToAlert(${index})"></span>
                `).join('')}
            </div>
        </article>
    ` : '';
    
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

    grid.innerHTML = `
        <article class="dash-card dash-card-primary">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('calendar', 'dash-title-icon')} This month</span>
                <span class="dash-card-badge" style="background:${budgetColor}22;color:${budgetColor}">${budgetState}</span>
            </div>
            <div class="dash-primary-value" style="color:${spendable >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">${fmtMoney(spendable)}</div>
            <p class="dash-primary-label">available after recurring commitments</p>
            <div class="dash-stat-row"><span class="dash-stat-label">Total Inflow</span><span class="dash-stat-value">${fmtMoney(totalIncome)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Total Outflow</span><span class="dash-stat-value">${fmtMoney(totalOutflow)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Monthly commitments</span><span class="dash-stat-value">${fmtMoney(monthlyCommitments)}</span></div>
            ${budgetSurplusText ? `<div class="dash-stat-row"><span class="dash-stat-label">Budget status</span><span class="dash-stat-value" style="color:${budgetSurplusColor}">${budgetSurplusText}</span></div>` : ''}
            <div class="dash-stat-row"><span class="dash-stat-label">Credit card usage</span><span class="dash-stat-value" style="color:${totalCreditCardUsage > 0 ? COLOR_WARNING : COLOR_POSITIVE}">${fmtMoney(totalCreditCardUsage)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Variable expenses</span><span class="dash-stat-value">${fmtMoney(variableExp)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">On-demand items</span><span class="dash-stat-value" style="color:#3b82f6">${fmtMoney(totalOndemand)}</span></div>
            <div class="dash-card-note">Values from Budget tab · <a href="#" onclick="switchToTab('monthlyBudget'); return false;" style="color:#3b82f6;text-decoration:underline;cursor:pointer;">View Budget</a></div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('bank', 'dash-title-icon')} Accounts & Net Worth</span>
                <span class="dash-card-badge" style="background:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}22;color:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">Current</span>
            </div>
            <div class="dash-primary-value" style="color:${netWorth >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">${fmtMoney(netWorth)}</div>
            <p class="dash-primary-label">net worth (assets less liabilities)</p>
            <div class="dash-stat-row"><span class="dash-stat-label">Assets</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(totalAssets)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Liabilities</span><span class="dash-stat-value" style="color:${COLOR_NEGATIVE}">${fmtMoney(totalLiabilities)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Cash in accounts</span><span class="dash-stat-value">${fmtMoney(accountBalance)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Primary account</span><span class="dash-stat-value">${expenditureAccount ? 'Set' : 'Missing'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Salary account</span><span class="dash-stat-value">${salaryAccount ? 'Set' : 'Missing'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Saving account</span><span class="dash-stat-value">${savingAccount ? 'Set' : 'Missing'}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Investment account</span><span class="dash-stat-value">${investmentAccount ? 'Set' : 'Missing'}</span></div>
            <div class="dash-card-note">${accounts.length} account${accounts.length === 1 ? '' : 's'} · ${assetCount} asset${assetCount === 1 ? '' : 's'} tracked · <a href="#" onclick="switchToTab('netWorth'); return false;" style="color:#3b82f6;text-decoration:underline;cursor:pointer;">View Net Worth</a></div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('target', 'dash-title-icon')} Goals & Investment Planning</span>
                <span class="dash-card-badge" style="background:#3b82f622;color:#3b82f6">${activeGoals.length} active</span>
            </div>
            ${activeGoals.length > 0 ? `
                <div class="dash-goal-focus">
                    <span class="dash-goal-name">All Goals Combined</span>
                    <span class="dash-goal-meta">${activeGoals.length} goal${activeGoals.length === 1 ? '' : 's'} in progress</span>
                    ${(() => {
                        const totalNeeded = activeGoals.reduce((sum, g) => sum + Number(g.amountNeeded || 0), 0);
                        const totalAccumulated = activeGoals.reduce((sum, g) => sum + Number(g.amountAccumulated || 0), 0);
                        const overallProgress = totalNeeded > 0 ? Math.min(100, (totalAccumulated / totalNeeded) * 100) : 0;
                        const totalRemaining = Math.max(0, totalNeeded - totalAccumulated);
                        return `
                            <div style="margin-top:16px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <span style="font-size:14px;font-weight:600;color:var(--text)">Combined Progress</span>
                                    <span style="font-size:13px;font-weight:600;color:#3b82f6">${Math.round(overallProgress)}%</span>
                                </div>
                                <div class="dash-progress-bar" style="height:12px;"><div class="dash-progress-fill" style="width:${overallProgress}%;background:#3b82f6"></div></div>
                                <div style="display:flex;justify-content:space-between;margin-top:8px;">
                                    <span class="dash-goal-meta">Accumulated: ${fmtMoney(totalAccumulated)}</span>
                                    <span class="dash-goal-meta">Target: ${fmtMoney(totalNeeded)}</span>
                                </div>
                                <div style="margin-top:4px;text-align:center;">
                                    <span style="font-size:13px;font-weight:500;color:${totalRemaining > 0 ? COLOR_WARNING : COLOR_POSITIVE}">${fmtMoney(totalRemaining)} remaining</span>
                                </div>
                            </div>
                        `;
                    })()}
                </div>` : '<p class="dash-empty-state">No active goals need attention.</p>'}
            <div class="dash-stat-row"><span class="dash-stat-label">Portfolio value</span><span class="dash-stat-value" style="color:${COLOR_POSITIVE}">${fmtMoney(portfolioValue)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Monthly investment</span><span class="dash-stat-value">${fmtMoney(monthlyInvestment)}</span></div>
            <div class="dash-stat-row"><span class="dash-stat-label">Tax items logged</span><span class="dash-stat-value">${fmtMoney(taxPlanned)}</span></div>
            <div class="dash-card-note">${activeGoals.length} goal${activeGoals.length === 1 ? '' : 's'} · ${plannedGifts > 0 ? fmtMoney(plannedGifts) + ' for gifts' : 'No gifts'} · <a href="#" onclick="switchToTab('financialGoal'); return false;" style="color:#3b82f6;text-decoration:underline;cursor:pointer;">View Goals</a> · <a href="#" onclick="switchToTab('gifts'); return false;" style="color:#3b82f6;text-decoration:underline;cursor:pointer;">View Gifts</a></div>
        </article>

        <article class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title">${iconSvg('shield', 'dash-title-icon')} Preparedness & Budget</span>
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
            <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:14px;font-weight:600;color:var(--text)">Budget vs Actual</span>
                    <span class="dash-card-badge" style="background:${budgetBalance >= 0 ? COLOR_POSITIVE : COLOR_WARNING}22;color:${budgetBalance >= 0 ? COLOR_POSITIVE : COLOR_WARNING};font-size:12px;padding:4px 8px;">${budgetBalance >= 0 ? 'On Track' : 'Over'}</span>
                </div>
                <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));gap:12px;">
                    <div class="dash-stat-row"><span class="dash-stat-label">Budgeted</span><span class="dash-stat-value">${fmtMoney(spendable)}</span></div>
                    <div class="dash-stat-row"><span class="dash-stat-label">Spent</span><span class="dash-stat-value" style="color:${untracked > spendable ? COLOR_NEGATIVE : COLOR_POSITIVE}">${fmtMoney(untracked)}</span></div>
                    <div class="dash-stat-row"><span class="dash-stat-label">Balance</span><span class="dash-stat-value" style="color:${budgetBalance >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}">${budgetBalance >= 0 ? '+' : ''}${fmtMoney(budgetBalance)}</span></div>
                    <div class="dash-stat-row"><span class="dash-stat-label">Adherence</span><span class="dash-stat-value">${spendable > 0 ? Math.min(100, Math.round((1 - Math.max(0, untracked - spendable) / spendable) * 100)) : 0}%</span></div>
                </div>
            </div>
            <div class="dash-card-note">${insuranceCount} polic${insuranceCount === 1 ? 'y' : 'ies'} · ${fmtMoney(variableExp)} var · ${fmtMoney(totalCreditCardUsage)} CC · ${fmtMoney(totalOndemand)} on-demand</div>
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
        
        ${alertsHTML}
        
        ${healthScoreHTML}
        
        <article class="dash-card" style="grid-column: 1 / -1;">
            <div class="dash-card-header"><span class="dash-card-title">6-Month Trend</span></div>
            <canvas id="dashboardTrendChart" style="margin-top:16px;max-height:250px;"></canvas>
        </article>
        
        <article class="dash-card dash-quick-actions" style="grid-column: 1 / -1;">
            <div class="dash-card-header">
                <span class="dash-card-title">Quick Actions</span>
            </div>
            <div class="dash-quick-actions-grid">
                <button onclick="switchToTab('monthlyBudget'); return false;" class="dash-quick-btn">
                    ${iconSvg('wallet', 'dash-quick-svg')}
                    <span class="dash-quick-label">Budget</span>
                </button>
                <button onclick="switchToTab('inflow'); return false;" class="dash-quick-btn">
                    ${iconSvg('trendingUp', 'dash-quick-svg')}
                    <span class="dash-quick-label">Investments</span>
                </button>
                <button onclick="switchToTab('outflow'); return false;" class="dash-quick-btn">
                    ${iconSvg('creditCard', 'dash-quick-svg')}
                    <span class="dash-quick-label">Expenses</span>
                </button>
                <button onclick="switchToTab('financialGoal'); return false;" class="dash-quick-btn">
                    ${iconSvg('target', 'dash-quick-svg')}
                    <span class="dash-quick-label">Goals</span>
                </button>
                <button onclick="switchToTab('netWorth'); return false;" class="dash-quick-btn">
                    ${iconSvg('barChart', 'dash-quick-svg')}
                    <span class="dash-quick-label">Net Worth</span>
                </button>
                <button onclick="switchToTab('taxPlan'); return false;" class="dash-quick-btn">
                    ${iconSvg('fileText', 'dash-quick-svg')}
                    <span class="dash-quick-label">Tax Plan</span>
                </button>
            </div>
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
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sixMonthData.map(m => m.monthName),
                datasets: [
                    {
                        label: 'Investment',
                        data: sixMonthData.map(m => m.investment),
                        backgroundColor: '#3b82f6', // Investment color
                        borderColor: '#3b82f6',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
                    },
                    {
                        label: 'Liability',
                        data: sixMonthData.map(m => m.liability),
                        backgroundColor: '#ef4444', // Liability color
                        borderColor: '#ef4444',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
                    },
                    {
                        label: 'Saving',
                        data: sixMonthData.map(m => m.saving),
                        backgroundColor: '#22c55e', // Savings color
                        borderColor: '#22c55e',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
                    },
                    {
                        label: 'Expenditure',
                        data: sixMonthData.map(m => m.expenditure),
                        backgroundColor: '#f97316', // Expenditure color
                        borderColor: '#f97316',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
                    },
                    {
                        label: 'Others',
                        data: sixMonthData.map(m => m.others),
                        backgroundColor: '#eab308', // Others color
                        borderColor: '#eab308',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
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
                    datalabels: {
                        display: true,
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function(value) {
                            if (value === 0) return '';
                            return '₹' + (value / 1000).toFixed(0) + 'K';
                        },
                        anchor: 'end',
                        align: 'top'
                    }
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
            },
            plugins: [{
                afterDatasetsDraw: function(chart) {
                    const isMobile = window.innerWidth < 768;
                    if (isMobile) return;
                    
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach(function(dataset, i) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach(function(bar, index) {
                            const data = dataset.data[index];
                            if (data > 0) {
                                ctx.fillStyle = '#fff';
                                ctx.font = 'bold 10px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText('₹' + (data / 1000).toFixed(0) + 'K', bar.x, bar.y - 5);
                            }
                        });
                    });
                }
            }]
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

