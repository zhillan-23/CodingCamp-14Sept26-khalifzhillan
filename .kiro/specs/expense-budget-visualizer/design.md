# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side web application delivered as a single `index.html` page. It requires no server, no build step, and no package manager — opening `index.html` in any modern browser is enough to launch the app. All data is persisted in the browser's `localStorage` as JSON.

The application lets users:
- Record income and expense transactions with amount, category, description, and date
- Sort and review their transaction history
- Create and delete custom categories alongside a set of built-in defaults
- Set monthly spending budgets per category and track progress against them
- Visualize spending breakdown (Donut Chart) and income vs. expenses (Bar Chart) using Canvas
- See a live financial summary (total income, total expenses, net balance)
- Toggle between dark and light themes, with OS-level preference detection on first launch

Because every feature is implemented in Vanilla JS, the entire codebase stays within three files: `index.html`, `css/style.css`, and `js/app.js`.

---

## Architecture

### High-Level Structure

```
index.html          — markup skeleton, loads style.css and app.js
css/
  style.css         — all visual styles, CSS custom properties, responsive layout
js/
  app.js            — full application logic: state, rendering, events, localStorage, charts
```

The app follows a **unidirectional data flow**:

```
User Action
    │
    ▼
Mutation Function (addTransaction, deleteTransaction, addCategory, …)
    │  mutates AppState
    ▼
persistState()      — writes entire state to localStorage
    │
    ▼
render()            — performs a full UI re-render from state
```

There is exactly one shared state object (`AppState`). Every mutation goes through a dedicated function that modifies `AppState`, persists it, then calls `render()`. No component stores its own state — UI is always a pure projection of `AppState`.

### Module Layout inside app.js

```
app.js
├── Constants & Defaults
├── AppState (single mutable object)
├── Storage Layer       (loadState, persistState, graceful degradation)
├── State Mutators      (addTransaction, deleteTransaction, addCategory,
│                        deleteCategory, setBudget, setTheme, setSortOrder)
├── Derived Selectors   (getFilteredTransactions, getSummary,
│                        getCategoryExpensesThisMonth, getBudgetProgress)
├── Rendering Layer     (render, renderTransactionList, renderSummary,
│                        renderBudgetTrackers, renderCategoryList,
│                        renderCharts, applyTheme)
├── Chart Engine        (drawDonutChart, drawBarChart)
└── Event Bootstrap     (DOMContentLoaded listener, form/button event wiring)
```

---

## Components and Interfaces

### TransactionForm

**HTML region:** `#transaction-form-section`

Renders a `<form>` with:
- `<select>` for type (income / expense)
- `<input type="number" step="0.01" min="0.01">` for amount
- `<select>` for category — populated dynamically from `AppState.categories`
- `<input type="text">` for description (optional)
- `<input type="date">` for date

**Validation (client-side, before mutation):**

| Field | Rule |
|---|---|
| type | must be "income" or "expense" |
| amount | required, numeric, > 0 |
| category | must be a non-empty string present in category list |
| date | required, valid date string |
| description | optional |

Validation errors are injected as `<span class="field-error">` immediately after the offending input. On successful submit the form is reset to its default empty state.

**Interface:**
```js
handleTransactionSubmit(event: SubmitEvent): void
validateTransactionForm(formData: FormData): ValidationResult
```

### TransactionList

**HTML region:** `#transaction-list-section`

Renders a `<ul>` (or `<table>`) where each row shows type, amount, category, description, and date. Income rows get the `transaction--income` class; expense rows get `transaction--expense`.

A delete button (`data-id` attribute) on each row wires to `handleDeleteTransaction`. When the list is empty, a `<p class="empty-state">` placeholder is rendered instead.

**Interface:**
```js
renderTransactionList(transactions: Transaction[], container: HTMLElement): void
handleDeleteTransaction(id: string): void
```

### CategoryManager

**HTML region:** `#category-section`

Renders:
- A list of all categories; default ones show no delete button, custom ones do
- An `<input type="text">` + submit button for adding a new category

Duplicate-name and empty-name errors are displayed inline.

