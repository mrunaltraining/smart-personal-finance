# Changelog

All notable changes to SmartFin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.5.0] - 2026-08-22 - Email Infrastructure & Professional Pages

### Added
- **EmailJS Integration**: Complete email service abstraction using EmailJS for transactional emails
  - EmailService module with rate limiting, retry logic, and error handling
  - Dashboard Report email functionality (send to user's registered email)
  - Bug Report email with auto-incremented bug IDs (DEF-XXX format)
  - Automatic log collection and sanitization for bug reports
  - Support for up to 2 screenshot attachments (max 5MB each)
  - Configuration: service ID (smart_personal_finance), public key (testkey), template (smartfin_contact_us)
  - Rate limiting: 1 minute between dashboard reports, 2 minutes between bug reports
  - Security: No sensitive credentials exposed, admin recipient fixed (mrunaltemp01@gmail.com)
- **Professional Legal Pages**: Added comprehensive legal documentation
  - Privacy Policy covering data collection, usage, storage, and user rights
  - Terms & Conditions with complete terms of service and user responsibilities
  - Disclaimer with important warnings about financial advice and data accuracy
  - About Us with company information, mission, and technology stack
  - Contact Us with support information and bug reporting guidance
  - Modal-based display with modern styling matching existing UI
  - Accessible from footer and auth screen
- **HTML Entity Handling**: Comprehensive XSS prevention system
  - HTML utilities module with escape/unescape functions
  - Automatic sanitization of user input before storage
  - Proper data preparation for safe storage and display
  - Integration with Firebase data handling
- **Duplicate Detection System**: Smart duplicate detection for expense imports
  - Transaction fingerprinting based on date, category, amount, and payment method
  - Configurable tolerance for amount matching (1% or ₹1)
  - Pre-import duplicate checking to prevent duplicate entries
  - Clear duplicate reporting in import results
- **Contact & Support Updates**: Updated contact information and help section
  - Support email: mrunaltemp01@gmail.com
  - Enhanced bug reporting guidance in help section
  - Integration with email service for bug reports

### Changed
- **Mobile Optimizations**: Improved financial year overview display for mobile devices
  - More compact layout with better spacing
  - Optimized font sizes and responsive breakpoints
- **Light Mode Improvements**: Enhanced light theme with better contrast and visual hierarchy
  - Updated color palette for improved readability
  - Better card backgrounds and border definitions
- **Alert System Enhancement**: Notifications now re-evaluate on every login
  - Forced trigger check on authentication state change
  - Prevents stale alert information
- **Bug Report UI**: Redesigned to match existing modern design
  - Professional styling with proper form validation
  - Enhanced error handling and user feedback

### Fixed
- **Syntax Errors**: Fixed JavaScript syntax errors in legal content (removed apostrophes from template strings)
- **HTML Entity Issues**: Fixed special character conversion in input fields
  - Proper handling of quotes, apostrophes, and special characters
  - XSS prevention for all user inputs
- **Duplicate Declarations**: Fixed duplicate function declarations causing JavaScript errors

### Technical
- **Enhanced Logging**: Added comprehensive logging to all email-related functions
  - Initialization success/failure logging
  - Rate limiting warnings
  - Email send attempts and results
  - Bug report submission tracking
  - Attachment validation logging
- **Error Handling**: Improved error handling throughout email systems
  - User-friendly error messages
  - Automatic retry with exponential backoff
  - Graceful degradation on service failures

## [5.3.0] - 2026-06-20 - Dynamic Notifications & Enhanced Insights

## [v5.3.2] - 2026-08-17 - Build Update

### Changed
- Bumped build number to 2


## [v5.3.1] - 2026-08-17 - Build Update

### Changed
- Bumped build number to 1


### Added
- **Dynamic Notification System**: Bell icon with live badge counter in header
  - 7 smart triggers: Budget, Goals, Insurance, Expenses, Net Worth, Tax, Gifts
  - Popup panel showing all active alerts with icons, messages, and quick navigation
  - "Clear All" button to dismiss all alerts for the day
  - Click-outside-to-close behavior for popup
  - Daily reset: notification state resets automatically at start of new day
  - Badge counter shows unread alert count, auto-hides when count is zero
  - Change detection to avoid regenerating same alerts
- **Enhanced Insights Engine**: 11 recommendation types across 3 categories
  - Positive (5): Budget surplus, savings rate ≥30%, emergency fund funded, net worth strong, consistent investing
  - Suggestion (7): Emergency fund gap, low health/term insurance, no investments, goals behind schedule, no goals set, low asset diversification, no tax planning
  - Warning (3): High debt ratio, low savings rate, negative net worth
  - Display limit increased from 4 to 6 most relevant insights
- **Financial Health Score Rebalancing**: New weight distribution out of 100 points
  - Emergency Fund: 15 pts (gradual scoring based on months-of-expenses ratio)
  - Debt Management: 20 pts (debt-to-income ratio bands: <30%/20pts, <40%/15pts, <50%/10pts, <70%/5pts)
  - Savings & Investment: 25 pts (combined rate vs usable income, highest weight)
  - Insurance Coverage: 15 pts (Health 9pts + Term 6pts, weighted 60/40)
  - Net Worth Position: 15 pts (+2 diversification bonus for ≥3 distinct asset types)
  - Goal Progress: 10 pts (8pts for progress + 2pt bonus for having goals defined)
- **Modern Dark Theme**: Indigo/slate color palette
  - Primary color: #6366f1 (indigo) throughout the app
  - Updated all CSS variables for consistency
  - Light theme support with proper contrast
- **Loading Spinner Redesign**: Logo inside rotating ring
  - App logo displays inside the rotating spinner ring
  - Counter-rotation animation keeps logo upright while ring spins
  - Respects prefers-reduced-motion setting
- **Tags/Badges Dark/Light Mode Consistency**: Modern color refresh
  - Updated semantic badges with modern colors (indigo, rose, emerald, amber, violet, cyan)
  - Separate light theme overrides for readability
  - Consistent across all tabs (Tax Plan, Budget, Goals, Insurance, etc.)
- **Tax Deductions Chart**: Horizontal bar chart
  - Changed from vertical to horizontal bar chart for better label readability
  - Grouped by tax section (80C, 80D, 24(b), etc.)
- **Sample Test Data**: Created tests/sampledata.json
  - Comprehensive test data with 6 accounts, 5 investments, 10 outflows
  - 5 financial goals, 3 insurance policies, 2 liabilities
  - 5 months of budget data with realistic numbers
  - Expense tracking data included

### Changed
- **Unit Tests**: Added 30+ new tests for v5.3.0 features
  - Health score calculation tests (6 tests)
  - Notification trigger tests (4 tests)
  - Goal trigger tests (2 tests)
  - Insurance trigger tests (3 tests)
  - Net worth trigger tests (4 tests)
  - Insights generation tests (3 tests)
  - Total: 95+ tests (all passing)
- **Documentation**: Updated all documentation files
  - APP_SPEC.md: Added notification system, insights, health score sections
  - ARCHITECTURE.md: Added notification and health score pipeline diagrams
  - API_DOCUMENTATION.md: Added health score and insights API docs
  - USER_MANUAL.md: Added v5.3.0 changelog
  - README.md: Added v5.3.0 features
  - TO-DO.txt: Updated to reflect v5.3.0 completion

### Fixed
- **Version Constant**: Updated APP_VERSION from v4.0.7 to v5.3.0 in app.js
- **Version References**: Updated version numbers in all documentation files

## [4.0.5] - 2026-08-15 - Error Handling & Network Status Improvements

### Added
- **Network Status Indicator**: Visual indicator in user bar showing Firebase save status
  - Icon-based status display (checkmark, refresh, warning, offline icons)
  - Compact design: 14px icons, shows text on hover
  - Located in user bar next to user email
  - Status values: online (green checkmark), retrying (yellow blinking refresh), error (red warning), offline (red WiFi slash)
  - Automatically hides after 2 seconds on successful save
  - Browser online/offline detection with automatic status updates
- **Enhanced Error Handling**: Improved Firebase error handling with specific user notifications
  - Quota exceeded error: Specific message about quota reset timing and upgrade options
  - Network errors: Automatic retry with visual "Retrying save..." indicator
  - Permission errors: Clear message about re-login requirements
  - Connection loss: Network status indicator shows error state
  - All errors now have user-friendly alert messages

### Changed
- **Save Retry Logic**: Network errors now automatically retry after 2 seconds with visual feedback
- **Error Messages**: More specific error messages based on error type (quota, network, permission)
- **Status Indicator**: Changed from simple colored dots to SVG icons for better visual clarity
- **Animation**: Retrying status now uses blinking animation instead of spinning

### Fixed
- **Firebase Quota Error**: Now properly identified and communicated to user instead of generic error
- **Network Error Visibility**: User now notified when automatic retries are happening
- **Connection Loss**: Firestore listener errors now show network status indicator

## [4.0.2] - 2026-08-15 - Dashboard Enhancements & Import Features

### Added

#### Dashboard Features
- **6-Month Trend Chart Enhancement**: Updated to show all 5 budget categories
  - Now displays: Income, Saving, Expenditure, Investment, and Liability
  - Consistent color coding matching category colors throughout the app
  - Modern line chart styling with smooth curves (tension: 0.35)
  - Automatic chart destruction before re-render to prevent canvas reuse errors
- **Financial Year Overview Enhancement**: Added Others category
  - Now shows: Income, Expenditure, Saved, Invested, Liabilities, and Others
  - Others category includes all fixedOthers from outflow (auto-calculated)
  - Properly calculated and displayed in Financial Year totals
- **This Month Card Enhancement**: Added Variable Expenses and On-Demand Expense display
  - Variable Expenses: Shows actual spending + credit card usage
  - On-Demand Expense: Shows total on-demand items (saving, investment, expenditure, liability)
  - Better visibility into monthly budget allocation
- **Accounts & Net Worth Card Enhancement**: Added total balance and credit limit
  - Total balance (all accounts): Sum of all account balances
  - Total credit limit: Sum of all credit card limits across accounts
  - Provides quick overview of available funds and credit capacity
- **Spending Breakdown Enhancement**: Now shows all 10 expense categories
  - Displays all categories except "Others" (up to 10 categories)
  - Automatic separator when more than 5 categories exist
  - Categories split evenly on both sides of separator for better organization
  - Maintains current view for 5 or fewer categories
- **Savings Rate KPI Card**: New dashboard card displaying savings rate percentage, benchmark status, and formula
  - Shows percentage of usable income saved/invested
  - Color-coded: Green (≥20%), Orange (≥10%), Red (<10%)
  - Includes target benchmarks and calculation breakdown
- **Current Balance KPI Card**: New dashboard card aggregating cash across all accounts
  - Displays total balance from all accounts
  - Shows breakdown by account type (Primary, Salary, Saving, Investment)
  - Quick link to Accounts tab for management
- **Toggle Button Fix**: Fixed Monthly/Annual budget view toggle button
  - Icon and text now always display properly with consistent width
  - CSS improvements: flex layout, min-width, proper gap spacing
  - Improved visual alignment and consistency

#### Expense Tracking Enhancements
- **Payment Method Field**: New optional field for expense entries
  - Dropdown with 7 payment options: UPI, Credit Card, Debit Card, Cash, Wallet, Bank Transfer, Other
  - Defaults to "UPI" for new expenses
  - Displayed in expense table for quick reference
  - Stored with expense records for payment method tracking
  - Backward compatible: defaults to "UPI" for old expenses without this field
- **CSV/Bank Statement Import**: New bulk expense import feature
  - Accepts CSV files with columns: Date, Category, Amount, Payment Method (optional)
  - Template download with example format
  - Progress indicator showing import status
  - Error handling with detailed feedback (rows skipped, reasons)
  - Supports up to 1000 expenses per import
  - Auto-formats dates, validates amounts, handles missing fields gracefully
  - Maintains data consistency (expense ID generation, timestamp tracking)

#### Period Selector
- **Global Period Selector**: New header control for cross-tab period filtering
  - Monthly view (default): Current calendar month
  - Quarterly view: Current financial quarter
  - Financial Year view: April - March (Indian fiscal year)
  - Custom Range view: User-selected date range
  - Dynamic display updates based on selection
  - Integrated with app-wide state management

### Fixed

#### Bug Fixes
- **Chart.js Canvas Reuse Error**: Fixed "Canvas is already in use" error
  - Automatically destroys existing chart instance before creating new one
  - Uses Chart.getChart() to check for existing instance
  - Prevents memory leaks and canvas conflicts
  - Applies to dashboard 6-month trend chart
- **Expense Page Mobile Layout**: Fixed edit/done button alignment on mobile
  - Edit/done button now properly right-aligned like other pages
  - Added flex-wrap to expense-header for proper wrapping
  - Added order property for mobile layout (button order: 2, margin-left: auto)
  - Consistent with budget and goal page layouts
- **Net Worth Projection Chart Styling**: Updated to match modern dashboard style
  - Changed from filled area chart to line chart with consistent styling
  - Updated tension to 0.35 for smooth curves
  - Increased border width to 3px for better visibility
  - Updated point radius and hover states
  - Added modern tooltip formatting
  - Y-axis now shows values in ₹K format
  - Legend position changed to bottom for consistency
- **Annual Budget Calculation**: Verified correct aggregation of monthly data
  - Confirmed fiscal year (April-March) calculation logic
  - Ensured on-demand items summed correctly
  - Applied auto-values for linked entries (EMI, premiums)
  - Proper handling of future months (not included)
  - Budget status determination using saved month closure data

### Changed

#### UI/UX Improvements
- **Expense Form Layout**: Reorganized for better mobile experience
  - Payment method field added in new row with date
  - Import section placed above manual entry form
  - Better form grouping and visual hierarchy
- **Expense Table**: Updated with payment method column
  - Added 5th column after amount for payment method display
  - Maintained responsive behavior on mobile
  - Consistent styling with other table cells

### Performance
- CSV import uses efficient batch processing
- No blocking operations during file read
- Progress updates in real-time

### Testing
- All existing features remain fully functional (backward compatible)
- Payment method field handles missing data gracefully
- CSV import error handling tested with various input formats
- KPI cards recalculate on data refresh
- Toggle button visual state consistent across browser zoom levels

### Documentation
- Updated APP_SPEC.md with new feature specifications
- Updated USER_MANUAL.md with payment method and CSV import instructions
- Added feature descriptions for KPI cards and period selector
- Maintained backward compatibility notes

---

## [4.0.1] - 2026-08-13 - Major Architecture Redesign

### Added

#### Core Business Logic Modules
- **FrequencyConverter**: Payment frequency conversions (Monthly, Quarterly, Semi-Annual, Annual, One-Time)
- **DateUtils**: Date manipulation utilities (month keys, age calculation, financial year, date formatting)
- **CurrencyFormatter**: Indian currency formatting (standard, compact, percentage, with sign)
- **BudgetCalculator**: Budget calculations (fixed outflow, transfer amount, variable expenditure, budget summary, validation)
- **AccountManager**: Account management (find by purpose, calculate totals, validate constraints, onboarding status)
- **AccountValidator**: Account validation (validate data, sanitize inputs, check completeness)
- **InvestmentCalculator**: Investment calculations (SIP returns, portfolio summary, growth projections, required investment)
- **GoalCalculator**: Goal tracking (progress calculation, status determination, on-track checking, required savings)
- **InsuranceCalculator**: Insurance analysis (ideal coverage, annual premium, gap analysis, policy filtering)
- **NetWorthCalculator**: Net worth tracking (current calculation, future projection, inflation adjustment, auto-entry generation)
- **TaxCalculator**: Tax planning (section-wise deductions, auto deductions, tax savings, section limits)
- **ExpenseAnalyzer**: Expense tracking (category analysis, budget comparison, statistics, chart data generation)
- **Core Index**: Main export file for all modules

#### Testing & Documentation
- **test-utils.html**: Browser-based test runner with 21 integration tests
- **FrequencyConverter.test.js**: 13 unit tests for frequency conversion
- **BudgetCalculator.test.js**: 30 unit tests for budget calculations
- **INTEGRATION_GUIDE.md**: Complete guide on using the new modules (452 lines)
- **PHASE1_COMPLETE.md**: Detailed summary of architecture redesign (451 lines)
- **IMPLEMENTATION_PROGRESS.md**: Progress tracking and metrics (updated)
- **README_IMPLEMENTATION.md**: Quick start guide for developers (396 lines)

### Changed

#### Architecture
- **Modular Design**: Business logic separated into 13 platform-independent modules (2,780 lines)
- **Pure Functions**: All business logic functions are pure (no side effects, predictable outputs)
- **Platform Independence**: No DOM or framework dependencies, works on web and mobile
- **Enhanced Maintainability**: Clear separation of concerns, single responsibility principle
- **Improved Testability**: 100% testable with 64 comprehensive tests (100% pass rate)

#### Code Quality
- **constants.js**: Updated to use new FrequencyConverter module (backward compatible)
- **app.js**: Updated version to v4.0.1 with architecture redesign notes
- **Documentation**: All documentation updated to reflect new architecture

### Performance
- **Test Execution**: Fast test execution with browser-based test runner
- **Code Organization**: Improved code organization reduces cognitive load
- **Reusability**: Modules can be reused across web and mobile platforms

### Compatibility
- **Backward Compatibility**: Zero breaking changes, all existing features preserved
- **Browser Support**: Maintained support for Chrome, Firefox, Safari, Edge
- **Mobile Support**: Maintained support for iOS Safari, Android Chrome
- **Firebase Integration**: No changes to Firebase integration

### Documentation
- **APP_SPEC.md**: Updated to v4.0.1 with new architecture section
- **README.md**: Updated to v4.0.1 with new features and architecture details
- **CHANGE_LOG.md**: Added v4.0.1 entry with complete changelog
- **All Documentation**: Updated version numbers and architecture information

### Technical Details
- **Total Modules**: 13 files
- **Lines of Code**: 2,780 lines
- **Functions**: 119+ pure functions
- **Tests**: 64 tests (100% passing)
- **Documentation**: 1,100+ lines
- **Total Deliverables**: 4,280 lines

## [3.0.5] - 2026-01-XX - Budget Calculation & UI Improvements

### Changed

#### Budget Calculation
- On-demand items (saving, investment, expenditure, liability) now reduce expenditure account balance when budget is saved
- Budget surplus calculation now includes on-demand items in the untracked amount
- Variable Expenses display excludes on-demand items to show actual spending (actual = variableExp - totalOndemand + CC)
- On-Demand Items displayed separately showing total on-demand saving, investment, expenditure, and liability
- Total Allocated calculated as sum of Variable Expenses and On-Demand Items for accurate budget tracking
- Fixed double-counting issue where on-demand items were counted in both variable expenses and total allocated

#### Dashboard Enhancements
- Added Saving and Investment account status display (Set/Missing indicators)
- Optimized dashboard notes to show concise format with actual values (e.g., "8 policies · ₹40,048 var · ₹32,895 CC · ₹24,534 on-demand")
- Added navigation links to Goals and Gifts tabs from dashboard notes
- Fixed dashboard calculations to use corrected stored values with fallback on-the-fly calculation for consistency
- Ensured dashboard always shows correct values even if Budget page wasn't visited

#### Icon System
- Created compact versions of insight icons (starSmall, checkSmall, lightbulbSmall, hospitalSmall, trendingUpSmall, targetSmall, alertSmall)
- Created compact versions of alert icons (shieldCheckSmall, creditCardSmall, calendarSmall, bellSmall)
- Updated all insights and alerts to use compact icon versions
- Reduced icon container size from 40px to 28px for better fit in UI cards
- Reduced icon font size from 1.1rem to 0.75rem for improved visual balance

#### UI Layout & Responsiveness
- Summary grid changed from auto-fit to fixed 4 columns on desktop, 2 columns on mobile for consistent layout
- Removed fixed min-height (180px) from summary items for even distribution across rows
- Fixed all media queries to ensure summary grid always shows 4 or 2 items per row (never 6 or 3)
- Added responsive sizing for app tagline to scale proportionally with screen size (0.3em to 0.38em based on breakpoints)
- Reduced insight icon font size on mobile from 0.9rem to 0.7rem for better fit

### Fixed

- Fixed duplicate variable declaration error for creditCardOutstanding in dashboard.js
- Fixed budget status calculation to use corrected totalAllocated instead of old untracked value
- Fixed closed month budget status to use corrected calculation logic
- Fixed Quick Update tracking to use corrected totalAllocated value

## [3.0.0] - 2026-08-09 - Major UI System Refresh

### Changed

- Rebuilt section context bars so the app no longer repeats page titles while preserving accessible headings.
- Unified navigation styling with compact semantic tab icons and consistent responsive action controls.
- Converted Accounts, Gifts, and Expense Tracking summaries into divider-based responsive summary strips.
- Refined lists, tables, edit surfaces, chart containers, and annual summary cards to use the same visual system.
- Added matching icons for every Expense Tracking category in the grouped list and edit table.

### Fixed

- Expense Tracking now updates its own total summary instead of the duplicate Budget `totalExpenses` element.

## [2.4.0] - 2026-08-05 - Major Feature Release

### Added

#### **Expense Tracking Tab**
- Complete expense tracking system with month-by-month categorization
- 11 predefined expense categories (Food & Dining, Transportation, Shopping, Entertainment, Healthcare, Education, Personal Care, Home & Utilities, Travel, Gifts & Donations, Others)
- Calendar-style month navigation (Previous/Next buttons)
- Preview/Edit toggle pattern consistent with other tabs
- Summary cards showing Total Expenses, Budget Variable Expenditure, and Difference
- Visual pie chart showing category-wise spending breakdown
- "Unidentified" category for budget vs actual differences
- Automatic comparison with Budget tab's Variable Expenditure
- Full CRUD operations (Create, Read, Update, Delete) for expenses
- Expense list grouped by category with amounts in preview mode
- Expense table with edit/delete actions in edit mode
- Optional tracking - months can be left blank if you don't want to track expenses
- Syncs with Budget tab lifecycle - auto-advances when budget month is closed

#### **Dashboard Improvements**
- Clickable app logo and name - now navigates to Dashboard tab
- Mobile-friendly tooltips for Financial Health Score (tap to show/hide)
- Responsive design improvements for all dashboard elements
- Reorganized dashboard layout - moved Alerts & Notifications and Financial Health Score below Insights & Recommendations
- Optimized Financial Health Score card width for better mobile experience
- Keyboard navigation support for logo click (Enter/Space keys)

### Changed

#### **Data Structure Updates**
- Added `expenseTrackingData` to appData structure
- Updated Firestore data loading to include expenseTrackingData
- Updated import/export functionality to include expenseTrackingData
- Added expenseTrackingData initialization in normalizeAppDataModel()

#### **Responsive Design**
- Enhanced CSS breakpoints for mobile (<768px), tablet (768-1024px), and desktop (>1024px)
- Improved touch target sizes for mobile usability (minimum 44x44px)
- Better spacing and sizing across all screen sizes
- Optimized card layouts for both mobile and desktop views

### Technical

- Custom tooltip system supporting both hover (desktop) and tap (mobile) interactions
- Month lifecycle synchronization between Budget and Expense Tracking tabs
- Chart.js integration for expense category pie chart
- Enhanced CSS with proper responsive breakpoints
- Improved mobile performance with passive event listeners

## [2.3.21] - 2026-08-05 - Tax Data Load Bug Fix

### Fixed

#### **Critical Data Load Bug**
- **Fixed Firestore data loading** - taxData was missing from the appData object when loading from Firestore
- **Added taxData to Firestore load** - startListening() now includes taxData when loading data
- **Added load logging** - Console logs now show taxData being loaded from Firestore

#### **Root Cause**
The data was being saved to Firestore correctly (verified by console logs showing `hasTaxData: true` and `✅ Saved successfully`), but when loading data back from Firestore in the `startListening()` function, the code was not including `taxData` in the appData object being assigned. This caused salary and house property details to be lost on page refresh.

**Before (WRONG):**
```javascript
// Line 1847 in startListening()
appData = {
    tabData: d.tabData || {},
    customTabs: d.customTabs || [],
    userName: d.userName || "",
    monthlyBudgetData: d.monthlyBudgetData || {},
    fixedMonthlyIncome: d.fixedMonthlyIncome || 0,
    dateOfBirth: d.dateOfBirth || "",
    currentAge: d.currentAge || 0,
    onboardingComplete: d.onboardingComplete || false,
    onboardingDate: d.onboardingDate || "",
    dataMigrated: d.dataMigrated || false,
    // Missing: taxData!
};
```

**After (CORRECT):**
```javascript
appData = {
    tabData: d.tabData || {},
    customTabs: d.customTabs || [],
    userName: d.userName || "",
    monthlyBudgetData: d.monthlyBudgetData || {},
    fixedMonthlyIncome: d.fixedMonthlyIncome || 0,
    dateOfBirth: d.dateOfBirth || "",
    currentAge: d.currentAge || 0,
    onboardingComplete: d.onboardingComplete || false,
    onboardingDate: d.onboardingDate || "",
    dataMigrated: d.dataMigrated || false,
    taxData: d.taxData || {},  // ✅ NOW INCLUDED!
};
```

### Added
- Console logging for Firestore data load to verify taxData is loaded
- Console logging for taxData state before/after save operations

### Changed
- Updated footer version display CSS to enforce transparent background
- Fixed duplicate ID conflict between footer and settings version display (renamed to settingsVersionDisplay)

---

## [2.3.15] - 2026-08-05 - Tax Data Persistence After Refresh

### Fixed

#### **Page Refresh Data Loss**
- **Fixed default appData structure** - Now includes taxData field
- **Fixed Firestore data loading** - Now ensures taxData is initialized after load
- **Fixed backward compatibility** - taxData added automatically if missing from old data
- **Fixed normalizeAppDataModel** - Already ensured taxData initialization

#### **Root Cause**
When data was loaded from Firestore (line 1855), the appData object was set to the Firestore snapshot. If the Firestore document didn't have taxData (which it wouldn't for existing users), the appData would be missing taxData. Additionally, the default appData structure for new users was also missing taxData.

