# SmartFin – Application Specification (v5.4.3)

> **Purpose**: Single source of truth for the app's architecture, data models, business logic, and UI structure.
> Use this file as context when making future modifications. Update it after every significant change.
>
> **IMPORTANT**: After making any code changes, follow this complete process to maintain project quality:
> - Update version numbers in README.md, USER_MANUAL.md, DEVELOPMENT.md, architecture.md to match APP_VERSION in app.js
> - Add changelog entries to CHANGE_LOG.md with detailed description of changes
> - Update relevant sections in APP_SPEC.md with technical details
> - Update USER_MANUAL.md for user-facing changes
> - Add test cases for new logic/algorithm changes (place in tests/ directory)
> - Verify all changes work correctly before marking as complete
> - Test on different screen sizes (mobile, tablet, desktop) for UI changes
>
> **CRITICAL REQUIREMENT - Mobile & Web Compatibility**:
> - ALL features MUST work on both web app (desktop/laptop browsers) AND mobile devices (phones/tablets)
> - Test on multiple browsers: Chrome, Firefox, Safari, Edge
> - Test on mobile: iOS Safari, Android Chrome
> - Implement touch/swipe gestures for mobile interactions
> - Provide keyboard shortcuts for desktop accessibility
> - Use responsive CSS with proper breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
> - Ensure tap targets are at least 44x44px for mobile usability
> - Test with different screen orientations (portrait/landscape)
> - Verify smooth performance on lower-end mobile devices
> - Use passive event listeners for scroll/touch events to improve performance
>
> **Version 5.3.0 Updates - Dynamic Notifications, Enhanced Insights & Modern Dark Theme**:
> - **Dynamic Notification System**: Bell icon with live badge counter driven by 7 registered triggers (Budget, Goals, Insurance, Expenses/Recurring Outflows, Net Worth, Tax, Gifts)
>   - Popup panel lists all active alerts with icon, message, and quick-navigation action
>   - "Clear All" button dismisses all alerts for the day (`clearNotifications()`)
>   - Click-outside-to-close behavior (clicking anywhere outside the popup and bell button closes it)
>   - Daily reset: notification state (`viewedCount`, `cleared`, `lastAlertsHash`) resets automatically at the start of a new day, stored in `localStorage` under `notificationState`
>   - Badge counter shows unread alert count on the bell icon, auto-hides when count is zero
> - **Enhanced Insights (Dashboard)**: `generateInsights()` now evaluates 11 recommendation types across three categories — **positive** (surplus, savings rate, emergency fund funded, net worth strength, consistent investing), **suggestion** (emergency fund gap, low health/term insurance, no investments, goals behind schedule, no goals set, low asset diversification, no tax planning), and **warning** (high debt ratio, low savings rate, negative net worth)
>   - Display limit increased from 4 to 6 most relevant insights (`insights.slice(0, 6)`)
> - **Financial Health Score – Rebalanced Weights**: `calculateFinancialHealthScore()` now scores out of 100 using:
>   - Emergency Fund Coverage — 15 pts (gradual scoring based on months-of-expenses ratio)
>   - Debt Management — 20 pts (debt-to-income ratio bands: <30% / <40% / <50% / <70% / ≥70%)
>   - Savings & Investment — 25 pts (combined Savings + Investment rate vs usable income; highest-weighted component)
>   - Insurance Coverage — 15 pts (Health 9 pts + Term 6 pts, weighted 60/40)
>   - Net Worth Position — 15 pts (base points for positive net worth, scaled by months-of-expenses covered, **+2 asset diversification bonus** for ≥3 distinct asset types)
>   - Goal Progress & Planning — 10 pts (8 pts for progress + **2 pt bonus** simply for having goals defined)
> - **Modern Dark Theme**: Indigo/slate color palette applied across the UI; `--primary` and `--investment` CSS variables set to `#6366f1` (indigo), replacing the previous accent color
> - **Loading Spinner Redesign**: App logo now renders inside a rotating ring (`.sf-spinner`), with the logo counter-rotating (`.sf-spinner-logo`, `sf-spin-reverse` keyframes) so it stays upright while the ring spins; `prefers-reduced-motion` disables both animations
> - **Tags/Badges Refresh**: Semantic badges (`.semantic-investment`, `.policy-badge`, `.premium-badge`, tab pills, etc.) updated with modern colors — indigo, rose, emerald, amber, violet, cyan — tuned for both dark and light theme consistency
> - **Tax Deductions Chart**: `renderTaxDeductionsChart()` now renders a horizontal bar chart (Chart.js `indexAxis: 'y'`) grouped by tax section for improved label readability
> - **Sample Test Data**: Added `tests/sampledata.json` — a representative dataset for exercising dashboard, budget, and insights logic during manual/automated testing
>
> **Version 4.0.3 Updates - Error Handling & Network Status Improvements**:
> - **Network Status Indicator**: Visual indicator in user bar showing Firebase save status
>   - Icon-based status display (checkmark, refresh, warning, offline icons)
>   - Compact design: 14px icons, shows text on hover
>   - Located in user bar next to user email
>   - Status values: online (green checkmark), retrying (yellow blinking refresh), error (red warning), offline (red WiFi slash)
>   - Automatically hides after 2 seconds on successful save
>   - Browser online/offline detection with automatic status updates
> - **Enhanced Error Handling**: Improved Firebase error handling with specific user notifications
>   - Quota exceeded error: Specific message about quota reset timing and upgrade options
>   - Network errors: Automatic retry after 2 seconds with visual "Retrying save..." indicator
>   - Permission errors: Clear message about re-login requirements
>   - Connection loss: Network status indicator shows error state
>   - All errors now have user-friendly alert messages
> - **Error Handling Functions**: New functions for network status management
>   - `showNetworkStatus(status)`: Shows indicator with appropriate icon and text
>   - `hideNetworkStatus()`: Hides the indicator
>   - Browser event listeners for online/offline detection
>   - Automatic retry logic for network errors
>
> **Version 4.0.2 Updates - Dashboard Enhancements & Bug Fixes**: 
> - **6-Month Trend Chart**: Now displays all 5 categories (Income, Saving, Expenditure, Investment, Liability) with consistent color coding
> - **Chart.js Canvas Fix**: Automatic destruction of existing chart instances before creating new ones to prevent canvas reuse errors
> - **Net Worth Projection Chart**: Updated styling to match modern dashboard 6-Month Trend appearance (smooth curves, consistent styling)
> - **Spending Breakdown**: Shows all 10 expense categories (excluding Others) with automatic separator when more than 5 items
> - **This Month Card**: Added Variable Expenses and On-Demand Expense display for better budget visibility
> - **Financial Year Overview**: Added Others category to show all outflow types including fixedOthers
> - **Accounts & Net Worth Card**: Added total balance (all accounts) and total credit limit display
> - **Mobile UI Fix**: Expense page edit/done button now properly right-aligned on mobile devices like other pages
> - **Responsive Design**: All changes tested and optimized for mobile, tablet, and desktop views
>
> **Version 4.0.1 Updates - Major Architecture Redesign**: 
> - **Core Business Logic Extraction**: All business logic separated into platform-independent modules (13 modules, 2,780 lines)
> - **Modular Architecture**: Utilities, Budget, Accounts, Investments, Goals, Insurance, Net Worth, Tax, and Expense modules
> - **100% Test Coverage**: 64 comprehensive tests ensuring reliability and correctness
> - **Platform Independence**: Business logic works seamlessly on both web and mobile platforms
> - **Enhanced Maintainability**: Clear separation of concerns, single responsibility, well-documented code
> - **Backward Compatibility**: Zero breaking changes, all existing features preserved
> - **Future-Ready**: Foundation for mobile app development and advanced features
> - All features use existing data and calculations - no duplicates, ensuring data consistency
> - Fully responsive design for mobile, tablet, and desktop
> - Enhanced code quality with modular, testable, and reusable components