**Interface:**
```js
handleAddCategory(name: string): void
handleDeleteCategory(name: string): void
renderCategoryList(categories: Category[], container: HTMLElement): void
```

### BudgetTracker

**HTML region:** `#budget-section`

For each category that has a budget limit, renders a card with:
- Category name
- "Spent / Limit" label
- A `<progress>` element or custom CSS bar showing `Budget_Progress`
- A visual warning state (`budget--over`) when spent ≥ limit

Also renders a form per category to set/update the budget limit.

**Interface:**
```js
renderBudgetTrackers(state: AppState, container: HTMLElement): void
handleSetBudget(category: string, limit: number): void
```

### Visualizer — DonutChart

**HTML region:** `#donut-chart-canvas` (`<canvas>`)

Draws a proportional ring chart of expenses grouped by category for all time. Includes a `<ul class="chart-legend">` below the canvas listing each color segment and category name.

When there are no expense transactions, a centered placeholder text is drawn on the canvas.

**Interface:**
```js
drawDonutChart(canvas: HTMLCanvasElement, data: CategoryExpense[]): void
```

### Visualizer — BarChart

**HTML region:** `#bar-chart-canvas` (`<canvas>`)

Draws two side-by-side bars: total income (all time) and total expenses (all time). Labeled axes on the Y axis (value ticks) and X axis (Income / Expenses labels). Value annotations are drawn above each bar.

**Interface:**
```js
drawBarChart(canvas: HTMLCanvasElement, income: number, expenses: number): void
```

### SummaryPanel

**HTML region:** `#summary-section`

Renders three `<div class="summary-card">` elements:
- Total Income
- Total Expenses
- Net Balance — gets class `summary--positive` when ≥ 0, `summary--negative` when < 0

All values are formatted with `toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })`.

**Interface:**
```js
renderSummary(summary: Summary, container: HTMLElement): void
```

### ThemeToggle

**HTML region:** header `<button id="theme-toggle">`

On click: reads current theme from `AppState.theme`, toggles to the opposite, calls `setTheme()`. The button label/icon reflects the active theme.

**Interface:**
```js
handleThemeToggle(): void
applyTheme(theme: 'light' | 'dark'): void  // sets data-theme on <html>
```

---

## Data Models

### Transaction

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  type: 'income' | 'expense',
  amount: number,      // positive float, stored as-is
  category: string,    // must match an entry in AppState.categories
  description: string, // may be empty string
  date: string         // ISO 8601 date string "YYYY-MM-DD"
}
```

### Category

Categories are stored as a flat array of plain strings:

```js
AppState.categories: string[]
// e.g. ["Food","Transport","Housing","Entertainment","Health","Salary","Other","Freelance"]
```

Default categories are defined as a constant and merged on first init:

```js
const DEFAULT_CATEGORIES = ["Food","Transport","Housing","Entertainment","Health","Salary","Other"]
```

Deleted custom categories are removed from the array, but transactions that referenced them retain the original string value (no FK enforcement — display only).

### Budget

Budgets are stored as a plain object map from category name to monthly limit:

```js
AppState.budgets: Record<string, number>
// e.g. { "Food": 500, "Transport": 150 }
```

Only categories the user has explicitly set a limit for appear in this map.

### Sort Order

```js
AppState.sortOrder: 'amount-asc' | 'amount-desc' | 'category-asc' | 'category-desc'
```

Default: `'amount-desc'`.

### Theme

```js
AppState.theme: 'light' | 'dark'
```

### Full AppState

```js
const AppState = {
  transactions: Transaction[],
  categories:   string[],
  budgets:       Record<string, number>,
  sortOrder:    'amount-asc' | 'amount-desc' | 'category-asc' | 'category-desc',
  theme:        'light' | 'dark'
}
```

### localStorage Schema

The entire `AppState` is serialized with `JSON.stringify` under a single key:

```
localStorage key: "ebv_state"
value: JSON string of AppState
```

On load: `JSON.parse(localStorage.getItem('ebv_state'))`. If the key is absent, null, or the parse throws, the app initializes with defaults and shows a non-blocking banner.

---

## State Management

### Initialization

```
DOMContentLoaded
  → loadState()          reads localStorage, merges defaults, returns AppState
  → detectTheme()        if no saved theme, read prefers-color-scheme
  → render(AppState)     full initial render