**Before (WRONG):**
```javascript
// Default appData (new users)
appData = {
    tabData: {},
    customTabs: [],
    userName: "",
    monthlyBudgetData: {},
    // Missing: taxData!
};

// When loaded from Firestore (existing users)
appData = snapshot.data; // If snapshot doesn't have taxData, it's missing!
```

**After (CORRECT):**
```javascript
// Default appData (new users)
appData = {
    tabData: {},
    customTabs: [],
    userName: "",
    monthlyBudgetData: {},
    taxData: {} // ADDED
};

// When loaded from Firestore (existing users)
appData = snapshot.data;
if (!appData.taxData) appData.taxData = {}; // ADDED

// After render
normalizeAppDataModel(); // Already ensures taxData initialization
```

### Data Structure (Complete)

```javascript
appData = {
    tabData: {},           // All tab data (inflow, outflow, taxPlan, etc.)
    customTabs: [],        // Custom user tabs
    userName: "",          // User name
    monthlyBudgetData: {}, // Monthly budget data
    fixedMonthlyIncome: 0,
    dateOfBirth: "",
    currentAge: 0,
    onboardingComplete: false,
    onboardingDate: "",
    dataMigrated: false,
    taxData: {            // Tax planning data
        salary: {          // Salary details for HRA
            basicSalary,
            hRAReceived,
            rentPaid,
            isMetroCity
        },
        houseProperty: {    // House property for Section 24(b)
            rentalIncome,
            municipalTaxes,
            homeLoanInterest,
            isSelfOccupied
        }
    }
}
```