---

## 1. Mobile & Web Compatibility Standards

### Platform Support
- **Web Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Android Chrome
- **Screen Sizes**: 
  - Mobile: 320px - 767px (portrait & landscape)
  - Tablet: 768px - 1024px
  - Desktop: 1025px+

### Interaction Patterns

#### Touch Gestures (Mobile/Tablet)
- **Swipe Left/Right**: Navigate carousels, switch between items
- **Tap**: Select items, trigger actions (minimum 44x44px tap targets)
- **Long Press**: Context menus, additional options
- **Pinch to Zoom**: Disabled for app UI, enabled for images/charts where appropriate
- **Pull to Refresh**: Not implemented (use explicit refresh buttons)

#### Mouse/Keyboard (Desktop)
- **Click**: Primary action
- **Hover**: Show tooltips, highlight interactive elements
- **Arrow Keys**: Navigate carousels, move between fields
- **Tab**: Keyboard navigation through interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dialogs

#### Dual Support (All Platforms)
- All interactive elements must support both touch and mouse/keyboard
- Use passive event listeners for scroll/touch events
- Prevent default only when necessary
- Test with both input methods

### Performance Requirements
- **Mobile**: Smooth 60fps animations on mid-range devices (2-3 year old phones)
- **Load Time**: Initial page load < 3 seconds on 3G
- **Interaction**: Response to user input < 100ms
- **Animations**: Use CSS transforms and opacity (GPU-accelerated)
- **Images**: Lazy load, use appropriate formats (WebP with fallbacks)

### Responsive Design Checklist
- [ ] Test on physical mobile devices (iOS and Android)
- [ ] Test in browser device emulation mode
- [ ] Test both portrait and landscape orientations
- [ ] Verify touch targets are at least 44x44px
- [ ] Check text readability (minimum 16px base font)
- [ ] Ensure adequate spacing between interactive elements
- [ ] Test with slow network (3G throttling)
- [ ] Verify no horizontal scrolling on mobile
- [ ] Check that all features work without hover states
- [ ] Test keyboard navigation on desktop

### Implementation Guidelines
```javascript
// ✅ Good: Passive listeners for better performance
element.addEventListener('touchstart', handler, { passive: true });

// ✅ Good: Support both touch and mouse
element.addEventListener('touchstart', handleStart);
element.addEventListener('mousedown', handleStart);

// ✅ Good: Responsive breakpoints
@media (max-width: 767px) { /* Mobile */ }
@media (min-width: 768px) and (max-width: 1024px) { /* Tablet */ }
@media (min-width: 1025px) { /* Desktop */ }

// ✅ Good: Touch-friendly sizing
.button { min-width: 44px; min-height: 44px; }

// ❌ Bad: Hover-only interactions
.menu:hover .submenu { display: block; } // Won't work on touch

// ❌ Bad: Fixed pixel widths
.container { width: 1200px; } // Will break on mobile
```

---

## 2. Architecture & Modular Design (v5.4.3)

### Core Business Logic Modules

SmartFin now features a **modular architecture** with platform-independent business logic separated from UI code. This enables code reuse across web and mobile platforms.

#### Module Structure
```
src/core/
├── utils/              # Utility modules (3 files)
│   ├── FrequencyConverter.js    # Payment frequency conversions
│   ├── DateUtils.js             # Date manipulation utilities
│   └── CurrencyFormatter.js     # Indian currency formatting
├── budget/
│   └── BudgetCalculator.js      # Budget calculations and validation
├── accounts/
│   ├── AccountManager.js        # Account management logic
│   └── AccountValidator.js      # Account validation
├── investments/
│   └── InvestmentCalculator.js  # Investment returns and SIP
├── goals/
│   └── GoalCalculator.js        # Goal tracking and progress
├── insurance/
│   └── InsuranceCalculator.js   # Insurance coverage analysis
├── networth/
│   └── NetWorthCalculator.js    # Net worth projection
├── tax/
│   └── TaxCalculator.js         # Tax deductions and savings
├── expenses/
│   └── ExpenseAnalyzer.js       # Expense tracking and analysis
└── index.js                     # Main export file
```

#### Key Principles
- **Pure Functions**: No side effects, predictable outputs
- **Platform Independent**: No DOM or framework dependencies
- **Fully Tested**: 64 comprehensive unit tests (100% pass rate)
- **Well Documented**: JSDoc comments and usage examples
- **Reusable**: Can be used in web, mobile, and future platforms

#### Module Statistics
- **Total Modules**: 13 files
- **Lines of Code**: 2,780 lines
- **Functions**: 119+ pure functions
- **Test Coverage**: 64 tests, 100% passing

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (ES modules, single-page app) |
| Business Logic | Platform-independent ES6 modules (src/core/) |
| Styling | Custom CSS with CSS variables for theming (dark/light) |
| Charts | Chart.js (lazy-loaded) |
| Export | SheetJS/XLSX (lazy-loaded) |
| Auth | Firebase Authentication (email/password + password reset) |
| Database | Firebase Firestore (real-time sync) |
| Fonts | Google Fonts – Inter |
| Icons | Inline emoji/text icons + SVG (no icon library) |
| Modals | Custom async modal system (replaces native alert/confirm/prompt) |
| Testing | Browser-based test runner (test-utils.html) |

### Files

| File | Purpose | Approx Lines |
|------|---------|-------------|
| `index.html` | All HTML structure (single file, all tabs) | ~1390 |
| `assets/js/app.js` | Main application logic (ES module) | ~6600 |
| `assets/js/modules/constants.js` | Named constants (uses FrequencyConverter) | ~48 |
| `assets/js/modules/modal.js` | Custom modal/toast system | ~265 |
| `assets/js/modules/dashboard.js` | Dashboard quick-glance renderer | ~175 |
| `assets/css/styles.css` | All styles (single file) | ~4240 |
| `src/core/**/*.js` | Business logic modules (13 files) | ~2780 |
| `tests/core/**/*.test.js` | Unit tests (2 files) | ~400 |
| `test-utils.html` | Browser test runner | ~220 |
| `APP_SPEC.md` | Project memory / architecture spec (this file) | ~800 |

---

## 4. Navigation & Tab System

### DEFAULT_TABS (in order)

| Tab ID | Label | Core | Has Custom UI |
|--------|-------|------|--------------|
| `dashboard` | Dashboard | Yes | Yes – `dashboardUI` |
| `cards` | Accounts | Yes | Yes – `cardsUI` |
| `inflow` | Investments | Yes | Yes – `inflowUI` |
| `outflow` | Outflow | Yes | Yes – `outflowUI` |
| `insurance` | Insurance | Yes | Yes – `insuranceUI` |
| `monthlyBudget` | Budget | Yes | Yes – `monthlyBudgetUI` |
| `expenseTracking` | Expense Tracking | Yes | Yes – `expenseTrackingUI` |
| `financialGoal` | Goals | Yes | Yes – `financialGoalUI` |
| `netWorth` | Net Worth | No | Yes – `netWorthUI` |
| `taxPlan` | Tax Plan | No | Yes – `taxPlanUI` |
| `gifts` | Gifts | No | Yes – `giftsUI` |
| `emergencyFund` | Emergency Fund | No | Yes – `emergencyFundUI` |

Custom tabs use `standardUI` with generic form/table.

### UI Pattern

All tabs follow **Preview/Edit toggle**:
- Preview mode: summary cards, charts, read-only preview items
- Edit mode: dynamic form fields + data table with edit/delete actions
- Toggle button: `✎ Edit` ↔ `✓ Done`
- State variables: `is{Tab}EditMode` (boolean)

