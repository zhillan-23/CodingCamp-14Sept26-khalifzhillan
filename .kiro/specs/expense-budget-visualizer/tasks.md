# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side expense and budget tracking app as three files: `index.html`, `css/style.css`, and `js/app.js`. The app runs via `file://` with no build step, no server, and no external libraries. All data is persisted in `localStorage`. Charts are drawn with the Canvas 2D API. Implementation follows the unidirectional data flow pattern defined in the design: every mutation updates `AppState`, calls `persistState()`, then calls `render()`.

---

## Tasks

- [~] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with the full semantic markup skeleton: header (theme toggle button), main layout container (`.app-container`, `.app-layout`), and all named section regions: `#transaction-form-section`, `#transaction-list-section`, `#summary-section`, `#category-section`, `#budget-section`, `#charts-section`
  - Add `<canvas id="donut-chart-canvas">` and `<canvas id="bar-chart-canvas">` inside `#charts-section` with `<p>` fallback text for unsupported browsers
  - Link `css/style.css` in `<head>` and `js/app.js` at end of `<body>` with `defer`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 2. Implement AppState, constants, and localStorage layer
  - [x] 2.1 Define `DEFAULT_CATEGORIES`, the `AppState` object, and `initDefaults()` in `app.js`
    - `AppState` must include: `transactions`, `categories`, `budgets`, `sortOrder` (default `'amount-desc'`), `theme`
    - `initDefaults()` seeds `categories` with `DEFAULT_CATEGORIES` and empties other fields
    - _Requirements: 5.1, 9.4_
  - [x] 2.2 Implement `persistState()` and `loadState()`
    - `persistState()`: wraps `localStorage.setItem('ebv_state', JSON.stringify(AppState))` in try/catch; on failure calls `showNonBlockingNotice`
    - `loadState()`: reads and parses `'ebv_state'`; on missing key calls `initDefaults()`; on malformed JSON calls `initDefaults()` and `showNonBlockingNotice`; after parse, ensures all `DEFAULT_CATEGORIES` are present in `AppState.categories`
    - `showNonBlockingNotice(message)`: injects a dismissable `.notice.notice--warn` banner into the page header
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 2.3 Write property test for transaction persistence round-trip
    - **Property 3: Transaction persistence round-trip**
    - **Validates: Requirements 9.1, 9.4**
  - [ ]* 2.4 Write property test for theme persistence round-trip
    - **Property 11: Theme persistence round-trip**
    - **Validates: Requirements 10.3, 10.4**

- [x] 3. Implement CSS foundation: custom properties, reset, typography, and base layout
  - [x] 3.1 Declare all CSS custom properties for light theme on `:root` and dark theme on `[data-theme="dark"]`
    - Include all tokens from the design: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--border-color`, `--color-income`, `--color-expense`, `--color-warning`, `--color-neutral`
    - _Requirements: 10.5, 10.6_
  - [x] 3.2 Implement responsive grid layout (`.app-container`, `.app-layout`) and fluid typography
    - `.app-container`: `width: 100%`, `max-width: 1600px`, `margin-inline: auto`, `padding-inline: clamp(1rem, 3vw, 3rem)`
    - `.app-layout`: two-column grid at `≥ 768px`, single-column stack at `< 768px`
    - `font-size: clamp(14px, 1.2vw, 18px)` on `:root`
    - All buttons and selects: `min-height: 44px; min-width: 44px`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 4. Implement theme toggle
  - [x] 4.1 Implement `applyTheme(theme)`, `detectTheme()`, and `handleThemeToggle()` in `app.js`
    - `applyTheme`: sets `data-theme` attribute on `<html>`, updates `AppState.theme`, calls `persistState()`
    - `detectTheme`: if `AppState.theme` is falsy, reads `prefers-color-scheme` media query to set initial theme
    - `handleThemeToggle`: toggles between `'light'` and `'dark'`, calls `applyTheme`, then `render()`
    - Wire the `#theme-toggle` button click to `handleThemeToggle`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 5. Implement category management (state mutators + rendering)
  - [x] 5.1 Implement `addCategory(name)` and `deleteCategory(name)` state mutators
    - `addCategory`: trims input, validates non-empty and case-insensitive uniqueness against `AppState.categories`, pushes to array, calls `persistState()` and `render()`; on error returns a validation message without mutating state
    - `deleteCategory`: rejects deletion if name is in `DEFAULT_CATEGORIES`; removes from `AppState.categories`, calls `persistState()` and `render()`; does NOT remove or alter transactions referencing that category
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9, 5.10_
  - [x] 5.2 Implement `renderCategoryList(categories, container)` and wire the category form in `#category-section`
    - Render all categories in a list; default categories show no delete button; custom categories show a delete button with `data-category` attribute
    - Inline error display for duplicate / empty name submissions
    - _Requirements: 5.1, 5.6, 5.7, 5.9_
  - [ ]* 5.3 Write property test for duplicate and empty category rejection
    - **Property 8: Duplicate and empty category names are rejected**
    - **Validates: Requirements 5.4, 5.5**