### Verification

| Scenario | Status | Result |
|----------|--------|--------|
| **New User** | ✅ Fixed | Default appData includes taxData |
| **Existing User** | ✅ Fixed | taxData initialized if missing from Firestore |
| **Page Refresh** | ✅ Fixed | taxData preserved across refreshes |
| **Firestore Save** | ✅ Working | Entire appData (including taxData) saves correctly |
| **Import/Export** | ✅ Working | taxData included in both operations |

### What Works Now

**Tax Plan Tab - Full Persistence:**
- ✅ Add salary details → Click "✓ Done" → Saves to Firestore
- ✅ Refresh page → Salary details still there
- ✅ Add house property details → Click "✓ Done" → Saves to Firestore
- ✅ Refresh page → House property details still there
- ✅ Export backup → Includes taxData
- ✅ Import backup → Restores taxData
- ✅ Data persists across all operations

## [2.3.14] - 2026-08-05 - Tax Data Import/Export Fix

### Fixed

#### **Import Function Missing taxData**
- **Fixed import function** - Now includes taxData in safeImport object
- **Fixed normalizeAppDataModel** - Now ensures taxData is always initialized
- **Verified Firestore save** - Confirmed scheduleSave saves entire appData including taxData

#### **Root Cause**
The import function created a `safeImport` object that only included specific fields (tabData, customTabs, userName, monthlyBudgetData, etc.) but was **missing taxData**. When importing a backup, salary and house property details were lost.