---

## 3. Data Model

### Firestore Document Structure

```
users/{uid} → single document
```

```json
{
  "userName": "string",
  "userLocation": "City, State, Country (can be preset or custom)",
  "dateOfBirth": "YYYY-MM-DD",
  "currentAge": 0,
  "fixedMonthlyIncome": 0,
  "onboardingComplete": false,
  "onboardingDate": "YYYY-MM-DD",
  "dataMigrated": true,
  "tabData": {
    "cards": [ ...entries ],
    "inflow": [ ...entries ],
    "outflow": [ ...entries ],
    "insurance": [ ...entries ],
    "financialGoal": [ ...entries ],
    "netWorth": [ ...entries ],
    "taxPlan": [ ...entries ],
    "gifts": [ ...entries ],
    "emergencyFund": [ ...entries ],
    "{customTabId}": [ ...entries ]
  },
  "monthlyBudgetData": {
    "2026-06": {
      "inflow": { "primaryIncome": 0, "secondaryIncome": 0, ... },
      "outflow": { "loanEMI": 0, "fixedSaving": 0, "fixedInvestment": 0, "fixedExpenditure": 0, "fixedOthers": 0, "variableExpenditure": 0, "creditCardOutstanding": 0, "midMonthCCOutstanding": 0, ... },
      "investing": { "onetimeSaving": 0, "onetimeSavingDesc": "", "onetimeInvestment": 0, "onetimeInvestmentDesc": "", "ondemandExpenditure": 0, "ondemandExpenditureDesc": "", "ondemandLiability": 0, "ondemandLiabilityDesc": "" },
      "monthEndBalance": 0,
      "_transferDone": 0,
      "_initialBalance": 0,
      "_carryForwardDone": 0,
      "_ccSettlementAmount": 0,
      "_actualCCOutstanding": 0,
      "_monthClosed": false,
      "autoLinkedFields": { "outflow.loanEMI": true, "outflow.variableExpenditure": true, ... },
      "autoLinkedBreakdown": { "outflow.loanEMI": [{name, amount, source}] }
    }
  },
  "expenseTrackingData": {
    "2026-06": {
      "expenses": [
        {
          "id": "timestamp",
          "category": "Food & Dining",
          "amount": 1500,
          "date": "2026-06-15",
          "description": "Dinner at restaurant",
          "createdAt": "2026-06-15T18:30:00.000Z"
        }
      ]
    }
  },
  "customTabs": [ { "id": "string", "label": "string", "color": "#hex", "text": "#hex" } ]
}
```

### Entry Structure (all tabs)

Every entry has:
```json
{
  "id": "uuid-v4",
  ...tab-specific fields from TAB_FIELDS
}
```

---

## 4. Tab-Specific Field Definitions (TAB_FIELDS)

### cards (Accounts)

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| bankName | Bank/NBFC Name | text | — | Yes |
| isPrimary | Primary Account | select | Yes, No | — |
| accountPresent | Account Present | select | Yes, No | — |
| balance | Balance (₹) | number | — | — |
| debitCardPresent | Debit Card Present | select | Yes, No | — |
| creditCardPresent | Credit Card Present | select | Yes, No | — |
| creditCardLimit | Credit Card Limit (₹) | number | — | — |
| purpose | Purpose of Use | select | Salary, Expenditure, Saving, Investment, Loan, Others | — |
| purposeOther | Specify Purpose | text | — | — |
| kycUpdated | Address/KYC Updated | select | Yes, No | — |
| nomineeAdded | Nominee Added | select | Yes, No | — |

**Business Rules:**
- `isPrimary=Yes` → auto-sets `purpose=Expenditure`
- Only ONE Primary, ONE Salary, ONE Saving account allowed
- Onboarding complete when both Primary + Salary exist

### inflow (Investments)

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Investment Name | text | — | Yes |
| type | Type | select | Mutual Fund, SIP, FD, RD, Stocks, PPF, EPF, NPS, Bonds, Gold, Real Estate, Saving, Other | — |
| category | Category | select | Existing, Monthly | — |
| amount | Invested Amount (₹) | number | — | Yes |
| currentValue | Current Value (₹) | number | — | — |
| interestRate | Expected Return (%) | number | — | — |
| frequency | Frequency | select | Monthly, Quarterly, Semi-Annual, Annual, One-Time | — |
| startDate | Start Date | date | — | — |
| endDate | Maturity Date | date | — | — |
| details | Notes | text | — | — |

**Sub-section Filtering (preview mode):**
- `activeInvestmentView` state: `all | existing | monthly | portfolio`
- Existing = `category=Existing AND frequency≠Monthly`
- Monthly = `category=Monthly OR frequency=Monthly`
- Portfolio = consolidated view including one-time budget investments

### outflow (Fixed Deductions)

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Name | text | — | Yes |
| type | Type | select | Insurance, Liability, Savings, Expenditure, Investment, Others | — |
| amount | Amount (₹) | number | — | Yes |
| frequency | Frequency | select | Monthly, Quarterly, Semi-Annual, Annual, One-Time | — |
| bankName | Bank Name | text | — | — |
| endDate | End Date | date | — | — |
| details | Details | text | — | — |

**Auto-Debit Routing (recurring frequencies only, One-Time excluded):**
- Liability → leaves system
- Insurance → leaves system
- Saving → Saving account
- Investment → Investment account
- Expenditure → Primary account
- Others → leaves system (maps to `fixedOthers` in budget outflow, included in pie chart "Others")

### insurance

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Policy Name | text | — | Yes |
| policyType | Policy Type | select | Term Life, Whole Life, Health, Vehicle, Home, Travel, Critical Illness, Personal Accident, Other | — |
| provider | Insurance Provider | text | — | — |
| policyNumber | Policy Number | text | — | — |
| sumAssured | Sum Assured (₹) | number | — | — |
| premiumAmount | Premium Amount (₹) | number | — | — |
| premiumFrequency | Premium Frequency | select | Monthly, Quarterly, Half-Yearly, Annual, None (Paid Up) | — |
| startDate | Policy Start Date | date | — | — |
| endDate | Policy End Date | date | — | — |
| nominee | Nominee | text | — | — |
| details | Notes | text | — | — |

**Annual Premium Calculation:**
- Monthly → ×12, Quarterly → ×4, Half-Yearly → ×2, Annual → ×1, None → 0

### financialGoal

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Goal Name | text | — | Yes |
| amountNeeded | Amount Needed (₹) | number | — | Yes |
| amountAccumulated | Amount Accumulated (₹) | number | — | — |
| targetDate | Target Date | date | — | — |
| details | Details | text | — | — |
| goalType | Goal Type | select | ShortTerm, MidTerm, LongTerm | — |
| status | Status | select | Planned, Ongoing, Achieved, Missed | — |

### netWorth

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Name | text | — | Yes |
| type | Type | select | Asset, Liability | — |
| value | Value Today (₹) | number | — | Yes |
| growthRate | Expected Annual Growth (%) | number | — | — |
| details | Details | text | — | — |

**Auto-entries:** Account balances (Assets) and Outflow liabilities are auto-imported.

**Display per item:** Current value, @ 70 yrs (projected), @ 70 yrs real (inflation-adjusted at 6%).

### taxPlan

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Tax Saving Item | text | — | Yes |
| section | Section | select | 80C, 80D, 80CCD(1B), 80TTA, 80G, HRA, Other | — |
| amount | Amount (₹) | number | — | Yes |
| details | Details | text | — | — |

**Auto-deductions:** EPF, PPF, NPS, Insurance premiums auto-pulled from Outflow and Investments.

**Tax Deductions Chart (v5.4.3):** `renderTaxDeductionsChart()` renders deductions grouped by section as a **horizontal bar chart** (Chart.js `indexAxis: 'y'`) for improved label readability, replacing the previous vertical bar layout. Falls back to an empty-state message when no deductions exist.

