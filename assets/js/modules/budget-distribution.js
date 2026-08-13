// ── Budget Distribution ─────────────────────────────────────────────────────
// Shared by the Budget pie chart, annual rollup, and Dashboard so category
// totals stay identical everywhere in the app.
export function getMonthlyBudgetDistribution(monthData = {}) {
    const inflowTotal = Object.values(monthData.inflow || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const outflowTotal = Object.values(monthData.outflow || {}).reduce((sum, value) => sum + Number(value || 0), 0);

    const liability = Number(monthData.outflow?.loanEMI || 0)
        + Number(monthData.outflow?.debtRepayment || 0)
        + Number(monthData.investing?.ondemandLiability || 0);
    const insurance = Number(monthData.outflow?.insurancePremiums || 0);
    const expenditure = Number(monthData.outflow?.fixedExpenditure || 0)
        + Number(monthData.outflow?.variableExpenditure || 0)
        + Number(monthData.outflow?.utilityBills || 0)
        + Number(monthData.outflow?.familyExpenditure || 0)
        + Number(monthData.outflow?.miscExpenses || 0)
        + Number(monthData.outflow?.creditCardOutstanding || 0)
        + Number(monthData.outflow?.midMonthCCOutstanding || 0)
        + Number(monthData.investing?.ondemandExpenditure || 0);
    const saving = Number(monthData.outflow?.fixedSaving || 0)
        + Number(monthData.investing?.onetimeSaving || 0);
    const investment = Number(monthData.outflow?.fixedInvestment || 0)
        + Number(monthData.investing?.onetimeInvestment || 0);
    const other = Math.max(0, outflowTotal - liability - insurance - expenditure - saving - investment);

    return { income: inflowTotal, expenditure, saving, investment, liability, insurance, other };
}
