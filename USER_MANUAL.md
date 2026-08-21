# SmartFin – User Manual (v5.5.1)

A comprehensive guide to using SmartFin for personal financial planning.

## What's New in v5.5.1

### 📧 Email Infrastructure
- **EmailJS Integration**: Complete email service for transactional emails
- **Dashboard Report Email**: Send dashboard reports to your registered email
- **Bug Report System**: Auto-incremented bug IDs (DEF-XXX format) with automatic log collection
- **Rate Limiting**: Prevents email abuse with time-based limits
- **Security**: No sensitive credentials exposed, admin recipient fixed

### 📄 Professional Legal Pages
- **Privacy Policy**: Comprehensive data collection, usage, and security information
- **Terms & Conditions**: Complete terms of service and user responsibilities
- **Disclaimer**: Important warnings about financial advice and data accuracy
- **About Us**: Company information, mission, and technology stack
- **Contact Us**: Support contact information and bug reporting guidance
- **Accessibility**: Available from footer and auth screen

### 🔧 Technical Improvements
- **HTML Entity Handling**: Comprehensive XSS prevention for all user inputs
- **Duplicate Detection**: Smart duplicate detection for expense imports
- **Alert System**: Notifications re-evaluate on every login for fresh data
- **Enhanced Logging**: Better error handling and logging throughout email systems

### 🎨 UI/UX Improvements
- **Mobile Optimizations**: Improved financial year overview display for mobile devices
- **Light Mode Enhancement**: Better contrast and visual hierarchy in light theme
- **Bug Report UI**: Modern design matching existing app aesthetics

## What's New in v5.5.1

### 🔔 Dynamic Notification System
- **Bell Icon with Badge Counter**: Shows unread alert count in header
- **7 Smart Triggers**: Budget, Goals, Insurance, Expenses, Net Worth, Tax, Gifts
- **Popup Panel**: View all alerts with icons, messages, and quick navigation
- **Clear All**: Dismiss all alerts for the day with one click
- **Daily Reset**: Notifications automatically reset at the start of each day
- **Click-Outside-Close**: Click anywhere outside popup to close it

### 💡 Enhanced Insights & Recommendations
- **11 Insight Types**: More comprehensive financial recommendations
- **3 Categories**: Positive (5), Suggestion (7), Warning (3)
- **Display Limit**: Shows up to 6 most relevant insights (increased from 4)
- **Real-time Updates**: Insights update dynamically with your data

### 📊 Financial Health Score Rebalancing
- **New Weights**: Emergency Fund (15pts), Debt Management (20pts), Savings & Investment (25pts), Insurance (15pts), Net Worth (15pts), Goals (10pts)
- **Diversification Bonus**: +2 points for having 3+ asset types
- **Goal Planning Bonus**: +2 points simply for having goals defined
- **Better Scoring**: More emphasis on wealth-building and risk management

### 🎨 Modern Dark Theme
- **Indigo/Slate Palette**: New modern color scheme
- **Primary Color**: #6366f1 (indigo) throughout the app
- **Better Contrast**: Improved readability in both dark and light modes

### ⏳ Loading Spinner Redesign
- **Logo Inside Ring**: App logo now displays inside the rotating spinner
- **Counter-Rotation**: Logo stays upright while ring spins
- **Reduced Motion**: Respects prefers-reduced-motion setting

### 🏷️ Tags & Badges Refresh
- **Modern Colors**: Indigo, rose, emerald, amber, violet, cyan
- **Dark/Light Consistency**: Proper contrast in both themes
- **Updated Everywhere**: All semantic badges and tags refreshed

### 📈 Tax Deductions Chart
- **Horizontal Layout**: Changed to horizontal bar chart for better label readability
- **Grouped by Section**: Deductions organized by tax section (80C, 80D, etc.)

## What's New in v5.5.1

### 🔧 Error Handling & Network Status
- **Network Status Indicator**: Visual indicator in user bar (next to your email) showing Firebase save status
  - **Green checkmark with circle**: Data saved successfully (auto-hides after 2 seconds)
  - **Yellow refresh arrows (blinking)**: Retrying save due to network issue (stays visible)
  - **Red circle with exclamation**: Save failed (stays visible)
  - **Red WiFi with slash**: Browser is offline (stays visible)
  - **Red triangle alert**: Quota exceeded (stays visible)
  - **Yellow refresh arrows with slash**: Reconnecting (stays visible)
  - Hover over the icon on desktop or tap on mobile to see detailed status text
  - Mobile view: Shows only the icon for space efficiency
  - Indicator automatically hides after successful save
- **Better Error Messages**: Clear, specific messages for different error types
  - Quota exceeded: Informs you about quota reset timing and upgrade options
  - Network errors: Shows automatic retry status
  - Permission errors: Guides you to re-login if needed
- **Automatic Retry**: Network errors automatically retry after 2 seconds with visual feedback
- **Offline Detection**: Automatically detects when browser goes offline and shows status

## What's New in v5.5.1

### 🎉 Major Architecture Redesign (Behind the Scenes)
- **Modular Business Logic**: All financial calculations now use platform-independent modules for better reliability and accuracy
- **Enhanced Performance**: Optimized calculation logic with 64 comprehensive tests ensuring correctness
- **Future-Ready**: Foundation for mobile app development and advanced features
- **Improved Maintainability**: Cleaner code structure for faster feature development and bug fixes

### User Experience Improvements
- **No Breaking Changes**: All existing features work exactly as before
- **Same Interface**: No changes to the user interface or workflow
- **Better Reliability**: Enhanced calculation accuracy with comprehensive testing
- **Responsive Design**: Maintained full support for mobile, tablet, and desktop

## What's New in v5.5.1

- **Improved Budget Calculation**: On-demand items (saving, investment, expenditure, liability) now properly reduce expenditure account balance and are included in budget surplus calculation
- **Clearer Budget Display**: Variable Expenses and On-Demand Items are now shown separately for better tracking of actual spending vs allocations
- **Enhanced Dashboard**: Added Saving and Investment account status display, optimized information display with concise format, and added quick navigation links to Goals and Gifts tabs
- **Compact Icons**: Redesigned insight and alert icons to be more compact and fit better in UI cards
- **Consistent Layout**: Summary grid now displays exactly 4 items per row on desktop and 2 per row on mobile for a cleaner, more predictable layout