- [x] 6. Implement transaction form, validation, and mutators
  - [x] 6.1 Implement `validateTransactionForm(formData)` returning a `ValidationResult`
    - Validates: type ∈ `{income, expense}`, amount numeric and > 0, category non-empty, date non-empty; description is optional
    - Returns `{ valid: boolean, errors: Record<fieldName, string> }`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9_
  - [ ]* 6.2 Write property test for amount validation rejection
    - **Property 2: Whitespace-only and zero/negative amounts are rejected**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 6.3 Implement `addTransaction(data)` state mutator
    - Generates `id` via `crypto.randomUUID()` with fallback to `Date.now() + Math.random()`
    - Pushes the new transaction onto `AppState.transactions`, calls `persistState()` and `render()`
    - _Requirements: 1.2, 1.8_
  - [ ]* 6.4 Write property test for valid transaction addition growing the list by exactly one
    - **Property 1: Valid transaction addition grows the list by exactly one**
    - **Validates: Requirements 1.2**
  - [x] 6.5 Implement `handleTransactionSubmit(event)` and wire it to the transaction form
    - Calls `validateTransactionForm`; on failure injects `<span class="field-error">` after each failing field; on success calls `addTransaction` and resets the form
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - [x] 6.6 Implement `renderTransactionForm(categories, container)` to populate the category `<select>` from `AppState.categories`
    - _Requirements: 1.1, 5.3_

- [x] 7. Implement transaction list rendering and delete
  - [x] 7.1 Implement `getSortedTransactions()` derived selector
    - Returns a sorted copy of `AppState.transactions` (never mutates the original) using the four comparators: `amount-asc`, `amount-desc`, `category-asc` (`localeCompare`), `category-desc` (`localeCompare`)
    - _Requirements: 4.1, 4.2_
  - [ ]* 7.2 Write property test for sort order immutability
    - **Property 4: Sort order does not alter stored data**
    - **Validates: Requirements 4.2**
  - [ ]* 7.3 Write property test for sort order applied to newly added transactions
    - **Property 5: Active sort order applies to newly added transactions**
    - **Validates: Requirements 4.3**
  - [x] 7.4 Implement `renderTransactionList(transactions, container)`
    - Renders a `<ul>` where each item shows type, amount (currency formatted), category, description, date, and a delete button with `data-id`
    - Income items get class `transaction--income`; expense items get `transaction--expense`
    - When list is empty, renders `<p class="empty-state">` placeholder text
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 7.5 Implement `deleteTransaction(id)` mutator and `handleDeleteTransaction(id)` event handler
    - Removes the transaction with the matching `id` from `AppState.transactions`, calls `persistState()` and `render()`
    - Wire delete button clicks via event delegation on the list container
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 7.6 Write property test for deleted transaction absent from list and summary
    - **Property 7: Deleted transaction is absent from list and summary**
    - **Validates: Requirements 3.2, 3.3**
  - [x] 7.7 Implement sort controls and wire them to `setSortOrder(order)` mutator
    - `setSortOrder` updates `AppState.sortOrder`, calls `persistState()` and `render()`
    - Render sort control UI (e.g., `<select>` or button group) with all four options; the active sort is visually indicated
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Implement financial summary
  - [ ] 8.1 Implement `getSummary()` derived selector and `renderSummary(summary, container)`
    - `getSummary` computes `income`, `expenses`, `balance` by filtering and reducing `AppState.transactions`
    - `renderSummary` renders three `.summary-card` elements; net balance gets class `summary--positive` (≥ 0) or `summary--negative` (< 0); all values formatted as USD currency with two decimal places via `toLocaleString`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 8.2 Write property test for summary totals consistency
    - **Property 6: Summary totals are consistent with transaction list**
    - **Validates: Requirements 8.1**

- [x] 9. Implement budget tracking
  - [x] 9.1 Implement `setBudget(category, limit)` mutator and `getCategoryExpensesThisMonth()` selector
    - `setBudget`: validates limit > 0 (returns inline error otherwise); sets `AppState.budgets[category] = limit`, calls `persistState()` and `render()`
    - `getCategoryExpensesThisMonth`: returns a `Record<string, number>` of summed expense amounts per category for transactions in the current calendar month only
    - _Requirements: 6.1, 6.2, 6.7, 6.8_
  - [ ]* 9.2 Write property test for budget progress reflecting current-month expenses only
    - **Property 9: Budget progress reflects current-month expenses only**
    - **Validates: Requirements 6.3**
  - [x] 9.3 Implement `getBudgetProgress(category)` selector and `renderBudgetTrackers(state, container)`
    - `getBudgetProgress`: returns `{ spent, limit, ratio, isOver }` where `isOver` is `true` when `spent >= limit`
    - `renderBudgetTrackers`: for each category in `AppState.budgets`, renders a card with category name, "spent / limit" label, a `<progress>` bar, and applies class `budget--over` when `isOver` is true
    - Also renders a form per category (or a unified form with a category select) to set/update budget limits
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [ ]* 9.4 Write property test for budget warning threshold
    - **Property 10: Budget warning threshold is at or above 100%**
    - **Validates: Requirements 6.4, 6.5**