```

### Mutation Pattern

Every state change follows this exact sequence:

```js
function addTransaction(data) {
  const tx = { id: crypto.randomUUID(), ...data }
  AppState.transactions.push(tx)
  persistState()
  render()
}
```

No partial renders — every mutation triggers `render()` which rebuilds the entire UI from `AppState`. For the small data volumes expected (hundreds of transactions), this is fast enough and keeps logic simple.

### Derived Values (computed on each render, never stored)

```js
function getSummary() {
  const income   = AppState.transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0)
  const expenses = AppState.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0)
  return { income, expenses, balance: income - expenses }
}

function getCategoryExpensesThisMonth() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth()
  return AppState.transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() === month)
    .reduce((map, t) => { map[t.category] = (map[t.category] || 0) + t.amount; return map }, {})
}

function getSortedTransactions() {
  const copy = [...AppState.transactions]
  switch (AppState.sortOrder) {
    case 'amount-asc':    return copy.sort((a,b) => a.amount - b.amount)
    case 'amount-desc':   return copy.sort((a,b) => b.amount - a.amount)
    case 'category-asc':  return copy.sort((a,b) => a.category.localeCompare(b.category))
    case 'category-desc': return copy.sort((a,b) => b.category.localeCompare(a.category))
  }
}
```

---

## Chart Rendering

Both charts use the `<canvas>` 2D API with no external libraries. Chart dimensions are set to the canvas element's `clientWidth` and `clientHeight` to support responsive sizing; `window.addEventListener('resize', render)` triggers a redraw on viewport change.

### Donut Chart Algorithm

```
1. Aggregate expenses by category → [ { category, total } ]
2. Compute total = sum of all category totals
3. If total === 0: draw placeholder text, return
4. Assign a color from a predefined palette (cycled by index)
5. For each slice:
   a. startAngle = previousEndAngle
   b. sweepAngle = (total_i / total) * 2π
   c. endAngle = startAngle + sweepAngle
   d. Draw arc from startAngle to endAngle with lineWidth = radius * 0.35 (ring thickness)
6. Draw a center label: "Expenses" and currency total
7. Render legend below canvas as HTML <ul>
```

### Bar Chart Algorithm

```
1. Compute income and expenses totals from AppState
2. Canvas padding: 48px top, 40px bottom, 60px left, 20px right
3. chartHeight = canvas.height - padding.top - padding.bottom
4. maxValue = Math.max(income, expenses, 1)
5. Y-axis: draw 5 evenly spaced tick lines with currency labels
6. For each of [income, expenses]:
   a. barWidth = (chartWidth - gap) / 2
   b. barHeight = (value / maxValue) * chartHeight
   c. Draw filled rect from (x, baseline - barHeight) with dimensions (barWidth, barHeight)
   d. Draw value label above bar
   e. Draw category label below X axis
7. Colors: income bar uses --color-income token, expense bar uses --color-expense token
   (read via getComputedStyle to respect theme)
```

### Theme-Aware Colors

Charts read CSS custom property values at draw time using:
```js
getComputedStyle(document.documentElement).getPropertyValue('--color-income').trim()
```

This ensures chart colors automatically match the active theme without conditional logic.

---

## Sorting Logic

Sorting never mutates `AppState.transactions`. It produces a sorted copy for rendering only.

| Sort Order | Comparator |
|---|---|
| `amount-asc` | `a.amount - b.amount` |
| `amount-desc` | `b.amount - a.amount` |
| `category-asc` | `a.category.localeCompare(b.category)` |
| `category-desc` | `b.category.localeCompare(a.category)` |

`localeCompare` is used for category sorts to correctly handle locale-specific string ordering.

When `addTransaction` is called while a sort is active, the re-render applies `getSortedTransactions()` which includes the new transaction in its correct sorted position.

---

## Theme System

### CSS Custom Properties

All color tokens are declared on `:root` (light) and `[data-theme="dark"]`:

```css
:root {
  --bg-primary:      #ffffff;
  --bg-secondary:    #f4f6f8;
  --text-primary:    #1a1a2e;
  --text-secondary:  #555577;
  --border-color:    #dde1e7;
  --color-income:    #2ecc71;
  --color-expense:   #e74c3c;
  --color-warning:   #f39c12;
  --color-neutral:   #3498db;
}