## What's New in v5.5.1

- **Unified navigation and headers**: page names are no longer repeated; the active section in the app header and tabs provides context while controls stay compact.
- **Better summaries**: Accounts and Gifts use responsive divider-based summary strips that stay readable on mobile.
- **Expense category icons**: all available expense categories display a matching icon in the list and edit table.
- **Refined charts and lists**: chart cards, grouped expenses, and edit tables now share the same visual system.

## Previous Update: v5.5.1

- **Expense Tracking Tab**: Complete expense tracking system with category-wise breakdown and month-by-month analysis
- **Budget Comparison**: Automatic comparison of actual expenses vs Budget's Variable Expenditure
- **Visual Pie Charts**: Category-wise expense breakdown with "Unidentified" category for budget gaps
- **Mobile-Friendly Tooltips**: Financial Health Score tooltips now work on mobile devices
- **Responsive Design**: All dashboard elements optimized for mobile, tablet, and desktop
- **Improved Dashboard Layout**: Better information hierarchy with reorganized cards
- **Clickable Logo**: App logo and name now navigate to Dashboard tab

## Previous Updates

## What's New in v5.5.1

- **Location-Based Features**: City selection during registration for accurate insurance calculations
- **Enhanced Dashboard**: Budget surplus, combined goals progress, preparedness metrics with ideal amounts
- **Realistic Insurance Calculations**: Health & Term insurance ideals based on income, age, and location
- **6-Month Trend Chart**: Visual representation of Investment, Liability, Saving, Expenditure, and Others
- **Gifts Enhancements**: Date tracking and monthly spending visualization
- **Dashboard Report Download**: Download comprehensive dashboard summary (works on desktop and mobile)
- **Fixed Tax Calculations**: Now only counts recurring contributions, not portfolio values

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Dashboard & Navigation](#dashboard--navigation)
5. [Accounts (Setup)](#accounts-setup)
6. [Monthly Budget](#monthly-budget)
7. [Expense Tracking](#expense-tracking)
8. [Investments](#investments)
9. [Outflow (Fixed Deductions)](#outflow-fixed-deductions)
10. [Insurance](#insurance)
11. [Financial Goals](#financial-goals)
12. [Net Worth](#net-worth)
13. [Tax Plan](#tax-plan)
14. [Gifts](#gifts)
15. [Emergency Fund](#emergency-fund)
16. [Settings & Danger Zone](#settings--danger-zone)
17. [Export to Excel](#export-to-excel)
18. [Download Dashboard Report](#download-dashboard-report)
19. [Backup & Restore](#backup--restore)
20. [Cross-Device Sync](#cross-device-sync)
21. [Precautions & Common Pitfalls](#precautions--common-pitfalls)
22. [FAQ](#faq)

---

## Overview

SmartFin is a personal finance web application (dark/light theme) that helps you manage:

- **Monthly Budget** — Track inflows, outflows, on-demand spending with account-balance-aware calculations
- **Expense Tracking** — Category-wise daily expense tracking with budget comparison and visual breakdowns
- **Investments** — Existing (lump sum), Monthly (SIPs/RDs), Portfolio Summary, with sub-section views
- **Outflow** — Fixed monthly deductions (EMIs, insurance premiums, savings, investments) auto-debited from Salary
- **Insurance** — Dedicated policy tracker with premium frequency, sum assured, nominees
- **Accounts** — Bank/NBFC accounts with Primary (Expenditure), Salary, Saving, Investment designations
- **Financial Goals** — Target-based savings goals with progress tracking
- **Net Worth** — Assets & liabilities with 70-year projection
- **Tax Plan** — Old/New regime comparison with auto-calculated deductions from budget
- **Gifts** — Gift tracking with yearly/on-demand categories
- **Emergency Fund** — Fund adequacy calculator based on fixed obligations + average variable expenses

All data syncs in real-time across devices via Firebase Firestore.

---

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project configured (see README.md)
- Internet connection

### First-Time Setup

1. Open `index.html` in your browser (or the hosted URL)
2. **Register** with name, date of birth, email, and password
3. Go to **Accounts** tab → Add a **Primary (Expenditure)** account and a **Salary** account
4. This unlocks all other tabs
5. **Before your first budget month**, complete this recommended setup order:

#### Recommended Setup Order (Critical)

| Step | Tab | What to do | Why |
|------|-----|-----------|-----|
| 1 | **Accounts** | Add Primary + Salary accounts (balance = 0 if starting fresh) | Unlocks all tabs |
| 2 | **Accounts** | Add Saving, Investment accounts if applicable | Transfer will credit these |
| 3 | **Outflow** | Add ALL fixed deductions (EMIs, rent, insurance premiums, savings, investments) | These must exist BEFORE Execute Transfer |
| 4 | **Insurance** | Add policy details (separate from outflow premiums) | For tracking coverage |
| 5 | **Investments** | Add existing investments (FDs, stocks, MFs, etc.) with expected return rate (decimal allowed, e.g., 7.5) | For portfolio tracking |
| 6 | **Budget** | Enter Primary Income → Execute Transfer | Only after steps 1–3 are complete |

> **⚠️ CRITICAL:** Add ALL outflow items **before** clicking Execute Transfer. The transfer uses the outflow items that exist *at the moment you click the button*. If you add outflow items afterward, those deductions will NOT have been taken from salary, causing incorrect variable expenditure calculations.

---

## Authentication

### Sign In
1. Enter email + password → Click **Sign In**

### Register
1. Click **Register** → Enter name, email, password → Click **Create Account**

---

## Dashboard & Navigation

### Tab Bar

```
[Accounts] [Investments] [Outflow] [Insurance] [Budget] [Goals] [Net Worth] [Tax Plan] [Gifts] [Emergency Fund] [+]
```

- **Core tabs** (always visible): Accounts, Investments, Outflow, Insurance, Budget, Goals
- **Additional tabs**: Net Worth, Tax Plan, Gifts, Emergency Fund
- **Custom tabs**: Add with the **+** button
- **Mobile**: Horizontally scrollable, with hamburger menu

### Edit/Preview Pattern

All tabs use the **Edit/Done toggle** pattern:
- **Preview mode** (default): Shows summary cards, charts, and read-only data
- **Edit mode** (click ✎ Edit): Shows the entry form and editable data table
- Click **✓ Done** to return to preview mode

### Header Navigation

- **App Logo & Name**: Click to navigate to Dashboard tab (works from any tab)
- **User Email**: Displays your registered email
- **Settings Icon**: Access settings panel
- **Sign Out Icon**: Log out of the app (icon button)

### Context-Aware Quick Actions

The Dashboard includes context-aware action buttons (small icons) in the top-right corner of each card:

**"This Month" Card Actions:**
- **Beginning (Days 1-5, Transfer Not Done):** Edit, Transfer, Budget
- **Beginning (Days 1-5, Transfer Done):** Update, Budget
- **Mid-Month (Days 6-25):** Update, Budget
- **End-Month (Days 26-31):** Close, Update, Budget

**"Accounts & Net Worth" Card Actions:**
- Net Worth - Navigates to Net Worth tab

**"Spending Breakdown" Card Actions:**
- Expenses - Navigates to Expense Tracking tab

**"Goals & Investment" Card Actions:**
- Goals - Navigates to Goals tab
- Investments - Navigates to Investments tab
- Gifts - Navigates to Gifts tab

**"Preparedness & Budget Planning" Card Actions:**
- Tax Plan - Navigates to Tax Plan tab
- Insurance - Navigates to Insurance tab

**"Financial Year Overview" Card Actions:**
- Annual Budget - Navigates to Budget tab in annual view (shows yearly graph)

**Note:** Action buttons are positioned in the top-right corner of each card header for easy access. The Quick Update popup handles both expenditure balance and CC spending in one place for efficiency.

---

## Accounts (Setup)

### Purpose

Manage your bank/NBFC accounts. The account system is the foundation — other tabs depend on it.

### Account Types

| Account | Badge | Rules |
|---------|-------|-------|
| **Primary (Expenditure)** | ⭐ PRIMARY | Exactly one. isPrimary=Yes auto-sets purpose to Expenditure |
| **Salary** | 💼 SALARY | Exactly one. Purpose=Salary, isPrimary=No |
| **Saving** | 💰 SAVING | At most one. Purpose=Saving |
| **Investment** | — | Purpose=Investment |
| **Loan** | — | Purpose=Loan |
| **Others** | — | Purpose=Others (custom purpose field) |

### Fields

| Field | Type | Description |
|-------|------|-------------|
| Bank/NBFC Name | Text | e.g. HDFC, ICICI |
| Primary Account | Select | Yes / No |
| Account Present | Select | Yes / No |
| Balance (₹) | Number | Current account balance |
| Debit Card Present | Select | Yes / No |
| Credit Card Present | Select | Yes / No |
| Credit Card Limit (₹) | Number | Credit limit |
| Purpose of Use | Select | Salary, Expenditure, Saving, Investment, Loan, Others |
| Specify Purpose | Text | Custom purpose (when Others selected) |
| Address/KYC Updated | Select | Yes / No |
| Nominee Added | Select | Yes / No |

### Onboarding

The app marks onboarding complete when **both** Primary and Salary accounts exist. Until then, other tabs are hidden.

### Account Balance & Credit Limit Chart

The Accounts tab includes a bar chart showing:
- **Balance** (green bars) - Account balance for each account
- **Credit Limit** (blue bars) - Credit card limit for each account

**Notes:**
- Only accounts with `Account Present = Yes` or `Credit Card Present = Yes` are shown
- If an account has no balance or no credit card, the corresponding bar shows 0
- Chart is hidden in edit mode
- Uses modern Chart.js styling with rounded bars

---

## Monthly Budget

### Overview

The Budget tab is the central financial cockpit. It shows monthly income vs. expenses with account-balance-aware calculations.

### Views

- **Monthly view** — Current month's budget (navigate with ◀ ▶)
- **Annual view** — Financial year summary with pie chart (toggle with 📊 button)
  - Shows monthly breakdown with under/over budget status for each month
  - Closed months are marked with a lock icon 🔒

### Budget Summary Grid

| Metric | Hint | Formula |
|--------|------|---------|
| **Total Inflow** | All income sources this month | Sum of Cash Inflow fields |
| **Total Outflow** | Recurring monthly obligations only | Sum of Cash Outflow fields only (excludes On-Demand Outflow) |
| **Salary A/c Balance** | Current salary account balance | Auto-set when Primary Income entered |
| **Expenditure Account Balance** | Current spending account balance | From Accounts tab |
| **Total Spendable This Month** | What you can afford to spend | Inflow total − fixed monthly outflow |
| **Variable Expenses** | Spending from expenditure account + CC | variableExpenditure + midMonthCCOutstanding |

### Budget Status Banner

| Status | Condition |
|--------|----------|
| ⚠️ **No accounts** | Missing Primary or Salary account — setup guidance shown |
| *Empty* | No income or outflows entered yet |
| ⚪ **Enter income** | Outflows exist but no income entered |
| 🟢 **Budget Surplus** | Spendable > Variable Expenses |
| 🔴 **Over Budget** | Variable Expenses > Spendable |
| ⚪ **Budget Balanced** | Spendable = Variable Expenses |
| 🟢🔒 **Closed** | Month is closed and read-only — budget status (surplus/deficit) is preserved |

### Budget Categories

**Cash Inflow:**
- Primary Income (auto-calculated from Salary account)
- Secondary Income
- Borrowing/Money Back
- Interest/Dividend
- Others

**Cash Outflow:**
- Auto-calculated Liabilities (EMIs) — auto-linked from Outflow tab
- Auto-calculated Insurance Premiums — auto-linked from Outflow tab
- Auto-calculated Fixed Saving — auto-linked from Outflow tab
- Auto-calculated Fixed Investment — auto-linked from Outflow tab
- Auto-calculated Fixed Expenditure — auto-linked from Outflow tab
- Auto-calculated Variable Expenditure — auto: totalFunded − current exp balance
- Previous Month CC Bill (Unpaid) — auto from previous closed month's CC spending
- Current Month CC Spending — this month's credit card purchases
- Debt Repayment / Lending
- Utility Bills (electricity, water, gas, internet)
- Family Expenditure (groceries, household)
- Miscellaneous Expenses

**On-Demand Outflow:**
- On-Demand Saving
- On-Demand Investment
- On-Demand Expenditure
- On-Demand Liability

### Monthly Budget Flow

```
Month Start                          Mid-Month                      Month End
    │                                    │                              │
    ▼                                    ▼                              ▼
┌──────────┐  ┌─────────────────┐  ┌────────────┐  ┌──────────────────┐
│ Enter    │→ │ Execute Transfer │→ │ Quick      │→ │ Close Month      │
│ Primary  │  │ (salary → accs) │  │ Update     │  │ (read-only,      │
│ Income   │  │                 │  │ (exp bal,  │  │  carry forward)  │
│          │  │                 │  │  CC spend) │  │                  │
└──────────┘  └─────────────────┘  └────────────┘  └──────────────────┘
```

1. **Enter Primary Income** (salary credited this month) → salary account balance auto-updated
2. **Review the Transfer Breakdown** — verify all outflow items are listed and amounts look correct
3. **Execute Transfer** → Salary deducted to ₹0, funds routed to Expenditure/Saving/Investment accounts
4. **Mid-month**: Update Expenditure Account Balance & Current Month CC Spending via Quick Update
5. **End of month** (when next salary credited): **Close Current Month Budget** → marks read-only, carries forward balance, navigates to next month

> **Note:** Salary account balance is auto-managed (set when income entered, zeroed on transfer). It cannot be manually updated.

### Transfer Mismatch Warning

If you add or change outflow items **after** executing the transfer, a red **"⚠️ Transfer Mismatch Detected"** banner will appear showing:

- **Transfer Used** — the amount that was actually transferred (based on old outflows)
- **Correct Transfer** — what it should be with current outflows
- **Difference** — the discrepancy

Click **Recalculate Transfer** to fix the budget metadata (`_transferDone`, `_initialBalance`). This corrects the variable expenditure calculation but does **not** change actual account balances. Verify your account balances manually after recalculating.

> This feature is blocked on closed months — you must fix the mismatch before closing.

### Quick Update (Mid-Month)

Update account balances and CC spending without editing the full budget (located in edit mode):

| Field | What it does |
|-------|-------------|
| **Expenditure Account Balance** | Updates the Primary account balance + auto-calculates variable expenditure |
| **Current Month CC Spending** | Stores as `midMonthCCOutstanding` (separate from previous month's CC bill) |

When you update Expenditure Balance, the system calculates variable expenditure:
`Variable Expenditure = totalFunded − current balance`
where `totalFunded = account initial balance + carry forward from last month + salary leftover transferred` (`_initialBalance` captures this post-transfer; fallback before transfer: `_transferDone + prevCarryForward`)

### Close Current Month Budget

Shown after Execute Transfer is done (current or past months only).

Clicking **Close Month** will:
- Mark the month as **read-only** (no more edits)
- Save the budget status (surplus/deficit) for future reference
- Carry forward the remaining expenditure balance to next month
- Set current month's CC spending as next month's "Previous Month CC Bill (Unpaid)"
- Navigate to the next month
- Allow viewing the next month's budget even if it hasn't started (for planning ahead)

**Requires:** Transfer must be executed first. Cannot close an already-closed month.

---

## Expense Tracking

### Overview

Track your day-to-day expenses by category to understand spending patterns and compare against your budget's variable expenditure.

### Views

- **Preview Mode**: Shows expense summary cards, category-wise pie chart, and expense list
- **Edit Mode**: Add, edit, or delete expenses with full CRUD operations

### Summary Cards (Preview Mode)

| Card | Description |
|------|-------------|
| **Total Expenses** | Sum of all tracked expenses for the month |
| **Budget Variable Expenditure** | Auto-calculated from Budget tab (totalFunded − current balance) |
| **Under Budget** | Difference between budget variable expenditure and actual expenses (green if under, red if over) |

### Expense Categories

11 predefined categories for tracking:

- 🍽️ Food & Dining
- 🚗 Transportation
- 🛍️ Shopping
- 🎬 Entertainment
- 🏥 Healthcare
- 📚 Education
- 💇 Personal Care
- 🏠 Home & Utilities
- ✈️ Travel
- 🎁 Gifts & Donations
- 📦 Others

### Pie Chart

- Shows category-wise expense breakdown
- **Unidentified** category appears if actual expenses don't match budget variable expenditure
- Legend displays category name and percentage
- Responsive: legend appears below chart on mobile, to the right on desktop

### Month Navigation

- Navigate between months with ◀ ▶ buttons
- Cannot navigate to months before your onboarding date
- Syncs with Budget tab lifecycle (auto-advances when month is closed)
- Optional tracking: Leave blank for months you don't want to track expenses

### Adding/Editing Expenses (Edit Mode)

| Field | Description |
|-------|-------------|
| **Category** | Select from 11 predefined categories |
| **Amount (₹)** | Expense amount |
| **Date** | Date of expense |
| **Details** | Optional notes (e.g., restaurant name, item description) |

### Budget Comparison

The system automatically compares your tracked expenses against the Budget tab's Variable Expenditure:

- **Match**: If total tracked expenses ≈ budget variable expenditure → all categories shown
- **Under Budget**: If tracked expenses < budget variable expenditure → green "Under Budget" card
- **Over Budget**: If tracked expenses > budget variable expenditure → red "Under Budget" card
- **Unidentified**: Any difference appears as "Unidentified" category in the pie chart

### Lifecycle

- Expense tracking is optional per month
- When you close a month in Budget tab, the corresponding expense tracking month also becomes read-only
- Navigate to future months to plan ahead (view only until month starts)

---

## Investments

### Overview

Track all your investments in one place with sub-section views.

### Sub-sections (Preview Mode)

Located in the same section as sort/filter controls, aligned to the right:

| Tab | Shows |
|-----|-------|
| **All** | Every investment entry |
| **Existing** | Lump sum: FDs, PPF, Stocks, Bonds, Real Estate (category=Existing, frequency≠Monthly) |
| **Monthly** | Recurring: SIPs, RDs (category=Monthly or frequency=Monthly) |
| **Portfolio Summary** | Consolidated view with Existing + Monthly + One-Time (from Budget) |

> **Note**: Frequency filter is automatically hidden when viewing "Existing" or "Monthly" tabs to avoid redundancy.

### Chart Position

The "Investment Values" bar chart is positioned **above** the sort/filter controls and sub-section tabs for better visibility.

### Sort/Filter Controls

- Located in a bordered section (consistent with other tabs)
- Sort by: None, Name, Type, Amount, Current Value, Interest Rate, Start Date
- Sort direction: Ascending (↑) or Descending (↓)
- Filter by: Type, Frequency (when applicable)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| Investment Name | Text | e.g. HDFC SIP, Axis FD |
| Type | Select | Mutual Fund, SIP, FD, RD, Stocks, PPF, EPF, NPS, Bonds, Gold, Real Estate, Saving, Other |
| Category | Select | **Existing** or **Monthly** |
| Invested Amount (₹) | Number | Total amount invested |
| Current Value (₹) | Number | Market value today |
| Expected Return (%) | Number | Annual return rate |
| Frequency | Select | Monthly, Quarterly, Semi-Annual, Annual, One-Time |
| Start Date | Date | Investment start |
| Maturity Date | Date | Maturity / end date |
| Notes | Text | Optional |

### Summary Metrics

- Total Invested, Current Portfolio Value, Total Items
- Monthly Investments total, Existing (Lump Sum) total

### Portfolio Summary View

Groups investments into three sections:
1. **Existing Investments** — FDs, PPF, Stocks, etc.
2. **Monthly Investments** — SIPs, RDs
3. **One-Time Investments (from Budget)** — On-Demand Investment amounts from monthly budget data

---

## Outflow (Fixed Deductions)

### Overview

Recurring monthly deductions auto-debited from your Salary account at month start.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| Name | Text | e.g. Rent, LIC Premium |
| Type | Select | Insurance, Liability, Saving, Expenditure, Investment |
| Amount (₹) | Number | Monthly deduction amount |
| Frequency | Select | Monthly, Quarterly, Semi-Annual, Annual, One-Time |
| Bank Name | Text | Associated bank |
| End Date | Date | When deduction ends |
| Details | Text | Optional |

### Auto-Debit Routing

Recurring outflows (Monthly/Quarterly/Semi-Annual/Annual) are auto-debited from Salary and routed by type. **One-Time items are excluded** from auto-debit and budget auto-calculation:

| Outflow Type | Destination |
|-------------|-------------|
| Liability | Leaves system (paid to lender) |
| Insurance | Leaves system (paid to insurer) |
| Saving | Credited to Saving account |
| Investment | Credited to Investment account |
| Expenditure | Credited to Primary (Expenditure) account |

The **Monthly Transfer Breakdown** section in Budget shows this routing.

### Summary

- Fixed Monthly Income (editable)
- Monthly Deductions total
- Remaining After Deductions

---

## Insurance

### Overview

Dedicated tab for tracking insurance policies — separate from Outflow premium payments.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| Policy Name | Text | e.g. LIC Term Plan, Star Health |
| Policy Type | Select | Term Life, Whole Life, Health, Vehicle, Home, Travel, Critical Illness, Personal Accident, Other |
| Insurance Provider | Text | e.g. LIC, HDFC Life |
| Policy Number | Text | Policy/certificate number |
| Sum Assured (₹) | Number | Coverage amount |
| Premium Amount (₹) | Number | 0 if no active premium (paid up) |
| Premium Frequency | Select | Monthly, Quarterly, Half-Yearly, Annual, None (Paid Up) |
| Policy Start Date | Date | When policy started |
| Policy End Date | Date | When policy expires |
| Nominee | Text | Nominee name |
| Notes | Text | Optional |

### Summary

- Total Policies count
- Annual Premium Total (all premiums annualized)
- Monthly Premium Load (annual ÷ 12)
- Total Sum Assured

### Relationship to Outflow

- Policies **with** active premiums should also have a corresponding entry in Outflow (type=Insurance) for budget auto-debit
- Policies **without** premiums (Paid Up) only appear in Insurance tab

---

## Financial Goals

### Fields

| Field | Description |
|-------|-------------|
| Goal Name | e.g. Emergency Fund, Down Payment |
| Amount Needed (₹) | Target amount |
| Amount Accumulated (₹) | Saved so far |
| Target Date | Deadline |
| Details | Optional notes |
| Goal Type | Short Term, Mid Term, Long Term (auto-selected based on target date) |
| Status | Planned, Ongoing, Achieved, Missed |

### Preview Cards

Each goal shows a progress bar with percentage and status badge.

### Goal Type Auto-Selection

The system automatically selects the goal type based on your target date:

- **Short Term**: ≤ 1 year from today
- **Mid Term**: 1-3 years from today
- **Long Term**: > 3 years from today
- **Default**: Long Term if no target date is selected

You can manually override the auto-selected type if needed. Once you manually change the type, the system will respect your choice and won't auto-select again for that goal.

---

## Net Worth

### Fields

| Field | Description |
|-------|-------------|
| Asset/Liability Name | e.g. House, Car Loan |
| Type | Asset or Liability |
| Value Today (₹) | Current value |
| Expected Annual Growth (%) | For projection |
| Details | Optional |

### Features

- Auto-imports account balances and outflow liabilities as net worth entries
- Assets vs. Liabilities breakdown
- Each item shows: **Current**, **@ 70 yrs** (projected), **@ 70 yrs real** (inflation-adjusted at 6%)
- **Projection chart** — Projects net worth growth until age 70

---

## Tax Plan

### Features

- **Regime selection**: Old or New tax regime
- **Financial year selection**: Choose which FY to plan for
- **Auto-calculated deductions**: Pulls EPF, PPF, NPS, insurance premiums from Outflow and Investments
- **Manual deductions**: Add additional 80C, 80D, 80CCD, etc.
- **Tax breakdown**: Shows taxable income, slab-wise tax, cess
- **Tax Deductions Chart**: Doughnut chart showing deductions grouped by tax section (80C, 80D, 80CCD, 80E, 80G, 80TTA, Others)

---

## Gifts

### Fields

| Field | Description |
|-------|-------------|
| Gift Name | e.g. Birthday gift to friend |
| Category | Fixed Every Year, On Demand |
| Relative Name | Recipient |
| Occasion | e.g. Birthday, Wedding |
| Amount (₹) | Gift value |
| Details | Optional |

---

## Emergency Fund

### How It Works

- Enter your current emergency fund amount
- Click **Done** to save your changes
- System calculates **Minimum Monthly Need** = Fixed Liabilities/Insurance + Fixed Expenditure + Average Variable Expenses
- Saving and Investment outflows are excluded (can be stopped in an emergency)
- Shows practical scenarios: 3 months (bare minimum), 6 months (recommended), 12 months (ideal)
- Monthly need breakdown shows each component
- Status: EXCELLENT (≥12 mo), READY (6–12), ADEQUATE (3–6), LOW (<3)

---

## Settings & Danger Zone

Access via the ⚙️ Settings button in the header.

### Settings Options

- **Theme**: Toggle Dark/Light mode
- **User info**: Display name, email

### Danger Zone

| Action | Description | Confirmation |
|--------|-------------|-------------|
| **Reset All Data** | Deletes all financial data, preserves account | Type "DELETE" |
| **Delete Account** | Deletes all data + Firebase Auth account permanently | Type "DELETE ACCOUNT" |

**Delete Account** is irreversible — it removes your Firestore data and Firebase Authentication record. You'll need to re-register if you want to use the app again.

---

## Export to Excel

- Click **Export** on any tab
- Downloads `{Tab_Name}_export.xlsx`
- Contains all entries with column headers
- Uses SheetJS (XLSX) library

---

## Download Dashboard Report

### What's Included

The dashboard report is a comprehensive snapshot of your financial status including:
- **This Month Summary**: Total income, monthly commitments, available funds, budget status
- **Net Worth**: Total assets, total liabilities, net worth, debt-to-asset ratio
- **Goals Progress**: Overall progress bar with detailed goal-by-goal breakdown
- **Preparedness**: Emergency fund, health insurance, term insurance status
- **Accounts**: Total balance, primary account, salary account
- **Investments & Planning**: Portfolio value, monthly investment, tax planning
- **6-Month Trend Chart**: Visual chart showing investment, liability, saving, expenditure, and others

### How to Download

1. Go to **Settings** (⚙️)
2. Scroll to "Download Dashboard Report"
3. Click **Download Report**
4. HTML file downloads: `smartfin-dashboard-YYYY-MM-DD.html`

### How to Save as PDF

#### Desktop (Windows/Linux/Mac)
1. Open the downloaded HTML file in your browser
2. Press **Ctrl+P** (Windows/Linux) or **Cmd+P** (Mac)
3. Select **"Save as PDF"** as the printer/destination
4. Choose location and save

#### Mobile (Android)
1. Open the downloaded HTML file in your browser (Chrome or Samsung Internet)
2. Tap the **3-dot menu** (⋮) in top-right
3. Tap **"Share..."** or **"Print"**
4. Select **"Save as PDF"** as the printer
5. Tap the download/save icon
6. Choose location and save

#### Mobile (iOS - iPhone/iPad)
1. Open the downloaded HTML file in Safari
2. Tap the **Share icon** (⬆️ in a square)
3. Scroll down and tap **"Print"**
4. Pinch zoom on the preview to see full page
5. Tap the **Share icon** again
6. Tap **"Save to Files"**
7. Choose location and save

### Tips

- ✅ Use Chrome on Android or Safari on iOS for best PDF quality
- ✅ Ensure you have dashboard data before downloading
- ✅ The chart is embedded as an image in the HTML
- ✅ The report is professionally formatted for print
- ✅ For mobile users, you can also take a screenshot if PDF is difficult

---

## Backup & Restore

### Export Backup

- Go to **Settings** (⚙️) → **Export Backup**
- Downloads `smartfin-backup-YYYY-MM-DD.json` containing ALL your data
- Includes: accounts, investments, outflows, insurance, budget data, goals, net worth, tax plan, gifts, emergency fund
- **Recommended**: Export before and after major changes

### Import Backup

- Go to **Settings** (⚙️) → **Import Backup**
- Select a previously exported `.json` file
- **Warning**: This **overwrites ALL current data** with the imported backup
- A confirmation dialog shows the backup date before proceeding
- After import, the app verifies your accounts and re-checks onboarding status

### When to Use

- **Before Delete Account / Reset All Data** — always export first
- **To fix corrupt data** — export, edit the JSON, import the corrected version
- **To migrate between Firebase projects** — export from old, import to new
- **Monthly safety backup** — export at month end for offline records

---

## Cross-Device Sync

- **Real-time** via Firebase Firestore
- **Automatic** — no manual sync needed
- **Same data** on all devices with same account
- **Data location**: `users/{uid}` in Firestore

---

## Precautions & Common Pitfalls

### Before Execute Transfer

| Pitfall | What happens | How to avoid |
|---------|-------------|-------------|
| **Outflow items added AFTER transfer** | Transfer amount is too high; variable expenditure inflated | Add ALL outflow items before clicking Execute Transfer |
| **Wrong salary amount** | All calculations cascade incorrectly | Double-check Primary Income matches actual salary credited |
| **Missing Saving/Investment account** | Transfer can't credit those accounts | Add accounts before first transfer |
| **Account balance not zero** | Pre-existing balance included in totalFunded | Set balance to 0 if starting fresh; or verify the balance is accurate |

### During the Month

| Pitfall | What happens | How to avoid |
|---------|-------------|-------------|
| **Forgetting Quick Update** | Variable expenditure stays at 0 or stale value | Update expenditure balance whenever you check your bank |
| **Editing outflow amounts after transfer** | Mismatch warning appears; budget calculations off | Use Recalculate Transfer button if this happens |
| **Manually changing salary account balance** | Not possible — salary is auto-managed | Use Primary Income field only |

### At Month End

| Pitfall | What happens | How to avoid |
|---------|-------------|-------------|
| **Not closing the month** | Carry forward doesn't happen; next month can't start clean | Always Close Month before entering next month's income |
| **Closing with wrong exp balance** | Wrong carry forward to next month | Update exp balance via Quick Update before closing |
| **Closing without transfer** | Not allowed — transfer is required first | Execute Transfer before Close Month |

### Data Safety

| Pitfall | What happens | How to avoid |
|---------|-------------|-------------|
| **Reset All Data without backup** | All data permanently lost | Always Export Backup before Reset |
| **Delete Account without backup** | Firebase Auth + data permanently deleted | Export Backup first; this is irreversible |
| **Importing old/wrong backup** | Overwrites all current data | Verify backup date in confirmation dialog; export current data first |

---

## FAQ

### General

### Q: How do I delete my account?
**A:** Go to Settings → Danger Zone → Delete Account. Type "DELETE ACCOUNT" to confirm. This permanently deletes your Firestore data and Firebase Auth record.

### Q: Is my data secure?
**A:** Yes. Data is in Firebase Firestore with user-specific authentication. Only you can access your data with your login credentials.

### Q: What currency does the app use?
**A:** Indian Rupee (₹) with Indian number formatting (₹12,34,567).

### Q: Can multiple people use the same app?
**A:** Yes. Each user registers their own account. Data is completely separate per user — stored under `users/{uid}` in Firestore.

### Accounts

### Q: What accounts do I need to set up?
**A:** At minimum: one **Primary (Expenditure)** account and one **Salary** account. Optionally add a **Saving** and **Investment** account if you want the transfer to credit those.

### Q: What balance should I enter when adding accounts?
**A:** Enter the **actual current balance** from your bank. If you're starting fresh and want the app to track from zero, enter 0. The balance you enter becomes the starting point for all calculations.

### Q: Can I have multiple Saving accounts?
**A:** No. The app enforces one Saving, one Primary, and one Salary account. You can have multiple Investment, Loan, and Others accounts.

### Budget & Transfer

### Q: What happens when I click Execute Transfer?
**A:** The app deducts all fixed outflows from your salary, credits the remaining (salary leftover) to your Expenditure account, and also credits Saving/Investment accounts with their respective fixed amounts. Salary account goes to ₹0.

### Q: I added outflow items after Execute Transfer. What do I do?
**A:** A red **"Transfer Mismatch Detected"** banner will appear. Click **Recalculate Transfer** to correct the budget metadata. This fixes the variable expenditure calculation. Verify your actual account balances manually afterward.

### Q: What is Variable Expenditure?
**A:** It's automatically calculated as `totalFunded − current expenditure account balance`. It represents how much money has left your expenditure account since the transfer. Update your expenditure balance via Quick Update to keep this accurate.

### Q: What is totalFunded / _initialBalance?
**A:** The expenditure account balance right after Execute Transfer. Formula: `pre-existing balance + carry forward from last month + salary leftover`. This snapshot is stored and never changes for the rest of the month.

### Q: How is Total Outflow calculated?
**A:** Total Outflow = sum of all Cash Outflow fields only (recurring monthly obligations). It **excludes** On-Demand Outflow items and any one-time investments.

### Q: What's the difference between Outflow and Insurance tabs?
**A:** Outflow tracks **premium payments** (monthly deductions from salary). Insurance tracks **policy details** (coverage, nominees, dates). Policies with active premiums should appear in both.

### Q: What does "Previous Month CC Bill" vs "Current Month CC Spending" mean?
**A:** Previous Month CC Bill is the unpaid credit card balance from last month (auto-carried from previous month's close). Current Month CC Spending is what you've charged this month (updated via Quick Update).

### Q: How is "Total Spendable" calculated?
**A:** `Total Inflow − Fixed Monthly Outflow`. This shows how much of your income remains after all recurring deductions. If negative, your fixed obligations exceed your income.

### Q: What is the Monthly Distribution pie chart?
**A:** It shows your outflow broken into 6 categories: **Investment**, **Liability**, **Savings**, **Expenditure**, **Insurance**, **Others**. It only includes recurring outflow items — one-time and on-demand items are excluded.

### Investments & Outflow

### Q: What's the Portfolio Summary view in Investments?
**A:** It consolidates your investments from three sources: Existing (lump sum), Monthly (SIPs/RDs), and One-Time (from Budget on-demand investments).

### Q: Are One-Time outflow items included in the budget?
**A:** No. One-Time frequency items in Outflow and Investments are **excluded** from monthly auto-calculation. They don't appear in auto-debit routing, pie charts, or Total Outflow. They are tracked for reference only.

### Q: What's the difference between Outflow frequency and amount?
**A:** The amount is what you pay per occurrence. The app converts it to a monthly equivalent: Quarterly ÷ 3, Semi-Annual ÷ 6, Annual ÷ 12. This monthly equivalent is what appears in the budget.

### Net Worth & Emergency Fund

### Q: How does Net Worth projection work?
**A:** Each item shows three values: **Current** (today's value), **@ 70 yrs** (projected using expected growth rate), **@ 70 yrs real** (inflation-adjusted at 6%). The projection chart shows net worth growth over time.

### Q: How is Emergency Fund adequacy calculated?
**A:** Minimum Monthly Need = Fixed Liabilities/Insurance + Fixed Expenditure + Average Variable Expenses. Saving and Investment outflows are excluded (they can be paused in an emergency). Status: EXCELLENT (≥12 months), READY (6–12), ADEQUATE (3–6), LOW (<3).

### Backup & Data

### Q: How do I fix wrong data?
**A:** Export a backup, edit the JSON file to correct values, then import the corrected backup. For transfer mismatch issues, use the Recalculate Transfer button instead.

### Q: Will importing a backup lose any data?
**A:** Import preserves all fields from the backup file. It maps all tab data (cards, inflow, outflow, insurance, etc.), budget data, user settings, and metadata. No fields are dropped during import.

---

## Tips & Best Practices

### Setup (Do Once)

1. **Set up Accounts first** — Primary + Salary accounts unlock all features
2. **Add ALL Outflow items before your first Execute Transfer** — this is the single most important step to avoid data issues
3. **Set account balances accurately** — enter 0 if starting fresh, or your actual bank balance
4. **Add Insurance policies** in both the Insurance tab (details) and Outflow tab (premium payments)

### Monthly Routine

5. **Start of month**: Enter Primary Income → Review Transfer Breakdown → Execute Transfer
6. **Mid-month** (weekly or biweekly): Quick Update → enter current Expenditure Account Balance from your bank app + CC spending
7. **End of month**: Final Quick Update with latest balance → Close Month → move to next month
8. **Export backup monthly** — download JSON backup at month end for safety

### Ongoing

9. **If you add new outflow items after transfer**: Use the Recalculate Transfer button when the mismatch warning appears
10. **Check Portfolio Summary** for a consolidated investment view across all sources
11. **Review Emergency Fund** quarterly — update currentFund amount as your savings grow
12. **Don't manually edit salary balance** — it's auto-managed as a transit account
13. **Keep Insurance tab updated** separately from Outflow premiums
14. **Use On-Demand fields** for irregular expenses (gifts, medical, travel) that aren't monthly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 5.3.0 | 2026-06-20 | **Dynamic Notification System**: Replaced static alerts carousel with dynamic popup notifications triggered by real-time financial data. Added 7 comprehensive triggers (budget, goals, insurance, expenses, net worth, tax, gifts). Enhanced insights system with 11 recommendation types. Modern dark theme with indigo/slate color palette. Updated Financial Health Score with rebalanced weights (savings & investment 25pts, net worth 15pts, goals 10pts). Loading spinner redesigned with logo inside rotating ring. Dashboard styling modernized to match other tabs. Tax deductions chart changed to horizontal bar chart. All tags/badges updated for dark and light mode consistency. Added sampledata.json for testing. |
| 5.2 | 2026-06-18 | **Transfer Mismatch Detection**: red warning banner when outflows change after Execute Transfer, with Recalculate Transfer button to fix `_transferDone` and `_initialBalance`. **Outflow snapshot**: `_transferOutflowSnapshot` stored at transfer time for audit trail. **Variable Expenditure breakdown**: popup now shows individual components (Carry Forward, Salary Leftover, Pre-existing Balance) instead of combined total. **Recalculate formula**: correctly handles pre-existing account balance + carry forward without double-counting. |
| 5.1 | 2026-06-18 | **Pie chart fix**: 6 categories (added Insurance); excludes on-demand/one-time items from monthly & annual distribution. **Total Outflow fix**: shows recurring outflow only (excludes On-Demand investing). **One-Time exclusion**: One-Time frequency outflow and inflow items excluded from `buildMonthlyAutoValues` auto-calculation. **Transfer message**: restructured confirm dialog showing salary leftover explicitly. **Net worth display**: each item shows Current, @ 70 yrs, @ 70 yrs real (inflation-adjusted). **Emergency fund fix**: Details text field preserved on edit (pre-fills all fields, not just currentFund). |
| 5.0 | 2026-06-09 | **Auto-debit routing**: fixedSaving/fixedInvestment/fixedExpenditure/insurancePremiums moved to outflow; variableExpenditure auto-calculated; creditCardOutstanding auto from previous closed month; salary is transit-only account (no manual edit); Execute Transfer deducts full salary, credits all accounts; replaced Carry Forward with Close Current Month Budget (read-only months); updated emergency fund calculation (fixed obligations + avg variable, excludes saving/investment); budget status handles no-data/no-accounts/no-income edge cases; transfer section responsive for mobile; monthly need breakdown in emergency fund |
| 4.0 | 2026-06-08 | **Major restructure**: Inflow→Investments with sub-sections (Existing/Monthly/Portfolio Summary); new Insurance tab (policy tracking with premium frequency, sum assured, nominees); Budget engine rewrite (account-balance-aware "Total Spendable" formula); separated CC fields (Previous Month CC Bill vs Current Month CC Spending); Quick Update consolidation (added Expenditure Balance field, removed standalone Reconciliation, shows untracked expenses inline); Delete Account feature (Settings→Danger Zone, deletes Firestore data + Firebase Auth); month-end carry forward banner (auto-detects unclosed months); improved UI with summary hints/descriptions on all fields; investment category field (Existing/Monthly) for sub-section filtering. |
| 3.2 | 2026-06-04 | Changed UI pattern from Edit/Save/Cancel to Edit/Done for all tabs except Liability; Liability page keeps Save button for fixed monthly income field; removed Cancel buttons from all tabs except Liability; added theme-based favicon switching (logo_dark/logo_light); fixed auto-calculated badge tooltip. |
| 3.1 | 2026-06-04 | Monthly Budget: removed Insurance and Rent/Maintenance from Cash Outflow; removed SIP/Monthly Investment and Monthly Saving from On-Demand Outflow; renamed "Outflow" → "Cash Outflow"; added hover tooltips for auto-calculated fields showing breakdown; removed insurance from annual summary and pie charts; removed duplicate save button. |
| 3.0 | 2026-06-04 | Liabilities tab renamed; added Frequency field; Insurance Premium → Insurance. Monthly Budget: "Investing" → "On-Demand Outflow"; merged credit card fields; removed untrackedExpense and retirement; added on-demand fields; removed monthEndBalance; added "Balance to Spend" and "Amount Available to Spend"; budget edit supports Cancel with snapshot/restore; on-demand section hidden when empty. Accounts: Only one Saving account allowed; default sort (Primary → Saving → others by balance); purposeOther field for custom purposes. Delete confirmation for all entries. iOS safe-area support. Bug fixes: currentAge restored; budget snapshot month key fix; CC carryover removed. |
| 2.0 | 2026-05-28 | Added Net Worth, Tax Plan, Gifts, Emergency Fund tabs. Removed Misc and One-Time Budget tabs. Added Reset All Data feature with double confirmation. Updated all tabs with Preview/Edit modes and summary calculations. Added graphs and charts for Monthly Fixed Expense, Investments, and Net Worth. |
| 1.0 | 2026-05-28 | Initial release with authentication, 11 tabs, Excel export |

---

*SmartFin – Smart Financial Planning*
*Built with Firebase Firestore for cross-device sync*