### gifts

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| name | Gift Name | text | — | Yes |
| category | Category | select | Fixed Every Year, On Demand | — |
| relativeName | Relative Name | text | — | — |
| occasion | Occasion | text | — | — |
| amount | Amount (₹) | number | — | — |
| date | Date | date | — | — |
| details | Details | text | — | — |

**New in v6.1:**
- Added optional `date` field (defaults to current date when creating new entries)
- Monthly spending chart displays gifts by month for current financial year (April-March)

### emergencyFund

| Field ID | Label | Type | Options | Required |
|----------|-------|------|---------|----------|
| currentFund | Current Emergency Fund (₹) | number | — | Yes |
| details | Details | text | — | — |

---

## 5. Monthly Budget Engine

### MONTHLY_BUDGET_CATEGORIES

```
inflow:    primaryIncome, secondaryIncome, borrowing, interest, othersInflow
outflow:   loanEMI, insurancePremiums, fixedSaving, fixedInvestment, fixedExpenditure,
           variableExpenditure, creditCardOutstanding, midMonthCCOutstanding,
           debtRepayment, utilityBills, familyExpenditure, miscExpenses, fixedOthers
investing: onetimeSaving, onetimeInvestment, ondemandExpenditure, ondemandLiability
           (each has optional *Desc string field, e.g. onetimeSavingDesc)
```

**On-Demand Description Fields:**
- Each investing field has an optional description stored as `{fieldId}Desc` (string)
- In edit mode: rendered as a dashed-border text input below the number field
- In preview mode: shown as a blue "i" icon with CSS hover tooltip
- `sumCategoryNumericValues()` helper skips `*Desc` keys when computing totals

### Auto-Linked Fields

These fields are auto-calculated from other tabs (read-only in budget edit):
- `outflow.loanEMI` — Sum of all Liability outflows (monthly equivalent)
- `outflow.insurancePremiums` — Sum of all Insurance outflows (monthly equivalent)
- `outflow.fixedSaving` — Sum of all Saving outflows (monthly equivalent)
- `outflow.fixedInvestment` — Sum of all Investment outflows (monthly equivalent)
- `outflow.fixedExpenditure` — Sum of all Expenditure outflows (monthly equivalent)
- `outflow.fixedOthers` — Sum of all Others outflows (monthly equivalent)
- `outflow.variableExpenditure` — Auto: totalFunded − currentExpBalance, where totalFunded = account initial balance + carry forward from last month + salary leftover transferred (_initialBalance captures this post-transfer; fallback: _transferDone + prevCarryForward)
- `outflow.creditCardOutstanding` — Auto from previous month's midMonthCCOutstanding (when prev month is closed)

### Key Calculations (calculateAndDisplaySummary)

```
fixedMonthlyOutflow = sum of all Outflow entries converted to monthly equivalent:
  Monthly → amount, Quarterly → amount/3, Semi-Annual → amount/6, Annual → amount/12, One-Time → excluded

Total Outflow = outflowTotal only (excludes On-Demand investing category)
totalSpendable = inflowTotal - fixedMonthlyOutflow
variableExpenses = variableExpenditure + midMonthCCOutstanding
budgetBalance = totalSpendable - variableExpenses (positive = surplus, negative = overspent)
```

### Transfer Flow

```
transferAmount = primaryIncome - fixedMonthlyOutflow
Execute Transfer:
  1. Blocks if no Salary or Expenditure account
  2. Blocks if transfer already done (_transferDone exists)
  3. Blocks if month already closed (_monthClosed)
  4. Blocks if primaryIncome not set or ≤ 0
  5. Blocks if transferAmount ≤ 0 (outflow exceeds income)
  6. salary.balance = 0 (deduct full primaryIncome)
  7. expenditure.balance += transferAmount
  8. savingAccount.balance += autoDebitByType.Saving
  9. investmentAccount.balance += autoDebitByType.Investment
  10. Records: _transferDone, _initialBalance
  11. Transfer section hidden after execution
```

When primaryIncome is entered, salary account balance is auto-updated to match.

Transfer confirm message shows structured breakdown in 6 sections:
1. INCOME: Salary Credited
2. DEDUCTIONS (leaves salary): Liability, Insurance, Others
3. INTERNAL TRANSFERS: Savings A/c (before→after), Investment A/c (before→after), Fixed Expenditure
4. SUMMARY: Total Deducted, Salary Leftover
5. EXPENDITURE A/C: Existing Balance + Transfer = New Balance
6. SALARY A/C: Current → ₹0 (fully allocated)

### Close Current Month Budget

Replaces old "Carry Forward". Shown after transfer is done.

```
Close Month → confirmation dialog showing:
  • Month becomes read-only
  • Leftover expenditure balance carries forward
  • CC outstanding becomes next month's "Previous Month CC Bill (Unpaid)"

Actions:
  monthData._monthClosed = true
  monthData._carryForwardDone = expenditureBalance
  Navigate to next month
```

### Closed Month Behavior

- Edit button shows "🔒 Closed" (disabled)
- Budget status shows read-only banner
- Transfer section hidden
- Close section hidden
- Next month auto-gets CC outstanding via applyMonthlyAutoValues

---

## 5.5. Expense Tracking System

### Overview

Expense Tracking provides detailed, month-by-month expense categorization and analysis. It's designed as a complementary feature to the Budget tab - Budget handles planning and auto-calculations, while Expense Tracking provides granular actual spending analysis.

### Features

**Month Navigation**
- Calendar-style navigation (Previous/Next month buttons)
- Month display shows current being viewed
- Syncs with Budget tab - when Budget month is closed, Expense Tracking also advances to next month
- Optional tracking - months can be left blank if you don't want to track expenses

**Expense Categories (Predefined)**
- Food & Dining
- Transportation
- Shopping
- Entertainment
- Healthcare
- Education
- Personal Care
- Home & Utilities
- Travel
- Gifts & Donations
- Others

**Preview Mode**
- Summary cards showing:
  - Total Expenses (sum of all expenses for the month)
  - Budget Variable Expenditure (from Budget tab for comparison)
  - Difference (Over/Under budget with color coding)
- Pie chart showing category-wise breakdown
- "Unidentified" category appears in chart if total expenses < Budget Variable Expenditure
- Expense list grouped by category with amounts

**Edit Mode**
- **CSV/Bank Statement Import** (NEW)
  - File upload for CSV files with columns: Date, Category, Amount, Payment Method (optional)
  - Template download with example format
  - Bulk import with progress indicator
  - Error handling with detailed feedback
  - Auto-formats dates, validates amounts, handles missing fields
- Form to add/edit expenses:
  - Category (dropdown)
  - Amount (₹)
  - Date
  - **Payment Method** (NEW - dropdown: UPI, Credit Card, Debit Card, Cash, Wallet, Bank Transfer, Other)
  - Description (optional)
- Expense table showing all expenses with:
  - Date, Category, Amount, **Payment Method** (NEW), Actions
  - Edit and Delete buttons
- Full CRUD operations (Create, Read, Update, Delete)

### Data Structure

```
expenseTrackingData: {
  "2026-06": {
    "expenses": [
      {
        "id": "1234567890",
        "category": "Food & Dining",
        "amount": 1500,
        "date": "2026-06-15",
        "description": "Dinner at restaurant",
        "paymentMethod": "UPI",  // NEW FIELD
        "createdAt": "2026-06-15T18:30:00.000Z",
        "importedFromCSV": false  // NEW FIELD (optional, for tracking imports)
      }
    ]
  }
}
```

### Lifecycle Sync with Budget

