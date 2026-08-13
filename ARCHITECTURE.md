# SmartFin – Architecture Document

> Version 2.4.0 | August 2026

## Version History

- **v2.4.0** (Aug 2026): Added Expense Tracking tab with category-wise breakdown, pie charts, budget comparison, mobile-friendly tooltips, responsive design improvements, dashboard layout reorganization
- **v2.0.4** (Jan 2026): Enhanced dashboard with preparedness metrics, 6-month trend chart, location-based insurance calculations, gifts tracking improvements, PDF export, fixed tax calculations
- **v2.0.3** (Aug 2025): Streamlined dashboard, unified net worth source
- **v2.0.2** (Jun 2025): Initial modular architecture

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [High-Level Design (HLD)](#2-high-level-design-hld)
3. [Low-Level Design (LLD)](#3-low-level-design-lld)
4. [Data Flow Diagrams (DFD)](#4-data-flow-diagrams-dfd)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [Data Schema](#6-data-schema)
7. [Final Review Findings](#7-final-review-findings)

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Markup | HTML5 | Single-page app shell, all UI panels |
| Styling | CSS3 + CSS Variables | Dark theme, responsive grid layouts |
| Logic | Vanilla JavaScript (ES2022, strict mode) | All app logic, rendering, calculations |
| Auth | Firebase Authentication (Email/Password) | User login, registration, session |
| Database | Firebase Firestore (NoSQL) | Real-time data sync across devices |
| Charts | Chart.js 4.4 (CDN) | Pie chart, bar charts, net worth projection |
| Export | SheetJS / XLSX 0.20 (CDN) | Export data to `.xlsx` Excel files |
| Hosting | GitHub Pages (static) | Zero-server deployment |
| Fonts | Google Fonts — Inter | UI typography |

---

## 2. High-Level Design (HLD)

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│  ┌──────────────┐   ┌──────────────────────────────────────┐ │
│  │  index.html  │   │           assets/js/app.js           │ │
│  │  (UI Shell)  │◄──│  Auth │ Render │ CRUD │ Sync │ Export│ │
│  └──────────────┘   └──────────────────────────────────────┘ │
│         │                          │                         │
│  ┌──────────────┐   ┌──────────────────────────────────────┐ │
│  │styles.css    │   │     firebase-config.js               │ │
│  │(Responsive   │   │     (Firebase init + credentials)    │ │
│  │ Layout)      │   └──────────────────────────────────────┘ │
│  └──────────────┘                  │                         │
└───────────────────────────────────┼──────────────────────────┘
                                    │ HTTPS
                    ┌───────────────┼───────────────┐
                    │         Firebase Cloud         │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │  Firebase Auth           │  │
                    │  │  (Email/Password)        │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │  Cloud Firestore         │  │
                    │  │  /users/{uid}            │  │
                    │  │  • tabData               │  │
                    │  │  • monthlyBudgetData     │  │
                    │  │  • customTabs            │  │
                    │  │  • userName              │  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
```

### 2.2 Component Map

```mermaid
graph TD
    A[SmartFin SPA] --> B[Auth Module]
    A --> C[Tab Manager]
    A --> D[Render Engine]
    A --> E[Data Layer]
    A --> F[Export Module]

    B --> B1[Login / Register]
    B --> B2[Firebase Auth SDK]
    B --> B3[Session Management]

    C --> C1[Default Tabs × 10]
    C --> C2[Custom Tabs]
    C --> C3[Tab Bar Renderer]

    D --> D1[Monthly Budget UI]
    D --> D2[Financial Goal UI]
    D --> D3[Investments UI]
    D --> D4[Insurances UI]
    D --> D5[Cards UI]
    D --> D6[Net Worth UI]
    D --> D7[Tax Plan UI]
    D --> D8[Gifts UI]
    D --> D9[Emergency Fund UI]
    D --> D10[Standard Table UI]

    D1 --> D1a[Monthly View]
    D1 --> D1b[Annual Summary View]

    E --> E1[Firestore onSnapshot listener]
    E --> E2[scheduleSave / doSave]
    E --> E3[resetAllData]

    F --> F1[SheetJS XLSX export]
```

### 2.3 Deployment View

```
┌─────────────────────────────────────────────────────┐
│               GitHub Pages (Static Hosting)          │
│                                                     │
│   index.html ──────────────────────── /             │
│   assets/css/styles.css ──────── /assets/css/       │
│   assets/js/app.js ───────────── /assets/js/        │
│   assets/js/firebase-config.js ──/assets/js/        │
│   architecture.md                                   │
│   README.md                                         │
│   USER_MANUAL.md                                    │
│   test.html                                         │
└────────────────────┬────────────────────────────────┘
                     │ CDN dependencies (runtime)
          ┌──────────┼──────────┐
          ▼          ▼          ▼
     gstatic.com  jsdelivr.net  sheetjs.com
     (Firebase)   (Chart.js)    (XLSX)
```

---

## 3. Low-Level Design (LLD)

### 3.1 Module Breakdown

```mermaid
graph LR
    subgraph "State Variables"
        S1[appData]
        S2[activeTabId]
        S3[currentUser]
        S4[currentMonth]
        S5[isXxxEditMode × 9]
        S6[isAnnualBudgetView]
        S7[pieChart / barCharts]
    end

    subgraph "Core Functions"
        F1[render]
        F2[renderTabs]
        F3[renderMonthlyBudget]
        F4[renderFinancialGoal]
        F5[renderInvestments]
        F6[renderNetWorth]
        F7[renderTaxPlan]
        F8[renderEmergencyFund]
        F9[calculateAnnualSummary]
        F10[calculateEmergencyFundSummary]
    end

    subgraph "Data Functions"
        D1[startListening]
        D2[stopListening]
        D3[scheduleSave]
        D4[doSave]
        D5[activeEntries]
        D6[setActiveEntries]
        D7[resetAllData]
    end

    subgraph "Entry Functions"
        E1[addEntry]
        E2[addGoalEntry]
        E3[addExpenseEntry]
        E4[addInvestmentEntry]
        E5[addInsuranceEntry]
        E6[addCardEntry]
        E7[addNetWorthEntry]
        E8[addTaxPlanEntry]
        E9[addGiftsEntry]
        E10[addEmergencyFundEntry]
        E11[deleteEntry]
    end

    subgraph "Utility Functions"
        U1[formatMoney]
        U2[esc]
        U3[getMonthKey]
        U4[friendlyError]
        U5[exportToExcel]
    end

    F1 --> F2
    F1 --> F3
    F1 --> F4
    F3 --> F9
    F8 --> F10
    D5 --> S1
    D6 --> S1
    D6 --> D3
    D3 --> D4
    D4 --> S3
```

### 3.2 appData Schema

```mermaid
classDiagram
    class appData {
        +string userName
        +Object tabData
        +Object monthlyBudgetData
        +Array customTabs
    }

    class tabData {
        +Array financialGoal
        +Array monthlyFixedExpense
        +Array investments
        +Array insurances
        +Array cards
        +Array netWorth
        +Array taxPlan
        +Array gifts
        +Array emergencyFund
        +Array customTabId
    }

    class monthlyBudgetData {
        +Object "YYYY-MM"
    }

    class MonthEntry {
        +Object inflow
        +Object outflow
        +Object investing
        +Object autoLinkedFields
        +Object autoLinkedBreakdown
        +number _transferDone
        +number _initialBalance
        +boolean _monthClosed
        +number _carryForwardDone
    }

    class TabEntry {
        +string id
        +string name
        +number planned
        +number actual
        +string date
        +string note
    }

    class CustomTab {
        +string id
        +string label
        +string color
        +string text
    }

    appData "1" --> "1" tabData
    appData "1" --> "1" monthlyBudgetData
    appData "1" --> "*" CustomTab
    tabData "1" --> "*" TabEntry
    monthlyBudgetData "1" --> "*" MonthEntry
```

### 3.3 Render Decision Tree

```
render()
    │
    ├─ activeTabId === "monthlyBudget"
    │       └─ renderMonthlyBudget()
    │               ├─ isAnnualBudgetView? → calculateAnnualSummary()
    │               └─ else
    │                   ├─ isBudgetEditMode? → renderCategoryFields()
    │                   └─ else → renderCategoryPreview() + renderPieChart()
    │
    ├─ activeTabId === "financialGoal"
    │       └─ renderFinancialGoal()
    │               ├─ isGoalEditMode? → renderGoalDynamicFields() + renderGoalTable()
    │               └─ else → renderGoalPreviewCards()
    │
    ├─ activeTabId === "investments"
    │       └─ renderInvestments()
    │               └─ renderInvestmentChart() + renderInvestmentPreviewCards()
    │
    ├─ activeTabId === "netWorth"
    │       └─ renderNetWorth()
    │               └─ renderNetWorthProjectionChart()
    │
    ├─ activeTabId === "taxPlan"
    │       └─ renderTaxPlan()
    │               └─ renderTaxBreakdown() [new + old regime calc]
    │
    ├─ activeTabId === "emergencyFund"
    │       └─ renderEmergencyFund()
    │               └─ calculateEmergencyFundSummary() [status: LOW/GOOD/READY/NO DATA]
    │
    └─ else (standard tab / custom tab)
            └─ renderDynamicFields() + renderRows() + renderSummary()
```

### 3.4 Save Pipeline

```
User Action (input change / form submit)
        │
        ▼
setActiveEntries(entries)
   or direct appData mutation
        │
        ▼
scheduleSave()           ◄─── debounce 600ms
        │
        ▼
doSave()
        │
        ▼
db.collection("users").doc(uid).set(appData)
        │
        ▼
Firestore Cloud (persisted)
        │
        ▼ (onSnapshot fires on ALL devices logged in with same account)
startListening() → appData updated → render()
```

---

## 4. Data Flow Diagrams (DFD)

### 4.1 Level 0 – Context Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
  ─── Login ───────►│                                 │──── Auth Token ────►
                    │                                 │
  ─── Add Data ────►│         SmartFin App            │──── Saved Data ────►
                    │                                 │
  ─── Edit/Delete ─►│                                 │◄─── Real-time Sync ─
                    │                                 │
  ◄─ Reports/Charts─│                                 │──── Export .xlsx ──►
                    │                                 │
  ─── Reset Data ──►│                                 │
                    └─────────────────────────────────┘
         User                                              Firebase Cloud
```

### 4.2 Level 1 – Process Decomposition

```mermaid
flowchart TD
    U([User]) -- credentials --> P1
    P1[1.0 Authentication] -- uid + token --> P2
    P1 -- error msg --> U

    P2[2.0 Load Data] -- appData --> P3
    Firestore[(Firestore\n/users/uid)] -- onSnapshot --> P2
    P2 -- listen subscription --> Firestore

    P3[3.0 Render UI] -- DOM updates --> UI([Browser UI])
    UI -- tab click --> P4
    UI -- form submit --> P5
    UI -- delete click --> P6

    P4[4.0 Switch Tab] -- activeTabId --> P3

    P5[5.0 Add Entry] -- new entry --> P7
    P6[6.0 Delete Entry] -- filtered entries --> P7

    P7[7.0 Persist Data] -- scheduleSave --> P8
    P8[8.0 doSave] -- appData --> Firestore

    UI -- export click --> P9
    P9[9.0 Export XLSX] -- .xlsx file --> FS([File System])

    UI -- reset click + DELETE --> P10
    P10[10.0 Reset All Data] -- empty appData --> P8

    UI -- annual toggle --> P11
    P11[11.0 Annual Summary] -- totals + breakdown --> UI

    UI -- emergency fund --> P12
    P12[12.0 Emergency Fund Calc] -- status badge + months covered --> UI
```

### 4.3 Monthly Budget Data Flow

```
User types value in category field
        │
        ▼
handleCategoryFieldChange(event)
        │
        ├── reads: e.target.dataset.fieldId (e.g. "rent")
        ├── reads: e.target.parentElement.parentElement.id (e.g. "outflowFields")
        │
        ▼
appData.monthlyBudgetData[YYYY-MM][category][fieldId] = value
        │
        ├── updates: inflowTotalEdit / outflowTotalEdit / investingTotalEdit (live)
        ├── if primaryIncome changed: auto-updates salary account balance
        ├── calls:   calculateAndDisplaySummary(monthData)
        ├── calls:   renderPieChart(monthData)
        └── calls:   scheduleSave()
```

Current and future monthly budget records also maintain `autoLinkedFields`, populated from Investments and Liabilities. Auto-linked budget fields are disabled in the monthly editor and should be changed only in their source tab. Historical months are not re-linked automatically, preserving older calculations after future source changes.

---

## 5. Sequence Diagrams

### 5.1 User Login / Registration

```mermaid
sequenceDiagram
    actor User
    participant UI as index.html
    participant App as app.js
    participant Auth as Firebase Auth
    participant DB as Firestore

    User->>UI: Fill email + password + (name if register)
    UI->>App: authForm submit event
    App->>Auth: createUserWithEmailAndPassword(email, pwd)
    Auth-->>App: UserCredential { uid }
    App->>DB: users/{uid}.set({ tabData, customTabs, userName, monthlyBudgetData })
    DB-->>App: write confirmed
    App->>Auth: onAuthStateChanged fires
    Auth-->>App: user object
    App->>UI: authScreen.hidden=true, appScreen.hidden=false
    App->>DB: onSnapshot listener starts
    DB-->>App: initial appData snapshot
    App->>UI: render() — full UI drawn
```

### 5.2 Adding an Entry (Standard Tab)

```mermaid
sequenceDiagram
    actor User
    participant UI as Browser DOM
    participant App as app.js
    participant DB as Firestore

    User->>UI: Fill form fields, click "Add"
    UI->>App: entryForm submit event
    App->>App: addEntry(event)
    App->>App: read field values from fieldInputs map
    App->>App: validate (name required, amounts ≥ 0)
    App->>App: entry = { id: Date.now(), ...fields }
    App->>App: entries.unshift(entry)
    App->>App: setActiveEntries(entries)
    App->>App: scheduleSave() — debounce 600ms
    App->>App: render()
    App->>UI: table row injected, summary metrics updated
    Note over App,DB: 600ms later...
    App->>DB: users/{uid}.set(appData)
    DB-->>App: write confirmed
```

### 5.3 Real-Time Sync Across Two Devices

```mermaid
sequenceDiagram
    participant DevA as Device A (PC)
    participant DB as Firestore
    participant DevB as Device B (Phone)

    Note over DevA,DevB: Both logged in with same account
    DevA->>DB: onSnapshot listening
    DevB->>DB: onSnapshot listening

    DevA->>DB: Add investment entry → doSave()
    DB-->>DevA: onSnapshot fires (own write)
    DB-->>DevB: onSnapshot fires (cross-device sync)

    DevB->>DevB: appData updated
    DevB->>DevB: render() called
    DevB->>DevB: New entry appears automatically

    Note over DevA,DevB: Last write wins — no conflict merge
```

### 5.4 Monthly Budget – Annual View Toggle

```mermaid
sequenceDiagram
    actor User
    participant UI as Browser DOM
    participant App as app.js

    User->>UI: Click "📊 Annual" button
    UI->>App: toggleBudgetView click event
    App->>App: isAnnualBudgetView = true
    App->>App: toggleBudgetView.textContent = "📅 Monthly"
    App->>App: renderMonthlyBudget()
    App->>App: annualSummarySection.hidden = false
    App->>App: monthlyViewSection.hidden = true
    App->>App: calculateAnnualSummary()
    App->>App: build Apr-Mar financial-year month keys
    App->>App: sum income, expenditure, saving, investment, liability, insurance, other (recurring outflow only, excludes on-demand)
    App->>App: sort FY months desc (using "YYYY-MM-01" dates)
    App->>UI: annual total cards updated for all six outflow sections plus income
    App->>UI: monthly average cards updated for the same sections
    App->>UI: monthly breakdown list rendered

    User->>UI: Click "📅 Monthly" button
    UI->>App: toggleBudgetView click event
    App->>App: isAnnualBudgetView = false
    App->>App: renderMonthlyBudget() — shows monthly view
```

### 5.5 Reset All Data

```mermaid
sequenceDiagram
    actor User
    participant UI as Browser
    participant App as app.js
    participant DB as Firestore

    User->>UI: Click "Reset All Data"
    UI->>App: resetAllData()
    App->>User: confirm() — warning dialog
    User->>App: OK
    App->>User: prompt("Type DELETE to confirm")
    User->>App: "DELETE"
    App->>App: appData = { tabData:{}, monthlyBudgetData:{}, customTabs:[], userName: preserved }
    App->>DB: doSave() — overwrites Firestore with empty data
    DB-->>App: write confirmed
    App->>App: render()
    App->>UI: All tabs show empty state
    App->>User: alert("✅ All data deleted")
    Note over App,DB: onSnapshot will fire and confirm cleared state
```

### 5.6 Emergency Fund Status Calculation

```mermaid
sequenceDiagram
    participant App as app.js
    participant MB as monthlyBudgetData
    participant EF as Emergency Fund Entries
    participant UI as Status Badge

    App->>App: fixedObligations = sum Outflow items (type=Liability/Insurance), monthly equivalent
    App->>App: fixedExpenditure = sum Outflow items (type=Expenditure), monthly equivalent
    App->>MB: read variable expense fields across all months with data
    App->>App: avgVariable = average of (utilityBills + familyExp + misc + debtRepayment + CC + ondemandExp + ondemandLiability)
    App->>App: minimumMonthlyNeed = fixedObligations + fixedExpenditure + avgVariable

    alt No outflow or budget data
        App->>UI: badge = "NO DATA" (yellow)
    else Data available
        App->>EF: read entries[0].currentFund
        App->>App: monthsCovered = currentFund / minimumMonthlyNeed

        alt monthsCovered >= 12
            App->>UI: badge = "EXCELLENT" (green)
        else monthsCovered >= 6
            App->>UI: badge = "READY" (green)
        else monthsCovered >= 3
            App->>UI: badge = "ADEQUATE" (yellow)
        else
            App->>UI: badge = "LOW" (red)
        end

        App->>UI: 3/6/12 month scenarios displayed
        App->>UI: shortfall = max(0, 6×monthlyNeed - currentFund)
        App->>UI: breakdown: fixedObligations, fixedExpenditure, avgVariable
    end
```

---

## 6. Data Schema

### 6.1 Firestore Document — `/users/{uid}`

```json
{
  "userName": "Mrunal Muduli",
  "tabData": {
    "financialGoal": [
      { "id": "1748374923001", "name": "Car", "amountNeeded": 800000,
        "amountAccumulated": 200000, "targetDate": "2027-06-01",
        "goalType": "Mid Term", "status": "Ongoing", "details": "" }
    ],
    "investments": [
      { "id": "1748374923002", "name": "HDFC SIP", "initialInvestment": 5000,
        "totalAmount": 65000, "frequency": "Monthly",
        "startDate": "2024-01-01", "maturityDate": "2030-01-01", "details": "" }
    ],
    "emergencyFund": [
      { "id": "1748374923003", "currentFund": 150000, "details": "FD + Savings" }
    ]
  },
  "monthlyBudgetData": {
    "2026-05": {
      "inflow":    { "primaryIncome": 80000, "secondaryIncome": 5000 },
      "outflow":   { "loanEMI": 107000, "insurancePremiums": 5000, "fixedSaving": 45000, "fixedInvestment": 121000, "fixedExpenditure": 10000, "variableExpenditure": 15000, "creditCardOutstanding": 30000, "midMonthCCOutstanding": 27819, "utilityBills": 1504 },
      "investing": { "onetimeInvestment": 10000 },
      "_transferDone": 92000,
      "_initialBalance": 92000,
      "_monthClosed": true,
      "_carryForwardDone": 5000
    },
    "2026-04": { "inflow": {}, "outflow": {}, "investing": {} }
  },
  "customTabs": [
    { "id": "my-wedding-2026-1748374923004", "label": "My Wedding 2026",
      "color": "#333", "text": "#fff" }
  ]
}
```

### 6.2 Tax Calculation Logic (Indian Income Tax)

```
New Regime (FY 2024-25):
  Standard Deduction: ₹75,000
  Taxable Income = Gross Income − 75,000

  Slabs:
  ₹0      – ₹3,00,000  →  0%
  ₹3L     – ₹7,00,000  →  5%
  ₹7L     – ₹10,00,000 → 10%
  ₹10L    – ₹12,00,000 → 15%
  ₹12L    – ₹15,00,000 → 20%
  Above ₹15,00,000     → 30%
  + 4% Health & Education Cess on total tax

Old Regime:
  Standard Deduction: ₹50,000
  Deductions: 80C + 80D + 80CCD(1B) + 80CCD(2) + 80E + 80EEA + 80G
  Taxable Income = Gross − 50,000 − Deductions

  Slabs:
  ₹0   – ₹2,50,000 →  0%
  ₹2.5L – ₹5,00,000 →  5%
  ₹5L  – ₹10,00,000 → 20%
  Above ₹10,00,000  → 30%
  + 4% Cess
```

### 6.3 Emergency Fund Thresholds

```
minimumMonthlyNeed = fixedLiabilities/Insurance + fixedExpenditure + avgVariableExpenses
monthsCovered = currentFund ÷ minimumMonthlyNeed

< 3 months  → LOW      (red)    — Urgent: build emergency fund
3–6 months  → ADEQUATE (yellow) — Bare minimum covered
6–12 months → READY    (green)  — Recommended level
≥ 12 months → EXCELLENT(green)  — Fully covered
No data     → NO DATA  (yellow) — Add outflow entries / budget data first

Excludes Saving & Investment outflows (stoppable in emergency).
```

---

## 7. Final Review Findings

### 7.1 Bugs Fixed (all resolved)

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| 1 | Critical | `resetAllData()` called undefined `saveData()` instead of `doSave()` | ✅ Fixed |
| 2 | Critical | `monthlyViewSection` `<div>` unclosed in `index.html` → malformed DOM | ✅ Fixed |
| 3 | High | Annual summary month sort used `new Date("2026-01")` → UTC timezone bug | ✅ Fixed |
| 4 | High | `resetAllData` cleared `userName` from Firestore | ✅ Fixed |
| 5 | High | `addEntry()` called `input.value` without null guard → potential TypeError | ✅ Fixed |
| 6 | Medium | Emergency fund showed "LOW" when no monthly expense data | ✅ Fixed |
| 7 | Medium | `currentEmergencyFundInput` listener had stale `isEditMode` guard | ✅ Fixed |
| 8 | High | `test.html` tested stale 11-tab config with removed tabs | ✅ Rewritten |
| 9 | High | `</script>` literal inside `<script>` block caused parse error | ✅ Fixed |
| 10 | High | Monthly pie chart included one-time investments/liabilities from auto-calc | ✅ Fixed (v5.1) |
| 11 | High | `getMonthlyDistribution` included on-demand investing items in pie chart | ✅ Fixed (v5.1) |
| 12 | Medium | Total Outflow included On-Demand investing total | ✅ Fixed (v5.1) |
| 13 | Medium | Emergency fund Details text lost on edit (only currentFund pre-filled) | ✅ Fixed (v5.1) |

### 7.2 Architecture Strengths

- **Zero backend** — pure static + Firebase; no server to maintain
- **Real-time sync** — `onSnapshot` propagates changes to all logged-in devices within ~1s
- **Offline tolerant writes** — Firebase SDK queues writes when offline and flushes on reconnect
- **Debounced saves** — 600ms debounce prevents Firestore write spam on rapid typing
- **Safe defaults everywhere** — `|| {}`, `|| []`, `|| 0` guards prevent null reference crashes
- **XSS protected** — all user-content rendered through `esc()` before `innerHTML`
- **Error wrapped** — `formatMoney`, `activeEntries`, `setActiveEntries` all have `try/catch`

### 7.3 Known Limitations

| Limitation | Impact | Recommendation |
|------------|--------|---------------|
| Last-write-wins on simultaneous edits | Low (single-user app) | Use Firestore `merge: true` if multi-user ever needed |
| No offline read caching set up explicitly | Low (Firebase SDK handles it) | Enable Firestore offline persistence for full offline mode |
| No input validation beyond `required` | Medium | Add amount range checks (e.g., no negative investments) |
| No edit-in-place for table rows | UX only | Delete + re-add is current workaround |
| Custom tab data not exported | Low | Extend `exportToExcel` to export all tabs |
| No PWA `manifest.json` | Low | Add manifest for "Add to Home Screen" icon support |

### 7.4 GitHub Pages Checklist

- [x] No server-side code — pure static files
- [x] All dependencies via CDN (Firebase, Chart.js, SheetJS)
- [x] `viewport-fit=cover` + safe-area insets for mobile
- [x] `apple-mobile-web-app-capable` meta for iOS home screen
- [ ] **Action required:** Add `<yourusername>.github.io` to Firebase Console → Authentication → Authorized Domains
- [ ] **Action required:** Replace `YOUR_API_KEY` etc. in `firebase-config.js` with real values before deploying

### 7.5 File Structure

```
smart-financial-planning/
├── index.html              # Single-page app shell (760 lines)
├── assets/
│   ├── css/
│   │   └── styles.css      # All styles + 4 responsive breakpoints (~2050 lines)
│   └── js/
│       ├── app.js          # All application logic (~3250 lines)
│       └── firebase-config.js  # Firebase credentials (replace before deploy)
├── test.html               # Unit test runner (42 automated tests)
├── architecture.md         # This document
├── README.md               # Project overview + setup guide
└── USER_MANUAL.md          # End-user guide (~570 lines)
```
