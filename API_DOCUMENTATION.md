# SmartFin - API Documentation
## Service Layer API Reference

> **Purpose**: Complete API reference for all service methods. This document describes the interface between UI and business logic layers.

---

## Table of Contents

1. [Authentication Service](#1-authentication-service)
2. [Account Service](#2-account-service)
3. [Budget Service](#3-budget-service)
4. [Investment Service](#4-investment-service)
5. [Goal Service](#5-goal-service)
6. [Insurance Service](#6-insurance-service)
7. [Net Worth Service](#7-net-worth-service)
8. [Tax Service](#8-tax-service)
9. [Expense Service](#9-expense-service)
10. [Dashboard Service](#10-dashboard-service)
11. [Data Export Service](#11-data-export-service)
12. [Error Handling](#12-error-handling)
13. [Response Formats](#13-response-formats)

---

## 1. Authentication Service

### `AuthService`

Handles user authentication and session management.

#### Constructor
```javascript
constructor(authRepository, userRepository)
```

#### Methods

##### `signIn(email, password)`
Sign in an existing user.

**Parameters:**
- `email` (string): User email address
- `password` (string): User password

**Returns:**
```javascript
{
  success: boolean,
  user?: {
    uid: string,
    email: string,
    displayName: string
  },
  error?: string
}
```

**Example:**
```javascript
const authService = new AuthService(authRepo, userRepo);
const result = await authService.signIn('user@example.com', 'password123');

if (result.success) {
  console.log('Logged in:', result.user);
} else {
  console.error('Login failed:', result.error);
}
```

##### `signUp(email, password, userData)`
Register a new user.

**Parameters:**
- `email` (string): User email address
- `password` (string): User password (min 6 characters)
- `userData` (object):
  ```javascript
  {
    name: string,
    dateOfBirth?: string,  // YYYY-MM-DD
    location?: string      // Default: "Bengaluru, Karnataka, India"
  }
  ```

**Returns:**
```javascript
{
  success: boolean,
  user?: {
    uid: string,
    email: string,
    displayName: string
  },
  error?: string
}
```

##### `signOut()`
Sign out the current user.

**Returns:**
```javascript
Promise<void>
```

##### `getCurrentUser()`
Get the currently authenticated user.

**Returns:**
```javascript
{
  uid: string,
  email: string,
  displayName: string
} | null
```

##### `resetPassword(email)`
Send password reset email.

**Parameters:**
- `email` (string): User email address

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `onAuthStateChanged(callback)`
Listen to authentication state changes.

**Parameters:**
- `callback` (function): Callback function called when auth state changes

**Returns:**
```javascript
function // Unsubscribe function
```

**Example:**
```javascript
const unsubscribe = authService.onAuthStateChanged((user) => {
  if (user) {
    console.log('User logged in:', user.uid);
  } else {
    console.log('User logged out');
  }
});

// Later: unsubscribe();
```

---

## 2. Account Service

### `AccountService`

Manages user accounts (bank accounts, credit cards).

#### Constructor
```javascript
constructor(userRepository, cacheManager)
```

#### Methods

##### `getAccounts(uid)`
Get all accounts for a user.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<Account>>

// Account structure:
{
  id: string,
  bankName: string,
  isPrimary: "Yes" | "No",
  accountPresent: "Yes" | "No",
  balance: number,
  debitCardPresent: "Yes" | "No",
  creditCardPresent: "Yes" | "No",
  creditCardLimit: number,
  purpose: "Salary" | "Expenditure" | "Saving" | "Investment" | "Loan" | "Others",
  purposeOther?: string,
  kycUpdated: "Yes" | "No",
  nomineeAdded: "Yes" | "No"
}
```

**Example:**
```javascript
const accounts = await accountService.getAccounts(uid);
console.log(`User has ${accounts.length} accounts`);
```

##### `addAccount(uid, accountData)`
Add a new account.

**Parameters:**
- `uid` (string): User ID
- `accountData` (object): Account details (see Account structure above)

**Returns:**
```javascript
{
  success: boolean,
  account?: Account,
  errors?: Array<string>
}
```

**Validation Rules:**
- Only ONE Primary account allowed
- Only ONE Salary account allowed
- Only ONE Saving account allowed
- Bank name is required
- If `isPrimary=Yes`, purpose is auto-set to "Expenditure"

**Example:**
```javascript
const result = await accountService.addAccount(uid, {
  bankName: "HDFC Bank",
  isPrimary: "Yes",
  accountPresent: "Yes",
  balance: 50000,
  debitCardPresent: "Yes",
  creditCardPresent: "No"
});

if (result.success) {
  console.log('Account added:', result.account.id);
} else {
  console.error('Errors:', result.errors);
}
```

##### `updateAccount(uid, accountId, updates)`
Update an existing account.

**Parameters:**
- `uid` (string): User ID
- `accountId` (string): Account ID
- `updates` (object): Fields to update

**Returns:**
```javascript
{
  success: boolean,
  account?: Account,
  error?: string
}
```

##### `deleteAccount(uid, accountId)`
Delete an account.

**Parameters:**
- `uid` (string): User ID
- `accountId` (string): Account ID

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `getPrimaryAccount(uid)`
Get the primary (expenditure) account.

**Returns:**
```javascript
Promise<Account | null>
```

##### `getSalaryAccount(uid)`
Get the salary account.

**Returns:**
```javascript
Promise<Account | null>
```

##### `getSavingAccount(uid)`
Get the saving account.

**Returns:**
```javascript
Promise<Account | null>
```

##### `getInvestmentAccount(uid)`
Get the investment account.

**Returns:**
```javascript
Promise<Account | null>
```

##### `calculateTotalBalance(uid)`
Calculate total balance across all accounts.

**Returns:**
```javascript
Promise<number>
```

---

## 3. Budget Service

### `BudgetService`

Manages monthly budget data and calculations.

#### Constructor
```javascript
constructor(userRepository, accountService, outflowService, cacheManager)
```

#### Methods

##### `getMonthlyBudget(uid, monthKey)`
Get budget data for a specific month.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key in format "YYYY-MM" (e.g., "2026-08")

**Returns:**
```javascript
Promise<BudgetData>

// BudgetData structure:
{
  inflow: {
    primaryIncome: number,
    secondaryIncome: number,
    borrowing: number,
    interest: number,
    othersInflow: number
  },
  outflow: {
    loanEMI: number,              // Auto-calculated
    insurancePremiums: number,    // Auto-calculated
    fixedSaving: number,          // Auto-calculated
    fixedInvestment: number,      // Auto-calculated
    fixedExpenditure: number,     // Auto-calculated
    fixedOthers: number,          // Auto-calculated
    variableExpenditure: number,  // Auto-calculated
    creditCardOutstanding: number,// Auto-calculated
    midMonthCCOutstanding: number,
    debtRepayment: number,
    utilityBills: number,
    familyExpenditure: number,
    miscExpenses: number
  },
  investing: {
    onetimeSaving: number,
    onetimeSavingDesc: string,
    onetimeInvestment: number,
    onetimeInvestmentDesc: string,
    ondemandExpenditure: number,
    ondemandExpenditureDesc: string,
    ondemandLiability: number,
    ondemandLiabilityDesc: string
  },
  monthEndBalance: number,
  _transferDone: number,
  _initialBalance: number,
  _carryForwardDone: number,
  _ccSettlementAmount: number,
  _actualCCOutstanding: number,
  _monthClosed: boolean,
  autoLinkedFields: object,
  autoLinkedBreakdown: object
}
```

##### `updateMonthlyBudget(uid, monthKey, budgetData)`
Update budget data for a month.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"
- `budgetData` (object): Budget data to update

**Returns:**
```javascript
{
  success: boolean,
  budgetData?: BudgetData,
  errors?: Array<string>
}
```

**Validation Rules:**
- Primary income cannot be negative
- All amounts must be numbers
- Auto-linked fields are read-only

##### `calculateBudgetSummary(uid, monthKey)`
Calculate budget summary with all totals.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"

**Returns:**
```javascript
Promise<BudgetSummary>

// BudgetSummary structure:
{
  inflowTotal: number,
  outflowTotal: number,
  investingTotal: number,
  fixedMonthlyOutflow: number,
  totalSpendable: number,
  variableExpenses: number,
  budgetBalance: number,
  budgetStatus: {
    type: "positive" | "negative" | "neutral",
    message: string
  },
  autoDebitByType: {
    Liability: number,
    Insurance: number,
    Savings: number,
    Investment: number,
    Expenditure: number,
    Others: number
  }
}
```

**Example:**
```javascript
const summary = await budgetService.calculateBudgetSummary(uid, '2026-08');
console.log('Budget balance:', summary.budgetBalance);
console.log('Status:', summary.budgetStatus.message);
```

##### `executeTransfer(uid, monthKey)`
Execute salary transfer for the month.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"

**Returns:**
```javascript
{
  success: boolean,
  transferAmount?: number,
  breakdown?: {
    income: object,
    deductions: object,
    internalTransfers: object,
    summary: object,
    expenditureAccount: object,
    salaryAccount: object
  },
  errors?: Array<string>
}
```

**Prerequisites:**
- Salary account must exist
- Expenditure account must exist
- Primary income must be set and > 0
- Transfer not already done
- Month not closed
- Transfer amount must be positive

**Actions Performed:**
1. Deduct full primary income from salary account
2. Credit transfer amount to expenditure account
3. Credit auto-debit amounts to saving/investment accounts
4. Record transfer in budget data
5. Update account balances

**Example:**
```javascript
const result = await budgetService.executeTransfer(uid, '2026-08');

if (result.success) {
  console.log('Transfer completed:', result.transferAmount);
  console.log('Breakdown:', result.breakdown);
} else {
  console.error('Transfer failed:', result.errors);
}
```

##### `closeMonth(uid, monthKey)`
Close the current month's budget.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"

**Returns:**
```javascript
{
  success: boolean,
  carryForward?: number,
  error?: string
}
```

**Actions Performed:**
1. Mark month as closed (`_monthClosed = true`)
2. Record carry forward amount (`_carryForwardDone`)
3. Month becomes read-only
4. Next month auto-gets CC outstanding

**Example:**
```javascript
const result = await budgetService.closeMonth(uid, '2026-08');

if (result.success) {
  console.log('Month closed. Carry forward:', result.carryForward);
}
```

##### `updateExpenditureBalance(uid, monthKey, newBalance)`
Quick update expenditure account balance.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"
- `newBalance` (number): New expenditure account balance

**Returns:**
```javascript
{
  success: boolean,
  variableExpenditure?: number,
  error?: string
}
```

**Calculation:**
```
variableExpenditure = totalFunded - newBalance
where totalFunded = initialBalance + carryForward + transferDone
```

##### `updateCCOutstanding(uid, monthKey, ccAmount)`
Quick update mid-month CC outstanding.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"
- `ccAmount` (number): Mid-month CC outstanding amount

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `getAnnualSummary(uid, financialYear)`
Get annual budget summary.

**Parameters:**
- `uid` (string): User ID
- `financialYear` (number): Financial year (e.g., 2026 for FY 2026-27)

**Returns:**
```javascript
Promise<AnnualSummary>

// AnnualSummary structure:
{
  year: number,
  months: Array<MonthSummary>,
  totals: {
    income: number,
    expenses: number,
    savings: number,
    investments: number
  },
  averages: {
    monthlyIncome: number,
    monthlyExpenses: number,
    monthlySavings: number
  }
}
```

---

## 4. Investment Service

### `InvestmentService`

Manages investment tracking and portfolio calculations.

#### Constructor
```javascript
constructor(userRepository, budgetService, cacheManager)
```

#### Methods

##### `getInvestments(uid)`
Get all investments for a user.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<Investment>>

// Investment structure:
{
  id: string,
  name: string,
  type: "Mutual Fund" | "SIP" | "FD" | "RD" | "Stocks" | "PPF" | "EPF" | "NPS" | "Bonds" | "Gold" | "Real Estate" | "Saving" | "Other",
  category: "Existing" | "Monthly",
  amount: number,
  currentValue: number,
  interestRate: number,
  frequency: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | "One-Time",
  startDate: string,
  endDate: string,
  details: string
}
```

##### `addInvestment(uid, investmentData)`
Add a new investment.

**Parameters:**
- `uid` (string): User ID
- `investmentData` (object): Investment details

**Returns:**
```javascript
{
  success: boolean,
  investment?: Investment,
  errors?: Array<string>
}
```

**Validation Rules:**
- Name is required
- Amount is required and must be > 0
- Current value must be >= 0
- Interest rate must be between 0 and 100

##### `updateInvestment(uid, investmentId, updates)`
Update an existing investment.

**Returns:**
```javascript
{
  success: boolean,
  investment?: Investment,
  error?: string
}
```

##### `deleteInvestment(uid, investmentId)`
Delete an investment.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `getInvestmentsByCategory(uid, category)`
Filter investments by category.

**Parameters:**
- `uid` (string): User ID
- `category` (string): "all" | "existing" | "monthly" | "portfolio"

**Returns:**
```javascript
Promise<Array<Investment>>
```

**Filtering Logic:**
- `existing`: category=Existing AND frequency≠Monthly
- `monthly`: category=Monthly OR frequency=Monthly
- `portfolio`: All investments + one-time budget investments
- `all`: All investments

##### `calculatePortfolioSummary(uid, monthKey)`
Calculate complete portfolio summary.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Current month key "YYYY-MM"

**Returns:**
```javascript
Promise<PortfolioSummary>

// PortfolioSummary structure:
{
  totalInvested: number,
  currentValue: number,
  totalReturns: number,
  returnPercentage: number,
  monthlyContribution: number,
  sections: {
    existingInvestments: {
      count: number,
      invested: number,
      currentValue: number,
      returns: number
    },
    monthlyInvestments: {
      count: number,
      monthlyAmount: number,
      totalInvested: number,
      currentValue: number
    },
    onetimeInvestments: {
      saving: number,
      investment: number,
      total: number
    }
  },
  byType: {
    [type: string]: {
      count: number,
      invested: number,
      currentValue: number
    }
  }
}
```

**Example:**
```javascript
const portfolio = await investmentService.calculatePortfolioSummary(uid, '2026-08');
console.log('Total invested:', portfolio.totalInvested);
console.log('Current value:', portfolio.currentValue);
console.log('Returns:', portfolio.totalReturns, `(${portfolio.returnPercentage}%)`);
```

##### `calculateSIPMaturity(monthlyAmount, rate, months)`
Calculate SIP maturity value.

**Parameters:**
- `monthlyAmount` (number): Monthly SIP amount
- `rate` (number): Expected annual return rate (%)
- `months` (number): Investment duration in months

**Returns:**
```javascript
number // Maturity value
```

**Formula:**
```
M = P × ((1 + r)^n - 1) / r × (1 + r)
where:
  M = Maturity value
  P = Monthly investment
  r = Monthly rate (annual rate / 12 / 100)
  n = Number of months
```

##### `calculateReturns(principal, rate, years)`
Calculate investment returns with compound interest.

**Parameters:**
- `principal` (number): Initial investment amount
- `rate` (number): Annual return rate (%)
- `years` (number): Investment duration in years

**Returns:**
```javascript
number // Future value
```

**Formula:**
```
FV = PV × (1 + r)^n
where:
  FV = Future value
  PV = Present value (principal)
  r = Annual rate / 100
  n = Number of years
```

---

## 5. Goal Service

### `GoalService`

Manages financial goals and progress tracking.

#### Constructor
```javascript
constructor(userRepository, cacheManager)
```

#### Methods

##### `getGoals(uid)`
Get all financial goals for a user.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<Goal>>

// Goal structure:
{
  id: string,
  name: string,
  amountNeeded: number,
  amountAccumulated: number,
  targetDate: string,  // YYYY-MM-DD
  details: string,
  goalType: "ShortTerm" | "MidTerm" | "LongTerm",
  status: "Planned" | "Ongoing" | "Achieved" | "Missed"
}
```

##### `addGoal(uid, goalData)`
Add a new financial goal.

**Parameters:**
- `uid` (string): User ID
- `goalData` (object): Goal details

**Returns:**
```javascript
{
  success: boolean,
  goal?: Goal,
  errors?: Array<string>
}
```

**Validation Rules:**
- Name is required
- Amount needed is required and must be > 0
- Amount accumulated must be >= 0
- Target date must be in the future (for new goals)

##### `updateGoal(uid, goalId, updates)`
Update an existing goal.

**Returns:**
```javascript
{
  success: boolean,
  goal?: Goal,
  error?: string
}
```

##### `deleteGoal(uid, goalId)`
Delete a goal.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `calculateGoalProgress(goal)`
Calculate progress metrics for a goal.

**Parameters:**
- `goal` (object): Goal object

**Returns:**
```javascript
{
  progress: number,          // Percentage (0-100)
  remaining: number,         // Amount remaining
  monthsRemaining: number,   // Months until target date
  requiredMonthlySavings: number,  // Required monthly savings to achieve goal
  status: string,            // Auto-determined status
  onTrack: boolean          // Whether goal is on track
}
```

**Example:**
```javascript
const goal = await goalService.getGoal(uid, goalId);
const progress = goalService.calculateGoalProgress(goal);

console.log(`Progress: ${progress.progress}%`);
console.log(`Remaining: ₹${progress.remaining}`);
console.log(`Required monthly savings: ₹${progress.requiredMonthlySavings}`);
console.log(`Status: ${progress.status}`);
```

##### `getActiveGoals(uid)`
Get all active goals (not achieved or missed).

**Returns:**
```javascript
Promise<Array<Goal>>
```

##### `getGoalsByType(uid, goalType)`
Filter goals by type.

**Parameters:**
- `goalType` (string): "ShortTerm" | "MidTerm" | "LongTerm"

**Returns:**
```javascript
Promise<Array<Goal>>
```

---

## 6. Insurance Service

### `InsuranceService`

Manages insurance policies and coverage calculations.

#### Constructor
```javascript
constructor(userRepository, cacheManager)
```

#### Methods

##### `getInsurancePolicies(uid)`
Get all insurance policies for a user.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<InsurancePolicy>>

// InsurancePolicy structure:
{
  id: string,
  name: string,
  policyType: "Term Life" | "Whole Life" | "Health" | "Vehicle" | "Home" | "Travel" | "Critical Illness" | "Personal Accident" | "Other",
  provider: string,
  policyNumber: string,
  sumAssured: number,
  premiumAmount: number,
  premiumFrequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Annual" | "None (Paid Up)",
  startDate: string,
  endDate: string,
  nominee: string,
  details: string
}
```

##### `addInsurancePolicy(uid, policyData)`
Add a new insurance policy.

**Parameters:**
- `uid` (string): User ID
- `policyData` (object): Policy details

**Returns:**
```javascript
{
  success: boolean,
  policy?: InsurancePolicy,
  errors?: Array<string>
}
```

**Validation Rules:**
- Name is required
- Sum assured must be > 0
- Premium amount must be >= 0
- Premium frequency is required

##### `updateInsurancePolicy(uid, policyId, updates)`
Update an existing policy.

**Returns:**
```javascript
{
  success: boolean,
  policy?: InsurancePolicy,
  error?: string
}
```

##### `deleteInsurancePolicy(uid, policyId)`
Delete a policy.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `calculateInsuranceSummary(uid)`
Calculate insurance coverage summary.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<InsuranceSummary>

// InsuranceSummary structure:
{
  totalCoverage: number,
  annualPremium: number,
  byType: {
    [policyType: string]: {
      count: number,
      coverage: number,
      annualPremium: number
    }
  },
  healthInsurance: {
    totalCoverage: number,
    policies: number
  },
  lifeInsurance: {
    totalCoverage: number,
    policies: number
  }
}
```

##### `calculateIdealCoverage(uid, userAge, userLocation)`
Calculate ideal insurance coverage.

**Parameters:**
- `uid` (string): User ID
- `userAge` (number): User's current age
- `userLocation` (string): User's location

**Returns:**
```javascript
Promise<IdealCoverage>

// IdealCoverage structure:
{
  healthInsurance: {
    ideal: number,
    current: number,
    gap: number,
    progress: number  // Percentage
  },
  termInsurance: {
    ideal: number,
    current: number,
    gap: number,
    progress: number
  }
}
```

**Health Insurance Calculation:**
```
Base = Metro cities: ₹10L, Non-metro: ₹5L
Age multiplier: <35: 1.0, 35-50: 1.5, >50: 2.0
Family multiplier: 1: 1.0, 2: 1.5, 3+: 2.0
Ideal = Base × Age multiplier × Family multiplier
```

**Term Insurance Calculation:**
```
Ideal = (Monthly Expenses × 12 × [65 - Age]) - Current Savings
```

---

## 7. Net Worth Service

### `NetWorthService`

Manages net worth tracking and projections.

#### Constructor
```javascript
constructor(userRepository, accountService, outflowService, cacheManager)
```

#### Methods

##### `getNetWorthEntries(uid)`
Get all net worth entries (manual + auto).

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<NetWorthEntry>>

// NetWorthEntry structure:
{
  id: string,
  name: string,
  type: "Asset" | "Liability",
  value: number,
  growthRate: number,  // Annual growth rate (%)
  details: string,
  isAuto: boolean      // Auto-generated from accounts/outflows
}
```

##### `addNetWorthEntry(uid, entryData)`
Add a manual net worth entry.

**Parameters:**
- `uid` (string): User ID
- `entryData` (object): Entry details

**Returns:**
```javascript
{
  success: boolean,
  entry?: NetWorthEntry,
  errors?: Array<string>
}
```

**Validation Rules:**
- Name is required
- Type is required
- Value is required and must be > 0
- Growth rate must be between -100 and 100

##### `updateNetWorthEntry(uid, entryId, updates)`
Update a manual entry (auto entries cannot be updated).

**Returns:**
```javascript
{
  success: boolean,
  entry?: NetWorthEntry,
  error?: string
}
```

##### `deleteNetWorthEntry(uid, entryId)`
Delete a manual entry (auto entries cannot be deleted).

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `calculateNetWorth(uid, userAge)`
Calculate current and projected net worth.

**Parameters:**
- `uid` (string): User ID
- `userAge` (number): User's current age

**Returns:**
```javascript
Promise<NetWorthSummary>

// NetWorthSummary structure:
{
  current: {
    assets: number,
    liabilities: number,
    netWorth: number
  },
  atAge70: {
    assets: number,
    liabilities: number,
    netWorth: number
  },
  atAge70Real: {  // Inflation-adjusted at 6%
    assets: number,
    liabilities: number,
    netWorth: number
  },
  byType: {
    assets: Array<{
      name: string,
      current: number,
      atAge70: number,
      atAge70Real: number
    }>,
    liabilities: Array<{
      name: string,
      current: number,
      atAge70: number,
      atAge70Real: number
    }>
  }
}
```

**Projection Formulas:**
```
At Age 70 = Current Value × (1 + Growth Rate)^(70 - Current Age)
Real Value = Future Value / (1 + Inflation Rate)^Years
```

**Example:**
```javascript
const netWorth = await netWorthService.calculateNetWorth(uid, 35);
console.log('Current net worth:', netWorth.current.netWorth);
console.log('Projected at 70:', netWorth.atAge70.netWorth);
console.log('Real value at 70:', netWorth.atAge70Real.netWorth);
```

---

## 8. Tax Service

### `TaxService`

Manages tax planning and deductions.

#### Constructor
```javascript
constructor(userRepository, investmentService, outflowService, cacheManager)
```

#### Methods

##### `getTaxItems(uid)`
Get all tax deduction items (manual + auto).

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<Array<TaxItem>>

// TaxItem structure:
{
  id: string,
  name: string,
  section: "80C" | "80D" | "80CCD(1B)" | "80TTA" | "80G" | "HRA" | "Other",
  amount: number,
  details: string,
  isAuto: boolean  // Auto-generated from investments/insurance
}
```

##### `addTaxItem(uid, itemData)`
Add a manual tax deduction item.

**Parameters:**
- `uid` (string): User ID
- `itemData` (object): Tax item details

**Returns:**
```javascript
{
  success: boolean,
  item?: TaxItem,
  errors?: Array<string>
}
```

##### `updateTaxItem(uid, itemId, updates)`
Update a manual tax item.

**Returns:**
```javascript
{
  success: boolean,
  item?: TaxItem,
  error?: string
}
```

##### `deleteTaxItem(uid, itemId)`
Delete a manual tax item.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `calculateTaxSummary(uid)`
Calculate tax deductions summary.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<TaxSummary>

// TaxSummary structure:
{
  totalDeductions: number,
  bySection: {
    [section: string]: {
      amount: number,
      limit: number | null,
      remaining: number | null,
      items: Array<TaxItem>
    }
  },
  autoDeductions: {
    count: number,
    amount: number
  },
  manualDeductions: {
    count: number,
    amount: number
  }
}
```

**Section Limits:**
- 80C: ₹1,50,000
- 80D: ₹25,000
- 80CCD(1B): ₹50,000
- 80TTA: ₹10,000
- 80G: No limit
- HRA: Calculated separately
- Other: No limit

**Auto-Deductions:**
- EPF, PPF, NPS from investments → 80C or 80CCD(1B)
- Insurance premiums from outflows → 80D

**Example:**
```javascript
const taxSummary = await taxService.calculateTaxSummary(uid);
console.log('Total deductions:', taxSummary.totalDeductions);
console.log('80C used:', taxSummary.bySection['80C'].amount);
console.log('80C remaining:', taxSummary.bySection['80C'].remaining);
```

---

## 9. Expense Service

### `ExpenseService`

Manages expense tracking and analysis.

#### Constructor
```javascript
constructor(userRepository, budgetService, cacheManager)
```

#### Methods

##### `getExpenses(uid, monthKey)`
Get all expenses for a specific month.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"

**Returns:**
```javascript
Promise<Array<Expense>>

// Expense structure:
{
  id: string,
  category: "Food & Dining" | "Transportation" | "Shopping" | "Entertainment" | "Healthcare" | "Education" | "Personal Care" | "Home & Utilities" | "Travel" | "Gifts & Donations" | "Others",
  amount: number,
  date: string,  // YYYY-MM-DD
  description: string,
  createdAt: string  // ISO timestamp
}
```

##### `addExpense(uid, monthKey, expenseData)`
Add a new expense.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"
- `expenseData` (object): Expense details

**Returns:**
```javascript
{
  success: boolean,
  expense?: Expense,
  errors?: Array<string>
}
```

**Validation Rules:**
- Category is required
- Amount is required and must be > 0
- Date is required and must be valid

##### `updateExpense(uid, monthKey, expenseId, updates)`
Update an existing expense.

**Returns:**
```javascript
{
  success: boolean,
  expense?: Expense,
  error?: string
}
```

##### `deleteExpense(uid, monthKey, expenseId)`
Delete an expense.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

##### `analyzeExpenses(uid, monthKey)`
Analyze expenses for a month.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"

**Returns:**
```javascript
Promise<ExpenseAnalysis>

// ExpenseAnalysis structure:
{
  totalExpenses: number,
  budgetVariableExpenditure: number,
  difference: number,
  isOverBudget: boolean,
  percentageUsed: number,
  byCategory: Array<{
    category: string,
    total: number,
    count: number,
    percentage: number,
    expenses: Array<Expense>
  }>,
  chartData: Array<{
    category: string,
    amount: number,
    percentage: number
  }>
}
```

**Chart Data:**
- Includes all expense categories with amounts
- Adds "Unidentified" category if total < budget variable expenditure
- Sorted by amount (descending)

**Example:**
```javascript
const analysis = await expenseService.analyzeExpenses(uid, '2026-08');
console.log('Total expenses:', analysis.totalExpenses);
console.log('Budget:', analysis.budgetVariableExpenditure);
console.log('Difference:', analysis.difference);
console.log('Over budget?', analysis.isOverBudget);

analysis.byCategory.forEach(cat => {
  console.log(`${cat.category}: ₹${cat.total} (${cat.percentage}%)`);
});
```

##### `getExpensesByCategory(uid, monthKey, category)`
Filter expenses by category.

**Parameters:**
- `uid` (string): User ID
- `monthKey` (string): Month key "YYYY-MM"
- `category` (string): Category name

**Returns:**
```javascript
Promise<Array<Expense>>
```

##### `getExpensesByDateRange(uid, startDate, endDate)`
Get expenses within a date range.

**Parameters:**
- `uid` (string): User ID
- `startDate` (string): Start date "YYYY-MM-DD"
- `endDate` (string): End date "YYYY-MM-DD"

**Returns:**
```javascript
Promise<Array<Expense>>
```

---

## 10. Dashboard Service

### `DashboardService`

Aggregates data from all modules for dashboard display.

#### Constructor
```javascript
constructor(
  accountService,
  budgetService,
  investmentService,
  goalService,
  insuranceService,
  netWorthService,
  expenseService,
  emergencyFundService
)
```

#### Methods

##### `getDashboardMetrics(uid, currentMonth)`
Get all dashboard metrics.

**Parameters:**
- `uid` (string): User ID
- `currentMonth` (string): Current month key "YYYY-MM"

**Returns:**
```javascript
Promise<DashboardMetrics>

// DashboardMetrics structure:
{
  thisMonth: {
    usableIncome: number,
    recurringCommitments: number,
    availableAfterCommitments: number,
    creditCardUsage: number,
    expenditureBalance: number,
    budgetStatus: {
      type: "positive" | "negative" | "neutral",
      message: string,
      surplus: number
    },
    accountStatus: {
      hasPrimary: boolean,
      hasSalary: boolean,
      hasSaving: boolean,
      hasInvestment: boolean
    }
  },
  accountsNetWorth: {
    totalAssets: number,
    totalLiabilities: number,
    netWorth: number,
    cashInAccounts: number,
    accountBreakdown: Array<{
      name: string,
      balance: number,
      purpose: string
    }>
  },
  goalsInvestments: {
    portfolioValue: number,
    monthlyContribution: number,
    taxItemsLogged: number,
    plannedGiftsTotal: number,
    activeGoals: Array<{
      name: string,
      progress: number,
      remaining: number,
      targetDate: string
    }>
  },
  preparedness: {
    emergencyFund: {
      current: number,
      ideal: number,
      progress: number
    },
    healthInsurance: {
      current: number,
      ideal: number,
      progress: number
    },
    termInsurance: {
      current: number,
      ideal: number,
      progress: number
    }
  },
  trends: {
    months: Array<string>,  // Last 6 months
    data: Array<{
      month: string,
      income: number,
      expenditure: number,
      saving: number,
      liability: number,
      others: number
    }>
  }
}
```

**Example:**
```javascript
const metrics = await dashboardService.getDashboardMetrics(uid, '2026-08');

// This Month
console.log('Usable income:', metrics.thisMonth.usableIncome);
console.log('Budget status:', metrics.thisMonth.budgetStatus.message);

// Net Worth
console.log('Net worth:', metrics.accountsNetWorth.netWorth);

// Goals
metrics.goalsInvestments.activeGoals.forEach(goal => {
  console.log(`${goal.name}: ${goal.progress}% complete`);
});

// Preparedness
console.log('Emergency fund:', metrics.preparedness.emergencyFund.progress, '%');
console.log('Health insurance:', metrics.preparedness.healthInsurance.progress, '%');
```

##### `calculateFinancialHealthScore(data)` *(v5.3.0)*
Calculate comprehensive financial health score.

**Parameters:**
- `data` (object): Financial data including:
  - `emergencyFund`, `idealEmergencyFund` (number)
  - `totalAssets`, `totalLiabilities` (number)
  - `usableIncome`, `monthlyCommitments` (number)
  - `healthInsurance`, `idealHealthInsurance` (number)
  - `termInsurance`, `idealTermInsurance` (number)
  - `ongoingGoals` (Array): Goals with `amountNeeded` and `amountAccumulated`
  - `monthlyInvestment` (number)
  - `monthData` (object): Current month budget data
  - `assets` (Array): Account objects with `purpose` field

**Returns:**
```javascript
{
  score: number,          // 0-100
  breakdown: Array<{
    label: string,        // Category name
    score: number,        // Points earned
    max: number,          // Maximum points
    percentage: number,   // Coverage percentage
    tooltip: string       // Detailed tooltip text
  }>,
  healthLevel: string,    // "Excellent" | "Good" | "Fair" | "Needs Improvement" | "Needs Work"
  healthColor: string     // Hex color for display
}
```

**Scoring Weights (v5.3.0):**
| Category | Max Points | Description |
|----------|-----------|-------------|
| Emergency Fund | 15 | Based on coverage vs 6-month ideal |
| Debt Management | 20 | Based on debt-to-income ratio |
| Savings & Investment | 25 | Combined savings + investment rate |
| Insurance Coverage | 15 | Health (9pts) + Term (6pts) |
| Net Worth Position | 15 | Net worth vs expenses + diversification bonus |
| Goal Progress | 10 | Goal completion + planning bonus |

##### `generateInsights(data)` *(v5.3.0)*
Generate insights and recommendations.

**Parameters:**
- `data` (object): Same as health score plus `assets`, `taxPlan`

**Returns:**
```javascript
Array<{
  type: "positive" | "suggestion" | "warning",
  icon: string,
  message: string
}>  // Limited to 6 items
```

##### Notification Triggers *(v5.3.0)*
Registered via `registerNotificationTrigger(fn)`. Each trigger returns an array of alerts.

**7 Built-in Triggers:**
1. **Budget & Expense**: Over budget, low emergency fund, high CC usage, low savings rate, no investments
2. **Goals**: Behind schedule, due within 30 days, no goals set
3. **Insurance**: Below recommended, no policies, expiring within 60 days
4. **Recurring Expenses**: High commitments, fixed expenses > 60% of income
5. **Net Worth**: Negative net worth, low diversification, high debt-to-asset ratio
6. **Tax Planning**: No tax planning, regime review suggestion
7. **Gifts**: Gifts due within 30 days

**Alert structure:**
```javascript
{
  type: "warning" | "info",
  icon: string,           // Icon name for display
  message: string,        // Alert text
  action: string          // Tab ID to navigate on click
}
```

---

## 11. Data Export Service

### `DataExportService`

Handles data export and import operations.

#### Constructor
```javascript
constructor(userRepository)
```

#### Methods

##### `exportAllData(uid)`
Export all user data as JSON.

**Parameters:**
- `uid` (string): User ID

**Returns:**
```javascript
Promise<ExportData>

// ExportData structure:
{
  version: string,  // App version
  exportDate: string,  // ISO timestamp
  userData: {
    userName: string,
    userLocation: string,
    dateOfBirth: string,
    currentAge: number,
    // ... all user data
  }
}
```

**Example:**
```javascript
const exportData = await dataExportService.exportAllData(uid);
const json = JSON.stringify(exportData, null, 2);
const blob = new Blob([json], { type: 'application/json' });
// Download blob as file
```

##### `importData(uid, importData)`
Import previously exported data.

**Parameters:**
- `uid` (string): User ID
- `importData` (object): Previously exported data

**Returns:**
```javascript
{
  success: boolean,
  backupCreated: boolean,
  error?: string
}
```

**Actions:**
1. Create automatic backup of current data
2. Validate import data structure
3. Merge/replace data
4. Clear all caches

**Example:**
```javascript
const result = await dataExportService.importData(uid, importedData);

if (result.success) {
  console.log('Data imported successfully');
  console.log('Backup created:', result.backupCreated);
} else {
  console.error('Import failed:', result.error);
}
```

##### `downloadDashboardSummary(uid, currentMonth)`
Generate HTML snapshot of dashboard.

**Parameters:**
- `uid` (string): User ID
- `currentMonth` (string): Current month key "YYYY-MM"

**Returns:**
```javascript
Promise<string>  // HTML content
```

**Example:**
```javascript
const html = await dataExportService.downloadDashboardSummary(uid, '2026-08');
const blob = new Blob([html], { type: 'text/html' });
// Download blob as HTML file (can be printed to PDF)
```

##### `resetAllData(uid, keepProfile)`
Reset all user data.

**Parameters:**
- `uid` (string): User ID
- `keepProfile` (boolean): Whether to keep user name and location

**Returns:**
```javascript
{
  success: boolean,
  backupCreated: boolean,
  error?: string
}
```

**Actions:**
1. Create automatic backup
2. Clear all tab data
3. Clear all budget data
4. Clear all expense data
5. Optionally preserve user profile
6. Clear all caches

---

## 12. Error Handling

### Standard Error Response

All service methods return errors in a consistent format:

```javascript
{
  success: false,
  error?: string,        // Single error message
  errors?: Array<string> // Multiple validation errors
}
```

### Error Types

#### Validation Errors
```javascript
{
  success: false,
  errors: [
    "Bank name is required",
    "Balance cannot be negative"
  ]
}
```

#### Business Rule Errors
```javascript
{
  success: false,
  error: "Only one primary account is allowed"
}
```

#### Not Found Errors
```javascript
{
  success: false,
  error: "Account not found"
}
```

#### Permission Errors
```javascript
{
  success: false,
  error: "Cannot delete auto-generated entry"
}
```

### Error Handling Example

```javascript
const result = await accountService.addAccount(uid, accountData);

if (!result.success) {
  if (result.errors) {
    // Multiple validation errors
    result.errors.forEach(error => {
      console.error('Validation error:', error);
    });
  } else if (result.error) {
    // Single error
    console.error('Error:', result.error);
  }
} else {
  console.log('Success:', result.account);
}
```

---

## 13. Response Formats

### Success Response

```javascript
{
  success: true,
  [dataKey]: [returnedData]
}
```

### Error Response

```javascript
{
  success: false,
  error?: string,
  errors?: Array<string>
}
```

### List Response

```javascript
Promise<Array<T>>
```

### Calculated Response

```javascript
Promise<CalculatedData>
```

---

## 14. Usage Examples

### Complete User Flow Example

```javascript
// 1. Sign in
const authService = new AuthService(authRepo, userRepo);
const loginResult = await authService.signIn('user@example.com', 'password');

if (!loginResult.success) {
  console.error('Login failed:', loginResult.error);
  return;
}

const uid = loginResult.user.uid;

// 2. Get dashboard metrics
const dashboardService = new DashboardService(/* dependencies */);
const metrics = await dashboardService.getDashboardMetrics(uid, '2026-08');

console.log('Net worth:', metrics.accountsNetWorth.netWorth);
console.log('Budget status:', metrics.thisMonth.budgetStatus.message);

// 3. Add an expense
const expenseService = new ExpenseService(userRepo, budgetService, cache);
const expenseResult = await expenseService.addExpense(uid, '2026-08', {
  category: 'Food & Dining',
  amount: 1500,
  date: '2026-08-13',
  description: 'Dinner at restaurant'
});

if (expenseResult.success) {
  console.log('Expense added:', expenseResult.expense.id);
}

// 4. Analyze expenses
const analysis = await expenseService.analyzeExpenses(uid, '2026-08');
console.log('Total expenses:', analysis.totalExpenses);
console.log('Over budget?', analysis.isOverBudget);

// 5. Execute budget transfer
const budgetService = new BudgetService(/* dependencies */);
const transferResult = await budgetService.executeTransfer(uid, '2026-08');

if (transferResult.success) {
  console.log('Transfer completed:', transferResult.transferAmount);
} else {
  console.error('Transfer failed:', transferResult.errors);
}
```

---

## 15. Best Practices

### 1. Always Check Success Flag

```javascript
const result = await service.someMethod();

if (result.success) {
  // Handle success
} else {
  // Handle error
}
```

### 2. Handle Both Error Types

```javascript
if (!result.success) {
  if (result.errors) {
    // Multiple errors (validation)
    result.errors.forEach(showError);
  } else if (result.error) {
    // Single error
    showError(result.error);
  }
}
```

### 3. Use Try-Catch for Async Operations

```javascript
try {
  const data = await service.getData(uid);
  // Process data
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### 4. Cache User ID

```javascript
// Don't do this
const accounts = await accountService.getAccounts(getCurrentUserId());
const budget = await budgetService.getBudget(getCurrentUserId());

// Do this
const uid = getCurrentUserId();
const accounts = await accountService.getAccounts(uid);
const budget = await budgetService.getBudget(uid);
```

### 5. Batch Related Operations

```javascript
// Get all data needed for a view in parallel
const [accounts, budget, investments] = await Promise.all([
  accountService.getAccounts(uid),
  budgetService.getMonthlyBudget(uid, monthKey),
  investmentService.getInvestments(uid)
]);
```

---

*Document Version: 1.0*  
*Last Updated: 2026-08-13*  
*Author: SmartFin Development Team*