When a Budget month is closed:
1. Expense tracking month automatically advances to next month
2. Previous month's expenses remain accessible via navigation
3. New month starts with blank expense list
4. Comparison with new month's Budget Variable Expenditure begins

### Integration Points

**Budget Tab Integration**
- Reads `monthlyBudgetData[monthKey].outflow.variableExpenditure` for comparison
- Shows difference between actual expenses vs budgeted variable expenditure
- "Unidentified" category represents the gap

**Dashboard Integration**
- Could be extended to show expense summaries on Dashboard
- Expense data available for future dashboard enhancements

### UI Components

- `expenseTrackingUI` - Main container
- Month navigation buttons (`prevExpenseMonth`, `nextExpenseMonth`)
- Toggle edit button (`toggleExpenseEdit`)
- Summary cards (Total Expenses, Budget Variable Expenditure, Difference)
- Pie chart (`expensePieChart`)
- Expense list (preview mode)
- Expense form and table (edit mode)

### State Variables

- `currentExpenseMonth` - Currently viewed month (Date object)
- `isExpenseEditMode` - Edit mode toggle (boolean)
- `expensePieChart` - Chart.js instance for pie chart

### New Features in v5.4.3

#### CSV/Bank Statement Import
- **File Format**: CSV with columns: Date, Category, Amount, Payment Method (optional)
- **Template Download**: One-click template with example data
- **Batch Import**: Process up to 1000 expenses per file
- **Error Handling**: Detailed error report showing rows skipped and reasons
- **Progress Indicator**: Real-time progress bar during import
- **Date Validation**: Auto-formats dates, skips invalid entries
- **Payment Method Handling**: Defaults to "UPI" if not specified in import
- **Data Integrity**: Each imported expense gets unique ID and timestamp

#### Payment Method Tracking
- **Field Location**: Payment method select field in expense form (adjacent to date field)
- **Options**: UPI, Credit Card, Debit Card, Cash, Wallet, Bank Transfer, Other
- **Table Display**: Payment method shown in expense table (new 4th column)
- **Backward Compatibility**: Expenses without payment method default to "UPI"
- **Edit Support**: Payment method can be changed when editing expenses
- **CSV Mapping**: Maps "Payment Method" column from CSV imports

---

## 5.6. Global Period Selector

### Location
- Header bar (top of application), centered between logo and user controls
- Visible on all tabs for cross-tab period filtering

### Features
- **Monthly**: Current calendar month (default)
- **Quarterly**: Current financial quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
- **Financial Year**: April-March (Indian fiscal year) - FY 2026-27, etc.
- **Custom Range**: User-selected start and end dates

### UI Components
- Period type dropdown (`globalPeriodType`)
- Period display text (`globalPeriodDisplay`) - shows selected period label
- Custom date inputs (`globalPeriodCustomStart`, `globalPeriodCustomEnd`) - hidden except in custom mode

### State Management
- `globalPeriodType` - Currently selected period type
- `globalPeriodStart` - Start date of selected period (Date object)
- `globalPeriodEnd` - End date of selected period (Date object)

### Display Examples
- Monthly: "August 2026"
- Quarterly: "Q3 2026"
- Financial Year: "FY 2026-2027"
- Custom: "15 Aug 2026 - 30 Sep 2026"

### Integration Points
- Can be used by dashboard, reports, and analytics features
- Data is available in app state for future filtering features
- Extensible for future period-based analytics

---

## 5.7. Dashboard Enhancements

### Savings Rate KPI Card
- **Location**: Dashboard grid, positioned after Accounts & Net Worth card
- **Calculation**: `(Usable Income - Monthly Commitments) / Usable Income × 100`
- **Display Format**: Percentage (0-100%)
- **Color Coding**:
  - Green (≥20%): Excellent savings rate
  - Orange (≥10%): Good savings rate
  - Red (<10%): Below target
- **Breakdown**: Shows usable income, monthly savings amount, and benchmark level
- **Educational Note**: Target is 20% or more of usable income

### Current Balance KPI Card
- **Location**: Dashboard grid, positioned after Savings Rate card
- **Calculation**: Sum of all account balances
- **Display Format**: Indian currency (₹)
- **Breakdown**: Shows Primary, Salary, Saving, and Investment account balances
- **Quick Link**: "Manage Accounts" link to Accounts tab
- **Data Source**: Updated from `appData.tabData.cards`

### Toggle Button Fix
- **Issue Fixed**: Monthly/Annual budget view toggle button had alignment issues
- **Changes**:
  - CSS: Added flex display, min-width (140px), and gap (6px)
  - HTML: Icon and text now wrapped in separate spans
  - Consistency: Icon always visible and properly aligned
  - Responsive: Works on mobile, tablet, and desktop

---

## 5.8. Dynamic Notification System (NEW in v5.4.3)

### Overview
A bell-icon notification center in the header that surfaces actionable alerts sourced from live app data, without duplicating any calculations (reuses existing budget/goal/insurance/net worth/tax/gifts logic).

### Triggers (7 total)
Registered via `registerNotificationTrigger(triggerFn)` in `app.js`, each returning zero or more alert objects `{ type, icon, message, action }`:

| # | Trigger | Source Data | Example Alert |
|---|---------|-------------|---------------|
| 1 | Budget | `monthlyBudgetData` | Over budget this month, transfer pending |
| 2 | Goals | `tabData.financialGoal` | Goal behind schedule |
| 3 | Insurance | `tabData.insurance` | Health/Term insurance below recommended level |
| 4 | Expenses (Recurring Outflows) | `tabData.outflow` | Upcoming/overdue recurring payment |
| 5 | Net Worth | `tabData.cards` + liabilities | Negative or declining net worth |
| 6 | Tax | `tabData.taxPlan` | No tax planning done, deadline approaching |
| 7 | Gifts | `tabData.gifts` | Upcoming occasion/gift reminder |

### Behavior
- `checkNotificationTriggers()` runs all registered triggers, merges results, and de-duplicates by `type-message` key
- **Badge Counter**: `updateNotificationBadge(count)` shows unread count on the bell icon; hidden when `unreadCount <= 0`
- **Popup Panel** (`showNotificationPopup(alerts)`): renders header ("Alerts & Notifications"), a **Clear All** button (`clearNotifications()`), and the alert list with icons/messages/quick actions
- **Click-Outside-Close**: a document-level click listener closes the popup when the click target is outside both the popup and the notification bell button
- **Daily Reset**: `getNotificationState()` compares stored `date` to `new Date().toDateString()`; on a new day it resets `{ viewedCount: 0, cleared: false, lastAlertsHash: null }`
- **Change Detection**: `shouldRegenerateAlerts()` hashes the current alert set (`JSON.stringify`) and skips regeneration if unchanged or if the user already cleared alerts for the day
- **Persistence**: State stored in `localStorage` under key `notificationState`

---

## 5.9. Enhanced Dashboard Insights & Financial Health Score (v5.4.3)

### Insights Engine (`generateInsights()`)
Evaluates account/budget/goal/insurance/net-worth/tax data and returns up to **11 possible recommendation types**, capped at **6 displayed** (`insights.slice(0, 6)`, increased from the previous limit of 4):

| Type | Examples |
|------|----------|
| `positive` | Budget surplus this month; savings rate ≥30%; emergency fund fully funded; net worth ≥2× liabilities; consistent monthly investing |
| `suggestion` | Emergency fund gap with monthly target; health/term insurance below 70% of ideal; no investments while income allows; goals behind schedule; no goals defined; low asset diversification (<3 types); no tax planning above ₹5L income |
| `warning` | Debt-to-income ratio >50%; savings rate <10%; negative net worth (liabilities > assets) |

Each insight has `{ type, icon, message }` and is rendered on the Dashboard beneath the summary cards.

