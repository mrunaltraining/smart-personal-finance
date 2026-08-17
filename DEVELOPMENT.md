# SmartFin – Developer Guide (v5.4.4)

> Local development, testing, and deployment instructions.

## Version Management

**IMPORTANT**: The `APP_VERSION` constant in `assets/js/app.js` is the **single source of truth** for version across the entire app.

### Source of Truth

```javascript
// assets/js/app.js (line 595)
const APP_VERSION = { major: 5, minor: 3, build: 0 };
function getAppVersion() {
    return `v${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.build}`;
}
```

### Version Bumping Methods

#### 1. GitHub Actions (Automatic - Recommended)
When you push to the `main` branch, the workflow `.github/workflows/bump-version.yml` automatically:
- Bumps the build number
- Updates all documentation files
- Commits with `[skip ci]` to prevent infinite loop

#### 2. Manual Script (Linux/Mac)
For manual version bumps (major/minor):
```bash
# From project root
./scripts/bump-version.sh         # Bump build (default)
./scripts/bump-version.sh minor   # Bump minor version
./scripts/bump-version.sh major   # Bump major version
```

#### 3. Manual Script (Windows)
For manual version bumps (major/minor):
```cmd
# From project root
scripts\bump-version.bat         # Bump build (default)
scripts\bump-version.bat minor   # Bump minor version
scripts\bump-version.bat major   # Bump major version
```

### Files Auto-Updated
When version is bumped, these files are automatically updated:
- `assets/js/app.js` (APP_VERSION constant)
- `USER_MANUAL.md` (title and version references)
- `README.md` (version references)
- `APP_SPEC.md` (version references)
- `DEVELOPMENT.md` (title)
- `TO-DO.txt` (version and date)
- `tests/test-utils.html` (title)
- `tests/test.html` (title)
- `CHANGE_LOG.md` (new entry for build bumps)

### Version Bump Guidelines
- **Build (Patch)**: Bug fixes, minor improvements, documentation updates
- **Minor**: New features, enhancements, non-breaking changes
- **Major**: Breaking changes, major architectural changes

## Documentation Maintenance

After making code changes, update documentation:

1. **Content Updates**:
   - Add changelog entry to `CHANGE_LOG.md` with details
   - Update `APP_SPEC.md` if data models or business logic changed
   - Update `USER_MANUAL.md` for user-facing features
   - Update `README.md` for major feature announcements

2. **Version Updates**: Use the version bump scripts or GitHub Actions - do NOT manually update version numbers

## Recent Changes (v5.4.4)

- **Budget calculation refinement**: On-demand items (saving, investment, expenditure, liability) now reduce expenditure account balance and are included in budget surplus calculation. Variable Expenses display excludes on-demand items to show actual spending. On-Demand Items displayed separately with Total Allocated as sum of both.
- **Dashboard enhancements**: Added Saving and Investment account status display. Optimized dashboard notes with concise format showing actual values. Added navigation links to Goals and Gifts tabs. Fixed calculation to use corrected values with fallback for consistency.
- **Icon redesign**: Created compact versions of insight and alert icons (starSmall, checkSmall, lightbulbSmall, hospitalSmall, trendingUpSmall, targetSmall, alertSmall, shieldCheckSmall, creditCardSmall, calendarSmall, bellSmall) for better fit in UI cards.
- **UI layout improvements**: Summary grid changed to fixed 4 columns (desktop) / 2 columns (mobile) for consistent layout. Removed fixed min-height from summary items for even distribution. Reduced icon sizes (28px) for insights and alerts.
- **Responsive improvements**: Added responsive sizing for app tagline to scale with screen size.

## Recent Changes (v5.4.4)

- **UI system refresh**: unified headers, icon navigation, divider-based summaries, refined charts, and responsive list/form presentation.
- **Expense tracking fix**: summary updates now target the Expense Tracking total rather than the Budget total.

### New Features
- **User Location Field**: Added to registration and Firestore data model (`userLocation`)
- **Dashboard Enhancements**: Budget surplus, cumulative goals, preparedness metrics, 6-month trend chart
- **Insurance Calculations**: Realistic formulas in `dashboard.js` for Health & Term insurance
- **Gifts Date Field**: Optional date tracking with monthly chart visualization
- **PDF Export**: Dashboard summary download functionality
- **Tax Calculation Fix**: Only counts recurring contributions (excludes one-time/current values)