**Before (WRONG):**
```javascript
const safeImport = {
    tabData: imported.tabData || {},
    customTabs: imported.customTabs || [],
    userName: imported.userName || appData.userName || "",
    monthlyBudgetData: imported.monthlyBudgetData || {},
    // ... other fields
    // Missing: taxData!
};
```

**After (CORRECT):**
```javascript
const safeImport = {
    tabData: imported.tabData || {},
    customTabs: imported.customTabs || [],
    userName: imported.userName || appData.userName || "",
    monthlyBudgetData: imported.monthlyBudgetData || {},
    // ... other fields
    taxData: imported.taxData || {} // ADDED
};
```

#### **Data Structure Verification**

**appData Structure:**
```javascript
appData = {
    tabData: {},           // All tab data (inflow, outflow, taxPlan, etc.)
    customTabs: [],        // Custom user tabs
    userName: "",          // User name
    monthlyBudgetData: {}, // Monthly budget data
    taxData: {            // Tax planning data ← NOW INCLUDED
        salary: {          // Salary details for HRA
            basicSalary,
            hraReceived,
            rentPaid,
            isMetroCity
        },
        houseProperty: {    // House property for Section 24(b)
            rentalIncome,
            municipalTaxes,
            homeLoanInterest,
            isSelfOccupied
        }
    }
}
```

#### **Firestore Save Verification**
- **Function**: `doSave()` saves entire `appData` to Firestore
- **Method**: `db.collection("users").doc(uid).set(appData, { merge: true })`
- **Result**: taxData is saved since it's at the root level of appData
- **Verified**: ✅ Tax data saves to Firestore correctly

#### **Import/Export Verification**
- **Export**: Downloads entire appData (includes taxData) ✅
- **Import**: Restores entire appData (now includes taxData) ✅
- **Before**: taxData was lost during import ❌
- **After**: taxData is preserved during import ✅

### What Works Now

**Tax Plan Tab - Data Persistence:**
- ✅ Salary details save to Firestore
- ✅ House property details save to Firestore
- ✅ Data persists across page refreshes
- ✅ Data included in backup exports
- ✅ Data restored from backup imports
- ✅ Salary details populate correctly in edit mode
- ✅ House property details populate correctly in edit mode

**Import/Export Workflow:**
1. **Export**: Settings → Export File → Downloads appData.json (includes taxData)
2. **Import**: Settings → Import File → Select appData.json → Restores all data (now includes taxData)
3. **Result**: Salary and house property details are preserved

## [2.3.13] - 2026-08-05 - Tax Saving Banner Style Update

### Changed

