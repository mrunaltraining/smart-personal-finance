# SmartFin - Developer Guide (v4.0.1)

> Quick reference for developers working with SmartFin's modular architecture.

## 📦 Core Modules

All business logic is in `src/core/` - platform-independent, tested, and documented.

### Utilities (4 modules)
- **FrequencyConverter** - Payment frequency conversions
- **DateUtils** - Date manipulation utilities  
- **CurrencyFormatter** - Indian currency formatting
- **Logger** - Standardized logging utility

### Business Logic (10 modules)
- **BudgetCalculator** - Budget calculations
- **AccountManager** - Account management
- **AccountValidator** - Account validation
- **InvestmentCalculator** - Investment calculations
- **GoalCalculator** - Goal tracking
- **InsuranceCalculator** - Insurance analysis
- **NetWorthCalculator** - Net worth projection
- **TaxCalculator** - Tax planning
- **ExpenseAnalyzer** - Expense tracking
- **DashboardCalculator** - Dashboard aggregation

## 🎨 Design System

### Colors (Dark Theme)
```css
--bg: #0b1020;           /* Background */
--surf1: #151b2e;        /* Surface 1 */
--surf2: #1e2538;        /* Surface 2 */
--text: #e2e8f0;         /* Primary text */
--accent: #8b5cf6;       /* Accent color */
--success: #34d399;      /* Success */
--warning: #fbbf24;      /* Warning */
--error: #f87171;        /* Error */
```

### Typography
```css
--font-primary: 'Inter', sans-serif;
--text-xs: 0.75rem;       /* 12px */
--text-sm: 0.875rem;      /* 14px */
--text-base: 1rem;        /* 16px */
--text-lg: 1.125rem;      /* 18px */
--text-xl: 1.25rem;       /* 20px */
```

### Spacing
```css
--space-1: 0.25rem;       /* 4px */
--space-2: 0.5rem;        /* 8px */
--space-4: 1rem;          /* 16px */
--space-6: 1.5rem;        /* 24px */
--space-8: 2rem;          /* 32px */
```

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🚀 Quick Start

### Import Modules
```javascript
import { BudgetCalculator } from './src/core/budget/BudgetCalculator.js';
import { AccountManager } from './src/core/accounts/AccountManager.js';
import { Logger } from './src/core/utils/Logger.js';
```

### Use Logger
```javascript
Logger.info('BUDGET', 'Calculation started');
Logger.success('BUDGET', 'Calculation completed');
Logger.error('API', 'Request failed');
```

### Use Calculators
```javascript
const accounts = AccountManager.getSpecialAccounts(accountsArray);
const summary = BudgetCalculator.calculateMonthlySummary(monthData, outflows, accounts);
```

## 🧪 Testing

Run tests in browser:
```
http://127.0.0.1:5500/test-utils.html
```

Expected: 21/21 tests passing

## 📁 Project Structure

```
smart-personal-finance/
├── src/core/              # Business logic (14 modules)
├── tests/core/            # Unit tests
├── assets/js/             # Main app code
├── docs/                  # Documentation
└── test-utils.html        # Browser test runner
```

## 📝 Version Update

Update version in `assets/js/app.js`:
```javascript
const APP_VERSION = { major: 4, minor: 0, build: 1 };
```

Then update:
- README.md
- APP_SPEC.md
- CHANGE_LOG.md
- DEVELOPMENT.md
- USER_MANUAL.md
- ARCHITECTURE.md

## 🔧 Debugging

### Enable Debug Logging
```javascript
Logger.setLogLevel(Logger.LOG_LEVELS.DEBUG);
```

### Filter Logs
- By level: DEBUG, INFO, WARN, ERROR
- By category: BUDGET, API, USER, FUNCTION
- By timestamp: Date and time

## 📚 Full Documentation

- **APP_SPEC.md** - Complete application specification
- **API_DOCUMENTATION.md** - Service API reference
- **ARCHITECTURE.md** - Architecture document
- **CHANGE_LOG.md** - Version changelog

---

*Last Updated: 2026-08-13*  
*Version: 4.0.1*
