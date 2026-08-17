/**
 * FrequencyConverter - Utility for converting between different payment frequencies
 * Pure functions with no side effects - platform independent
 */

export class FrequencyConverter {
    static FREQ_DIVISORS = {
        'Monthly': 1,
        'Quarterly': 3,
        'Semi-Annual': 6,
        'Annual': 12,
        'One-Time': 0
    };

    static FREQ_MULTIPLIERS = {
        'Monthly': 12,
        'Quarterly': 4,
        'Semi-Annual': 2,
        'Annual': 1
    };

    /**
     * Convert any frequency to monthly equivalent
     * @param {number} amount - Amount to convert
     * @param {string} frequency - Source frequency
     * @returns {number} Monthly equivalent amount
     */
    static toMonthly(amount, frequency) {
        const divisor = this.FREQ_DIVISORS[frequency];
        if (divisor === undefined) {
            console.warn(`Unknown frequency: ${frequency}, defaulting to Monthly`);
            return amount;
        }
        return divisor === 0 ? 0 : amount / divisor;
    }

    /**
     * Convert monthly amount to any frequency
     * @param {number} monthlyAmount - Monthly amount
     * @param {string} frequency - Target frequency
     * @returns {number} Converted amount
     */
    static fromMonthly(monthlyAmount, frequency) {
        const multiplier = this.FREQ_MULTIPLIERS[frequency];
        if (multiplier === undefined) {
            console.warn(`Unknown frequency: ${frequency}, defaulting to Monthly`);
            return monthlyAmount;
        }
        return monthlyAmount * multiplier;
    }

    /**
     * Get number of periods per year for a frequency
     * @param {string} frequency - Frequency
     * @returns {number} Periods per year
     */
    static getPeriodsPerYear(frequency) {
        return this.FREQ_MULTIPLIERS[frequency] || 12;
    }

    /**
     * Get all valid frequencies
     * @returns {Array<string>} List of valid frequencies
     */
    static getValidFrequencies() {
        return Object.keys(this.FREQ_DIVISORS);
    }

    /**
     * Check if frequency is valid
     * @param {string} frequency - Frequency to check
     * @returns {boolean} True if valid
     */
    static isValidFrequency(frequency) {
        return frequency in this.FREQ_DIVISORS;
    }
}