#### **Banner Styling**
- **Changed from background gradient to border color** for tax-saving banner
- **Removed blue gradient background** (was: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%))
- **Added blue border** (#3b82f6, 2px solid)
- **Changed background to light gray** (var(--surf2))
- **Changed text color from white to dark** (var(--text))
- **Reduced shadow opacity** for subtler effect

### Visual Changes

**Before (v2.3.12):**
- Blue gradient background with white text
- 1px border (#1d4ed8)
- Heavier shadow
- Darker, more prominent banner

**After (v2.3.13):**
- Light gray background with dark text
- 2px blue border (#3b82f6)
- Lighter shadow
- Cleaner, more readable appearance

### Benefits

- ✅ **Better readability** - Dark text on light background
- ✅ **Cleaner look** - Less visually heavy
- ✅ **Consistent with app design** - Uses CSS variables
- ✅ **Border emphasis** - Blue border draws attention without overwhelming

## [2.3.12] - 2026-08-05 - Tax Plan Auto-Save Fix

### Fixed

#### **saveData Error**
- **Fixed "saveData is not defined" error** when clicking "✓ Done" in Tax Plan
- **Fixed salary details auto-save** - Now uses `scheduleSave()` instead of non-existent `saveData()`
- **Fixed house property auto-save** - Now uses `scheduleSave()` instead of non-existent `saveData()`

#### **Root Cause**
In v2.3.0-2.3.10, the auto-save functions called `saveData()` which doesn't exist in the codebase. The correct function used by other tabs is `scheduleSave()`.

**Before (WRONG):**
```javascript
function saveSalaryDetailsAuto() {
    // ... set appData.taxData.salary
    saveData(); // ERROR: saveData is not defined!
}
```

**After (CORRECT):**
```javascript
function saveSalaryDetailsAuto() {
    // ... set appData.taxData.salary
    scheduleSave(); // Correct function used by other tabs
}
```

### What Works Now

**Tax Plan Tab - Auto-Save:**
- ✅ Salary details save when clicking "✓ Done"
- ✅ House property details save when clicking "✓ Done"
- ✅ Data persists to Firestore
- ✅ Details show correctly in preview mode
- ✅ Forms populate correctly in edit mode

## [2.3.10] - 2026-08-05 - Financial Year Date Filtering

### Added

#### **Financial Year Date Filtering**
- **Auto-calculated deductions now respect financial year dates**
- **Investments only counted for selected financial year** (April 1 to March 31)
- **One-time investments filtered by start date** - Only included if within FY
- **Monthly investments pro-rated** - Based on months within selected FY
- **More accurate tax calculations** - Based on actual investment dates, not historical totals

### How It Works

**Before (v2.3.9):**
```javascript
// All investments counted regardless of date
const annual = freq === 'monthly' ? base * 12 : base;
// Historical investments from 2023, 2022, etc. all counted in 2024-25
```

**After (v2.3.10):**
```javascript
// Get selected financial year
const fyStartYear = getSelectedTaxFyStartYear();
const fyStartDate = new Date(fyStartYear, 3, 1); // April 1
const fyEndDate = new Date(fyStartYear + 1, 2, 31); // March 31

// One-time investments
if (freq === 'one-time' && startDate >= fyStartDate && startDate <= fyEndDate) {
    fyAmount = base; // Only if in current FY
}

// Monthly investments
if (freq === 'monthly') {
    if (!startDate) {
        fyAmount = base * 12; // Assume full year if no date
    } else {
        const monthsInFY = calculateMonthsInFY(startDate, fyStartDate, fyEndDate);
        fyAmount = base * monthsInFY; // Pro-rated
    }
}
```

### Examples

**Scenario 1: One-time Investment**
- Investment: PPF ₹50,000
- Date: January 15, 2025
- Selected FY: 2024-25 (April 1, 2024 to March 31, 2025)
- Result: **₹50,000** included ✓

**Scenario 2: Historical Investment**
- Investment: PPF ₹50,000
- Date: March 2023
- Selected FY: 2024-25
- Result: **₹0** excluded ✗ (already counted in FY 2022-23)

**Scenario 3: Monthly SIP**
- Investment: Monthly SIP ₹10,000
- Start Date: November 1, 2024
- Selected FY: 2024-25
- Months in FY: November, December, January, February, March = 5 months
- Result: **₹50,000** (₹10,000 × 5) ✓

**Scenario 4: Monthly SIP (No Date)**
- Investment: Monthly SIP ₹10,000
- Start Date: Not specified
- Selected FY: 2024-25
- Result: **₹120,000** (₹10,000 × 12) - assumes full year

### Limitations

- **Outflow (Insurance)**: Currently uses full annual amount (no date filtering yet)
  - Outflow entries don't have startDate field
  - Can be refined in future update
- **Quarterly/Semi-Annual/Annual**: Full amount (assumes regular payments)
  - Can be refined with date tracking in future

### Benefits

- ✅ **Accurate tax calculations** - Only current FY investments counted
- ✅ **No double counting** - Historical investments not counted again
- ✅ **Pro-rated monthly investments** - Based on actual months in FY
- ✅ **Financial year selector** - Can view tax for any FY
- ✅ **Better compliance** - Matches actual tax filing requirements

## [2.3.9] - 2026-08-05 - Tax Plan Complete appData.taxData Fix

### Fixed

#### **Additional appData.taxData Errors**
- **Fixed "Cannot read properties of undefined (reading 'houseProperty')"** in renderTaxBreakdown
- **Fixed 4 more locations** where `appData.taxData` was accessed unsafely
- **Total of 8 locations now fixed** across all tax plan functions

#### **Additional Locations Fixed**
1. `renderTaxBreakdown()` - Line 4866: `appData.taxData.houseProperty` → `(appData.taxData || {}).houseProperty`
2. `renderTaxSavingBanner()` - Line 4953: `appData.taxData.salary` → `(appData.taxData || {}).salary`
3. `populateSalaryDetailsForm()` - Line 4994: `appData.taxData.salary` → `(appData.taxData || {}).salary`
4. `populateHousePropertyForm()` - Line 5098: `appData.taxData.houseProperty` → `(appData.taxData || {}).houseProperty`

#### **Complete List of All 8 Fixed Locations**
1. ✅ `renderSalaryDetails()` - v2.3.8
2. ✅ `renderHousePropertyDetails()` - v2.3.8
3. ✅ `getEffectiveDeductions()` (2 locations) - v2.3.8
4. ✅ `calculateTaxSummary()` - v2.3.8
5. ✅ `renderTaxBreakdown()` - v2.3.9
6. ✅ `renderTaxSavingBanner()` - v2.3.9
7. ✅ `populateSalaryDetailsForm()` - v2.3.9
8. ✅ `populateHousePropertyForm()` - v2.3.9

#### **Root Cause**
After fixing the first 4 locations in v2.3.8, there were still 4 more locations where `appData.taxData` was accessed without null checks. When the user refreshed and clicked Tax Plan again, the next location in the rendering pipeline (`renderTaxBreakdown`) crashed with the same type of error.

#### **The Fix**
Applied the same pattern to all remaining locations:
```javascript
// BEFORE:
const hp = appData.taxData.houseProperty || {};

// AFTER:
const hp = (appData.taxData || {}).houseProperty || {};
```

### What Works Now

**Tax Plan Tab - Complete Functionality:**
- ✅ Tab loads without any errors
- ✅ Preview mode renders correctly
- ✅ Edit mode renders correctly
- ✅ Form population works (when switching to edit mode)
- ✅ All calculations work correctly
- ✅ All sections render correctly

**For Users WITHOUT salary/house property data:**
- ✅ No crashes
- ✅ Empty states display correctly
- ✅ Auto-deductions still work
- ✅ Tax calculations still work

**For Users WITH salary/house property data:**
- ✅ Salary details display
- ✅ House property details display
- ✅ Forms populate correctly in edit mode
- ✅ All calculations work

## [2.3.8] - 2026-08-05 - Tax Plan appData.taxData Fix

### Fixed

#### **Critical appData.taxData Error**
- **Fixed "Cannot read properties of undefined (reading 'salary')"** when clicking Tax Plan tab
- **Fixed all appData.taxData accesses** to handle undefined safely
- **Added null checks** in 4 functions:
  - `renderSalaryDetails()` - Now uses `(appData.taxData || {}).salary`
  - `renderHousePropertyDetails()` - Now uses `(appData.taxData || {}).houseProperty`
  - `getEffectiveDeductions()` - Now uses `(appData.taxData || {}).salary` and `(appData.taxData || {}).houseProperty`
  - `calculateTaxSummary()` - Now uses `(appData.taxData || {}).houseProperty`

#### **Root Cause**
In v2.3.6, when `appData.taxData` was undefined (for users who hadn't added salary or house property details), the code tried to access `.salary` or `.houseProperty` on undefined, causing:
```
TypeError: Cannot read properties of undefined (reading 'salary')
at renderSalaryDetails (line 5066:36)
```

#### **The Fix**
Changed all accesses from:
```javascript
// WRONG:
const salary = appData.taxData.salary || {};
```

To:
```javascript
// CORRECT:
const salary = (appData.taxData || {}).salary || {};
```

This ensures that if `appData.taxData` is undefined, it defaults to an empty object `{}` before trying to access `.salary`, preventing the crash.

#### **Locations Fixed**
1. `renderSalaryDetails()` - Line 5066
2. `renderHousePropertyDetails()` - Line 5170
3. `getEffectiveDeductions()` - Lines 4578, 4582
4. `calculateTaxSummary()` - Line 4795

#### **Debug Process**
- Added extensive console logging in v2.3.7
- User reported exact error: "Cannot read properties of undefined (reading 'salary')"
- Identified all 4 locations where `appData.taxData` was accessed unsafely
- Fixed all locations with proper null checks
- Removed debug logging in v2.3.8

### What Works Now

**For Users WITHOUT salary/house property data:**
- ✅ Tax Plan tab loads without error
- ✅ Shows "No salary details added. Add in Edit mode."
- ✅ Shows "No house property details added. Add in Edit mode."
- ✅ Auto-deductions still display correctly
- ✅ Tax breakdown works correctly
- ✅ Regime recommendation works correctly

**For Users WITH salary/house property data:**
- ✅ Salary details display correctly
- ✅ House property details display correctly
- ✅ HRA exemption calculated correctly
- ✅ Income from house property calculated correctly
- ✅ All tax calculations work correctly

## [2.3.6] - 2026-08-05 - Tax Plan Rendering Fix

### Fixed

#### **Tax Plan Rendering Error**
- **Fixed "An error rendering taxplan" message** when viewing tax plan tab
- **Fixed `getAllTaxDeductions()` function** - Now correctly retrieves manual tax plan entries from `appData.tabData.taxPlan` instead of calling `activeEntries()`
- **Fixed `renderTaxPlan()` function** - Now correctly gets tax plan entries using `appData.tabData.taxPlan` instead of `activeEntries()`
- **Fixed function signatures** - Removed unused `entries` parameter from:
  - `calculateTaxSummary(taxRegime)` (was `calculateTaxSummary(entries, taxRegime)`)
  - `renderTaxDeductionsList()` (was `renderTaxDeductionsList(entries)`)
  - `renderTaxBreakdown(taxRegime)` (was `renderTaxBreakdown(entries, taxRegime)`)
  - `renderTaxSavingBanner(taxRegime)` (was `renderTaxSavingBanner(entries, taxRegime)`)

#### **DOM Element Safety Checks**
- **Added null checks in `calculateTaxSummary()`** for all DOM elements:
  - `annualIncome`
  - `totalDeductions`
  - `taxableIncome`
  - `annualTaxLiability`
  - `taxLiabilityYTD`
  - `recommendedRegime`
  - `regimeSavingsNote`
- Each element now checked before setting `textContent` to prevent crashes

### Root Cause

In v2.3.0-2.3.5:
1. **Wrong data source**: `getAllTaxDeductions()` called `activeEntries()` which returns data for the currently active tab, not specifically tax plan data
2. **Wrong entries**: `renderTaxPlan()` used `activeEntries()` which could return data from any tab (dashboard, budget, etc.) instead of tax plan entries
3. **Missing null checks**: `calculateTaxSummary()` tried to set `textContent` on potentially null DOM elements
4. **Incorrect function signatures**: Functions accepted `entries` parameter but then called `getAllTaxDeductions()` internally, ignoring the parameter

### What Works Now

**Tax Plan Tab - Preview Mode:**
- ✅ Loads without "An error rendering taxplan" message
- ✅ **Tax Summary** (6 metrics at top):
  - Annual Income (from Budget)
  - Total Deductions (incl. auto)
  - Taxable Income
  - Annual Tax Liability
  - Tax Liability YTD
  - Recommended Regime
- ✅ **Salary Details** (if added)
- ✅ **House Property** (if added)
- ✅ **Tax Deductions List** (auto-pulled + manual):
  - All 20+ auto-pulled items from Inflow/Outflow tabs
  - All manual tax-saving items added in Edit mode
  - Auto/Manual badges
  - Section labels (80C, 80D, 24(b), etc.)
- ✅ **Tax Breakdown**:
  - Gross Annual Income
  - House Property Income/Loss
  - Standard Deduction
  - All deductions listed
  - Taxable Income
  - Base Tax + Cess
  - Total Tax Liability
  - Best regime recommendation
- ✅ **Tax-Saving Banner**:
  - Old Regime: ₹5.85L+ scope
  - New Regime: ₹90K+ scope

**Tax Plan Tab - Edit Mode:**
- ✅ Salary Details form
- ✅ House Property form
- ✅ Tax Saving Items form (4 fields)
- ✅ Tax Saving Items table with Edit/Delete
- ✅ "✓ Done" button saves and switches to preview

### Technical Details

**Before:**
```javascript
function getAllTaxDeductions() {
    return [...getAutoTaxDeductions(), ...activeEntries()]; // Wrong!
}

function renderTaxPlan() {
    const entries = activeEntries(); // Could be any tab's data!
    // ...
}
```

**After:**
```javascript
function getAllTaxDeductions() {
    const manualEntries = (appData.tabData || {}).taxPlan || [];
    return [...getAutoTaxDeductions(), ...manualEntries]; // Correct!
}

function renderTaxPlan() {
    const entries = (appData.tabData || {}).taxPlan || []; // Tax plan data only!
    // ...
}
```

## [2.3.5] - 2026-08-05 - Tax Plan Done Button Fix

### Fixed

#### **Done Button Error**
- **Fixed "An unexpected error occurred" when clicking "✓ Done"** in Tax Plan edit mode
- **Fixed toggleTaxPlanEdit initialization** - Now properly initialized in `initTaxPlanElements()`
- **Fixed taxPlanUI initialization** - Now properly initialized in `initTaxPlanElements()`
- **Added try-catch in toggle event listener** - Catches and logs errors with helpful messages
- **Added error handling in saveSalaryDetailsAuto()** - Prevents crashes when saving salary details
- **Added error handling in saveHousePropertyDetailsAuto()** - Prevents crashes when saving house property details

#### **Element Initialization**
- Changed `toggleTaxPlanEdit` from `const` to `let` for late initialization
- Changed `taxPlanUI` from `const` to `let` for late initialization
- Both elements now initialized in `initTaxPlanElements()` after authentication

#### **Error Handling Improvements**
- Toggle event listener wrapped in try-catch with specific error logging
- Save functions wrapped in try-catch with error logging
- Better error messages in console for debugging
- Alert messages for user feedback when errors occur

### Root Cause

In v2.3.4:
1. `toggleTaxPlanEdit` was declared as `const` before DOM loaded → null reference
2. `taxPlanUI` was declared as `const` before DOM loaded → null reference
3. No error handling in toggle event listener → crash on any error
4. No error handling in save functions → crash on save errors

### What Works Now

**Tax Plan Tab - Edit Mode:**
1. Click "✎ Edit" - Switches to edit mode ✅
2. Fill in forms:
   - Salary details
   - House property details
   - Tax-saving items
3. Click "✓ Done" - **Works without errors!** ✅
   - Auto-saves salary details
   - Auto-saves house property details
   - Switches to preview mode
   - Shows all deductions, breakdown, and banner

**Error Handling:**
- If error occurs, shows helpful alert message
- Logs detailed error to console for debugging
- Doesn't crash the entire app

## [2.3.4] - 2026-08-05 - Tax Plan Critical Fix

### Fixed

#### **Critical Errors**
- **Fixed "An unexpected error occurred" crash** when clicking Tax Plan tab
- **Fixed element initialization** - All tax plan elements (taxRegimeSelect, financialYearSelect, taxDeductionsList, taxBreakdown, etc.) now initialize after authentication
- **Fixed event listeners** - Tax plan event listeners now attach after elements are initialized
- **Added comprehensive error handling** - Try-catch blocks in renderTaxPlan() with fallback initialization

#### **Missing Features Restored**
- **Auto-calculated tax deductions** - All 20+ deductions from Inflow/Outflow tabs now display correctly
- **Tax breakdown** - Complete tax calculation breakdown now shows
- **Regime recommendation banner** - "Best regime: X saves ₹Y/yr" banner restored
- **Tax-saving banner** - ₹5.85L+ investment scope banner restored

#### **Technical Changes**
- Changed all tax plan element declarations from `const` to `let` for late initialization
- Added `initTaxPlanElements()` to initialize all tax plan DOM elements
- Added `initTaxPlanEventListeners()` to attach event listeners after elements exist
- Called both init functions in `auth.onAuthStateChanged` after user signs in
- Added null checks in `renderTaxPlan()` with fallback initialization
- Added try-catch error handling in `renderTaxPlan()`
- Added safety checks in `renderTaxDeductionsList()` and `renderTaxBreakdown()`

### Root Cause

In v2.3.0-2.3.3, when adding salary and house property sections:
1. Some elements were declared as `const` before DOM loaded (null references)
2. Other elements were declared as `let` but not initialized
3. Event listeners attached to null elements
4. No error handling when elements were missing
5. Functions tried to access `.value` or `.innerHTML` on null elements → crash

### What Works Now

**Tax Plan Tab - Preview Mode:**
- ✅ Salary Details section (if added)
- ✅ House Property section (if added)
- ✅ **Tax Deductions list** (auto-pulled + manual)
  - Shows all 20+ auto-pulled items from Inflow/Outflow
  - Shows manual tax-saving items
  - Auto/Manual badges
  - Section labels (80C, 80D, etc.)
- ✅ **Tax Breakdown**
  - Gross Annual Income
  - House Property Income/Loss
  - Standard Deduction
  - All deductions (80C, 80D, 24(b), HRA, etc.)
  - Taxable Income
  - Base Tax + Cess
  - Total Tax Liability
- ✅ **Regime Recommendation**
  - "Best regime: X saves ₹Y/yr"
- ✅ **Tax-Saving Banner**
  - Old Regime: ₹5.85L+ scope
  - New Regime: ₹90K+ scope

**Tax Plan Tab - Edit Mode:**
- ✅ Salary Details form
- ✅ House Property form
- ✅ Tax Saving Items form (4 fields)
- ✅ Tax Saving Items table
- ✅ Edit/Delete buttons

## [2.3.3] - 2026-08-05 - Tax Plan Form Fix

### Fixed

#### **Tax-Saving Items Form**
- **Fixed form fields not rendering** - Tax Saving Item, Amount Invested, Section, and Details fields now display correctly in Edit mode
- **Fixed table not showing** - Table with existing tax-saving items now renders properly
- **Fixed element initialization** - Tax plan elements now initialize after authentication to ensure DOM is ready
- **Added safety checks** - Functions now check if elements exist before accessing them

#### **Technical Fixes**
- Changed tax plan element declarations from `const` to `let` to allow late initialization
- Added `initTaxPlanElements()` function to initialize elements after DOM is ready
- Called `initTaxPlanElements()` in `auth.onAuthStateChanged` after user signs in
- Added null checks in `renderTaxPlanDynamicFields()` and `renderTaxPlanTable()`
- Added conditional event listeners for `taxPlanForm` and `taxPlanTableBody`
- Added "Actions" column header to tax plan table

### What Was Broken

In v2.3.0-2.3.2, when adding salary and house property sections, the tax-saving items form fields stopped rendering because:
1. Elements were referenced before DOM was fully loaded
2. No safety checks for null elements
3. Event listeners attached to null elements

### What Works Now

- ✅ Tax-saving items form fields render correctly
- ✅ Table shows all manual tax-saving entries
- ✅ Edit/Delete buttons work for each entry
- ✅ Form submission adds new tax-saving items
- ✅ Auto-pulled deductions still work
- ✅ Salary and house property sections work
- ✅ Everything saves on "✓ Done"

## [2.3.2] - 2026-08-05 - Tax Plan UX Improvement

### Changed

#### **Auto-Save Behavior**
- **Removed separate "Save Salary Details" button** - data saves automatically when clicking "✓ Done"
- **Removed separate "Save House Property" button** - data saves automatically when clicking "✓ Done"
- **Consistent with other tabs** - Tax Plan now follows the same UX pattern as Investments, Fixed Outflow, etc.
- **Edit → Done workflow** - Fill in forms, click "✓ Done", data is saved automatically

#### **Function Changes**
- Renamed `saveSalaryDetails()` to `saveSalaryDetailsAuto()` - called automatically on Done
- Renamed `saveHousePropertyDetails()` to `saveHousePropertyDetailsAuto()` - called automatically on Done
- Added auto-save trigger in `toggleTaxPlanEdit` event listener

### Benefits

- **Better UX**: No confusion about when to save
- **Fewer clicks**: One click (Done) instead of three (Save Salary + Save House Property + Done)
- **Consistent**: Works like all other tabs in the app
- **Cleaner interface**: Removed two unnecessary buttons

### User Experience

**Before (v2.3.1):**
1. Click "✎ Edit"
2. Fill salary details
3. Click "Save Salary Details"
4. Fill house property details
5. Click "Save House Property"
6. Click "✓ Done"

**After (v2.3.2):**
1. Click "✎ Edit"
2. Fill salary details
3. Fill house property details
4. Click "✓ Done" ← Everything saves automatically!

## [2.3.1] - 2026-08-05 - Dashboard Card Merge & Icons

### Changed

#### **Dashboard Card Structure**
- **Merged "Preparedness" and "Budget vs Actual" cards** into single "Preparedness & Budget" card
- Insurance progress bars (Emergency Fund, Health Insurance, Term Insurance) now in grid layout
- Budget vs Actual stats now in compact grid within the merged card
- Reduced dashboard card count while maintaining all information
- Better visual hierarchy with section dividers

#### **Card Icons**
- Added emoji icons to all dashboard cards for better visual recognition:
  - 📅 This Month
  - 🏦 Accounts & Net Worth
  - 🎯 Goals & Investment Planning
  - 🛡️ Preparedness & Budget (merged)
  - 💚 Financial Health Score
  - 💡 Insights & Recommendations
  - 📊 6-Month Trend
  - ⚡ Quick Actions

### Benefits

- **Cleaner Dashboard**: Fewer cards, same information
- **Better Organization**: Related information grouped together
- **Visual Clarity**: Icons make cards instantly recognizable
- **Compact Layout**: More information in less space
- **Improved UX**: Easier to scan and understand

## [2.3.0] - 2026-08-05 - Comprehensive Tax Planning for ITR-2

### Added

#### **Salary Details Section**
- Basic salary input (₹/year)
- HRA received input (₹/year)
- Rent paid input (₹/year)
- Metro/Non-metro city selection
- Automatic HRA exemption calculation per Section 10(13A)
- Formula: Min of (Actual HRA, Rent - 10% of basic, 50%/40% of basic)

#### **House Property Section**
- Rental income input (₹/year)
- Municipal taxes paid input (₹/year)
- Home loan interest input (₹/year)
- Self-occupied vs Let-out property selection
- Automatic income from house property calculation
- Standard deduction: 30% of rental income
- Section 24(b): Interest deduction (₹2L limit for self-occupied, unlimited for let-out)
- House property loss set-off (max ₹2L against other income)

#### **Enhanced Tax Sections**
- Added Section 24(b) - Home Loan Interest
- Added Section 80TTA - Savings Account Interest (₹10K limit)
- Added HRA - House Rent Allowance exemption
- Updated tax deduction dropdown with new sections

#### **Comprehensive Tax-Saving Banner**

**Old Regime Banner:**
- Maximum tax saving potential: ₹5,85,000+
- Section-wise breakdown:
  - 80C: ₹1,50,000 (PPF, ELSS, EPF, LIC, etc.)
  - 80D: ₹25,000-1,00,000 (Health insurance)
  - 24(b): ₹2,00,000 (Home loan interest)
  - 80CCD(1B): ₹50,000 (NPS)
  - 80EEA: ₹1,50,000 (First-time home buyer)
  - 80E: Unlimited (Education loan)
  - 80G: Varies (Donations)
  - 80TTA: ₹10,000 (Savings interest)
- Current utilization tracking
- Remaining scope calculation
- Potential tax savings (30% bracket + 4% cess)

**New Regime Banner:**
- Total potential: ₹90,000+
- Standard deduction: ₹75,000
- Family pension: ₹15,000
- Agneepath scheme: Varies
- Best for: Low deductions, high income, simpler filing

#### **Improved Tax Calculation Logic**
- Gross total income = Salary + House Property Income
- HRA exemption automatically deducted from salary
- House property loss set-off applied (max ₹2L)
- Section 24(b) interest deduction applied
- Section 80TTA savings interest deduction applied
- Updated standard deduction (₹75K new, ₹50K old)
- Detailed breakdown shows all deductions

### Changed

#### **Tax Breakdown Display**
- Now shows house property income/loss separately
- Lists HRA exemption if applicable
- Lists Section 24(b) deduction if applicable
- Lists Section 80TTA deduction if applicable
- Lists house property loss set-off if applicable
- More detailed breakdown of all deductions

#### **Tax Summary**
- Annual income now includes house property income
- Total deductions include HRA, 24(b), 80TTA
- More accurate taxable income calculation

### Removed

#### **Dashboard Cleanup**
- Removed "Cash Flow Summary" card (redundant)
- All information available in:
  - "This Month" card (income, expenses, available funds)
  - "Financial Health Score" (savings rate)

### Technical

#### **Data Structure**
- Added `appData.taxData` object
- `appData.taxData.salary`: Stores salary details
- `appData.taxData.houseProperty`: Stores house property details

#### **New Functions**
- `saveSalaryDetails()`: Save salary form data
- `renderSalaryDetails()`: Display salary details in preview
- `calculateHRAExemption()`: Calculate HRA exemption per IT rules
- `populateSalaryDetailsForm()`: Load saved salary data in edit mode
- `saveHousePropertyDetails()`: Save house property form data
- `renderHousePropertyDetails()`: Display house property in preview
- `calculateIncomeFromHouseProperty()`: Calculate house property income/loss
- `populateHousePropertyForm()`: Load saved house property data in edit mode

#### **Updated Functions**
- `getEffectiveDeductions()`: Now includes HRA, 24(b), 80TTA, house property loss
- `calculateTaxSummary()`: Includes house property income in gross total
- `renderTaxBreakdown()`: Shows detailed breakdown with new deductions
- `renderTaxSavingBanner()`: Comprehensive banner for both regimes
- `renderTaxPlan()`: Populates salary and house property forms in edit mode

### User Experience

#### **Tax Planning Workflow**
1. Go to Tax Plan tab
2. Click "✎ Edit"
3. Fill salary details (basic, HRA, rent, metro/non-metro)
4. Fill house property details (rental income, taxes, interest)
5. Add tax-saving items (80C, 80D, etc.)
6. Click "✓ Done" to see comprehensive tax calculation
7. View tax-saving banner for investment scope
8. Compare Old vs New regime automatically

#### **Benefits**
- Accurate ITR-2 tax calculation
- HRA exemption automatically calculated
- House property income/loss properly handled
- Section 24(b) interest deduction applied
- Know exactly how much more you can invest to save tax
- See potential tax savings in rupees
- Make informed decision between Old and New regime

### Notes

- Assumes ITR-2 filing (salary + house property + capital gains)
- HRA exemption follows IT Act Section 10(13A) rules
- Section 24(b) limit: ₹2L for self-occupied, unlimited for let-out
- House property loss set-off: Max ₹2L against other income
- Tax calculation includes 4% cess
- Rebate u/s 87A applied automatically (₹12L for new, ₹5L for old)

## [2.2.1] - 2026-08-05 - Financial Health Score Tooltips

### Added

- **Tooltips for Financial Health Score Components**
  - Hover over any component to see detailed calculation breakdown
  - Each component shows:
    - Current values and ideal values
    - Calculation formula
    - Scoring thresholds
    - Percentage breakdown
  - Information icon (ℹ️) indicates tooltip availability

### Component Tooltips Include:

1. **Emergency Fund (20 points)**
   - Current vs Ideal amounts
   - Coverage percentage
   - Gradual scoring explanation
   - Based on 6 months expenses

2. **Debt Management (25 points)**
   - Monthly commitments amount
   - Usable income
   - Debt-to-income ratio
   - Scoring thresholds (Excellent to Critical)
   - Note about excluding savings/investments

3. **Savings Rate (20 points)**
   - Actual savings breakdown
   - Fixed & one-time savings
   - Fixed & one-time investments
   - Savings rate percentage
   - Scoring thresholds

4. **Insurance Coverage (20 points)**
   - Health insurance current vs ideal
   - Term insurance current vs ideal
   - Coverage percentages
   - Weighted scoring (60% health, 40% term)

5. **Net Worth Position (10 points)**
   - Net worth amount
   - Total assets and liabilities
   - 6 months expenses benchmark
   - Scoring thresholds

6. **Goal Progress (5 points)**
   - Number of active goals
   - Total needed vs accumulated
   - Progress percentage
   - Scoring formula

### Technical

- Added `tooltip` property to each breakdown item
- Used native HTML `title` attribute for tooltips
- Added cursor: help styling
- Added ℹ️ icon to indicate tooltip presence

## [2.2.0] - 2026-08-05 - Expense Tracking Tab

### Added

- **New Expense Tracking Tab**
  - Comprehensive expense tracking with 50+ categories
  - Categories include: Groceries, Vegetables & Fruits, Dairy, Medical, Travel, Fuel, Dining, Shopping, Home, Entertainment, Education, Gifts, Pet Care, Beauty & Wellness, and more
  - Date-wise expense logging
  - Payment mode tracking (Cash, Card, UPI, etc.)
  - Merchant/store information
  - Notes for each expense

- **Auto-Validation with Budget Tab**
  - Compares total tracked expenses with Auto-calculated Variable Expenditure from Budget tab
  - Shows match percentage
  - Visual indicators: Green (matched), Red (over), Blue (under)
  - Difference calculation in rupees

- **Category Breakdown**
  - Groups expenses by category
  - Shows amount and percentage for each category
  - Sorted by highest spending first
  - Visual category list with amounts

- **Summary Dashboard**
  - Auto-calculated Variable Expenditure (from Budget)
  - Total Tracked Expenses
  - Difference (over/under)
  - Transaction count
  - Match status

### Technical

- Added `expenseTracking` tab to DEFAULT_TABS
- Created TAB_FIELDS.expenseTracking with 6 fields
- Implemented renderExpenseTracking() function
- Added expense tracking DOM elements in index.html
- Created CSS styles for expense UI
- Edit/Preview mode toggle
- Table view for all expenses
- Sorted by date (descending)

### User Experience

- Easy expense entry with dropdown categories
- Quick validation against budget
- Identify spending patterns
- Track if manual tracking matches auto-calculations
- Category-wise insights

## [2.1.7] - 2026-08-05 - Dashboard Layout Adjustment

### Changed

- **Dashboard Layout - 6-Month Trend Position**
  - Moved 6-Month Trend chart above Quick Actions panel
  - Better visual hierarchy with analytics before actions
  - Trend chart now appears before navigation buttons

### Technical

- Reordered dashboard HTML structure
- No functional changes, only layout adjustment

## [2.1.6] - 2026-08-05 - Financial Health Score Accuracy Fixes

### Fixed

- **Savings Rate Calculation - Critical Bug Fix**
  - Previously: Calculated "available for savings" (income - commitments)
  - Now: Calculates "actual savings made" (fixedSaving + onetimeSaving + fixedInvestment + onetimeInvestment)
  - Much more accurate reflection of actual savings behavior
  - Aligns with standard financial planning metrics

### Changed

- **"This Month" Card - Variable Expenditure Display**
  - Replaced "Expenditure account" (account balance) with "Variable expenditure"
  - Now shows the auto-calculated variable expenditure from budget tab
  - More relevant metric for tracking spending
  - Aligns with budget calculation methodology

### Impact

- **Savings Rate Score**: Will now reflect actual savings/investment behavior
- Users who save/invest regularly will see accurate scores
- Users with high "available" income but low actual savings will see lower scores
- More honest assessment of financial discipline

### Technical

- Savings Rate now uses: `fixedSaving + onetimeSaving + fixedInvestment + onetimeInvestment`
- All from monthData.outflow and monthData.investing
- Variable expenditure uses: `monthData.outflow.variableExpenditure`

## [2.1.5] - 2026-08-05 - Dashboard Metric Update

### Changed

- **"This Month" Card - Variable Expenditure Display**
  - Replaced "Expenditure account" (account balance) with "Variable expenditure"
  - Now shows the auto-calculated variable expenditure from budget tab
  - More relevant metric for tracking spending
  - Aligns with budget calculation methodology

### Technical

- Changed from `expenditureAccountBalance` to `variableExp` (from monthData.outflow.variableExpenditure)
- This is the same auto-calculated value used in the Budget tab
- Provides better visibility into actual spending patterns

## [2.1.4] - 2026-08-05 - Fixed Debt Management Calculation

### Fixed

- **Monthly Commitments Calculation - Critical Bug Fix**
  - Previously: Included ALL recurring outflows (Saving, Investment, Liability, Expenditure)
  - Now: Only includes Liability, Expenditure, Loan, and Others purposes
  - **Savings and Investments are NOT commitments** - they are discretionary
  - This fix dramatically improves Debt Management score accuracy
  - Debt-to-Income ratio now correctly reflects only mandatory obligations

### Impact

- **Debt Management Score**: Will now be much more accurate and likely higher
- Users with high savings/investments will see significant score improvement
- Better reflects actual financial flexibility and risk
- Aligns with standard financial planning practices

### Technical

- Added purpose filtering to monthlyCommitments calculation
- Filters: `purpose === 'liability' || 'expenditure' || 'loan' || 'others' || ''`
- Excludes: `purpose === 'saving' || 'investment'`

## [2.1.3] - 2026-08-05 - Enhanced Mobile Compatibility

### Added

- **Touch/Swipe Support for Carousel**
  - Swipe left to go to next alert
  - Swipe right to go to previous alert
  - Works on all touch devices (phones, tablets)
  - Minimum swipe distance: 50px
  - Smooth gesture recognition

- **Mouse Drag Support**
  - Drag left/right on desktop to navigate carousel
  - Same gesture as touch for consistency

- **Keyboard Navigation**
  - Arrow Left: Previous alert
  - Arrow Right: Next alert
  - Works when carousel is visible on screen
  - Improves accessibility

- **Mobile & Web Compatibility Standards in APP_SPEC.md**
  - Comprehensive platform support requirements
  - Touch gesture guidelines
  - Mouse/keyboard interaction patterns
  - Performance requirements for mobile
  - Responsive design checklist
  - Implementation guidelines with code examples

### Technical

- Passive event listeners for better scroll performance
- Touch event handling with threshold detection
- Mouse event handling for desktop drag
- Keyboard event handling with visibility check
- All interactions tested on mobile and desktop

### Documentation

- Added Section 1 in APP_SPEC.md: "Mobile & Web Compatibility Standards"
- Platform support matrix
- Interaction pattern guidelines
- Performance requirements
- Responsive design checklist
- Code examples for proper implementation

## [2.1.2] - 2026-08-05 - Carousel Alerts

### Changed

- **Alerts & Notifications - Carousel (One at a Time)**
  - Changed from horizontal scroll to carousel display
  - Shows one alert at a time for better focus
  - Left/Right arrow buttons for navigation
  - Circular rotation - loops back to first after last
  - Dot indicators show current position
  - Click dots to jump to specific alert
  - Smooth slide animations
  - Touch-friendly on mobile devices

### Technical

- Added rotateAlert() and goToAlert() functions for carousel navigation
- Circular array rotation logic
- CSS transitions for smooth slide effects
- Active state management for cards and dots

## [2.1.1] - 2026-08-05 - UX Improvements & Realistic Scoring

### Changed

- **Alerts & Notifications - Compact Horizontal Scroll**
  - Changed from vertical list to horizontal scrollable cards
  - Swipe/scroll left-right to view all alerts
  - Tap/click entire card to navigate to relevant section
  - More compact design saves vertical space
  - Better mobile experience with touch-friendly cards
  - Smooth scroll behavior with visible scrollbar

- **Dashboard Layout Reordering**
  - Moved Financial Health Score above Insights & Recommendations
  - Moved Quick Actions Panel to bottom (before 6-Month Trend)
  - Better information hierarchy and flow
  - More logical grouping of related information

- **Financial Health Score - More Realistic Scoring**
  - Emergency Fund (20 points): Gradual scoring based on months covered
  - Debt Management (25 points): Realistic thresholds (<30% excellent, 30-40% good, 40-50% fair, >50% poor)
  - Savings Rate (20 points): Realistic expectations (>30% excellent, 20-30% good, 10-20% fair, <10% poor)
  - Insurance Coverage (20 points): Weighted by importance (Health 12pts, Term 8pts)
  - Net Worth Position (10 points): New metric based on positive net worth and expense coverage
  - Goal Progress (5 points): Realistic expectations for goal achievement
  - Health levels adjusted: Excellent (85+), Good (70-84), Fair (50-69), Needs Improvement (30-49), Needs Work (<30)

### Technical

- Improved CSS for horizontal scrolling with smooth behavior
- Touch-friendly card interactions
- Better mobile responsiveness for alerts
- More nuanced scoring algorithm for realistic assessment

## [2.1.0] - 2026-08-05 - Major Dashboard Enhancement

### Added - P1 Features (High Priority)

- **Alerts & Notifications Section**
  - Real-time alerts for financial issues requiring attention
  - Over-budget category warnings
  - Low emergency fund alerts (< 50% of ideal)
  - Goals behind schedule notifications
  - Insurance coverage gap warnings
  - High credit card usage alerts (> ₹50,000)
  - Upcoming recurring expenses reminders
  - Limited to 5 most important alerts for clarity
  - Click-through navigation to relevant tabs

- **Quick Actions Panel**
  - One-click navigation to key sections
  - Budget, Investments, Expenses, Goals, Net Worth, Tax Planning
  - Responsive grid layout (6 columns desktop, 3 columns mobile)
  - Hover effects and smooth transitions

- **Financial Health Score**
  - Comprehensive 0-100 scoring system
  - Emergency Fund Coverage (25 points)
  - Debt Management (20 points)
  - Savings Rate (20 points)
  - Insurance Coverage (15 points)
  - Goal Progress (10 points)
  - Investment Activity (10 points)
  - Visual circular progress indicator
  - Detailed breakdown with individual component scores
  - Color-coded health levels: Excellent (80+), Good (60-79), Fair (40-59), Poor (<40)

- **Cash Flow Summary Card**
  - Net cash flow calculation (income - expenses)
  - Total income breakdown
  - Total expenses breakdown
  - Savings rate percentage
  - Excludes borrowing from income calculations
  - Based on recurring commitments

- **Budget vs Actual Comparison Card**
  - Real-time budget adherence tracking
  - Surplus/deficit display
  - Budgeted vs spent comparison
  - Budget adherence percentage
  - Tracks variable expenses and credit card spending

### Added - P2 Features (Medium Priority)

- **Insights & Recommendations**
  - AI-like personalized suggestions
  - Positive reinforcement for good financial habits
  - Actionable improvement suggestions
  - Emergency fund building recommendations
  - Insurance coverage optimization tips
  - Investment encouragement for non-investors
  - Goal progress tracking insights
  - Debt optimization warnings
  - Limited to 4 most relevant insights
  - Color-coded by type: positive (green), suggestion (blue), warning (orange)

### Technical Implementation

- **Data Consistency**
  - All features use existing calculations from dashboard.js
  - No duplicate calculations or data fetching
  - Reuses budgetBalance, emergencyFund, healthInsurance, etc.
  - Ensures consistency across all dashboard components

- **Performance Optimization**
  - No additional API calls or database queries
  - Calculations performed once and reused
  - Efficient rendering with minimal DOM updates
  - Lazy evaluation of insights and alerts

- **Responsive Design**
  - Mobile-first approach
  - Breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
  - Quick Actions: 3 columns mobile, 6 columns desktop
  - Health Score: Stacked layout mobile, side-by-side desktop
  - All cards adapt gracefully to screen size

- **User Experience**
  - Smooth transitions and animations
  - Hover effects on interactive elements
  - Clear visual hierarchy with icons and colors
  - Accessible navigation with keyboard support
  - Consistent design language across all new features

### Changed

- Dashboard layout now includes 8 new cards/sections
- Improved information density without overwhelming users
- Enhanced visual feedback with color-coded indicators
- Better use of dashboard space with full-width cards for alerts and actions

## [2.0.12] - 2026-08-05

### Changed
- **Dashboard Layout**: Changed desktop layout from 3 columns to 2 columns (2x2 grid) for the 4 main dashboard cards
- **Responsive Design**: Updated breakpoints for better tablet/mobile responsiveness

## [2.0.11] - 2026-08-05

### Added
- **Location Enhancement**
  - Added "Other" option to location dropdown for custom cities
  - Custom location input field appears when "Other" is selected
  - Custom cities are assumed non-metro for insurance calculations
  - Validation to ensure custom location is entered when "Other" is selected

- **Dashboard Layout Improvements**
  - Enhanced responsive grid system for better card distribution
  - Added `align-items: stretch` to ensure cards are evenly distributed
  - Improved mobile layout (1 column), tablet (2 columns), desktop (3 columns)
  - Better spacing and alignment across all screen sizes

- **Documentation**
  - Added comprehensive development process documentation in APP_SPEC.md
  - Documented testing guidelines and procedures
  - Added test file structure guidelines
  - Updated version numbers across all documentation

### Changed
- **Location Field**: Now supports both preset cities and custom locations
- **Dashboard Grid**: Improved responsiveness and card alignment

## [2.0.10] - 2026-08-05

### Added
- **Dashboard Enhancements**
  - Credit card usage and expenditure account balance now displayed in "This Month" section
  - Navigation links added to Budget, Fixed Outflow, Net Worth, and Goals tabs from dashboard cards
  - Mobile-responsive bar chart - numbers hidden on mobile devices (< 768px) for better readability

- **Tax Planning**
  - Comprehensive tax saving banner showing remaining investment scope under Old Tax Regime
  - Banner displays potential tax savings and suggests 80C/80D investment opportunities
  - ITR-2 focused tax calculation with detailed breakdown
  - Test suite added for tax calculation logic with 20+ test cases

- **Gifts Tracking**
  - Date display for on-demand gifts (full date)
  - Month display for recurring gifts (month only)

- **Project Files**
  - LICENSE file added (Personal Use Only license)
  - .codeowners file added for repository management
  - Comprehensive test suite for tax calculations (tests/tax-calculation.test.js)

### Changed
- **Dashboard Layout**
  - Combined "Accounts" and "Net Worth" into single consolidated card
  - Combined "Goals" and "Investment Planning" into single consolidated card
  - Improved space utilization and information density

- **UI Improvements**
  - Removed "Purpose:" label from Accounts tab item lists for cleaner display
  - Insurance preparedness text now shows actual user location instead of generic "location" text
  - "Fixed Outflow" text in dashboard now clickable link to Outflow tab

### Fixed
- Mobile responsiveness of dashboard bar chart
- User location display in insurance metrics

## [2.0.4] - Previous Release

### Added
- User location field
- Enhanced dashboard with budget surplus
- Cumulative goals progress
- Preparedness metrics with ideal insurance calculations
- 6-month trend graph
- Gifts date field with monthly spending chart
- PDF dashboard export

---

## Version History

- **2.0.10** - Dashboard enhancements, tax planning improvements, UI refinements
- **2.0.4** - Location tracking, enhanced metrics, PDF export
- **2.0.0** - Major release with comprehensive financial planning features
- **1.x.x** - Initial releases with basic budget tracking