### Modified Files
- `index.html`: Location dropdown, gifts date field, PDF button, dashboard chart canvas
- `assets/js/app.js`: Tax calculation logic, gifts summary, location handling
- `assets/js/modules/dashboard.js`: Enhanced calculations, 6-month chart, preparedness formulas
- `assets/css/styles.css`: Compact dashboard cards, responsive grid (3-column → 2-column → 1-column)
- `APP_SPEC.md`: Updated to v5.4.4 with all new features documented

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Firebase Setup (Required)](#3-firebase-setup-required)
4. [Running Locally](#4-running-locally)
5. [Running Tests](#5-running-tests)
6. [Making Changes](#6-making-changes)
7. [Firestore Security Rules](#7-firestore-security-rules)
8. [Deploying to GitHub Pages](#8-deploying-to-github-pages)
9. [Deploying to Firebase Hosting (Alternative)](#9-deploying-to-firebase-hosting-alternative)
10. [Environment Checklist](#10-environment-checklist)
11. [Troubleshooting](#11-troubleshooting)
12. [Logging System](#12-logging-system)

---

## 1. Prerequisites

No build tools, bundlers, or package managers are required. The app is pure HTML/CSS/JS.

| Tool | Required | Purpose |
|------|----------|---------|
| Any modern browser | ✅ Yes | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| A local HTTP server | ✅ Yes | Firebase SDK needs HTTP (not `file://`) |
| Firebase account | ✅ Yes | Auth + Firestore for login and data sync |
| Git | Optional | Version control and GitHub Pages deployment |
| Python 3 / Node.js | Optional | Quick local HTTP server |
| VS Code + Live Server | Optional | Best developer experience |

> **Why a local server?**  
> Firebase Auth requires the page to be served over `http://` or `https://`. Opening `index.html` directly as a `file://` URL will cause Firebase to fail silently.

---

## 2. Project Structure

```
smart-financial-planning/
├── index.html                  # Single-page app — all UI panels live here
├── assets/
│   ├── css/
│   │   └── styles.css          # All styles — dark theme + responsive breakpoints
│   └── js/
│       ├── firebase-config.js  # ← YOUR CREDENTIALS GO HERE (never commit real keys publicly)
│       └── app.js              # All application logic (~3250 lines, no dependencies)
├── test.html                   # Standalone unit test runner (open in browser)
├── architecture.md             # HLD / LLD / DFD / Sequence diagrams
├── DEVELOPMENT.md              # This file
├── README.md                   # Project overview
└── USER_MANUAL.md              # End-user guide
```

---

## 3. Firebase Setup (Required)

This is a one-time step before any local or deployed run will work.

### Step 1 — Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name (e.g. `smartfin-app`) → Continue
3. Disable Google Analytics if not needed → **Create project**

### Step 2 — Enable Authentication

1. In the left sidebar: **Build → Authentication → Get started**
2. Click **Email/Password** provider → toggle **Enable** → Save

### Step 3 — Create Firestore Database

1. In the left sidebar: **Build → Firestore Database → Create database**
2. Choose **Start in test mode** (you will tighten this later — see [Section 7](#7-firestore-security-rules))
3. Pick a region close to you (e.g. `asia-south1` for India) → **Enable**

### Step 4 — Register Web App

1. In **Project Overview**, click the `</>` (Web) icon
2. Give the app a nickname (e.g. `smartfin-web`) → **Register app**
3. Copy the `firebaseConfig` object shown

### Step 5 — Paste Config

Open `assets/js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
    apiKey:            "AIzaSy...",          // ← paste your values
    authDomain:        "your-id.firebaseapp.com",
    projectId:         "your-id",
    storageBucket:     "your-id.appspot.com",
    messagingSenderId: "123456789",
    appId:             "1:123456789:web:abc123"
};
```

> ⚠️ **Security note:** For a personal private app these values are safe to commit — they are not secret keys, they are *client identifiers*. Firebase security is enforced server-side via Security Rules (Section 7). If you are open-sourcing the repo, consider using a `.env` approach or GitHub Actions secrets.

---

## 4. Running Locally

### Option A — VS Code Live Server (Recommended)

1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**
3. App opens at `http://127.0.0.1:5500`
4. Changes to HTML/CSS/JS auto-reload the page

### Option B — Python (no install needed on most systems)

```bash
# Python 3
python -m http.server 8080

# Then open:
# http://localhost:8080
```

### Option C — Node.js (npx)

```bash
npx serve .

# Then open the URL shown in the terminal (usually http://localhost:3000)
```

### Option D — Node.js http-server

```bash
npm install -g http-server
http-server -p 8080

# Then open:
# http://localhost:8080
```

### Verify it works

1. The SmartFin login screen should appear
2. Register a new account with any email/password
3. You should be taken to the app dashboard
4. Check the browser console — no Firebase errors should appear

---

## 5. Running Tests

The test suite is a standalone HTML file with no dependencies or build step.

### Run automated unit tests

1. Start your local server (any option from Section 4)
2. Navigate to `http://localhost:8080/test.html`
3. Click **▶ Run All Tests**
4. All 42+ tests should show **PASS** (green)

### What the tests cover

| Category | Tests |
|----------|-------|
| `DEFAULT_TABS` structure | 10 tabs, correct IDs, no removed tabs (`misc`, `oneTimeBudget`) |
| `TAB_FIELDS` definitions | Field counts and required field presence including Frequency in Liabilities |
| `MONTHLY_BUDGET_CATEGORIES` | Inflow (5 fields), Outflow (12 fields incl. variableExpenditure), On-Demand Outflow (4 fields) |
| `formatMoney()` | Indian number format, null/undefined safety, negative values |
| `esc()` | HTML entity escaping, XSS prevention |
| `getMonthKey()` | Month key format `YYYY-MM`, zero-padding |
| Emergency Fund status | LOW / GOOD / READY / NO DATA thresholds |
| Annual summary totals | Income, expenses, investing, savings arithmetic |
| Tax calculation | New regime slabs, 4% cess inclusion |
| Custom tab ID generation | Slug format, special character stripping |
| Card sort order | Primary → Saving → others by balance descending |

### Manual test checklist

Open `test.html` in a browser — the **Manual Testing Checklist** section lists every critical user flow to verify by hand, including auth, cross-device sync, export, reset, Liabilities frequency field, Monthly Budget on-demand fields, Accounts purpose validation, and budget edit cancel.

---

## 6. Making Changes

### CSS changes

Edit `assets/css/styles.css` directly. The file is structured in sections:

```
/* Reset & Base */          lines ~1–35
/* Auth Screen */           lines ~36–85
/* Form Fields & Buttons */ lines ~86–240
/* App Shell & Header */    lines ~241–310
/* Tab Bar */               lines ~294–332
/* Dashboard Grid */        lines ~333–375
/* Work Area */             lines ~376–500+
/* Tab-specific UIs */      lines ~500–1760
/* Annual Summary */        lines ~1766–1851
/* Responsive breakpoints */lines ~1853–end
```

Responsive breakpoints in order:
- `≥ 1100px` — desktop wide optimizations
- `≤ 860px` — narrow tablet / large phone
- `≤ 520px` — mobile phone
- `≤ 360px` — very small phones

### JavaScript changes

All logic is in `assets/js/app.js`. Key sections:

```
lines 1–94      TAB_FIELDS and DEFAULT_TABS config (includes Frequency in Liabilities, purposeOther in Cards)
lines 96–165    MONTHLY_BUDGET_CATEGORIES config (inflow, outflow with variableExpenditure, investing)
lines 167–310   DOM references
lines 312–335   App state variables
lines 340–460   Firebase Auth + Firestore listeners
lines 462–505   Utility: formatMoney, esc, activeEntries, setActiveEntries
lines 507–660   render() dispatch and renderTabs()
lines 1240–1341 applyMonthlyAutoValues() (auto-calc fields, variable expenditure)
lines 1381–1475 renderMonthlyBudget() (closed month handling, edit mode)
lines 1477–1514 renderCategoryPreview() (shows auto-linked fields even at ₹0)
lines 3381–3500 calculateEmergencyFundSummary() (fixed obligations + avg variable)
lines 3800–3990 calculateAndDisplaySummary() (budget status, transfer, close month)
lines 4430–4455 toggleBudgetEdit (blocks closed months)
lines 4457–4520 Execute Transfer handler (blocks: no income, already done, closed)
lines 4557–4595 Close Current Month Budget handler
lines 4597–4645 Mid-Month Quick Update handlers (exp balance + CC only)
lines 4700+     handleCategoryFieldChange, addCardEntry, all event listeners
```

### Adding a new tab

1. Add entry to `DEFAULT_TABS` in `app.js` (lines 3–14)
2. Add field definitions to `TAB_FIELDS` (lines 17–94)
3. Add a `<div id="newTabUI">` section in `index.html` with your UI
4. Add DOM reference constants in `app.js` (~lines 127–304)
5. Add `isNewTabEditMode` state variable (~lines 306–329)
6. Add render branch in `render()` (~lines 496–651)
7. Write `renderNewTab()` function
8. Write `addNewTabEntry()` function
9. Add event listeners at the bottom of `app.js`

### HTML changes

`index.html` is a single file. All UI panels are `<div>` elements with `hidden` attribute — only one is shown at a time via JavaScript. Do not add `<script>` tags with literal `</script>` strings inside them (use `<\/script>` instead).

---

## 7. Firestore Security Rules

The default "test mode" rules allow anyone to read/write. Before sharing or deploying publicly, tighten the rules so users can only access their own data.

### Recommended rules

In Firebase Console → **Firestore Database → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read and write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish**. This ensures:
- ✅ Authenticated users can only read/write `/users/{their own uid}`
- ✅ No user can access another user's data
- ✅ Unauthenticated requests are rejected entirely

---

## 8. Deploying to GitHub Pages

GitHub Pages serves static files for free. No server-side code is needed since the app is purely client-side.

### Step 1 — Create GitHub repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/smart-financial-planning.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / `(root)` → **Save**
5. After ~60 seconds your site is live at:  
   `https://<your-username>.github.io/smart-financial-planning/`

### Step 3 — Authorize the domain in Firebase

Firebase Auth blocks requests from unauthorized domains.

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **Add domain**
3. Enter: `<your-username>.github.io`
4. Click **Add**

### Step 4 — Verify deployment

1. Open `https://<your-username>.github.io/smart-financial-planning/`
2. The login screen should appear
3. Register or sign in — if Firebase Auth is not authorized you will see a network error in the console

### Updating after changes

```bash
git add .
git commit -m "describe your change"
git push
```

GitHub Pages redeploys automatically within ~30 seconds of a push to `main`.

---

## 9. Deploying to Firebase Hosting (Alternative)

Firebase Hosting is faster (CDN-backed) and integrates natively with Firebase Auth — no domain authorization step needed.

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login and initialize

```bash
firebase login
firebase init hosting
```

When prompted:
- **Public directory:** `.` (root of the project)
- **Configure as single-page app:** `No`
- **Set up automatic builds with GitHub:** `No` (unless you want CI/CD)
- **Overwrite index.html:** `No`

This creates `firebase.json` and `.firebaserc` in your project root.

### Deploy

```bash
firebase deploy --only hosting
```

Your app will be live at:  
`https://<your-project-id>.web.app`

### Update `firebase.json` to prevent caching JS/CSS

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

---

## 10. Environment Checklist

Run through this before considering any deployment complete.

### Firebase setup
- [ ] `firebase-config.js` has real values (not `YOUR_API_KEY`)
- [ ] Firebase Auth → Email/Password sign-in enabled
- [ ] Firestore database created and in active state
- [ ] Firestore Security Rules tightened (not test mode)
- [ ] Deployment domain added to Firebase Authorized Domains

### Local test
- [ ] App loads on `http://localhost:xxxx` without console errors
- [ ] Register a new user — account created, redirected to app
- [ ] Sign out and sign back in — data persists
- [ ] All 10 tabs render without errors
- [ ] Monthly Budget: enter Primary Income (salary balance updates), Execute Transfer (salary → ₹0, exp/saving/investment credited), mid-month Quick Update (exp balance + CC), Close Month (read-only), navigate months
- [ ] Budget: verify transfer blocks (no income, already done, month closed), close blocks (no transfer, already closed)
- [ ] Budget: verify budget status banner shows correct state (no accounts, no income, surplus, over budget, balanced, closed)
- [ ] Budget: verify variableExpenditure appears in Cash Outflow preview (auto badge, even at ₹0)
- [ ] Outflow: add Monthly/Quarterly/Annual items, verify all types auto-populate budget (Liability, Insurance, Saving, Investment, Expenditure). One-Time items must NOT auto-populate.
- [ ] Accounts: test Primary account enforcement, test Saving account limit, verify sort order (Primary → Saving → balance desc)
- [ ] Emergency Fund: verify calculation uses fixed obligations + avg variable (excludes saving/investment), 3/6/12 month scenarios shown
- [ ] Export Excel downloads `.xlsx` file
- [ ] Reset All Data clears everything after typing `DELETE`
- [ ] `test.html` → all automated tests pass

### Deployment
- [ ] `git status` shows no uncommitted changes
- [ ] Live URL opens correctly in browser
- [ ] Auth works on live URL (not just localhost)
- [ ] Tested on mobile browser (Chrome/Safari on phone)

---

## 11. Troubleshooting

### Firebase Auth error on login
**Symptom:** Red error message on login, or console shows `auth/unauthorized-domain`  
**Fix:** Add the domain (e.g. `localhost`, `127.0.0.1`, `yourusername.github.io`) to Firebase Console → Authentication → Settings → Authorized domains

### App shows blank page / no UI
**Symptom:** White/black screen, no login form  
**Fix:** Open browser DevTools (F12) → Console tab. If you see `firebase is not defined`, the Firebase CDN scripts failed to load — check your internet connection. If you see a syntax error, check `app.js` for a recent edit.

### Data not saving / spinner forever
**Symptom:** Entries added but disappear on refresh  
**Fix:** Check Firestore Security Rules — if rules are too strict they silently block writes. Temporarily switch to test mode to confirm.

### `file://` URL doesn't work
**Symptom:** Login appears but Firebase crashes immediately  
**Fix:** You must serve via HTTP. Use any option from [Section 4](#4-running-locally). Firebase does not work with `file://` protocol.

### Changes not reflecting after deploy
**Symptom:** Old version still showing after `git push`  
**Fix:** Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to bypass browser cache. On GitHub Pages, allow up to 2 minutes for CDN propagation.

### Test suite shows FAIL
**Symptom:** One or more tests in `test.html` fail  
**Fix:** The test file contains stub implementations that mirror `app.js` logic. If you changed `DEFAULT_TABS`, `TAB_FIELDS`, `MONTHLY_BUDGET_CATEGORIES`, `formatMoney`, the card sort function, or the tax/emergency fund calculation, update the corresponding stubs and expected values in `test.html`.

### Chart not rendering
**Symptom:** Canvas area is empty, console shows `Chart is not defined`  
**Fix:** Chart.js CDN failed to load. Check network connection. The CDN URL is `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` — verify it loads in the browser.

---

## 12. Logging System

The app includes a comprehensive logging system for debugging and monitoring application behavior.

### Overview

**Location:** `assets/js/app.js` (lines 3-227 for AppLogger class, lines 229-425 for logs panel UI)

**Features:**
- Centralized logging service with levels (info, warning, error)
- Device tracking (unique device ID in localStorage)
- User tracking (when logged in)
- Offline queue system (logs queued when offline, flushed when online)
- Auto-flush every 30 seconds
- Firebase Firestore storage (collection: `app_logs`)
- LocalStorage fallback (key: `app_logs_local`)

### Log Levels

- **info:** General operational messages
- **warning:** Non-critical issues that need attention
- **error:** Critical failures that prevent normal operation

### Usage

**Basic logging:**
```javascript
logger.info('User action', { action: 'edit', itemId: '123' });
logger.warning('Low balance', { amount: 100 });
logger.error('Operation failed', { error: error.message });
```

**With context:**
```javascript
logger.info('Settlement successful', { 
    monthKey, 
    settleAmount, 
    previousBalance,
    newBalance 
});
```

### Accessing Logs

**Location:** Settings → Data Management → "View Logs"

**Features:**
- Log level filter (All, Info, Warning, Error)
- Auto-refresh every 10 seconds
- Manual refresh button
- Export logs to JSON
- Clear local logs
- Statistics display (total, info, warning, error counts)
- Color-coded entries (blue=info, yellow=warning, red=error)

### Firebase Setup

**Collection:** `app_logs`

**Required indexes** (for performance):
- `timestamp` (descending)
- `level`
- `userId`
- `deviceId`

**Security Rules Example:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app_logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.token.admin === true);
    }
  }
}
```

### Instrumented Functions

Currently instrumented with logging:

1. **Auto-Values Application** - Logs when monthly auto values are applied
2. **Data Save** - Logs save operations, successes, failures, retries
3. **CC Settlement** - Logs settlement operations with amounts
4. **Data Export** - Logs export initiation and success
5. **Data Import** - Logs import with filename, file path, file size
6. **Quick Update - Salary Balance** - Logs balance updates with old/new values
7. **Quick Update - Expenditure Balance** - Logs balance updates and variable expenditure calculation
8. **Quick Update - CC Spending** - Logs CC spending updates with old/new amounts

### Adding More Logging

To add logging to a function:

```javascript
logger.info('Descriptive message', { 
    key: 'value',
    additionalContext: 'data'
});
```

### Log Entry Structure

```javascript
{
    timestamp: "2024-07-04T10:30:00.000Z",
    level: "info|warning|error",
    message: "Log message",
    userId: "user123",  // Optional
    deviceId: "device_1234567890_abc123",
    userAgent: "Browser user agent string",
    url: "Current page URL",
    context: {  // Additional contextual data
        key: "value"
    }
}
```

### Performance Considerations

- **Queue size:** Max 100 logs (older entries trimmed)
- **Auto-flush:** Every 30 seconds
- **LocalStorage fallback:** Used when Firebase unavailable
- **Firebase costs:** Monitor usage; adjust flush interval if needed
