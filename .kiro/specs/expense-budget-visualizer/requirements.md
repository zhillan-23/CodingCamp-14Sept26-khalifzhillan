# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that lets users track personal income and expenses, manage budgets per category, and visualize their financial data through interactive charts. All data is stored in the browser's Local Storage — no backend, no accounts, no setup required. The app runs as a standalone HTML/CSS/Vanilla JS web page and must work across modern browsers at any screen width from 320px to 2560px.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single financial record with a type (income or expense), amount, category, description, and date.
- **Category**: A label that groups transactions. Categories may be default (built-in) or custom (user-created).
- **Budget**: A user-defined monthly spending limit associated with a single category.
- **Budget_Progress**: The ratio of total expenses in a category during the current month relative to that category's budget limit.
- **Summary**: The aggregated financial view showing total income, total expenses, and net balance.
- **Donut_Chart**: A circular chart drawn with Canvas or SVG that shows the proportional breakdown of expenses by category.
- **Bar_Chart**: A chart drawn with Canvas or SVG that shows total income versus total expenses side by side.
- **Theme**: The visual color mode of the App, either light or dark.
- **Local_Storage**: The browser's Web Storage API used to persist all App data client-side.
- **Transaction_List**: The rendered table or list view of all recorded transactions.
- **Sort_Order**: The currently active sort criterion applied to the Transaction_List (amount ascending, amount descending, category A–Z, category Z–A).

---

## Requirements

### Requirement 1: Add Transactions

**User Story:** As a user, I want to add income and expense transactions with full details, so that I can maintain an accurate record of my finances.

#### Acceptance Criteria

1. THE App SHALL provide a form with the following fields for each transaction: type (income or expense), amount, category, description, and date.
2. WHEN the user submits the transaction form with all required fields filled, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
3. IF the user submits the transaction form with an empty amount field, THEN THE App SHALL display an inline validation error and reject the submission.
4. IF the user submits the transaction form with a non-positive or non-numeric amount value, THEN THE App SHALL display an inline validation error and reject the submission.
5. IF the user submits the transaction form without selecting a type, THEN THE App SHALL display an inline validation error and reject the submission.
6. IF the user submits the transaction form without selecting a category, THEN THE App SHALL display an inline validation error and reject the submission.
7. IF the user submits the transaction form without providing a date, THEN THE App SHALL display an inline validation error and reject the submission.
8. WHEN a transaction is successfully added, THE App SHALL clear the form fields and return the form to its default empty state.
9. THE App SHALL allow the description field to be left blank without triggering a validation error.

---

### Requirement 2: View Transactions

**User Story:** As a user, I want to see all my transactions in a list, so that I can review my financial history at a glance.

#### Acceptance Criteria

1. THE App SHALL render all stored transactions in the Transaction_List on page load.
2. THE Transaction_List SHALL display the type, amount, category, description, and date for each transaction.
3. WHILE the Transaction_List contains no transactions, THE App SHALL display a non-error placeholder message indicating that no transactions have been recorded yet.
4. THE App SHALL visually distinguish income transactions from expense transactions in the Transaction_List (e.g., using color or an icon).

---

### Requirement 3: Delete Transactions

**User Story:** As a user, I want to delete individual transactions, so that I can correct mistakes or remove outdated records.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage.
3. WHEN a transaction is deleted, THE App SHALL update the Summary, charts, and Budget_Progress indicators to reflect the removal without a page reload.

---

### Requirement 4: Sort Transactions

**User Story:** As a user, I want to sort my transactions by amount or category, so that I can quickly find and compare entries.

#### Acceptance Criteria

1. THE App SHALL provide Sort_Order controls that let the user sort the Transaction_List by amount (ascending and descending) and by category (A–Z and Z–A).
2. WHEN the user selects a Sort_Order, THE App SHALL re-render the Transaction_List in the chosen order without altering the underlying stored data.
3. WHEN new transactions are added, THE App SHALL apply the currently active Sort_Order to the updated Transaction_List.

---

### Requirement 5: Manage Categories

**User Story:** As a user, I want to manage custom categories alongside built-in ones, so that I can organize transactions in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL include a set of default categories (e.g., Food, Transport, Housing, Entertainment, Health, Salary, Other) that are available on first use without any setup.
2. THE App SHALL provide a form that allows the user to add a custom category by entering a unique name.
3. WHEN the user submits a new category name, THE App SHALL add it to the category list, make it selectable in the transaction form, and persist it to Local_Storage.
4. IF the user submits a category name that already exists (case-insensitive), THEN THE App SHALL display an inline validation error and reject the duplicate.
5. IF the user submits an empty category name, THEN THE App SHALL display an inline validation error and reject the submission.
6. THE App SHALL display all categories (default and custom) in a category management view.
7. THE App SHALL provide a delete control for each custom category.
8. WHEN the user deletes a custom category, THE App SHALL remove it from the category list and from Local_Storage.
9. THE App SHALL NOT allow deletion of default categories.
10. WHEN a custom category is deleted, THE App SHALL retain all transactions previously assigned to that category; those transactions SHALL continue to display the original category name.

---

### Requirement 6: Set and Track Budgets

**User Story:** As a user, I want to set monthly spending limits per category and see how close I am to each limit, so that I can manage my spending proactively.

#### Acceptance Criteria

