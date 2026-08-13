/**
 * InsuranceCalculator - Insurance calculation logic
 * Pure functions with no side effects - platform independent
 */

import { FrequencyConverter } from '../utils/FrequencyConverter.js';

export class InsuranceCalculator {
    /**
     * Calculate annual premium from frequency
     * @param {number} amount - Premium amount
     * @param {string} frequency - Payment frequency
     * @returns {number} Annual premium
     */
    static calculateAnnualPremium(amount, frequency) {
        const multipliers = {
            'Monthly': 12,
            'Quarterly': 4,
            'Half-Yearly': 2,
            'Annual': 1,
            'None (Paid Up)': 0
        };

        return amount * (multipliers[frequency] || 0);
    }

    /**
     * Calculate ideal health insurance coverage
     * @param {number} age - User's age
     * @param {string} location - User's location
     * @param {number} familySize - Number of family members (default: 1)
     * @returns {number} Ideal health insurance coverage
     */
    static calculateIdealHealthCoverage(age, location, familySize = 1) {
        // Metro cities list
        const metroCities = [
            'Mumbai', 'Delhi', 'Bengaluru', 'Bangalore', 'Pune', 'Hyderabad',
            'Chennai', 'Kolkata', 'Ahmedabad', 'Gurgaon', 'Noida'
        ];

        // Check if location is metro
        const isMetro = metroCities.some(city => 
            location && location.toLowerCase().includes(city.toLowerCase())
        );

        // Base cost: 10L for metro, 5L for non-metro
        const baseCost = isMetro ? 1000000 : 500000;

        // Age risk multiplier
        let ageMultiplier = 1.0;
        if (age >= 35 && age <= 50) {
            ageMultiplier = 1.5;
        } else if (age > 50) {
            ageMultiplier = 2.0;
        }

        // Family size variant
        let familyMultiplier = 1.0;
        if (familySize === 2) {
            familyMultiplier = 1.5;
        } else if (familySize >= 3) {
            familyMultiplier = 2.0;
        }

        return baseCost * ageMultiplier * familyMultiplier;
    }

    /**
     * Calculate ideal term insurance coverage
     * @param {number} age - User's age
     * @param {number} monthlyExpenses - Monthly expenses
     * @param {number} currentSavings - Current savings/investments
     * @param {number} retirementAge - Retirement age (default: 65)
     * @returns {number} Ideal term insurance coverage
     */
    static calculateIdealTermCoverage(age, monthlyExpenses, currentSavings, retirementAge = 65) {
        const yearsToRetirement = Math.max(retirementAge - age, 0);
        const futureExpenses = monthlyExpenses * 12 * yearsToRetirement;
        return Math.max(futureExpenses - currentSavings, 0);
    }

    /**
     * Calculate total insurance coverage
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @returns {number} Total coverage
     */
    static calculateTotalCoverage(insurancePolicies) {
        if (!insurancePolicies || !Array.isArray(insurancePolicies)) return 0;

        return insurancePolicies.reduce((total, policy) => {
            return total + Number(policy.sumAssured || 0);
        }, 0);
    }

    /**
     * Calculate total annual premium
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @returns {number} Total annual premium
     */
    static calculateTotalAnnualPremium(insurancePolicies) {
        if (!insurancePolicies || !Array.isArray(insurancePolicies)) return 0;

        return insurancePolicies.reduce((total, policy) => {
            const premium = Number(policy.premiumAmount || 0);
            const frequency = policy.premiumFrequency || 'Annual';
            return total + this.calculateAnnualPremium(premium, frequency);
        }, 0);
    }

    /**
     * Calculate insurance summary
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @returns {Object} Insurance summary
     */
    static calculateInsuranceSummary(insurancePolicies) {
        if (!insurancePolicies || !Array.isArray(insurancePolicies)) {
            return {
                totalCoverage: 0,
                annualPremium: 0,
                byType: {},
                healthInsurance: { totalCoverage: 0, policies: 0 },
                lifeInsurance: { totalCoverage: 0, policies: 0 }
            };
        }

        const byType = {};
        let healthCoverage = 0;
        let healthPolicies = 0;
        let lifeCoverage = 0;
        let lifePolicies = 0;

        insurancePolicies.forEach(policy => {
            const type = policy.policyType || 'Other';
            const coverage = Number(policy.sumAssured || 0);
            const premium = Number(policy.premiumAmount || 0);
            const frequency = policy.premiumFrequency || 'Annual';
            const annualPremium = this.calculateAnnualPremium(premium, frequency);

            // Group by type
            if (!byType[type]) {
                byType[type] = {
                    count: 0,
                    coverage: 0,
                    annualPremium: 0
                };
            }
            byType[type].count++;
            byType[type].coverage += coverage;
            byType[type].annualPremium += annualPremium;

            // Categorize as health or life
            if (type === 'Health' || type === 'Critical Illness' || type === 'Personal Accident') {
                healthCoverage += coverage;
                healthPolicies++;
            } else if (type === 'Term Life' || type === 'Whole Life') {
                lifeCoverage += coverage;
                lifePolicies++;
            }
        });

        return {
            totalCoverage: this.calculateTotalCoverage(insurancePolicies),
            annualPremium: this.calculateTotalAnnualPremium(insurancePolicies),
            byType,
            healthInsurance: {
                totalCoverage: healthCoverage,
                policies: healthPolicies
            },
            lifeInsurance: {
                totalCoverage: lifeCoverage,
                policies: lifePolicies
            },
            totalPolicies: insurancePolicies.length
        };
    }

    /**
     * Calculate insurance gap analysis
     * @param {Object} current - Current insurance coverage
     * @param {Object} ideal - Ideal insurance coverage
     * @returns {Object} Gap analysis
     */
    static calculateGapAnalysis(current, ideal) {
        const healthGap = Math.max(ideal.health - current.health, 0);
        const termGap = Math.max(ideal.term - current.term, 0);

        return {
            health: {
                current: current.health,
                ideal: ideal.health,
                gap: healthGap,
                progress: ideal.health > 0 ? (current.health / ideal.health) * 100 : 0,
                isAdequate: current.health >= ideal.health
            },
            term: {
                current: current.term,
                ideal: ideal.term,
                gap: termGap,
                progress: ideal.term > 0 ? (current.term / ideal.term) * 100 : 0,
                isAdequate: current.term >= ideal.term
            }
        };
    }

    /**
     * Filter policies by type
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @param {string} policyType - Policy type to filter
     * @returns {Array} Filtered policies
     */
    static filterByType(insurancePolicies, policyType) {
        if (!insurancePolicies || !Array.isArray(insurancePolicies)) return [];

        return insurancePolicies.filter(policy => 
            policy.policyType === policyType
        );
    }

    /**
     * Get active policies (not expired)
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @returns {Array} Active policies
     */
    static getActivePolicies(insurancePolicies) {
        if (!insurancePolicies || !Array.isArray(insurancePolicies)) return [];

        const today = new Date();
        return insurancePolicies.filter(policy => {
            if (!policy.endDate) return true; // No end date means active
            const endDate = new Date(policy.endDate);
            return endDate >= today;
        });
    }

    /**
     * Calculate monthly insurance cost
     * @param {Array} insurancePolicies - Array of insurance policy objects
     * @returns {number} Monthly insurance cost
     */
    static calculateMonthlyCost(insurancePolicies) {
        const annualPremium = this.calculateTotalAnnualPremium(insurancePolicies);
        return annualPremium / 12;
    }
}