### Financial Health Score (`calculateFinancialHealthScore()`)
Score out of 100, rebalanced in v5.4.3 to weight wealth-building more heavily:

| Component | Max Points | Scoring Basis |
|-----------|-----------|---------------|
| Emergency Fund | 15 | Gradual score from ratio of current fund to ideal (6 months expenses) |
| Debt Management | 20 | Monthly commitments ÷ usable income band: <30%→20, <40%→15, <50%→10, <70%→5, ≥70%→0 |
| Savings & Investment | 25 | Combined (Saving + Investment) ÷ usable income: ≥30%→25, ≥20%→20, ≥10%→12, >0%→5 |
| Insurance Coverage | 15 | Health coverage ratio × 9 + Term coverage ratio × 6 |
| Net Worth Position | 15 | 5 pts if positive; 10 pts if >3 months' commitments; 15 pts if >6 months'; **+2 diversification bonus** if ≥3 distinct asset `purpose` types |
| Goal Progress | 10 | Up to 8 pts from overall goal completion % + **2 pt bonus** for having any ongoing goals defined |

- Health levels: **Excellent** (≥85, green), **Good** (≥70, blue), **Fair** (≥50, amber), **Needs Improvement** (≥30, orange), **Needs Work** (<30, red)
- Displayed on Dashboard as a circular progress ring plus a per-component breakdown bar list, each with a hover tooltip explaining the scoring logic

---

## 6. Quick Update System

Located in Budget edit mode. Two fields (salary is auto-managed, not manually editable):

| Field | DOM ID | Action |
|-------|--------|--------|
| Expenditure Balance | `midMonthExpBalance` | Updates Primary account balance, auto-calculates variable expenditure |
| CC Spending | `midMonthCCOutstanding` | Stores in `monthlyBudgetData[monthKey].outflow.midMonthCCOutstanding` |

Variable expenditure shown after update: `totalFunded (initialBalance + prevCarryForward + transferDone) − newBalance`

---

## 7. Account System & Routing

### Account Lookup

```js
salaryAccount = cards.find(c => c.purpose === "Salary" && c.isPrimary !== "Yes")
expenditureAccount = cards.find(c => c.isPrimary === "Yes")
savingAccount = cards.find(c => c.purpose === "Saving" && c.isPrimary !== "Yes")
investmentAccount = cards.find(c => c.purpose === "Investment" && c.isPrimary !== "Yes")
```

### Auto-Debit Type Routing

```js
autoDebitByType = { Liability: 0, Insurance: 0, Savings: 0, Expenditure: 0, Investment: 0, Others: 0 }
// Liability/Insurance/Others → leaves system (paid externally)
// Savings → savingAccount.balance += amount
// Investment → investmentAccount.balance += amount
// Expenditure → expenditureAccount.balance += amount
```

---

## 8. User Registration & Profile

**Registration Fields:**
- Name (required)
- Date of Birth (optional)
- **Location** (new in v6.1): Dropdown selection of Indian cities, defaults to "Bengaluru, Karnataka, India"
- Email (required)
- Password (required, min 6 characters)

**Location Field Usage:**
- Used for calculating ideal health insurance coverage (metro vs non-metro cities)
- Stored in Firestore as `userLocation` field
- Limited to Indian cities in current implementation
- Backward compatible: defaults to "Bengaluru, Karnataka, India" for existing users

---

## 9. Data Management & Export

**Settings Panel Features:**

1. **Download Dashboard Summary** (new in v6.1)
   - Generates HTML snapshot of dashboard metrics
   - Includes: monthly income/expenses, account balances, preparedness metrics, active goals
   - Downloads as HTML file that can be printed to PDF
   - Quick sharing format for financial overview

2. **Export All Data**
   - Full JSON backup of all user data
   - Includes metadata: export date, app version
   - Filename format: `smartfin-backup-YYYY-MM-DD.json`

3. **Import Data**
   - Restores from previously exported JSON backup
   - Auto-backup created before import
   - Validates and normalizes imported data structure

4. **Reset All Data**
   - Requires double confirmation (typed "DELETE")
   - Auto-backup created before reset
   - Preserves user name and location

5. **Delete Account**
   - Permanently deletes Firestore data and Firebase Auth account
   - Requires recent authentication
   - Cannot be undone

---

## 10. Delete Account (Legacy)

```
Settings → Danger Zone → Delete Account
1. confirm() dialog
2. prompt("DELETE ACCOUNT")
3. Firestore: db.collection("users").doc(uid).delete()
4. Firebase Auth: user.delete()
5. Auth state listener redirects to login
```

Requires recent login — if `auth/requires-recent-login` error, user must re-authenticate first.

---

## 9. UI Component Patterns

### Section Config Map

```js
sectionConfig = {
  financialGoal: { prefix: "goal",      form: goalForm,      render: renderFinancialGoal },
  inflow:        { prefix: "inflow",    form: inflowForm,    render: renderInflow },
  outflow:       { prefix: "outflow",   form: outflowForm,   render: renderOutflow },
  cards:         { prefix: "card",      form: cardForm,      render: renderCards },
  netWorth:      { prefix: "netWorth",  form: netWorthForm,  render: renderNetWorth },
  taxPlan:       { prefix: "taxPlan",   form: taxPlanForm,   render: renderTaxPlan },
  gifts:         { prefix: "gifts",     form: giftsForm,     render: renderGifts },
  insurance:     { prefix: "insurance", form: insuranceForm, render: renderInsurance },
  standard:      { prefix: "field",     form: entryForm,     render: render },
}
```

### Form Field ID Convention

Input IDs follow: `{prefix}_{fieldId}` (e.g., `insurance_name`, `card_bankName`)

### Generic Functions Used Across Tabs

| Function | Purpose |
|----------|---------|
| `readSectionFormEntry(section)` | Reads form inputs into entry object |
| `upsertSectionEntry(section, entry)` | Creates or updates entry in tabData |
| `resetSectionForm(section)` | Clears form and resets editing state |
| `updateSectionSubmitButton(section)` | Sets button text (Add/Save) |
| `handleTableAction(section, event)` | Handles Edit/Delete clicks in table |
| `renderRowActions(id)` | Returns HTML for edit/delete buttons |
| `activeEntries()` | Returns entries for current tab |
| `buildSortFilterToolbar(section)` | Builds sort/filter dropdown HTML |
| `applyListSortFilter(section, entries)` | Applies sort/filter to entry list |

---

## 10. Sort/Filter System

### State

```js
listSortFilter = {
  financialGoal: { sortBy: "", sortDir: "asc", filters: {} },
  inflow:        { sortBy: "", sortDir: "asc", filters: {} },
  outflow:       { sortBy: "", sortDir: "asc", filters: {} },
  gifts:         { sortBy: "", sortDir: "asc", filters: {} },
  insurance:     { sortBy: "", sortDir: "asc", filters: {} },
}
```

### Preview Map (event delegation)

```js
previewMap = {
  goalPreview:         → financialGoal,
  inflowTabPreview:    → inflow,
  outflowTabPreview:   → outflow,
  giftsPreview:        → gifts,
  insuranceTabPreview: → insurance,
}
```

---

## 11. CSS Architecture

### Theme System

- CSS variables on `:root` and `[data-theme="light"]`
- Key variables: `--bg`, `--surf1`, `--surf2`, `--text`, `--dim`, `--muted`, `--border`, `--border2`, `--accent`, `--shadow`
- **Modern Dark Theme (v5.4.3)**: Indigo/slate color palette; `--primary` and `--investment` set to `#6366f1` (indigo), `--primary-hover: #4f46e5`, `--liability: #f43f5e` (rose). Semantic badges/tags (`.semantic-investment`, `.policy-badge`, `.premium-badge`/`.no-premium-badge`, tab pills) restyled with a modern accent set — indigo, rose, emerald, amber, violet, cyan — tuned separately for `[data-theme="light"]` to keep contrast/readability consistent between dark and light modes
- **Loading Spinner (v5.4.3)**: `.sf-spinner` — a rotating ring (`border-top-color: var(--primary)`, `sf-spin` keyframe) containing `.sf-spinner-logo`, the app logo, which counter-rotates (`sf-spin-reverse` keyframe) so it appears stationary while the ring spins around it. Both animations are disabled under `prefers-reduced-motion`