- [x] 10. Checkpoint — wire render() and validate core data flow
  - Implement the main `render()` function that calls all sub-renderers: `renderTransactionForm`, `renderTransactionList`, `renderSummary`, `renderBudgetTrackers`, `renderCategoryList`, `renderCharts`
  - Implement the `DOMContentLoaded` bootstrap: calls `loadState()`, `detectTheme()`, `applyTheme()`, wires all form submit and button click handlers, then calls `render()`
  - Add `window.addEventListener('resize', render)` for chart responsive redraws
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.4, 3.3, 6.6_

- [x] 11. Implement Canvas charts
  - [x] 11.1 Implement `drawDonutChart(canvas, data)` using Canvas 2D API
    - Aggregates expense totals by category from `data`; if total === 0 draws centered placeholder text and returns
    - Draws ring segments using `arc()` with `lineWidth = radius * 0.35`; assigns colors cyclically from a predefined palette of ≥ 7 colors
    - Draws center label showing "Expenses" and the currency total
    - After drawing, renders a `<ul class="chart-legend">` in the DOM below the canvas mapping each color to its category name
    - Colors read via `getComputedStyle` at draw time to respect active theme
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7_
  - [x] 11.2 Implement `drawBarChart(canvas, income, expenses)` using Canvas 2D API
    - Padding: 48px top, 40px bottom, 60px left, 20px right
    - Y-axis: 5 evenly spaced tick lines with currency-formatted labels
    - Draws two side-by-side filled rects (income and expenses); value annotation above each bar; X-axis label below each bar
    - Income bar uses `--color-income` token; expense bar uses `--color-expense` token (both read via `getComputedStyle`)
    - _Requirements: 7.2, 7.3, 7.6, 7.7_
  - [x] 11.3 Implement `renderCharts()` that calls both draw functions with current `AppState` data
    - Reads canvas dimensions from `clientWidth`/`clientHeight` and sets `canvas.width`/`canvas.height` accordingly before drawing
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Apply theme-aware and responsive CSS for all components
  - [x] 12.1 Style the transaction form, transaction list, summary cards, and category manager
    - Income rows: apply `--color-income` accent; expense rows: apply `--color-expense` accent
    - Field error `<span>` elements: visible inline, styled with `--color-expense` or a red tone
    - Summary net balance: `summary--positive` uses `--color-income`, `summary--negative` uses `--color-expense`
    - _Requirements: 2.4, 8.4, 10.5, 10.6_
  - [x] 12.2 Style the budget tracker cards, `<progress>` bars, and warning state
    - `.budget--over`: warning color (`--color-warning`) applied to progress bar and card border
    - _Requirements: 6.4, 6.5, 10.5, 10.6_
  - [x] 12.3 Style the chart sections, legend, non-blocking notice banner, and empty-state placeholder
    - Legend items use inline color swatches matching chart segment colors
    - Notice banner: dismissable, non-blocking, uses `--color-warning` tones
    - _Requirements: 7.4, 7.7, 9.5_

- [x] 13. Final checkpoint — full integration and cross-browser verification
  - Verify the app loads correctly from `index.html` via `file://` with no console errors
  - Verify `localStorage` round-trip: add transactions, reload page, confirm data restored
  - Verify charts re-render on transaction add and delete without page reload
  - Verify dark/light toggle persists across page reload
  - Verify responsive layout at 320px and 1440px viewport widths (no horizontal scroll, touch targets ≥ 44px)
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 12.4, 9.4, 7.3, 10.3, 11.1_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (no test setup is required to run the app)
- Property-based tests (Properties 1–11) use [fast-check](https://fast-check.io/) and target the pure logic functions in `app.js`; they are all optional sub-tasks
- Each task references specific requirements for traceability
- `render()` is a full re-render from `AppState` on every mutation — no partial updates needed
- Charts must read CSS custom property values at draw time via `getComputedStyle` to stay theme-aware
- `crypto.randomUUID()` fallback: `Date.now().toString(36) + Math.random().toString(36).slice(2)`

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.1", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["6.4", "6.5", "6.6", "7.2", "7.3", "7.4", "8.1"] },
    { "id": 6, "tasks": ["7.5", "7.6", "7.7", "8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "11.1", "11.2"] },
    { "id": 9, "tasks": ["11.3"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3"] }
  ]
}
```
