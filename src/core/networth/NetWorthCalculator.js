/**
 * NetWorthCalculator - Net worth calculation logic
 * Pure functions with no side effects - platform independent
 */

export class NetWorthCalculator {
    static DEFAULT_INFLATION_RATE = 6; // 6% annual inflation
    static DEFAULT_RETIREMENT_AGE = 70;

    /**
     * Calculate current net worth
     * @param {Array} assets - Array of asset objects
     * @param {Array} liabilities - Array of liability objects
     * @returns {number} Current net worth
     */
    static calculateCurrentNetWorth(assets, liabilities) {
        const totalAssets = this.calculateTotalAssets(assets);
        const totalLiabilities = this.calculateTotalLiabilities(liabilities);
        return totalAssets - totalLiabilities;
    }

    /**
     * Calculate total assets
     * @param {Array} assets - Array of asset objects
     * @returns {number} Total assets
     */
    static calculateTotalAssets(assets) {
        if (!assets || !Array.isArray(assets)) return 0;
        return assets.reduce((total, asset) => total + Number(asset.value || 0), 0);
    }

    /**
     * Calculate total liabilities
     * @param {Array} liabilities - Array of liability objects
     * @returns {number} Total liabilities
     */
    static calculateTotalLiabilities(liabilities) {
        if (!liabilities || !Array.isArray(liabilities)) return 0;
        return liabilities.reduce((total, liability) => total + Number(liability.value || 0), 0);
    }

    /**
     * Project value at a future age
     * @param {number} currentValue - Current value
     * @param {number} growthRate - Annual growth rate (%)
     * @param {number} currentAge - Current age
     * @param {number} targetAge - Target age (default: 70)
     * @returns {number} Projected value
     */
    static projectValueAtAge(currentValue, growthRate, currentAge, targetAge = 70) {
        const years = Math.max(targetAge - currentAge, 0);
        if (years === 0) return currentValue;
        if (growthRate === 0) return currentValue;

        return currentValue * Math.pow(1 + growthRate / 100, years);
    }

    /**
     * Calculate inflation-adjusted (real) value
     * @param {number} futureValue - Future value
     * @param {number} years - Number of years
     * @param {number} inflationRate - Annual inflation rate (%) (default: 6)
     * @returns {number} Real value
     */
    static calculateRealValue(futureValue, years, inflationRate = 6) {
        if (years === 0) return futureValue;
        return futureValue / Math.pow(1 + inflationRate / 100, years);
    }

    /**
     * Get auto-entries from accounts and outflows
     * @param {Array} accounts - Array of account objects
     * @param {Array} outflows - Array of outflow objects
     * @returns {Array} Auto-generated net worth entries
     */
    static getAutoNetWorthEntries(accounts, outflows) {
        const entries = [];

        // Add account balances as assets
        if (accounts && Array.isArray(accounts)) {
            accounts.forEach(account => {
                const balance = Number(account.balance || 0);
                if (balance > 0) {
                    entries.push({
                        id: `auto-account-${account.id}`,
                        name: `${account.bankName} Account`,
                        type: 'Asset',
                        value: balance,
                        growthRate: 0,
                        isAuto: true,
                        source: 'account'
                    });
                }
            });
        }

        // Add liabilities from outflows
        if (outflows && Array.isArray(outflows)) {
            outflows
                .filter(outflow => outflow.type === 'Liability')
                .forEach(outflow => {
                    const amount = Number(outflow.amount || 0);
                    if (amount > 0) {
                        entries.push({
                            id: `auto-liability-${outflow.id}`,
                            name: outflow.name,
                            type: 'Liability',
                            value: amount,
                            growthRate: 0,
                            isAuto: true,
                            source: 'outflow'
                        });
                    }
                });
        }

        return entries;
    }

    /**
     * Calculate complete net worth summary
     * @param {Array} entries - Array of net worth entry objects
     * @param {number} currentAge - Current age
     * @param {number} targetAge - Target age (default: 70)
     * @param {number} inflationRate - Inflation rate (default: 6)
     * @returns {Object} Complete net worth summary
     */
    static calculateNetWorthSummary(entries, currentAge, targetAge = 70, inflationRate = 6) {
        if (!entries || !Array.isArray(entries)) {
            return {
                current: { assets: 0, liabilities: 0, netWorth: 0 },
                atTargetAge: { assets: 0, liabilities: 0, netWorth: 0 },
                atTargetAgeReal: { assets: 0, liabilities: 0, netWorth: 0 },
                byType: { assets: [], liabilities: [] }
            };
        }

        const years = Math.max(targetAge - currentAge, 0);
        const assets = [];
        const liabilities = [];

        let currentAssets = 0;
        let currentLiabilities = 0;
        let futureAssets = 0;
        let futureLiabilities = 0;
        let futureAssetsReal = 0;
        let futureLiabilitiesReal = 0;

        entries.forEach(entry => {
            const currentValue = Number(entry.value || 0);
            const growthRate = Number(entry.growthRate || 0);
            const futureValue = this.projectValueAtAge(currentValue, growthRate, currentAge, targetAge);
            const realValue = this.calculateRealValue(futureValue, years, inflationRate);

            const item = {
                name: entry.name,
                current: currentValue,
                atTargetAge: futureValue,
                atTargetAgeReal: realValue,
                growthRate: growthRate,
                isAuto: entry.isAuto || false
            };

            if (entry.type === 'Asset') {
                assets.push(item);
                currentAssets += currentValue;
                futureAssets += futureValue;
                futureAssetsReal += realValue;
            } else if (entry.type === 'Liability') {
                liabilities.push(item);
                currentLiabilities += currentValue;
                futureLiabilities += futureValue;
                futureLiabilitiesReal += realValue;
            }
        });

        return {
            current: {
                assets: currentAssets,
                liabilities: currentLiabilities,
                netWorth: currentAssets - currentLiabilities
            },
            atTargetAge: {
                assets: futureAssets,
                liabilities: futureLiabilities,
                netWorth: futureAssets - futureLiabilities
            },
            atTargetAgeReal: {
                assets: futureAssetsReal,
                liabilities: futureLiabilitiesReal,
                netWorth: futureAssetsReal - futureLiabilitiesReal
            },
            byType: {
                assets,
                liabilities
            },
            targetAge,
            yearsToTarget: years
        };
    }

    /**
     * Separate manual and auto entries
     * @param {Array} entries - Array of net worth entry objects
     * @returns {Object} Separated entries
     */
    static separateManualAndAutoEntries(entries) {
        if (!entries || !Array.isArray(entries)) {
            return { manual: [], auto: [] };
        }

        const manual = entries.filter(entry => !entry.isAuto);
        const auto = entries.filter(entry => entry.isAuto);

        return { manual, auto };
    }

    /**
     * Calculate net worth growth rate
     * @param {number} currentNetWorth - Current net worth
     * @param {number} previousNetWorth - Previous net worth
     * @returns {number} Growth rate (%)
     */
    static calculateGrowthRate(currentNetWorth, previousNetWorth) {
        if (previousNetWorth === 0) return 0;
        return ((currentNetWorth - previousNetWorth) / previousNetWorth) * 100;
    }
}
