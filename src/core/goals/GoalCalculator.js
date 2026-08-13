/**
 * GoalCalculator - Financial goal calculation logic
 * Pure functions with no side effects - platform independent
 */

import { DateUtils } from '../utils/DateUtils.js';

export class GoalCalculator {
    /**
     * Calculate goal progress percentage
     * @param {number} amountAccumulated - Amount accumulated so far
     * @param {number} amountNeeded - Total amount needed
     * @returns {number} Progress percentage (0-100)
     */
    static calculateProgress(amountAccumulated, amountNeeded) {
        if (!amountNeeded || amountNeeded === 0) return 0;
        return Math.min((amountAccumulated / amountNeeded) * 100, 100);
    }

    /**
     * Calculate remaining amount
     * @param {number} amountAccumulated - Amount accumulated so far
     * @param {number} amountNeeded - Total amount needed
     * @returns {number} Remaining amount
     */
    static calculateRemaining(amountAccumulated, amountNeeded) {
        return Math.max(amountNeeded - amountAccumulated, 0);
    }

    /**
     * Calculate months remaining until target date
     * @param {string} targetDate - Target date (YYYY-MM-DD)
     * @returns {number} Months remaining
     */
    static calculateMonthsRemaining(targetDate) {
        if (!targetDate) return 0;
        
        const now = new Date();
        const target = new Date(targetDate);
        const diffTime = target - now;
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        return Math.max(diffMonths, 0);
    }

    /**
     * Calculate required monthly savings to achieve goal
     * @param {number} remaining - Remaining amount
     * @param {number} monthsRemaining - Months remaining
     * @returns {number} Required monthly savings
     */
    static calculateRequiredMonthlySavings(remaining, monthsRemaining) {
        if (monthsRemaining === 0) return remaining;
        if (remaining <= 0) return 0;
        return remaining / monthsRemaining;
    }

    /**
     * Determine goal status based on progress and dates
     * @param {Object} goal - Goal object
     * @returns {string} Goal status
     */
    static determineGoalStatus(goal) {
        const progress = this.calculateProgress(
            goal.amountAccumulated || 0,
            goal.amountNeeded || 0
        );
        
        // Check if goal is achieved
        if (progress >= 100) return 'Achieved';
        
        // Check if target date has passed
        if (goal.targetDate) {
            const targetDate = new Date(goal.targetDate);
            const now = new Date();
            
            if (targetDate < now && progress < 100) {
                return 'Missed';
            }
        }
        
        // Check if there's any progress
        if (progress > 0) return 'Ongoing';
        
        return 'Planned';
    }

    /**
     * Check if goal is on track
     * @param {Object} goal - Goal object
     * @returns {boolean} True if on track
     */
    static isOnTrack(goal) {
        if (!goal.targetDate) return true; // No deadline, can't be off track
        
        const monthsRemaining = this.calculateMonthsRemaining(goal.targetDate);
        if (monthsRemaining === 0) {
            // Deadline reached
            const progress = this.calculateProgress(
                goal.amountAccumulated || 0,
                goal.amountNeeded || 0
            );
            return progress >= 100;
        }
        
        // Calculate expected progress based on time elapsed
        const now = new Date();
        const start = goal.startDate ? new Date(goal.startDate) : new Date();
        const target = new Date(goal.targetDate);
        
        const totalTime = target - start;
        const elapsedTime = now - start;
        
        if (totalTime <= 0) return true;
        
        const expectedProgress = (elapsedTime / totalTime) * 100;
        const actualProgress = this.calculateProgress(
            goal.amountAccumulated || 0,
            goal.amountNeeded || 0
        );
        
        return actualProgress >= expectedProgress;
    }