[data-theme="dark"] {
  --bg-primary:      #1a1a2e;
  --bg-secondary:    #16213e;
  --text-primary:    #e8e8f0;
  --text-secondary:  #a0a0c0;
  --border-color:    #2a2a4a;
  --color-income:    #27ae60;
  --color-expense:   #c0392b;
  --color-warning:   #d68910;
  --color-neutral:   #2980b9;
}
```

`applyTheme(theme)` sets `document.documentElement.setAttribute('data-theme', theme)` and persists to `AppState`.

### OS Preference Detection

```js
function detectTheme() {
  if (AppState.theme) return           // saved preference wins
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  AppState.theme = prefersDark ? 'dark' : 'light'
}
```

This runs once during `loadState`, before the first render.

---

## Responsive Layout

### Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< 768px` | Single-column stack; all sections full-width; touch targets ≥ 44×44px |
| `≥ 768px` | Two-column grid: forms left, charts/summary right; budget cards in a grid |

### CSS Grid Structure

```css
/* Outer container — constrains max width for very large screens (up to 2560px) */
.app-container {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
  padding-inline: clamp(1rem, 3vw, 3rem);
}

/* ≥ 768px */
.app-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* < 768px */
@media (max-width: 767px) {
  .app-layout {
    grid-template-columns: 1fr;
  }
}
```

### Touch Targets

All buttons and selects carry `min-height: 44px; min-width: 44px` to satisfy the 44×44 CSS pixels requirement.

### Fluid Typography

Base font size is set in `rem` on `:root`, and all text uses `clamp()` for fluid scaling:

```css
:root { font-size: clamp(14px, 1.2vw, 18px); }
```

---

## localStorage Persistence Strategy

### Write on Mutation

Every mutation function ends with `persistState()`:

```js
function persistState() {
  try {
    localStorage.setItem('ebv_state', JSON.stringify(AppState))
  } catch (e) {
    showNonBlockingNotice('Could not save your data. Storage may be full or unavailable.')
  }
}
```

### Read on Init

```js
function loadState() {
  try {
    const raw = localStorage.getItem('ebv_state')
    if (!raw) return initDefaults()
    const parsed = JSON.parse(raw)
    Object.assign(AppState, parsed)
    // Ensure default categories always exist
    for (const cat of DEFAULT_CATEGORIES) {
      if (!AppState.categories.includes(cat)) AppState.categories.unshift(cat)
    }
  } catch (e) {
    initDefaults()
    showNonBlockingNotice('Saved data could not be loaded. Starting fresh.')
  }
}
```

### Graceful Degradation

`showNonBlockingNotice(message)` renders a dismissable `<div class="notice notice--warn">` in the page header. The app is fully functional even when localStorage is unavailable (private browsing, storage quota exceeded) — data is only lost on page reload.

---

## Error Handling

| Scenario | Handling |
|---|---|
| localStorage read fails or returns malformed JSON | Init with defaults, show non-blocking banner |
| localStorage write fails (quota exceeded) | Show non-blocking banner, in-memory state still functions |
| Invalid transaction form submission | Inline field-level error messages, no state mutation |
| Duplicate or empty category name | Inline error in category form |
| Budget limit ≤ 0 | Inline error in budget form |
| Chart canvas not supported | `<noscript>` / `<p>` fallback text inside `<canvas>` |
| `crypto.randomUUID` unavailable (old browsers) | Fallback to `Date.now() + Math.random()` string |

Errors are never thrown to the console silently — all user-facing failures produce visible feedback.

---

## Testing Strategy

This project is a UI-heavy, single-file Vanilla JS application with no build pipeline. Testing is split into two complementary approaches.

### Unit Tests

