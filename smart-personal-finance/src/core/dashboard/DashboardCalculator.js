/**
 * DashboardCalculator - Dashboard aggregation and calculation logic
 * Pure functions with no side effects - platform independent
 */

export class DashboardCalculator {
    /**
     * Calculate dashboard summary from all data sources
     * @param {Object} data - Complete application data
     * @returns {Object} Dashboard summary
     */
    static calculateDashboardSummary(data) {
        if (!data) {
            return this.getEmptyDashboard();
        }

        return {
            budget: this.calculateBudgetSummary(data),
            accounts: this.calculateAccountsSummary(data),
            investments: this.calculateInvestmentsSummary(data),
            goals: this.calculateGoalsSummary(data),
            insurance: this.calculateInsuranceSummary(data),
            netWorth: this.calculateNetWorthSummary(data),
            tax: this.calculateTaxSummary(data),
            expenses: this.calculateExpensesSummary(data),
            financialHealth: this.calculateFinancialHealthScore(data)
        };
    }

    /**
     * Calculate budget summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Budget summary
     */
    static calculateBudgetSummary(data) {
        const monthData = data.monthData || {};
        const currentMonth = data.currentMonth || this.getCurrentMonthKey();

        return {
            month: currentMonth,
            income: monthData._calculatedTotalIncome || 0,
            expenses: monthData._calculatedTotalOutflow || 0,
            spendable: monthData._calculatedSpendable || 0,
            budgetBalance: monthData._calculatedBudgetBalance || 0,
            budgetStatus: this.getBudgetStatus(monthData._calculatedBudgetBalance)
        };
    }

    /**
     * Calculate accounts summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Accounts summary
     */
    static calculateAccountsSummary(data) {
        const accounts = data.accounts || [];
        const cards = data.cards || [];

        const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        const accountCount = accounts.length;

        return {
            totalBalance,
            accountCount,
            hasAccounts: accountCount > 0,
            accounts: cards.map(card => ({
                bankName: card.bankName,
                balance: card.balance,
                purpose: card.purpose,
                isPrimary: card.isPrimary
            }))
        };
    }

    /**
     * Calculate investments summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Investments summary
     */
    static calculateInvestmentsSummary(data) {
        const investments = data.investments || [];
        const budgetInvesting = data.monthData?.investing || {};

        const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const onetimeInvestment = Number(budgetInvesting.onetimeInvestment || 0);
        const onetimeSaving = Number(budgetInvesting.onetimeSaving || 0);

        return {
            totalInvested,
            onetimeInvestment,
            onetimeSaving,
            totalOnetime: onetimeInvestment + onetimeSaving,
            investmentCount: investments.length,
            hasInvestments: investments.length > 0 || onetimeInvestment > 0
        };
    }

    /**
     * Calculate goals summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Goals summary
     */
    static calculateGoalsSummary(data) {
        const goals = data.goals || [];

        const totalNeeded = goals.reduce((sum, goal) => sum + (goal.amountNeeded || 0), 0);
        const totalAccumulated = goals.reduce((sum, goal) => sum + (goal.amountAccumulated || 0), 0);
        const activeGoals = goals.filter(goal => goal.status !== 'Achieved').length;
        const achievedGoals = goals.filter(goal => goal.status === 'Achieved').length;

        return {
            totalNeeded,
            totalAccumulated,
            remaining: Math.max(totalNeeded - totalAccumulated, 0),
            progress: totalNeeded > 0 ? (totalAccumulated / totalNeeded) * 100 : 0,
            totalGoals: goals.length,
            activeGoals,
            achievedGoals,
            hasGoals: goals.length > 0
        };
    }

    /**
     * Calculate insurance summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Insurance summary
     */
    static calculateInsuranceSummary(data) {
        const insurance = data.insurance || [];
        const outflows = data.outflows || [];

        const insuranceOutflows = outflows.filter(outflow => outflow.type === 'Insurance');
        const totalPremium = insuranceOutflows.reduce((sum, outflow) => sum + (outflow.amount || 0), 0);
        const policyCount = insurance.length + insuranceOutflows.length;

        return {
            totalPremium,
            policyCount,
            hasInsurance: policyCount > 0
        };
    }

