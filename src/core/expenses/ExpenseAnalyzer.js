/**
 * ExpenseAnalyzer - Expense tracking and analysis logic
 * Pure functions with no side effects - platform independent
 */

export class ExpenseAnalyzer {
    /**
     * Predefined expense categories
     */
    static CATEGORIES = [
        'Food & Dining',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Healthcare',
        'Education',
        'Personal Care',
        'Home & Utilities',
        'Travel',
        'Gifts & Donations',
        'Others'
    ];

    /**
     * Calculate total expenses for a month
     * @param {Array} expenses - Array of expense objects
     * @returns {number} Total expenses
     */
    static calculateMonthlyTotal(expenses) {
        if (!expenses || !Array.isArray(expenses)) return 0;
        return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }

    /**
     * Group expenses by category
     * @param {Array} expenses - Array of expense objects
     * @returns {Object} Grouped expenses
     */
    static groupByCategory(expenses) {
        if (!expenses || !Array.isArray(expenses)) return {};

        const grouped = {};

        expenses.forEach(expense => {
            const category = expense.category || 'Others';
            
            if (!grouped[category]) {
                grouped[category] = {
                    category,
                    total: 0,
                    count: 0,
                    expenses: []
                };
            }

            grouped[category].total += Number(expense.amount || 0);
            grouped[category].count += 1;
            grouped[category].expenses.push(expense);
        });

        return grouped;
    }

    /**
     * Calculate category-wise breakdown for pie chart
     * @param {Array} expenses - Array of expense objects
     * @param {number} budgetVariableExpenditure - Budget variable expenditure
     * @returns {Array} Category breakdown
     */
    static calculateCategoryBreakdown(expenses, budgetVariableExpenditure = 0) {
        const grouped = this.groupByCategory(expenses);
        const totalExpenses = this.calculateMonthlyTotal(expenses);

        const breakdown = Object.values(grouped).map(cat => ({
            category: cat.category,
            amount: cat.total,
            count: cat.count,
            percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
        }));

        // Add "Unidentified" category if total < budget
        if (budgetVariableExpenditure > 0 && totalExpenses < budgetVariableExpenditure) {
            const unidentified = budgetVariableExpenditure - totalExpenses;
            breakdown.push({
                category: 'Unidentified',
                amount: unidentified,
                count: 0,
                percentage: (unidentified / budgetVariableExpenditure) * 100
            });
        }

        // Sort by amount (descending)
        return breakdown.sort((a, b) => b.amount - a.amount);
    }

    /**
     * Compare expenses with budget
     * @param {Array} expenses - Array of expense objects
     * @param {number} budgetAmount - Budget amount
     * @returns {Object} Comparison result
     */
    static compareWithBudget(expenses, budgetAmount) {
        const totalExpenses = this.calculateMonthlyTotal(expenses);
        const difference = budgetAmount - totalExpenses;
        const isOverBudget = difference < 0;
        const percentageUsed = budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0;

        return {
            totalExpenses,
            budgetAmount,
            difference,
            isOverBudget,
            percentageUsed,
            status: isOverBudget ? 'over' : (difference === 0 ? 'exact' : 'under')
        };
    }

    /**
     * Analyze expenses for a month
     * @param {Array} expenses - Array of expense objects
     * @param {number} budgetVariableExpenditure - Budget variable expenditure
     * @returns {Object} Complete expense analysis
     */
    static analyzeExpenses(expenses, budgetVariableExpenditure = 0) {
        const totalExpenses = this.calculateMonthlyTotal(expenses);
        const byCategory = Object.values(this.groupByCategory(expenses));
        const chartData = this.calculateCategoryBreakdown(expenses, budgetVariableExpenditure);
        const comparison = this.compareWithBudget(expenses, budgetVariableExpenditure);

        return {
            totalExpenses,
            budgetVariableExpenditure,
            difference: comparison.difference,
            isOverBudget: comparison.isOverBudget,
            percentageUsed: comparison.percentageUsed,
            byCategory,
            chartData,
            expenseCount: expenses ? expenses.length : 0
        };
    }

    /**
     * Filter expenses by category
     * @param {Array} expenses - Array of expense objects
     * @param {string} category - Category to filter
     * @returns {Array} Filtered expenses
     */
    static filterByCategory(expenses, category) {
        if (!expenses || !Array.isArray(expenses)) return [];
        return expenses.filter(expense => expense.category === category);
    }

    /**
     * Filter expenses by date range
     * @param {Array} expenses - Array of expense objects
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Array} Filtered expenses
     */
    static filterByDateRange(expenses, startDate, endDate) {
        if (!expenses || !Array.isArray(expenses)) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);

        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
    }

    /**
     * Get top expenses
     * @param {Array} expenses - Array of expense objects
     * @param {number} limit - Number of top expenses to return (default: 5)
     * @returns {Array} Top expenses
     */
    static getTopExpenses(expenses, limit = 5) {
        if (!expenses || !Array.isArray(expenses)) return [];

        return [...expenses]
            .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
            .slice(0, limit);
    }

    /**
     * Calculate average expense per category
     * @param {Array} expenses - Array of expense objects
     * @returns {Object} Average per category
     */
    static calculateAveragePerCategory(expenses) {
        const grouped = this.groupByCategory(expenses);
        const averages = {};

        Object.keys(grouped).forEach(category => {
            const cat = grouped[category];
            averages[category] = cat.count > 0 ? cat.total / cat.count : 0;
        });

        return averages;
    }

    /**
     * Get expense statistics
     * @param {Array} expenses - Array of expense objects
     * @returns {Object} Expense statistics
     */
    static getExpenseStatistics(expenses) {
        if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
            return {
                total: 0,
                count: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                median: 0
            };
        }

        const amounts = expenses.map(e => Number(e.amount || 0)).sort((a, b) => a - b);
        const total = amounts.reduce((sum, amt) => sum + amt, 0);
        const count = amounts.length;
        const average = total / count;
        const highest = amounts[amounts.length - 1];
        const lowest = amounts[0];
        const median = count % 2 === 0
            ? (amounts[count / 2 - 1] + amounts[count / 2]) / 2
            : amounts[Math.floor(count / 2)];

        return {
            total,
            count,
            average,
            highest,
            lowest,
            median
        };
    }

    /**
     * Get valid expense categories
     * @returns {Array} List of valid categories
     */
    static getValidCategories() {
        return [...this.CATEGORIES];
    }

    /**
     * Validate expense category
     * @param {string} category - Category to validate
     * @returns {boolean} True if valid
     */
    static isValidCategory(category) {
        return this.CATEGORIES.includes(category);
    }
}
