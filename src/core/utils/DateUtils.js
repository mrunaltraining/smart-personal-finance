/**
 * DateUtils - Utility functions for date manipulation
 * Pure functions with no side effects - platform independent
 */

export class DateUtils {
    /**
     * Get month key in YYYY-MM format
     * @param {Date|string} date - Date object or string
     * @returns {string} Month key (e.g., "2026-08")
     */
    static getMonthKey(date) {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Get current month key
     * @returns {string} Current month key
     */
    static getCurrentMonthKey() {
        return this.getMonthKey(new Date());
    }

    /**
     * Get financial year for a date (April-March)
     * @param {Date|string} date - Date object or string
     * @returns {number} Financial year
     */
    static getFinancialYear(date) {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        return month >= 4 ? year : year - 1;
    }

    /**
     * Calculate age from date of birth
     * @param {string} dateOfBirth - Date of birth (YYYY-MM-DD)
     * @returns {number} Age in years
     */
    static calculateAge(dateOfBirth) {
        if (!dateOfBirth) return 0;
        
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Get next month key
     * @param {string} monthKey - Current month key (YYYY-MM)
     * @returns {string} Next month key
     */
    static getNextMonthKey(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    }

    /**
     * Get previous month key
     * @param {string} monthKey - Current month key (YYYY-MM)
     * @returns {string} Previous month key
     */
    static getPreviousMonthKey(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    /**
     * Format date as YYYY-MM-DD
     * @param {Date} date - Date object
     * @returns {string} Formatted date
     */
    static formatDate(date) {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get today's date as YYYY-MM-DD
     * @returns {string} Today's date
     */
    static getTodayString() {
        return this.formatDate(new Date());
    }

    /**
     * Calculate months between two dates
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {number} Number of months
     */
    static monthsBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const yearDiff = end.getFullYear() - start.getFullYear();
        const monthDiff = end.getMonth() - start.getMonth();
        
        return yearDiff * 12 + monthDiff;
    }

    /**
     * Check if date is in the past
     * @param {string} date - Date to check (YYYY-MM-DD)
     * @returns {boolean} True if in the past
     */
    static isInPast(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    }

    /**
     * Check if date is in the future
     * @param {string} date - Date to check (YYYY-MM-DD)
     * @returns {boolean} True if in the future
     */
    static isInFuture(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d > today;
    }
}