    /**
     * Calculate complete goal metrics
     * @param {Object} goal - Goal object
     * @returns {Object} Complete goal metrics
     */
    static calculateGoalMetrics(goal) {
        const amountAccumulated = Number(goal.amountAccumulated || 0);
        const amountNeeded = Number(goal.amountNeeded || 0);
        
        const progress = this.calculateProgress(amountAccumulated, amountNeeded);
        const remaining = this.calculateRemaining(amountAccumulated, amountNeeded);
        const monthsRemaining = this.calculateMonthsRemaining(goal.targetDate);
        const requiredMonthlySavings = this.calculateRequiredMonthlySavings(remaining, monthsRemaining);
        const status = this.determineGoalStatus(goal);
        const onTrack = this.isOnTrack(goal);

        return {
            progress,
            remaining,
            monthsRemaining,
            requiredMonthlySavings,
            status,
            onTrack,
            amountAccumulated,
            amountNeeded
        };
    }

    /**
     * Filter goals by status
     * @param {Array} goals - Array of goal objects
     * @param {string} status - Status to filter by
     * @returns {Array} Filtered goals
     */
    static filterByStatus(goals, status) {
        if (!goals || !Array.isArray(goals)) return [];
        
        return goals.filter(goal => {
            const goalStatus = this.determineGoalStatus(goal);
            return goalStatus === status;
        });
    }

    /**
     * Get active goals (Planned or Ongoing)
     * @param {Array} goals - Array of goal objects
     * @returns {Array} Active goals
     */
    static getActiveGoals(goals) {
        if (!goals || !Array.isArray(goals)) return [];
        
        return goals.filter(goal => {
            const status = this.determineGoalStatus(goal);
            return status === 'Planned' || status === 'Ongoing';
        });
    }

    /**
     * Sort goals by priority (closest deadline first)
     * @param {Array} goals - Array of goal objects
     * @returns {Array} Sorted goals
     */
    static sortByPriority(goals) {
        if (!goals || !Array.isArray(goals)) return [];
        
        return [...goals].sort((a, b) => {
            // Achieved and Missed goals go to the end
            const statusA = this.determineGoalStatus(a);
            const statusB = this.determineGoalStatus(b);
            
            if (statusA === 'Achieved' && statusB !== 'Achieved') return 1;
            if (statusA !== 'Achieved' && statusB === 'Achieved') return -1;
            if (statusA === 'Missed' && statusB !== 'Missed') return 1;
            if (statusA !== 'Missed' && statusB === 'Missed') return -1;
            
            // Sort by target date
            if (!a.targetDate && b.targetDate) return 1;
            if (a.targetDate && !b.targetDate) return -1;
            if (!a.targetDate && !b.targetDate) return 0;
            
            return new Date(a.targetDate) - new Date(b.targetDate);
        });
    }

    /**
     * Calculate total for all goals
     * @param {Array} goals - Array of goal objects
     * @returns {Object} Total metrics
     */
    static calculateTotalMetrics(goals) {
        if (!goals || !Array.isArray(goals)) {
            return {
                totalNeeded: 0,
                totalAccumulated: 0,
                totalRemaining: 0,
                overallProgress: 0,
                activeGoalsCount: 0,
                achievedGoalsCount: 0
            };
        }

        let totalNeeded = 0;
        let totalAccumulated = 0;
        let achievedCount = 0;
        let activeCount = 0;

        goals.forEach(goal => {
            totalNeeded += Number(goal.amountNeeded || 0);
            totalAccumulated += Number(goal.amountAccumulated || 0);
            
            const status = this.determineGoalStatus(goal);
            if (status === 'Achieved') achievedCount++;
            if (status === 'Planned' || status === 'Ongoing') activeCount++;
        });

        const totalRemaining = Math.max(totalNeeded - totalAccumulated, 0);
        const overallProgress = totalNeeded > 0 ? (totalAccumulated / totalNeeded) * 100 : 0;

        return {
            totalNeeded,
            totalAccumulated,
            totalRemaining,
            overallProgress,
            activeGoalsCount: activeCount,
            achievedGoalsCount: achievedCount,
            totalGoalsCount: goals.length
        };
    }
}