### Key CSS Classes

| Class | Used For |
|-------|---------|
| `.summary-hint` | Small descriptive text below summary labels |
| `.field-hint` | Hint text below form field labels |
| `.section-description` | Descriptive paragraph at top of tab sections |
| `.inv-sub-tabs` | Investment sub-section tab bar |
| `.inv-sub-tab.active` | Active investment sub-tab |
| `.portfolio-summary` | Portfolio summary grid container |
| `.portfolio-section` | Individual section in portfolio |
| `.portfolio-item` | Single investment item in portfolio list |
| `.insurance-card` | Insurance policy preview card |
| `.policy-badge` | Policy type badge |
| `.premium-badge` / `.no-premium-badge` | Premium status badges |
| `.quick-update-section` | Quick Update container in budget |
| `.quick-update-field` | Individual quick update input group |
| `.quick-update-result` | Untracked expenses result display |
| `.month-end-banner` | Carry forward suggestion banner |
| `.auto-calc-badge` | Badge for auto-calculated budget fields |
| `.category-preview-item` | Budget category line item in preview |
| `.budget-status.positive/.negative/.neutral` | Budget status banner variants |
| `.danger-zone` | Destructive action container in settings |
| `.danger-btn` | Red destructive action button |
| `.ondemand-desc-input` | Dashed-border text input for on-demand descriptions |
| `.desc-tooltip-wrapper` | Wrapper for description tooltip (preview mode) |
| `.desc-tooltip-icon` | Blue "i" circle icon that triggers tooltip |
| `.desc-tooltip-text` | Tooltip popup text (hidden until hover) |
| `.app-version` | Version display in footer |

---

## 12. Rendering Pipeline

### Dashboard quick glance

The Dashboard is intentionally a compact cross-tab snapshot rather than a second
copy of each workspace. It shows enhanced cards with actionable insights:

**Layout**: 2x2 grid (2 rows, 2 columns) for the 4 main cards on desktop, responsive to 2 columns on tablet and 1 column on mobile.

- **Financial Year Overview**: Shows Income, Expenditure, Saved, Invested, Liabilities, and **Others** for the current financial year (April-March). The Others category includes all outflow items categorized as "Others" type (fixedOthers).
- **This month**: usable income, recurring monthly commitments, amount available after commitments, **Variable Expenses**, **On-Demand Expense**, credit card usage, expenditure account balance, and **budget surplus/deficit status**. Borrowing is excluded from usable income. Includes navigation links to Budget and Fixed Outflow tabs. Shows account configuration status (Primary, Salary, Saving, Investment accounts).
- **Accounts & Net Worth** (combined card): current assets, liabilities, net worth, **total balance (all accounts)**, **total credit limit**, primary spending account, and savings account balances. Totals use the exact same manual and auto-generated entries as the Net Worth tab. Includes navigation link to Net Worth tab.
- **Spending Breakdown**: Shows all expense categories (up to 10 categories, excluding "Others") from expense tracking. If more than 5 categories exist, displays them in two columns separated by a visual separator for better organization.
- **Goals & Investment Planning** (combined card): portfolio value, monthly investment contribution, tax items logged, planned-gifts total, and **All active goals with individual progress bars** showing percentage funded and remaining amount. Includes navigation links to Goals and Gifts tabs.
- **Preparedness & Budget** (merged card): 
  - **Preparedness Section**: Progress bars for Emergency Fund, Health Insurance, and Term Insurance with ideal amounts calculated based on:
    - Emergency Fund: 6 months of expenses
    - Health Insurance: Based on age, location (metro/non-metro), and family size. Custom cities are assumed non-metro.
    - Term Insurance: Based on age, monthly expenses, and current savings (formula: Monthly Expenses × 12 × [65 - Age] - Savings)
  - **Budget Section**: Budgeted amount, spent amount, balance, and adherence percentage for variable expenses and credit card spending. Shows Variable Expenses (actual spending + CC, excluding on-demand), On-Demand Items (saving, investment, expenditure, liability), and Total Allocated (sum of both).
- **6-Month Trend**: Line chart showing **Income, Saving, Expenditure, Investment, and Liability** for the last 6 months with modern styling (smooth curves, consistent colors matching category color codes). Chart automatically destroys previous instance before rendering to prevent canvas reuse errors. Numbers hidden on mobile (< 768px) for better readability.

**Ideal Insurance Calculation Formulas (v6.1):**
- Health Insurance: `(Base City Cost × Age Risk Multiplier) × Family Size Variant`
  - Base City Cost: ₹10L for metro cities, ₹5L for non-metros
  - Age Risk Multiplier: 1.0 (<35), 1.5 (35-50), 2.0 (>50)
  - Family Size Variant: 1.0 (individual), 1.5 (couple), 2.0 (family 3+)
- Term Insurance: `(Monthly Expenses × 12 × [65 - Current Age]) - Current Savings`

```
render()
  ├─ getTabs() → merged DEFAULT_TABS + customTabs
  ├─ renderTabs() → tab bar HTML
  ├─ panelMap[activeTabId]
  │    ├─ monthlyBudget → renderMonthlyBudget()
  │    │    ├─ (annual view) → calculateAnnualSummary()
  │    │    ├─ applyMonthlyAutoValues()
  │    │    ├─ month-end banner check
  │    │    ├─ (edit) → renderCategoryFields() × 3
  │    │    └─ (preview) → renderCategoryPreview() × 3
  │    │         ├─ calculateAndDisplaySummary()
  │    │         └─ renderPieChart()
  │    ├─ inflow → renderInflow()
  │    │    ├─ (edit) → renderInflowDynamicFields() + renderInflowTable()
  │    │    └─ (preview) → filter by activeInvestmentView
  │    │         ├─ renderInflowPreviewCards() + calculateInflowSummary() + renderInflowChart()
  │    │         └─ (portfolio) → renderPortfolioSummary()
  │    ├─ insurance → renderInsurance()
  │    │    ├─ (edit) → renderInsuranceDynamicFields() + renderInsuranceTable()
  │    │    └─ (preview) → renderInsurancePreviewCards() + calculateInsuranceSummary()
  │    ├─ cards → renderCards()
  │    ├─ outflow → renderOutflow()
  │    ├─ financialGoal → renderFinancialGoal()
  │    ├─ netWorth → renderNetWorth()
  │    ├─ taxPlan → renderTaxPlan()
  │    ├─ gifts → renderGifts()
  │    └─ emergencyFund → renderEmergencyFund()
  └─ (custom/standard) → renderDynamicFields() + renderTableHead() + renderRows()
```

---

## 13. Event Binding Summary

| Event Source | Handler | Tab |
|-------------|---------|-----|
| `toggleBudgetEdit` click | Toggle `isBudgetEditMode` | Budget |
| `prevMonth/nextMonth` click | Navigate month | Budget |
| `toggleBudgetView` click | Toggle annual/monthly view | Budget |
| `btnCarryForward` click | Close current month budget | Budget |
| `btnUpdateExpBalance` click | Update expenditure balance + calc variable expenditure | Budget Quick Update |
| `btnUpdateCCOutstanding` click | Store midMonthCCOutstanding | Budget Quick Update |
| `inflowFields/outflowFields/investingFields` input | `handleCategoryFieldChange` | Budget Edit |
| `toggle{Tab}Edit` click | Toggle edit mode | All tabs |
| `{tab}Form` submit | `add{Tab}Entry` | All tabs |
| `{tab}TableBody` click | `handleTableAction(tab)` | All tabs |
| `investmentSubTabs` click | Switch investment view | Investments |
| `deleteAccountBtn` click | `deleteAccount()` | Settings |
| `resetAllDataButton` click | `resetAllData()` | Settings |

