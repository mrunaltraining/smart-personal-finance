/**
 * InvestmentCalculator - Investment calculation logic
 * Pure functions with no side effects - platform independent
 */

import { FrequencyConverter } from '../utils/FrequencyConverter.js';

export class InvestmentCalculator {
    /**
     * Calculate investment returns with compound interest
     * @param {number} principal - Initial investment amount
     * @param {number} rate - Annual return rate (%)
     * @param {number} years - Investment duration in years
     * @returns {number} Future value
     */
    static calculateReturns(principal, rate, years) {
        if (principal <= 0 || years <= 0) return principal;
        if (rate === 0) return principal;
        
        return principal * Math.pow(1 + rate / 100, years);
    }

    /**
     * Calculate SIP (Systematic Investment Plan) maturity value
     * @param {number} monthlyAmount - Monthly SIP amount
     * @param {number} rate - Expected annual return rate (%)
     * @param {number} months - Investment duration in months
     * @returns {number} Maturity value
     */
    static calculateSIPMaturity(monthlyAmount, rate, months) {
        if (monthlyAmount <= 0 || months <= 0) return 0;
        if (rate === 0) return monthlyAmount * months;
        
        const monthlyRate = rate / 12 / 100;
        return monthlyAmount * 
            ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * 
            (1 + monthlyRate);
    }

    /**
     * Calculate total invested amount for SIP
     * @param {number} monthlyAmount - Monthly SIP amount
     * @param {number} months - Investment duration in months
     * @returns {number} Total invested
     */
    static calculateSIPInvested(monthlyAmount, months) {
        return monthlyAmount * months;
    }

    /**
     * Calculate SIP returns
     * @param {number} monthlyAmount - Monthly SIP amount
     * @param {number} rate - Expected annual return rate (%)
     * @param {number} months - Investment duration in months
     * @returns {Object} Investment details
     */
    static calculateSIPReturns(monthlyAmount, rate, months) {
        const invested = this.calculateSIPInvested(monthlyAmount, months);
        const maturityValue = this.calculateSIPMaturity(monthlyAmount, rate, months);
        const returns = maturityValue - invested;
        const returnPercentage = invested > 0 ? (returns / invested) * 100 : 0;

        return {
            invested,
            maturityValue,
            returns,
            returnPercentage
        };
    }

    /**
     * Filter investments by category
     * @param {Array} investments - Array of investment objects
     * @param {string} category - Category to filter ('all', 'existing', 'monthly', 'portfolio')
     * @returns {Array} Filtered investments
     */
    static filterByCategory(investments, category) {
        if (!investments || !Array.isArray(investments)) return [];
        
        if (category === 'all') {
            return investments;
        }
        
        if (category === 'existing') {
            return investments.filter(inv => 
                inv.category === 'Existing' && inv.frequency !== 'Monthly'
            );
        }
        
        if (category === 'monthly') {
            return investments.filter(inv => 
                inv.category === 'Monthly' || inv.frequency === 'Monthly'
            );
        }
        
        return investments;
    }

    /**
     * Calculate portfolio summary
     * @param {Array} investments - Array of investment objects
     * @param {Object} budgetInvestments - One-time investments from budget
     * @returns {Object} Portfolio summary
     */
    static calculatePortfolioSummary(investments, budgetInvestments = {}) {
        if (!investments || !Array.isArray(investments)) {
            investments = [];
        }

        let totalInvested = 0;
        let currentValue = 0;
        let monthlyContribution = 0;

        const byType = {};

        // Process regular investments
        investments.forEach(inv => {
            const invested = Number(inv.amount || 0);
            const current = Number(inv.currentValue || invested);
            
            totalInvested += invested;
            currentValue += current;

            // Calculate monthly contribution
            if (inv.frequency === 'Monthly' || inv.category === 'Monthly') {
                monthlyContribution += invested;
            } else if (inv.frequency) {
                monthlyContribution += FrequencyConverter.toMonthly(invested, inv.frequency);
            }

            // Group by type
            const type = inv.type || 'Other';
            if (!byType[type]) {
                byType[type] = {
                    count: 0,
                    invested: 0,
                    currentValue: 0,
                    returns: 0
                };
            }
            byType[type].count++;
            byType[type].invested += invested;
            byType[type].currentValue += current;
            byType[type].returns += (current - invested);
        });

        // Add one-time budget investments
        const onetimeSaving = Number(budgetInvestments.onetimeSaving || 0);
        const onetimeInvestment = Number(budgetInvestments.onetimeInvestment || 0);
        const onetimeTotal = onetimeSaving + onetimeInvestment;

        totalInvested += onetimeTotal;
        currentValue += onetimeTotal; // Assume same value for recent investments

        const totalReturns = currentValue - totalInvested;
        const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

        return {
            totalInvested,
            currentValue,
            totalReturns,
            returnPercentage,
            monthlyContribution,
            byType,
            onetimeInvestments: {
                saving: onetimeSaving,
                investment: onetimeInvestment,
                total: onetimeTotal
            },
            sections: {
                existing: this.calculateSectionSummary(
                    this.filterByCategory(investments, 'existing')
                ),
                monthly: this.calculateSectionSummary(
                    this.filterByCategory(investments, 'monthly')
                )
            }
        };
    }

    /**
     * Calculate summary for a section of investments
     * @param {Array} investments - Array of investment objects
     * @returns {Object} Section summary
     */
    static calculateSectionSummary(investments) {
        let count = 0;
        let invested = 0;
        let currentValue = 0;
        let monthlyAmount = 0;

        investments.forEach(inv => {
            count++;
            invested += Number(inv.amount || 0);
            currentValue += Number(inv.currentValue || inv.amount || 0);
            
            if (inv.frequency === 'Monthly' || inv.category === 'Monthly') {
                monthlyAmount += Number(inv.amount || 0);
            }
        });

        const returns = currentValue - invested;

        return {
            count,
            invested,
            currentValue,
            returns,
            monthlyAmount
        };
    }

    /**
     * Calculate investment growth projection
     * @param {number} currentValue - Current investment value
     * @param {number} rate - Expected annual return rate (%)
     * @param {number} years - Projection period in years
     * @returns {number} Projected value
     */
    static projectGrowth(currentValue, rate, years) {
        return this.calculateReturns(currentValue, rate, years);
    }

    /**
     * Calculate required monthly investment to reach goal
     * @param {number} targetAmount - Target amount
     * @param {number} currentAmount - Current amount
     * @param {number} rate - Expected annual return rate (%)
     * @param {number} months - Time period in months
     * @returns {number} Required monthly investment
     */
    static calculateRequiredMonthlyInvestment(targetAmount, currentAmount, rate, months) {
        if (months <= 0) return targetAmount - currentAmount;
        
        const futureValueOfCurrent = this.calculateReturns(currentAmount, rate, months / 12);
        const remainingAmount = targetAmount - futureValueOfCurrent;
        
        if (remainingAmount <= 0) return 0;
        if (rate === 0) return remainingAmount / months;
        
        const monthlyRate = rate / 12 / 100;
        return remainingAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    }
}
