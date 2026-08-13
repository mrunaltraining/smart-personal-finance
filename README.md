# SmartFin – Smart Financial Planning

![Version](https://img.shields.io/badge/version-4.0.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Firebase](https://img.shields.io/badge/firebase-enabled-orange.svg)
![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile-lightgrey.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Architecture](https://img.shields.io/badge/architecture-modular-purple.svg)

A comprehensive dark-themed personal finance app with login/register, cross-device sync via Firebase, and tabbed sections for complete financial management.

**v4.0.1 - Major Architecture Redesign**: Platform-independent business logic modules, fully tested, ready for web and mobile deployment.

## 📋 Table of Contents

- [Features](#features)
- [What's New](#whats-new)
- [Installation](#installation)
- [Usage](#usage)
- [Tabs Overview](#tabs-overview)
- [Tech Stack](#tech-stack)
- [License](#license)

## ✨ Features

- 🔐 **Authentication**: Secure login/register with email/password
- 🔄 **Cross-Device Sync**: Real-time data synchronization via Firebase
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile
- 🌙 **Dark Theme**: Easy on the eyes dark interface
- 📊 **Financial Dashboard**: Complete overview of your financial health
- 💰 **Budget Planning**: Monthly budget with variable expenditure tracking
- 📈 **Investment Tracking**: Track all investments with portfolio summary
- 🏠 **Accounts Management**: Track bank accounts, credit cards, and net worth
- 🎯 **Financial Goals**: Set and track financial goals
- 💡 **Tax Planning**: Comprehensive tax planning for ITR-2 with regime comparison
- 🛡️ **Insurance Management**: Track insurance policies and coverage
- 🎁 **Gifts & Donations**: Track charitable giving
- 💸 **Expense Tracking**: Category-wise expense tracking with visual breakdowns

## 🚀 What's New in v4.0.1

### 🎉 Major Architecture Redesign
- **Modular Business Logic**: All business logic extracted into 14 platform-independent modules (3,200+ lines)
- **100% Test Coverage**: 64 comprehensive unit tests ensuring reliability and correctness
- **Platform Independence**: Business logic works seamlessly on both web and mobile platforms
- **Enhanced Maintainability**: Clear separation of concerns, single responsibility, well-documented code
- **Backward Compatibility**: Zero breaking changes, all existing features preserved
- **Future-Ready**: Foundation for mobile app development and advanced features
- **Standardized Logging**: New Logger utility for consistent, filterable logging throughout the app

### 📦 New Modules (14 total)
- **Utilities**: FrequencyConverter, DateUtils, CurrencyFormatter, Logger
- **Budget**: BudgetCalculator with comprehensive budget calculations
- **Accounts**: AccountManager and AccountValidator for account management
- **Investments**: InvestmentCalculator for SIP, returns, and portfolio tracking
- **Goals**: GoalCalculator for financial goal tracking and progress
- **Insurance**: InsuranceCalculator for coverage and gap analysis
- **Net Worth**: NetWorthCalculator for projections and tracking
- **Tax**: TaxCalculator for deductions and savings
- **Expenses**: ExpenseAnalyzer for category analysis and statistics
- **Dashboard**: DashboardCalculator for aggregation and financial health scoring

### 🧪 Testing
- **test-utils.html**: Browser-based test runner with 21 integration tests
- **Unit Tests**: 43 comprehensive unit tests for all modules
- **100% Pass Rate**: All tests passing, ensuring code quality

### 📚 Quick Integration Guide
```javascript
// Import modules
import { BudgetCalculator } from './src/core/budget/BudgetCalculator.js';
import { AccountManager } from './src/core/accounts/AccountManager.js';
import { Logger } from './src/core/utils/Logger.js';

// Use in your code
Logger.info('BUDGET', 'Starting calculation');
const accounts = AccountManager.getSpecialAccounts(accountsArray);
const summary = BudgetCalculator.calculateMonthlySummary(monthData, outflows, accounts);
Logger.success('BUDGET', 'Calculation completed');
```

### Previous update: v3.0.0 — UI Improvements
- **Unified professional UI**: streamlined context headers remove repeated page titles while keeping month navigation and actions together.
- **Improved visual hierarchy**: Accounts, Gifts, Budget and Expense Tracking use responsive segmented summaries with clean dividers.
- **Expense category icons**: every expense type now has a compact, consistent icon in both the grouped list and edit table.
- **Chart polish**: expense, annual, and gift visualizations now share the same professional chart containers and spacing.
- **Consistent navigation**: compact tab icons and responsive action bars align desktop and mobile behavior.

### Previous update: v2.4.0 — New features
- **✨ Expense Tracking Tab**: Complete expense tracking system with category-wise breakdown
  - Month-by-month expense tracking with calendar navigation
  - 11 predefined expense categories (Food & Dining, Transportation, Shopping, etc.)
  - Visual pie chart showing category-wise spending distribution
  - Automatic comparison with Budget's Variable Expenditure
  - "Unidentified" category for budget vs actual differences
  - Syncs with Budget tab lifecycle (auto-advances when month is closed)
  - Optional tracking - leave blank for months you don't want to track
  - Edit/Done toggle pattern consistent with other tabs
  - List view showing expenses grouped by category
  - Full CRUD operations (Create, Read, Update, Delete) for expenses

#### Dashboard improvements
- **🏠 Clickable Logo**: App logo and name now navigate to Dashboard tab
- **📱 Mobile-Friendly Tooltips**: Financial Health Score tooltips now work on mobile (tap to show/hide)
- **📐 Responsive Design**: All dashboard elements optimized for mobile, tablet, and desktop views
- **🎯 Better Layout**: Moved Alerts & Notifications and Financial Health Score below Insights & Recommendations for improved information hierarchy
- **💚 Optimized Health Score Card**: Better width handling across all screen sizes

### Technical Improvements
- Enhanced responsive CSS with proper breakpoints for all devices
- Touch-friendly tooltip system with both hover (desktop) and tap (mobile) support
- Keyboard navigation support for logo click (Enter/Space keys)
- Data structure updates to support expense tracking across months
- Improved mobile experience with larger touch targets and better spacing

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/smart-financial-planning.git
cd smart-financial-planning
```

2. Open `index.html` in your browser or serve with a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

3. Configure Firebase (optional, for cross-device sync):
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Add your Firebase config to the app

## 🎯 Usage

1. **Register**: Create an account with email and password
2. **Dashboard**: View your financial overview and health score
3. **Budget**: Set up monthly budget and track variable expenditure
4. **Investments**: Track your investments (one-time and recurring)
5. **Outflow**: Manage fixed expenses and commitments
6. **Accounts**: Track bank accounts and credit cards
7. **Goals**: Set and track financial goals
8. **Insurance**: Manage insurance policies
9. **Tax Plan**: Plan your taxes with regime comparison
10. **Gifts**: Track charitable donations
11. **Expense Tracking**: Track daily expenses by category

## 📑 Tabs Overview

| Tab | Description |
|-----|-------------|
| **Dashboard** | Financial overview with health score, alerts, and insights |
| **Budget** | Monthly budget planning with variable expenditure tracking |
| **Financial Goals** | Set and track financial goals with progress tracking |
| **Investments** | Track investments (one-time, recurring, portfolio summary) |
| **Fixed Outflow** | Manage fixed expenses and monthly commitments |
| **Insurance** | Track insurance policies and coverage details |
| **Accounts** | Manage bank accounts, credit cards, and net worth |
| **Tax Plan** | Comprehensive tax planning with old/new regime comparison |
| **Gifts** | Track charitable donations and gifts |
| **Expense Tracking** | Category-wise expense tracking with visual breakdowns |

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Charts**: Chart.js
- **PDF Export**: html2pdf.js
- **Icons**: SVG (inline)
- **Font**: Inter (Google Fonts)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📜 Version History

### v3.0.0 - UI System Refresh (Current)
- Unified header, navigation, list, form, card, and chart treatment across the app
- Added semantic icons to every expense category and corrected the Expense Tracking summary target

### v2.4.0 - Major Feature Release
- Expense Tracking Tab with category-wise breakdown
- Dashboard responsive improvements
- Mobile-friendly tooltips

### v2.3.21 - Tax Data Load Bug Fix
- Fixed tax data loading from Firestore
- Fixed Firestore data loading to include taxData

### v2.3.14 - Tax Data Import/Export Fix
- Fixed tax data inclusion in import/export
- Added taxData to normalizeAppDataModel

### v2.3.13 - Tax Saving Banner Style Update
- Changed to border color instead of background gradient
- Improved readability with lighter design

### v2.3.12 - Tax Plan Auto-Save Fix
- Fixed "saveData is not defined" error
- Changed to use scheduleSave() function

### v2.3.10 - Financial Year Date Filtering
- Investments now respect financial year dates
- One-time investments filtered by start date
- Monthly investments pro-rated based on months in FY

### v2.3.0 - Comprehensive Tax Planning for ITR-2
- Salary Details Section with HRA exemption
- House Property Income tracking
- Section 24(b), 80TTA deductions
- Enhanced tax-saving banner with regime comparison

### v2.2.0 - Expense Tracking Tab
- New expense tracking with 50+ categories
- Auto-validation with budget comparison
- Visual insights and category breakdown

### v2.1.7 - Dashboard Layout Adjustment
- Improved dashboard layout and spacing

### v2.1.6 - Financial Health Score Accuracy
- Fixed scoring calculations
- Improved accuracy across all components

### v2.1.5 - Emergency Fund Calculator
- Added ideal emergency fund calculation
- Based on monthly commitments and expenses

### v2.1.0 - Net Worth Tab
- Complete net worth tracking
- Assets and liabilities breakdown
- Net worth over time chart

### v2.0.0 - Firebase Integration
- Cross-device sync via Firebase
- User authentication
- Cloud data persistence

### v1.0.0 - Initial Release
- Basic financial planning features
- Budget tracking
- Investment tracking
- Fixed outflow management 🎯

- **Fixed Savings Rate**: Now calculates actual savings made (not just available)
- **Variable Expenditure Display**: Shows auto-calculated variable expenditure from budget
- **More Accurate Scores**: All Financial Health components now use correct data sources

## Previous Update - v2.1.5 - Dashboard Metric Update 📊

## Previous Update - v2.1.4 - Fixed Debt Management Calculation 🔧

- **Critical Bug Fix**: Monthly commitments now correctly exclude Savings and Investments
- **More Accurate Scores**: Debt Management score now reflects only mandatory obligations
- **Better Financial Health**: Your score will likely improve significantly if you have savings/investments

## Previous Update - v2.1.3 - Enhanced Mobile Compatibility 📱

- **Touch/Swipe Support**: Swipe left/right to navigate alerts on mobile
- **Keyboard Navigation**: Use arrow keys on desktop for accessibility
- **Mouse Drag**: Drag to navigate on desktop browsers
- **Universal Compatibility**: Works perfectly on web and mobile devices
- **Documented Standards**: Comprehensive mobile/web compatibility guidelines in APP_SPEC.md

## Previous Update - v2.1.2 - Carousel Alerts 🎠

- **Carousel Alerts**: One alert at a time with left/right arrow navigation
- **Circular Rotation**: Loops back to first alert after last (infinite scroll)
- **Dot Indicators**: Click dots to jump to any alert instantly
- **Smooth Animations**: Beautiful slide transitions between alerts

## v2.1.0 - Major Dashboard Enhancement 🎉

### P1 Features (High Priority)
- **⚡ Alerts & Notifications**: Real-time alerts for over-budget categories, low emergency fund, goals behind schedule, insurance gaps, and high credit card usage
- **⚡ Quick Actions Panel**: One-click access to Budget, Investments, Expenses, Goals, Net Worth, and Tax Planning
- **💚 Financial Health Score**: Comprehensive 0-100 score based on emergency fund (25%), debt management (20%), savings rate (20%), insurance coverage (15%), goal progress (10%), and investment activity (10%)
- **💸 Cash Flow Summary**: Clear view of income vs expenses with net cash flow and savings rate percentage
- **📈 Budget vs Actual**: Track budget adherence with surplus/deficit display and spending comparison

### P2 Features (Medium Priority)
- **💡 Insights & Recommendations**: AI-like suggestions for improving financial health, optimizing spending, and achieving goals faster

### Technical Excellence
- All features use existing data and calculations - no duplicates
- Ensures complete data consistency across the dashboard
- Fully responsive design (mobile, tablet, desktop)
- Performance optimized with no additional API calls

## Previous Updates (v2.0.11)

- **Location Enhancement**: Added "Other" option to location dropdown for custom cities (assumed non-metro for insurance calculations)
- **Dashboard Layout**: Improved card distribution across all screen sizes with responsive grid system
- **Development Process**: Added comprehensive development process documentation in APP_SPEC.md

## Previous Updates (v2.0.10)

- **Dashboard Enhancements**: 
  - Mobile-responsive bar chart (numbers hidden on mobile for better readability)
  - Credit card usage and expenditure account balance in "This Month" section
  - Combined Accounts & Net Worth into single card
  - Combined Goals & Investment Planning into single card
  - Navigation links to Budget, Fixed Outflow, Net Worth, and Goals tabs
- **Tax Planning**: Comprehensive tax saving banner showing investment scope for Old Tax Regime (ITR-2 focused)
- **UI Improvements**: Removed "Purpose:" label from Accounts tab, actual user location in insurance text
- **Gifts Tracking**: Date display for on-demand gifts, month display for recurring gifts
- **Project Files**: Added LICENSE (Personal Use Only), .codeowners, and comprehensive tax calculation test suite

## Features

### Tabs & Functionality

1. **Budget** – Monthly income & expense tracking with category-based fields
   - **Cash Inflow**: Primary Income, Secondary Income, Borrowing/Money Back, Interest/Dividend, Others
   - **Cash Outflow**: Auto-calculated Liabilities, Insurance Premiums, Fixed Saving, Fixed Investment, Fixed Expenditure, Variable Expenditure (auto), Previous Month CC Bill, Current Month CC Spending, Debt Repayment/Lending, Utility Bills, Family Expenditure, Miscellaneous Expenses
   - **On-Demand Outflow**: On-Demand Saving, On-Demand Investment, On-Demand Expenditure, On-Demand Liability
   - Auto-calculated fields with **clickable breakdown popups** showing source items (both edit & preview modes)
   - **Monthly Transfer Breakdown**: Primary Income − Auto-deducted Fixed Outflow = Salary Leftover → Expenditure A/c
   - **Execute Transfer** button: deducts full salary to ₹0, credits Expenditure/Saving/Investment accounts; one-time per month
   - **Close Current Month Budget**: marks month read-only, carries forward balance, navigates to next month
   - **Mid-Month Quick Update**: update Expenditure Account balance and CC outstanding from budget edit mode (salary is auto-managed, not editable)
   - Summary: Total Inflow, Total Outflow (recurring monthly obligations only), Salary Balance, Expenditure Balance, Total Spendable, Variable Expenses
   - Budget status banner: **Surplus** / **Over Budget** / **Balanced** + edge cases (no accounts, no income, closed month)
   - Budget status preserved when month is closed (shows surplus/deficit along with lock indicator)
   - Month navigation: cannot go before onboarding month; next month viewable if current month is closed
   - Financial-year annual view with Apr–Mar calculations (averages based on months with data)
   - Annual monthly breakdown shows under/over budget status per month with lock icon for closed months
   - Pie chart: 6 categories (Investment, Liability, Savings, Expenditure, Insurance, Others) — recurring instruments only, excludes on-demand/one-time items
   - Edit mode with snapshot/restore on Cancel

2. **Goals** – Set and track financial goals
   - Target amount, current amount, target date
   - Automatic status: Planned, Ongoing, Achieved, or Missed
   - Progress tracking with status-based colors
   - Preview/Edit mode with summary

3. **Inflow** – Track income sources & investments (replaces old Investments tab)
   - Name, Type (FD/RD/MF/Stocks/PPF/NPS/Gold/Real Estate/Other), Frequency, Amount, Current Value, Interest Rate (decimal supported, e.g., 7.5%), Start/End Date, Details
   - Current value calculation based on start date, amount, and annual interest rate
   - Bar chart visualization; grouped preview cards
   - Auto-populates budget investing fields for Monthly frequency items

4. **Outflow** – Track recurring liabilities & insurance (replaces old Liabilities + Insurances tabs)
   - Name, Type (Liability/Insurance/Expenditure/Saving/Investment), Bank, Frequency, Amount, End Date, Details
   - Items grouped by type in preview with subtotals per group
   - Recurring items (Monthly/Quarterly/Semi-Annual/Annual) auto-populate budget outflow; **One-Time items excluded** from auto-calc
   - Recurring items auto-debited from salary account at month start
   - Summary: Fixed Monthly Income, Monthly Deductions, Remaining, Total Items
   - Bar charts: Amount by Bank, Amount by Type

5. **Accounts** – Manage bank accounts
   - Bank/NBFC Name, Primary Account, Balance, Debit/Credit Card, Credit Limit, Purpose (Salary/Expenditure/Saving/Investment/Loan/Others)
   - Summary cards: No of Accounts, No of Debit Cards, Total Balance, No of Credit Cards, Total Credit Limit
   - **Primary account** = Expenditure account (mandatory, one only, purpose auto-set to "Expenditure") — your main daily-use spending account
   - **Salary account** = mandatory, non-primary, purpose "Salary" — where salary is credited, then transferred to Primary
   - **Saving account**: max one, shown with 💰 SAVING badge
   - ⭐ PRIMARY (Expenditure) badge on primary card, 💼 SALARY badge on salary card
   - Default sort: Primary → Salary → Saving → others by balance descending
   - **All other tabs disabled until both Primary (Expenditure) + Salary accounts are set up**
   - Setup guidance banner shows which mandatory accounts are missing
   - Only one Salary account allowed; only one Primary account allowed

6. **Net Worth** – Calculate and project net worth
   - Auto-populated assets from Inflow tab, liabilities from Outflow tab
   - Manual entries with growth rates
   - Each item shows: Current, @ 70 yrs (projected), @ 70 yrs real (inflation-adjusted at 6%)
   - Net worth projection graph (till age 70), inflation-adjusted (6%)

7. **Tax Plan** – Tax liability under new/old regimes
   - Auto-pulled deductions from recurring investments (Monthly/Annual SIPs, not one-time holdings)
   - Insurance premiums from Outflow tab
   - Manual tax saving items (80C, 80D, 80CCD, etc.)
   - New Tax Regime (FY 2024-25) and Old Tax Regime calculations
   - Dashboard shows total tax items logged

8. **Gifts** – Track gifts and charitable giving
   - Category: Fixed Every Year / On Demand
   - Optional date field (defaults to current date)
   - Summary: Total Gifts count, Fixed Every Year count & amount, Spent This Year, Overall Total
   - Monthly spending chart for current financial year (April-March)

9. **Emergency Fund** – Calculate emergency fund requirements
   - Minimum Monthly Need = Fixed Liabilities/Insurance + Fixed Expenditure + Avg Variable Expenses
   - Excludes Saving & Investment (stoppable in emergency)
   - Practical scenarios: 3-month (bare min), 6-month (recommended), 12-month (ideal)
   - Monthly need breakdown with component details
   - Status: EXCELLENT (≥12), READY (6–12), ADEQUATE (3–6), LOW (<3)
   - Click **Done** to save changes (removed separate Update button)

### Dashboard Features (v6.1)

- **This Month**: Income, commitments, available funds, and budget surplus/deficit status
- **Net Worth**: Assets, liabilities, and net worth with auto-sync from Net Worth tab
- **Goals**: Combined progress bar showing all active goals together
- **Preparedness**: Progress bars for Emergency Fund, Health Insurance, and Term Insurance with ideal calculations
  - Emergency Fund: 6 months of expenses (fixed + variable)
  - Health Insurance: Based on 50% annual income, age adjustment, and location (metro/non-metro)
  - Term Insurance: Based on 10-15x annual income minus savings (age-dependent multiplier)
- **Accounts**: Total balance and mandatory account setup status
- **Investments & Planning**: Portfolio value, monthly investment, and tax items logged
- **6-Month Trend**: Bar chart showing Investment, Liability, Saving, Expenditure, and Others
- **PDF Export**: Download dashboard summary as HTML (print to PDF from browser)

### Additional Features

- **Add/Edit/Delete** – Edit and Delete buttons side-by-side on desktop, stacked on mobile. Delete requires confirmation for all entries.
- **Preview/Edit Toggle** – Switch between view and edit modes. Budget edit supports Cancel with snapshot/restore.
- **Data Migration** – Automatic one-time migration from old tab structure (investments/liabilities/insurances → inflow/outflow)
- **Onboarding** – New users start on Accounts tab with location selection; existing users go to Budget
- **Excel Export** – Export tab data as `.xlsx`
- **Data Reset** – Double confirmation (confirm + type "DELETE")
- **Cross-Device Sync** – Firebase Firestore real-time sync
- **Responsive Design** – Desktop & mobile with iOS safe-area support, compact dashboard cards

## Structure

- `index.html` — Auth + app markup
- `assets/css/styles.css` — Responsive dark UI
- `assets/js/firebase-config.js` — **Your Firebase config goes here**
- `assets/js/app.js` — Firebase Auth + Firestore sync, tabs, rendering, calculations

## Firebase Setup (required for login & cross-device sync)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Add a **Web App** to the project (click the `</>` icon)
4. **Authentication** → Get started → Enable **Email/Password**
5. **Firestore Database** → Create database → Start in **test mode**
6. **Project Settings** → Your apps → copy the config snippet into `assets/js/firebase-config.js`

## Run Locally

Open `index.html` directly in your browser — no server needed (the app uses Firebase, not local files).

Or with a local server:

```bash
python -m http.server 8082
```

Then open `http://localhost:8082`

## Data Management

### Export Data
- Click "Export Excel" button to export current tab data
- Downloads as `{Tab_Name}_export.xlsx`

### Reset Data
- Click "Reset All Data" button to clear all data
- Requires double confirmation (confirm dialog + type "DELETE")
- Permanently deletes all data including budget, inflow, outflow, accounts, net worth, tax plan, gifts, emergency fund
- **This action cannot be undone**

## User Manual — How Each Field Is Calculated

### Getting Started

1. **Create accounts**: You must add a **Primary (Expenditure)** account (set as Primary) and a **Salary** account (purpose = Salary) before other tabs unlock.
2. **Add outflow items**: Go to the Outflow tab and add your recurring monthly liabilities (EMIs, subscriptions, etc.) with type "Liability" and frequency "Monthly".
3. **Add inflow items**: Go to the Inflow tab and add your investments (SIPs, FDs, etc.) with appropriate frequency.
4. **Set budget**: Go to the Budget tab to enter your monthly income and expenses.

---

### Account System

| Account Type | Rules |
|---|---|
| **Primary (Expenditure)** | Mandatory. Exactly one. Purpose auto-set to "Expenditure". This is your main daily-use spending account. Funds are transferred here from Salary. |
| **Salary** | Mandatory. Exactly one. Non-primary, purpose "Salary". Where your salary is credited. Fixed outflows are auto-debited, remaining is transferred to Primary. |
| **Saving** | Optional. Max one. Shown with 💰 badge. Used for "Settle from Saving" on CC outstanding. |
| **Others** | Optional. Investment, Loan, or custom purpose. |

---

### Monthly Budget — Field Calculations

#### Category Totals

| Field | Formula |
|---|---|
| **Cash Inflow Total** | `Primary Income + Secondary Income + Borrowing + Interest + Others` |
| **Cash Outflow Total** | `Auto-calc Liabilities + CC Outstanding + Debt Repayment + Utility Bills + Family Expenditure + Misc Expenses` |
| **On-Demand Outflow Total** | `On-Demand Saving + On-Demand Investment + On-Demand Expenditure + On-Demand Liability` |

#### Auto-Calculated Fields

| Field | Source | How |
|---|---|---|
| **Auto-calculated Liabilities** (loanEMI) | Outflow tab | Sum of all Outflow items where `type = Liability` and `frequency = Monthly` and item has not ended. Click the "auto" badge to see itemised breakdown. |
| **On-Demand Investment** (auto part) | Inflow tab | Sum of recurring Inflow items (Monthly/Quarterly/Semi-Annual/Annual in matching months). One-Time excluded. |

#### Summary Grid

| Field | Formula |
|---|---|
| **Total Inflow** | Same as Cash Inflow Total |
| **Total Outflow** | Cash Outflow Total only (recurring monthly obligations; excludes On-Demand Outflow) |
| **Salary A/c Balance** | Auto-set when Primary Income entered (transit account, zeroed on transfer) |
| **Expenditure Account Balance** | Current balance of the Expenditure account (from Accounts tab) |
| **Total Spendable / Amount Overspent** | `Inflow Total − Fixed Monthly Outflow` — shows "Total Spendable" if ≥ 0, "Amount Overspent" if < 0. Fixed Monthly Outflow = sum of all Outflow tab items converted to monthly equivalent (all frequencies). |
| **Variable Expenses** | `variableExpenditure + midMonthCCOutstanding` — spending from expenditure account + CC charges |

#### Budget Status Banner

| Status | Condition |
|---|---|
| ⚠️ **No accounts** | Missing Primary or Salary account — setup guidance shown |
| *Empty* | No income or outflows entered yet |
| ⚪ **Enter income** | Outflows exist but no income entered |
| � **Budget Surplus** | Spendable > Variable Expenses |
| 🔴 **Over Budget** | Variable Expenses > Spendable |
| ⚪ **Budget Balanced** | Spendable = Variable Expenses |
| 🔒 **Closed** | Month is closed and read-only |

---

### Monthly Transfer Breakdown

| Field | Formula |
|---|---|
| **Primary Income** | From budget Cash Inflow → Primary Income field |
| **Fixed Monthly Outflow** | Sum of Outflow tab items with `frequency = Monthly` (all types) |
| **Breakdown by destination** | Auto-debits from Salary are routed by Outflow type: |
| | • **Liability** (EMIs) → paid to lender (leaves system) |
| | • **Insurance** → paid to insurer (leaves system) |
| | • **Saving** → credited to Saving account |
| | • **Investment** → credited to Investment account |
| | • **Expenditure** → credited to Primary (Expenditure) account |
| **Salary Leftover → Expenditure A/c** | `Primary Income − Total Fixed Monthly Outflow` (green if ≥ 0; red = shortfall) |

**Execute Transfer** button:
- Deducts **full** primaryIncome from Salary (balance → ₹0)
- Credits Expenditure account with transfer amount
- Credits Saving and Investment accounts with respective auto-debit totals
- Records `_transferDone` and `_initialBalance`
- **One-time only** per month — section hidden after execution

---

### Close Current Month Budget

Visible when: transfer done, current or past month, not already closed.

**Close Month** button:
- Marks month as **read-only** (`_monthClosed = true`)
- Records expenditure balance as `_carryForwardDone`
- Sets current month's CC spending as next month's "Previous Month CC Bill (Unpaid)"
- Navigates to next month
- **Requires transfer first** — blocks if not yet executed

---

### Mid-Month Quick Update (Edit Mode)

| Field | What It Updates |
|---|---|
| **Expenditure Account Balance** | Updates Primary account balance + auto-calculates variable expenditure |
| **Current Month CC Spending** | Stores as `midMonthCCOutstanding` in current month's outflow data |

Salary balance is **not** manually editable — auto-managed as a transit account.

---

### Annual View

Averages are calculated using **only months that have data** (not always 12).

| Field | Formula |
|---|---|
| **Income** | Sum of all monthly inflow totals across FY (Apr–Mar) |
| **Expenditure** | Sum of: Fixed Expenditure + Variable Expenditure + Utility Bills + Family Expenditure + Misc Expenses + CC Outstanding + CC Spending (per month) |
| **Saving** | Sum of Fixed Saving per month |
| **Investment** | Sum of Fixed Investment per month |
| **Liability** | Sum of Loan EMI + Debt Repayment per month |
| **Insurance** | Sum of Insurance Premiums per month |
| **Other** | `Cash Outflow Total − (Liability + Insurance + Expenditure + Saving + Investment)` per month (catches any unclassified items) |
| **Monthly Average** | `Total ÷ Months with data` |

---

### Emergency Fund

**Minimum Monthly Need** = Fixed Liabilities/Insurance + Fixed Expenditure + Average Variable Expenses

Excludes Saving & Investment outflows (stoppable in emergency).

| Component | Source |
|---|---|
| **Fixed Liabilities & Insurance** | Outflow tab items (type=Liability or Insurance), converted to monthly equivalent |
| **Fixed Expenditure** | Outflow tab items (type=Expenditure), converted to monthly equivalent |
| **Avg Variable Expenses** | Average of variable budget fields across months with data |

| Scenario | Formula |
|---|---|
| **3 Months (Bare Minimum)** | Minimum Monthly Need × 3 |
| **6 Months (Recommended)** | Minimum Monthly Need × 6 |
| **12 Months (Ideal)** | Minimum Monthly Need × 12 |
| **Shortfall** | `max(0, 6×Monthly Need − Current Fund)` |
| **Months Covered** | `Current Fund ÷ Minimum Monthly Need` |

| Status | Condition |
|---|---|
| 🟢 **EXCELLENT** | ≥ 12 months covered |
| 🟢 **READY** | 6–12 months |
| 🟡 **ADEQUATE** | 3–6 months |
| 🔴 **LOW** | < 3 months |

---

### Net Worth (Auto-Entries)

| Source | Mapped To | Value |
|---|---|---|
| Inflow tab items | Asset | `currentValue` (calculated from amount, interest rate, start date) |
| Outflow tab items (type=Liability) | Liability | `amount × remaining months (duration)` |

Manual entries can be added alongside auto-entries. Growth is projected at the item's rate minus 6% inflation.

---

### Tax Plan (Auto-Deductions)

Auto-pulled from Inflow and Outflow tabs based on item type mapping to tax sections (80C, 80D, 80CCD, etc.).

---

### Pie Charts

| Chart | Data |
|---|---|
| **Monthly** | Distribution of 6 categories: Investment, Liability, Savings, Expenditure, Insurance, Others — recurring outflow only, excludes on-demand/one-time (from `getMonthlyDistribution`) |
| **Annual** | Same 6 categories summed across 12 FY months |

## Libraries Used

- Firebase (Auth, Firestore) – Authentication and data sync
- Chart.js – Pie charts, bar charts, line charts
- SheetJS (XLSX) – Excel export