    /**
     * Calculate net worth summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Net worth summary
     */
    static calculateNetWorthSummary(data) {
        const assets = data.assets || [];
        const liabilities = data.liabilities || [];
        const accounts = data.accounts || [];

        const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
        const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.value || 0), 0);
        const accountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

        const netWorth = totalAssets + accountBalance - totalLiabilities;

        return {
            totalAssets,
            totalLiabilities,
            accountBalance,
            netWorth,
            hasNetWorthData: assets.length > 0 || liabilities.length > 0
        };
    }

    /**
     * Calculate tax summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Tax summary
     */
    static calculateTaxSummary(data) {
        const tax = data.tax || {};
        const investments = data.investments || [];
        const outflows = data.outflows || [];

        // Auto-detect tax-deductible items
        const epfPpf = investments.filter(inv => 
            inv.type === 'EPF' || inv.type === 'PPF'
        ).reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const insurancePremium = outflows.filter(outflow => 
            outflow.type === 'Insurance'
        ).reduce((sum, outflow) => sum + (outflow.amount || 0), 0);

        const totalDeductions = Number(tax.totalDeductions || 0) + epfPpf + insurancePremium;

        return {
            totalDeductions,
            epfPpf,
            insurancePremium,
            hasTaxData: tax.length > 0 || epfPpf > 0 || insurancePremium > 0
        };
    }

    /**
     * Calculate expenses summary for dashboard
     * @param {Object} data - Application data
     * @returns {Object} Expenses summary
     */
    static calculateExpensesSummary(data) {
        const expenses = data.expenses || [];
        const monthData = data.monthData || {};

        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const variableExpenditure = Number(monthData._calculatedVariableExp || 0);
        const budgetVariableExpenditure = Number(monthData.outflow?.variableExpenditure || 0);

        return {
            totalExpenses,
            variableExpenditure,
            budgetVariableExpenditure,
            difference: budgetVariableExpenditure - variableExpenditure,
            expenseCount: expenses.length,
            hasExpenses: expenses.length > 0
        };
    }

    /**
     * Calculate financial health score (0-100)
     * @param {Object} data - Application data
     * @returns {Object} Financial health score
     */
    static calculateFinancialHealthScore(data) {
        const budget = this.calculateBudgetSummary(data);
        const accounts = this.calculateAccountsSummary(data);
        const goals = this.calculateGoalsSummary(data);
        const insurance = this.calculateInsuranceSummary(data);
        const investments = this.calculateInvestmentsSummary(data);

        let score = 0;
        const components = {};

        // Emergency Fund (25%)
        const emergencyFundScore = this.calculateEmergencyFundScore(budget, accounts);
        components.emergencyFund = emergencyFundScore;
        score += emergencyFundScore * 0.25;

        // Debt-to-Income (20%)
        const debtScore = this.calculateDebtScore(data);
        components.debt = debtScore;
        score += debtScore * 0.20;

        // Savings Rate (20%)
        const savingsScore = this.calculateSavingsScore(budget);
        components.savings = savingsScore;
        score += savingsScore * 0.20;

        // Insurance Coverage (15%)
        const insuranceScore = this.calculateInsuranceScore(insurance);
        components.insurance = insuranceScore;
        score += insuranceScore * 0.15;

        // Goal Progress (10%)
        const goalScore = this.calculateGoalScore(goals);
        components.goals = goalScore;
        score += goalScore * 0.10;

        // Investment Activity (10%)
        const investmentScore = this.calculateInvestmentScore(investments);
        components.investments = investmentScore;
        score += investmentScore * 0.10;

        return {
            score: Math.round(score),
            components,
            grade: this.getHealthGrade(score)
        };
    }

    /**
     * Calculate emergency fund score
     * @param {Object} budget - Budget summary
     * @param {Object} accounts - Accounts summary
     * @returns {number} Score (0-100)
     */
    static calculateEmergencyFundScore(budget, accounts) {
        const monthlyExpenses = budget.expenses || 0;
        const totalBalance = accounts.totalBalance || 0;

        if (monthlyExpenses === 0) return 50; // Neutral if no expenses
        if (totalBalance === 0) return 0;

        const monthsCovered = totalBalance / monthlyExpenses;
        
        // 6 months = 100%, 3 months = 50%, 0 months = 0%
        return Math.min((monthsCovered / 6) * 100, 100);
    }

    /**
     * Calculate debt score
     * @param {Object} data - Application data
     * @returns {number} Score (0-100)
     */
    static calculateDebtScore(data) {
        const liabilities = data.liabilities || [];
        const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.value || 0), 0);
        const monthlyIncome = data.monthData?._calculatedTotalIncome || 0;

        if (totalLiabilities === 0) return 100; // No debt = perfect
        if (monthlyIncome === 0) return 0;

        const debtToIncome = totalLiabilities / (monthlyIncome * 12);
        
        // DTI < 30% = 100%, DTI > 50% = 0%
        if (debtToIncome < 0.3) return 100;
        if (debtToIncome > 0.5) return 0;
        return 100 - ((debtToIncome - 0.3) / 0.2) * 100;
    }

    /**
     * Calculate savings score
     * @param {Object} budget - Budget summary
     * @returns {number} Score (0-100)
     */
    static calculateSavingsScore(budget) {
        const income = budget.income || 0;
        const spendable = budget.spendable || 0;

        if (income === 0) return 50; // Neutral if no income
        if (spendable <= 0) return 0;

        const savingsRate = (spendable / income) * 100;
        
        // 20% savings = 100%, 0% = 0%
        return Math.min((savingsRate / 20) * 100, 100);
    }

    /**
     * Calculate insurance score
     * @param {Object} insurance - Insurance summary
     * @returns {number} Score (0-100)
     */
    static calculateInsuranceScore(insurance) {
        if (!insurance.hasInsurance) return 0;
        return 100; // Has insurance = good
    }

    /**
     * Calculate goal score
     * @param {Object} goals - Goals summary
     * @returns {number} Score (0-100)
     */
    static calculateGoalScore(goals) {
        if (!goals.hasGoals) return 50; // Neutral if no goals
        return goals.progress;
    }

    /**
     * Calculate investment score
     * @param {Object} investments - Investments summary
     * @returns {number} Score (0-100)
     */
    static calculateInvestmentScore(investments) {
        if (!investments.hasInvestments) return 0;
        return 100; // Has investments = good
    }

    /**
     * Get health grade from score
     * @param {number} score - Health score (0-100)
     * @returns {string} Grade
     */
    static getHealthGrade(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        if (score >= 20) return 'Poor';
        return 'Critical';
    }

    /**
     * Get budget status
     * @param {number} balance - Budget balance
     * @returns {string} Status
     */
    static getBudgetStatus(balance) {
        if (balance > 0) return 'Surplus';
        if (balance < 0) return 'Deficit';
        return 'Balanced';
    }

    /**
     * Get current month key
     * @returns {string} Month key (YYYY-MM)
     */
    static getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Get empty dashboard structure
     * @returns {Object} Empty dashboard
     */
    static getEmptyDashboard() {
        return {
            budget: {
                month: this.getCurrentMonthKey(),
                income: 0,
                expenses: 0,
                spendable: 0,
                budgetBalance: 0,
                budgetStatus: 'Balanced'
            },
            accounts: {
                totalBalance: 0,
                accountCount: 0,
                hasAccounts: false,
                accounts: []
            },
            investments: {
                totalInvested: 0,
                onetimeInvestment: 0,
                onetimeSaving: 0,
                totalOnetime: 0,
                investmentCount: 0,
                hasInvestments: false
            },
            goals: {
                totalNeeded: 0,
                totalAccumulated: 0,
                remaining: 0,
                progress: 0,
                totalGoals: 0,
                activeGoals: 0,
                achievedGoals: 0,
                hasGoals: false
            },
            insurance: {
                totalPremium: 0,
                policyCount: 0,
                hasInsurance: false
            },
            netWorth: {
                totalAssets: 0,
                totalLiabilities: 0,
                accountBalance: 0,
                netWorth: 0,
                hasNetWorthData: false
            },
            tax: {
                totalDeductions: 0,
                epfPpf: 0,
                insurancePremium: 0,
                hasTaxData: false
            },
            expenses: {
                totalExpenses: 0,
                variableExpenditure: 0,
                budgetVariableExpenditure: 0,
                difference: 0,
                expenseCount: 0,
                hasExpenses: false
            },
            financialHealth: {
                score: 0,
                components: {},
                grade: 'Critical'
            }
        };
    }
}