---

## 14. Global Window Variables

| Variable | Purpose |
|----------|---------|
| `window._budgetExpAccount` | Reference to expenditure account |
| `window._budgetSalaryAccount` | Reference to salary account |
| `window._budgetTransferAmt` | Calculated transfer amount |
| `window._budgetAutoDebitByType` | Auto-debit amounts by type (includes Others) |
| `window._budgetTransferDone` | Transfer done amount for current month |
| `window._budgetTrackedExpenses` | Variable expenses (variableExp + CC) |
| `window._mismatchCorrectTransfer` | Correct transfer amount when mismatch detected |
| `window._mismatchFixedOutflow` | Current fixed outflow when mismatch detected |

---

## 15. Known Relationships & Dependencies

1. **Accounts → Budget**: Salary and Expenditure balances feed into budget calculations
2. **Outflow → Budget**: Monthly outflows auto-populate `loanEMI` and auto-debit routing
3. **Outflow → Net Worth**: Liabilities auto-imported as net worth liabilities
4. **Accounts → Net Worth**: Account balances auto-imported as net worth assets
5. **Budget → Investments (Portfolio)**: On-demand investment amounts feed portfolio summary
6. **Outflow (Insurance type) → Insurance**: Premium payments in Outflow should match policy entries in Insurance
7. **Outflow + Investments → Tax Plan**: EPF, PPF, NPS, insurance premiums auto-calculated as deductions
8. **Budget → Emergency Fund**: Fixed liabilities + fixed expenditure + avg variable expenses from budget history

---

## 16. Version System

```js
APP_VERSION = { major: 1, minor: 0, build: 73 }
getAppVersion() → "v5.4.3"
```

- Displayed in footer: "SmartFin v5.4.3" (via `#appVersionDisplay`)
- Hover tooltip shows: "Major: 1 | Minor: 0 | Build: 73"
- Also used in data export payload (`version` field)
- **Versioning scheme**: `v{MAJOR}.{MINOR}.{BUILD}`
  - `BUILD` → bump on every deployment
  - `MINOR` → bump for feature additions
  - `MAJOR` → bump for breaking changes / major overhauls

---

## 17. Development Process & Testing

### Change Implementation Process

When implementing changes to SmartFin, follow this systematic approach:

1. **Understand Requirements**
   - Read APP_SPEC.md for context and existing patterns
   - Review relevant code sections before making changes
   - Plan the implementation step by step

2. **Implement Changes**
   - Make code changes carefully, one at a time
   - Follow existing code patterns and conventions
   - Test each change before moving to the next

3. **Add Tests**
   - For new logic/algorithms, add test cases in `tests/` directory
   - Test edge cases and error conditions
   - Ensure tests are comprehensive and maintainable

4. **Update Documentation**
   - Update APP_VERSION in `app.js`
   - Update version numbers in README.md, USER_MANUAL.md, DEVELOPMENT.md, architecture.md
   - Add changelog entries to CHANGE_LOG.md
   - Update relevant sections in APP_SPEC.md
   - Update USER_MANUAL.md for user-facing changes

5. **Verify Changes**
   - Test on different screen sizes (mobile, tablet, desktop)
   - Test user flows end-to-end
   - Verify no existing features are broken
   - Check for performance issues

### Testing Guidelines

- **UI Changes**: Test on mobile (< 768px), tablet (768px-1024px), and desktop (> 1024px)
- **Logic Changes**: Add unit tests in `tests/` directory
- **Data Changes**: Test with various data scenarios (empty, partial, full)
- **Integration Changes**: Test complete user flows

### Test File Structure

```
tests/
├── tax-calculation.test.js    # Tax calculation logic tests
├── sampledata.json             # NEW in v5.4.3 - representative sample dataset for
│                                #   manually/automatically exercising dashboard,
│                                #   budget, insights, and health-score logic
├── [future-test-files].test.js
```

Test files should be:
- Self-contained with mock functions
- Clear and well-documented
- Cover both positive and negative cases
- Easy to run in browser console or test runner

---

## 18. Logging System (AppLogger)

**Class**: `AppLogger` (lines 10–224 in app.js)
- Levels: `info`, `warning`, `error`
- Stores logs in-memory with device ID, user ID, timestamps
- UI panel: toggled via settings, filterable by level, searchable

**Key logged events:**
- Auth: sign-in, sign-out, auth failure, logout initiation
- Data: Firestore listener error, import success/failure, save success/failure, reset all data
- Budget: Execute Transfer (success/cancel), month close, tab switch
- Account: deletion initiated/success/failure, export with no data
- Entries: active entries get/set errors

---

## 18. Reconciliation / Mismatch Detection

When fixed outflows change mid-month (after transfer is done), the app detects a mismatch:

```
Stored snapshot: _transferOutflowSnapshot (recorded at transfer time)
Current outflows: fixedMonthlyOutflow (recalculated from current outflow entries)

If _transferOutflowSnapshot !== fixedMonthlyOutflow:
  → Show "Transfer Mismatch Detected" warning banner
  → Show "Recalculate Transfer" button (btnRecalcTransfer)
  → correctTransfer = primaryIncome - currentFixedOutflow
  → window._mismatchCorrectTransfer = correctTransfer
  → window._mismatchFixedOutflow = fixedMonthlyOutflow
```

**Recalculate Transfer** updates budget metadata only (NOT account balances):
- `monthData._transferDone = correctTransfer`
- `monthData._initialBalance = preExistingBalance + correctTransfer`

---

## 19. Modification Checklist

When modifying the app, check these areas:

- [ ] **Adding a new tab**: Update `DEFAULT_TABS`, `TAB_FIELDS`, add DOM refs, state variable, `sectionConfig`, `editingEntryIds`, `listSortFilter`, `panelMap` in `render()`, `allPanels`, event bindings, add HTML panel, add CSS styles
- [ ] **Adding a budget category field**: Update `MONTHLY_BUDGET_CATEGORIES`, update `calculateAndDisplaySummary` if it affects tracked expenses or spendable calculation
- [ ] **Changing account types**: Update `addCardEntry` validation, account lookup in `calculateAndDisplaySummary`, auto-debit routing
- [ ] **Changing outflow types**: Update `autoDebitByType` in `calculateAndDisplaySummary`, auto-debit routing labels
- [ ] **Adding auto-linked budget fields**: Update `applyMonthlyAutoValues`, ensure field is marked read-only in `renderCategoryFields`
- [ ] **Modifying transfer logic**: Update `calculateAndDisplaySummary`, Execute Transfer handler, Quick Update handlers
- [ ] **Adding to net worth auto-entries**: Update `getAutoNetWorthEntries`
- [ ] **Adding tax auto-deductions**: Update `getAutoTaxDeductions`

---

*Last updated: v5.4.3 — Dynamic Notification System (7 triggers, badge counter, Clear All, click-outside-close, daily reset), Enhanced Insights (11 recommendation types, limit 4→6), rebalanced Financial Health Score weights, Modern Dark Theme (indigo/slate palette), redesigned Loading Spinner, refreshed Tags/Badges, horizontal Tax Deductions chart, and tests/sampledata.json.*

*Previous update: 2026-08-05 (v5.4.3 — Tax data persistence fix: Added taxData to default appData structure and Firestore loading, ensures persistence after refresh)*