Unit tests cover pure logic functions that are isolated from the DOM. These can be run with any lightweight test harness (e.g., [Vitest](https://vitest.dev/) configured to run against plain JS files, or Node's built-in `node:test`).

Key units to test:
- `validateTransactionForm` — boundary cases for amount, type, category, date
- `getSortedTransactions` — all four sort orders, including ties
- `getSummary` — correct totals for mixed transaction sets
- `getCategoryExpensesThisMonth` — only includes current-month expense transactions
- `getBudgetProgress` — correct ratio and warning threshold detection
- `loadState` / `persistState` — serialization round-trip, malformed JSON recovery

### Property-Based Tests

Property-based tests use [fast-check](https://fast-check.io/) (a well-maintained JS/TS PBT library). Each test runs a minimum of 100 iterations.

Tag format per test: `// Feature: expense-budget-visualizer, Property N: <property_text>`

See the Correctness Properties section for the full list of properties to implement.

### Integration / Smoke Tests

Manual browser verification covers:
- App loads from `file://` (no CORS issues)
- Dark/light toggle persists across reload
- Chart re-renders on transaction add/delete
- Responsive layout at 320px and 1440px viewport widths

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list by exactly one

*For any* transaction list and any valid transaction (positive amount, valid type, non-empty category, valid date), adding that transaction to the list must result in a list whose length is exactly one greater than before, and the new transaction must appear in the list.

**Validates: Requirements 1.2**

### Property 2: Whitespace-only and zero/negative amounts are rejected

*For any* form submission where the amount is zero, negative, non-numeric, or empty, `validateTransactionForm` must return a failing validation result and the transaction list must remain unchanged.

**Validates: Requirements 1.3, 1.4**

### Property 3: Transaction persistence round-trip

*For any* sequence of valid transactions added to `AppState`, serializing `AppState` to JSON and then deserializing it must produce an `AppState` whose `transactions` array is equal (by deep equality) to the original.

**Validates: Requirements 9.1, 9.4**

### Property 4: Sort order does not alter stored data

*For any* transaction list and any sort order, `getSortedTransactions` must return an array that is a permutation of `AppState.transactions` — same elements, potentially different order — and `AppState.transactions` must be unchanged after the call.

**Validates: Requirements 4.2**

### Property 5: Active sort order applies to newly added transactions

*For any* sort order and any new valid transaction, after `addTransaction` is called, `getSortedTransactions` must return a list where the new transaction appears in the correct sorted position according to the active sort order.

**Validates: Requirements 4.3**

### Property 6: Summary totals are consistent with transaction list

*For any* set of transactions, `getSummary().income` must equal the sum of all amounts where `type === 'income'`, `getSummary().expenses` must equal the sum of all amounts where `type === 'expense'`, and `getSummary().balance` must equal `income - expenses`.

**Validates: Requirements 8.1**

### Property 7: Deleted transaction is absent from list and summary

*For any* transaction list containing at least one transaction, deleting a transaction by its `id` must result in: (a) the transaction no longer appearing in `AppState.transactions`, (b) `getSummary` values updated to exclude the deleted transaction's amount, and (c) `AppState.transactions.length` decreased by exactly one.

**Validates: Requirements 3.2, 3.3**

### Property 8: Duplicate and empty category names are rejected

*For any* existing category list, attempting to add a category whose name is empty or whose lowercase form already exists in the list must be rejected without modifying `AppState.categories`.

**Validates: Requirements 5.4, 5.5**

### Property 9: Budget progress reflects current-month expenses only

*For any* category with a budget limit and any mixed set of transactions spanning multiple months, `getBudgetProgress(category)` must equal the sum of expense amounts in that category whose date falls within the current calendar month, divided by the budget limit — and must not include transactions from other months or income transactions.

**Validates: Requirements 6.3**

### Property 10: Budget warning threshold is at or above 100%

*For any* category budget where the sum of current-month expenses is greater than or equal to the limit, `getBudgetProgress(category).isOver` must be `true`; when the sum is strictly less than the limit, it must be `false`.

**Validates: Requirements 6.4, 6.5**

### Property 11: Theme persistence round-trip

*For any* theme value (`'light'` or `'dark'`), setting the theme, persisting state, then loading state from the persisted value must restore the same theme.

**Validates: Requirements 10.3, 10.4**