1. THE App SHALL allow the user to assign a monthly budget limit (a positive numeric value) to any available category.
2. WHEN the user saves a budget limit for a category, THE App SHALL persist it to Local_Storage.
3. THE App SHALL display a Budget_Progress indicator for each category that has a budget limit, showing the amount spent relative to the limit in the current calendar month.
4. WHILE total expenses in a category for the current month are below the budget limit, THE App SHALL render the Budget_Progress indicator in a neutral or positive visual state.
5. WHEN total expenses in a category for the current month reach or exceed the budget limit, THE App SHALL render the Budget_Progress indicator in a warning visual state.
6. WHEN a new expense transaction is added or deleted, THE App SHALL update all affected Budget_Progress indicators without a page reload.
7. IF the user sets a budget limit of zero or a non-positive value for a category, THEN THE App SHALL display an inline validation error and reject the submission.
8. THE App SHALL allow the user to update an existing budget limit for a category by overwriting it with a new positive value.

---

### Requirement 7: Visualize Data with Charts

**User Story:** As a user, I want to see my financial data as charts, so that I can understand spending patterns and income-to-expense balance quickly.

#### Acceptance Criteria

1. THE App SHALL render a Donut_Chart that shows the proportional breakdown of total expenses grouped by category, using Canvas or SVG — no third-party charting libraries.
2. THE App SHALL render a Bar_Chart that shows total income versus total expenses side by side, using Canvas or SVG — no third-party charting libraries.
3. WHEN transactions are added or deleted, THE App SHALL re-render both charts to reflect the updated data without a page reload.
4. THE Donut_Chart SHALL display a legend mapping each color segment to its corresponding category name.
5. WHILE the App has no expense transactions recorded, THE Donut_Chart SHALL display a placeholder state indicating no expense data is available.
6. THE Bar_Chart SHALL display labeled axes or value annotations so that absolute income and expense totals are readable directly on the chart.
7. THE App SHALL render charts using colors that remain legible in both light and dark Theme.

---

### Requirement 8: Display Financial Summary

**User Story:** As a user, I want to see a summary of my total income, total expenses, and net balance at a glance, so that I know my overall financial position.

#### Acceptance Criteria

1. THE App SHALL display a Summary section showing three values: total income (sum of all income transactions), total expenses (sum of all expense transactions), and net balance (total income minus total expenses).
2. WHEN transactions are added or deleted, THE App SHALL update the Summary values without a page reload.
3. THE App SHALL format all Summary values as currency with two decimal places.
4. THE App SHALL visually distinguish a positive net balance from a negative net balance in the Summary display (e.g., using different colors).

---

### Requirement 9: Persist Data Across Sessions

**User Story:** As a user, I want my data to be saved automatically, so that my transactions, budgets, categories, and preferences are still there when I reopen the app.

#### Acceptance Criteria

1. THE App SHALL save all transactions to Local_Storage immediately after each add or delete operation.
2. THE App SHALL save all category additions and deletions to Local_Storage immediately after each operation.
3. THE App SHALL save all budget limit changes to Local_Storage immediately after each save operation.
4. WHEN the App loads, THE App SHALL read transactions, categories, budget limits, and Theme preference from Local_Storage and restore the full application state before rendering any interactive content.
5. IF Local_Storage is unavailable or a read operation returns malformed data, THEN THE App SHALL initialize with default categories and an empty transaction list, and SHALL display a non-blocking notice informing the user that saved data could not be loaded.

---

### Requirement 10: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode, so that the app is comfortable to use in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a visible toggle control that switches the Theme between light and dark mode.
2. WHEN the App loads for the first time with no saved Theme preference in Local_Storage, THE App SHALL apply the Theme that matches the user's OS-level color scheme preference (`prefers-color-scheme` media query).
3. WHEN the user activates the Theme toggle, THE App SHALL switch to the opposite Theme and persist the new preference to Local_Storage.
4. WHEN the App loads and a Theme preference exists in Local_Storage, THE App SHALL apply the saved preference regardless of the current OS color scheme.
5. WHILE the dark Theme is active, THE App SHALL apply a dark background with light foreground colors across all UI sections, including the Transaction_List, charts, Summary, and forms.
6. WHILE the light Theme is active, THE App SHALL apply a light background with dark foreground colors across all UI sections.

---

### Requirement 11: Responsive Layout

**User Story:** As a user, I want the app to be usable on any screen size from a small mobile phone to a large desktop monitor, so that I can manage my finances on any device.

#### Acceptance Criteria

1. THE App SHALL render a fully usable layout at viewport widths from 320px to 2560px without horizontal scrolling or clipped content.
2. WHEN the viewport width is below 768px, THE App SHALL stack layout sections vertically so that all content remains readable without zooming.
3. WHEN the viewport width is 768px or above, THE App SHALL arrange layout sections in a multi-column grid where appropriate (e.g., charts alongside summary, form alongside transaction list).
4. THE App SHALL scale all interactive controls (buttons, inputs, selects) to be touch-friendly on mobile viewports (minimum tap target of 44×44 CSS pixels).
5. THE App SHALL use fluid typography and spacing so that text remains legible and proportional across all supported viewport widths.

---

### Requirement 12: Single-File Asset Constraints

**User Story:** As a developer, I want the codebase to remain cleanly organized with one CSS file and one JavaScript file, so that the project is easy to navigate and maintain.

#### Acceptance Criteria

1. THE App SHALL load exactly one CSS file located inside the `css/` directory for all styling.
2. THE App SHALL load exactly one JavaScript file located inside the `js/` directory for all application logic.
3. THE App SHALL NOT use any external JavaScript frameworks, CSS frameworks, or charting libraries — all functionality SHALL be implemented with HTML, CSS, and Vanilla JavaScript.
4. THE App SHALL NOT require a backend server, build tool, or package manager to run; opening `index.html` in a modern browser SHALL be sufficient to launch the App.
