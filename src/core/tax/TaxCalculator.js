/**
 * TaxCalculator - Tax calculation logic
 * Pure functions with no side effects - platform independent
 */

export class TaxCalculator {
    /**
     * Section-wise tax deduction limits (Indian tax law)
     */
    static SECTION_LIMITS = {
        '80C': 150000,
        '80D': 25000,
        '80CCD(1B)': 50000,
        '80TTA': 10000,
        '80G': null, // No fixed limit
        'HRA': null, // Calculated separately
        'Other': null
    };

    /**
     * Calculate total tax deductions
     * @param {Array} taxItems - Array of tax deduction items
     * @returns {Object} Deductions by section
     */
    static calculateTotalDeductions(taxItems) {
        if (!taxItems || !Array.isArray(taxItems)) {
            return {};
        }

        const deductionsBySection = {};

        taxItems.forEach(item => {
            const section = item.section || 'Other';
            const amount = Number(item.amount || 0);

            if (!deductionsBySection[section]) {
                deductionsBySection[section] = 0;
            }

            deductionsBySection[section] += amount;
        });

        return deductionsBySection;
    }

    /**
     * Get auto tax deductions from investments and insurance
     * @param {Array} investments - Array of investment objects
     * @param {Array} outflows - Array of outflow objects
     * @returns {Array} Auto-generated tax deduction items
     */
    static getAutoTaxDeductions(investments, outflows) {
        const autoDeductions = [];

        // EPF, PPF, NPS from investments
        if (investments && Array.isArray(investments)) {
            investments.forEach(inv => {
                const type = inv.type;
                const amount = Number(inv.amount || 0);

                if (amount > 0) {
                    if (type === 'EPF' || type === 'PPF') {
                        autoDeductions.push({
                            id: `auto-tax-${inv.id}`,
                            name: `${type} - ${inv.name}`,
                            section: '80C',
                            amount: amount,
                            isAuto: true,
                            source: 'investment'
                        });
                    } else if (type === 'NPS') {
                        autoDeductions.push({
                            id: `auto-tax-${inv.id}`,
                            name: `NPS - ${inv.name}`,
                            section: '80CCD(1B)',
                            amount: amount,
                            isAuto: true,
                            source: 'investment'
                        });
                    }
                }
            });
        }

        // Insurance premiums from outflows
        if (outflows && Array.isArray(outflows)) {
            outflows
                .filter(outflow => outflow.type === 'Insurance')
                .forEach(outflow => {
                    const amount = Number(outflow.amount || 0);
                    if (amount > 0) {
                        autoDeductions.push({
                            id: `auto-tax-insurance-${outflow.id}`,
                            name: `Insurance Premium - ${outflow.name}`,
                            section: '80D',
                            amount: amount,
                            isAuto: true,
                            source: 'outflow'
                        });
                    }
                });
        }

        return autoDeductions;
    }

    /**
     * Calculate tax summary with limits
     * @param {Array} taxItems - Array of tax deduction items
     * @returns {Object} Tax summary
     */
    static calculateTaxSummary(taxItems) {
        if (!taxItems || !Array.isArray(taxItems)) {
            return {
                totalDeductions: 0,
                bySection: {},
                autoDeductions: { count: 0, amount: 0 },
                manualDeductions: { count: 0, amount: 0 }
            };
        }

        const bySection = {};
        let totalDeductions = 0;
        let autoCount = 0;
        let autoAmount = 0;
        let manualCount = 0;
        let manualAmount = 0;

        // Initialize sections
        Object.keys(this.SECTION_LIMITS).forEach(section => {
            bySection[section] = {
                amount: 0,
                limit: this.SECTION_LIMITS[section],
                remaining: this.SECTION_LIMITS[section],
                items: []
            };
        });

        // Process items
        taxItems.forEach(item => {
            const section = item.section || 'Other';
            const amount = Number(item.amount || 0);
            const isAuto = item.isAuto || false;

            if (!bySection[section]) {
                bySection[section] = {
                    amount: 0,
                    limit: null,
                    remaining: null,
                    items: []
                };
            }

            bySection[section].amount += amount;
            bySection[section].items.push(item);

            // Track auto vs manual
            if (isAuto) {
                autoCount++;
                autoAmount += amount;
            } else {
                manualCount++;
                manualAmount += amount;
            }
        });

        // Calculate remaining and total deductions
        Object.keys(bySection).forEach(section => {
            const sectionData = bySection[section];
            
            if (sectionData.limit !== null) {
                sectionData.remaining = Math.max(sectionData.limit - sectionData.amount, 0);
                // Cap at limit for total deductions
                totalDeductions += Math.min(sectionData.amount, sectionData.limit);
            } else {
                // No limit, add full amount
                totalDeductions += sectionData.amount;
            }
        });

        return {
            totalDeductions,
            bySection,
            autoDeductions: {
                count: autoCount,
                amount: autoAmount
            },
            manualDeductions: {
                count: manualCount,
                amount: manualAmount
            }
        };
    }

    /**
     * Calculate tax savings
     * @param {number} totalDeductions - Total deductions
     * @param {number} taxRate - Tax rate (%) (default: 30)
     * @returns {number} Tax savings
     */
    static calculateTaxSavings(totalDeductions, taxRate = 30) {
        return (totalDeductions * taxRate) / 100;
    }

    /**
     * Get section limits
     * @returns {Object} Section limits
     */
    static getSectionLimits() {
        return { ...this.SECTION_LIMITS };
    }

    /**
     * Check if section has limit
     * @param {string} section - Section name
     * @returns {boolean} True if section has limit
     */
    static hasLimit(section) {
        return this.SECTION_LIMITS[section] !== null && this.SECTION_LIMITS[section] !== undefined;
    }

    /**
     * Get remaining deduction capacity for a section
     * @param {string} section - Section name
     * @param {number} currentAmount - Current deduction amount
     * @returns {number|null} Remaining capacity or null if no limit
     */
    static getRemainingCapacity(section, currentAmount) {
        const limit = this.SECTION_LIMITS[section];
        if (limit === null || limit === undefined) return null;
        return Math.max(limit - currentAmount, 0);
    }

    /**
     * Separate manual and auto tax items
     * @param {Array} taxItems - Array of tax deduction items
     * @returns {Object} Separated items
     */
    static separateManualAndAutoItems(taxItems) {
        if (!taxItems || !Array.isArray(taxItems)) {
            return { manual: [], auto: [] };
        }

        const manual = taxItems.filter(item => !item.isAuto);
        const auto = taxItems.filter(item => item.isAuto);

        return { manual, auto };
    }
}
