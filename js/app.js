/* ============================================================
   Expense & Budget Visualizer — app.js
   Full application logic: state, rendering, events,
   localStorage, and charts. No external dependencies.
   ============================================================ */

// === Constants & Defaults ===

const DEFAULT_CATEGORIES = Object.freeze([
  'Food',
  'Transport',
  'Housing',
  'Entertainment',
  'Health',
  'Salary',
  'Other',
]);

// === AppState ===

const AppState = {
  transactions: [],
  categories:   [],
  budgets:      {},
  sortOrder:    'amount-desc',
  theme:        '',
};

/**
 * Resets AppState to its default empty state.
 * Seeds categories with a fresh copy of DEFAULT_CATEGORIES.
 */
function initDefaults() {
  AppState.transactions = [];
  AppState.categories   = [...DEFAULT_CATEGORIES];
  AppState.budgets      = {};
  AppState.sortOrder    = 'amount-desc';
  AppState.theme        = '';
}

// === Storage Layer ===

/**
 * Serializes the entire AppState to localStorage under the key 'ebv_state'.
 * On failure (e.g. storage quota exceeded), shows a non-blocking notice.
 */
function persistState() {
  try {
    localStorage.setItem('ebv_state', JSON.stringify(AppState));
  } catch (e) {
    showNonBlockingNotice('Could not save your data. Storage may be full or unavailable.');
  }
}

/**
 * Reads 'ebv_state' from localStorage and restores AppState.
 * - If the key is absent or null, initializes with defaults (silently).
 * - If JSON parsing fails, initializes with defaults and shows a warning banner.
 * - After a successful parse, ensures every DEFAULT_CATEGORIES entry is present
 *   in AppState.categories (missing ones are unshifted to the front).
 */
function loadState() {
  try {
    const raw = localStorage.getItem('ebv_state');

    if (!raw) {
      initDefaults();
      return;
    }

    const parsed = JSON.parse(raw); // may throw
    Object.assign(AppState, parsed);

    // Guarantee all default categories are always available
    for (const cat of DEFAULT_CATEGORIES) {
      if (!AppState.categories.includes(cat)) {
        AppState.categories.unshift(cat);
      }
    }
  } catch (e) {
    initDefaults();
    showNonBlockingNotice('Saved data could not be loaded. Starting fresh.');
  }
}

/**
 * Injects a dismissable warning banner into the page header.
 * The banner is non-blocking and does not interrupt app usage.
 *
 * @param {string} message - The message to display in the notice.
 */
function showNonBlockingNotice(message) {
  // Avoid stacking identical notices
  const existing = document.querySelector('.notice.notice--warn');
  if (existing && existing.textContent.includes(message)) return;

  const notice = document.createElement('div');
  notice.className = 'notice notice--warn';
  notice.setAttribute('role', 'alert');

  const text = document.createElement('span');
  text.className = 'notice__message';
  text.textContent = message;

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'notice__dismiss';
  dismissBtn.type = 'button';
  dismissBtn.setAttribute('aria-label', 'Dismiss notice');
  dismissBtn.textContent = '✕';
  dismissBtn.addEventListener('click', () => notice.remove());

  notice.appendChild(text);
  notice.appendChild(dismissBtn);

  const headerInner = document.querySelector('.app-header__inner');
  if (headerInner) {
    headerInner.appendChild(notice);
  } else {
    // Fallback: prepend to body if header isn't available yet
    document.body.prepend(notice);
  }
}

// === Theme System ===

/**
 * Sets the active theme on the <html> element, updates AppState.theme,
 * and persists the change to localStorage.
 *
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  AppState.theme = theme;
  persistState();
}

/**
 * Determines the initial theme when no saved preference exists.
 * Reads the OS-level prefers-color-scheme media query.
 * If AppState.theme is already set (from loadState), this is a no-op.
 */
function detectTheme() {
  if (AppState.theme) return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  AppState.theme = prefersDark ? 'dark' : 'light';
}

/**
 * Toggles the current theme between 'light' and 'dark', persists it,
 * and triggers a full UI re-render so the toggle button label updates.
 */
function handleThemeToggle() {
  const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  render();
}

// === HTML Utilities ===

/**
 * Escapes a string for safe insertion into HTML content (innerHTML).
 * Prevents XSS from user-supplied values like category names or descriptions.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// === Category Management ===

/**
 * Adds a new custom category to AppState.
 * Trims the input, rejects empty names and case-insensitive duplicates.
 *
 * @param {string} name - Raw category name from the user.
 * @returns {string|null} Error message string on failure, or null on success.
 */
function addCategory(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Category name cannot be empty.';
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const isDuplicate = AppState.categories.some(
    cat => cat.toLowerCase() === lowerTrimmed
  );

  if (isDuplicate) {
    return 'Category already exists.';
  }

  AppState.categories.push(trimmed);
  persistState();
  render();
  return null;
}

/**
 * Removes a custom category from AppState.
 * Refuses to delete any category that is part of DEFAULT_CATEGORIES.
 * Does NOT remove or alter transactions referencing the deleted category.
 *
 * @param {string} name - Exact category name to remove.
 * @returns {string|null} Error message string on failure, or null on success.
 */
function deleteCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) {
    return 'Default categories cannot be deleted.';
  }

  AppState.categories = AppState.categories.filter(cat => cat !== name);
  persistState();
  render();
  return null;
}

// === Category Rendering ===

/**
 * Renders the full category list into a given container element.
 * Default categories display without a delete button.
 * Custom categories display with a delete button carrying data-category.
 * Wires delegated click handling for delete buttons on the rendered list.
 *
 * @param {string[]} categories - The current AppState.categories array.
 * @param {HTMLElement} container - The DOM element to render into.
 */
function renderCategoryList(categories, container) {
  container.innerHTML = '';

  const ul = document.createElement('ul');
  ul.className = 'category-list';

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-list__item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-list__name';
    nameSpan.textContent = cat;
    li.appendChild(nameSpan);

    if (!DEFAULT_CATEGORIES.includes(cat)) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('data-category', cat);
      deleteBtn.setAttribute('aria-label', `Delete category ${cat}`);
      deleteBtn.textContent = 'Delete';
      li.appendChild(deleteBtn);
    }

    ul.appendChild(li);
  });

  // Delegated click handler for all delete buttons in this list
  ul.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;

    const categoryName = btn.getAttribute('data-category');
    const error = deleteCategory(categoryName);

    if (error) {
      // Show error inline next to the clicked button
      let errorEl = btn.parentElement.querySelector('.field-error');
      if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        btn.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = error;
    }
  });

  container.appendChild(ul);
}

/**
 * Wires the add-category form in #category-section.
 * Reads from #category-name-input and #add-category-btn.
 * On success: clears input and removes any existing error.
 * On failure: shows inline <span class="field-error"> next to the input.
 */
function wireCategoryForm() {
  const input = document.getElementById('category-name-input');
  const btn   = document.getElementById('add-category-btn');

  if (!input || !btn) return;

  // Guard: avoid attaching duplicate listeners across re-renders
  if (btn.dataset.wired) return;
  btn.dataset.wired = 'true';

  function handleAddCategory() {
    const error = addCategory(input.value);

    // Remove any existing error before showing a new one
    const section = document.getElementById('category-section');
    const existing = section && section.querySelector('.category-form .field-error');
    if (existing) existing.remove();

    if (error) {
      const errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      errorEl.textContent = error;
      input.insertAdjacentElement('afterend', errorEl);
    } else {
      input.value = '';
    }
  }

  btn.addEventListener('click', handleAddCategory);

  // Also allow Enter key from the input field
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddCategory();
  });
}

// === Transaction Validation ===

/**
 * Validates raw form data for a transaction submission.
 *
 * Rules:
 *  - type   : must be exactly 'income' or 'expense'
 *  - amount : required, must be a finite number > 0
 *  - category: required, must be a non-empty string
 *  - date   : required, must be a non-empty string
 *  - description: optional — always valid
 *
 * @param {Object} formData - Plain object with keys: type, amount, category, description, date.
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validateTransactionForm(formData) {
  const errors = {};

  // Validate type
  if (formData.type !== 'income' && formData.type !== 'expense') {
    errors.type = 'Please select a transaction type.';
  }

  // Validate amount
  const rawAmount = String(formData.amount ?? '').trim();
  if (rawAmount === '') {
    errors.amount = 'Amount is required.';
  } else {
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
      errors.amount = 'Amount must be a number greater than zero.';
    }
  }

  // Validate category
  const rawCategory = String(formData.category ?? '').trim();
  if (!rawCategory) {
    errors.category = 'Please select a category.';
  }

  // Validate date
  const rawDate = String(formData.date ?? '').trim();
  if (!rawDate) {
    errors.date = 'Date is required.';
  }

  // description is optional — no validation needed (Requirement 1.9)

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// === Transaction Mutators ===

/**
 * Generates a unique ID for a new transaction.
 * Prefers crypto.randomUUID(); falls back to a timestamp+random string.
 *
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Adds a validated transaction to AppState, persists, and re-renders.
 *
 * @param {{ type: string, amount: number, category: string, description: string, date: string }} data
 */
function addTransaction(data) {
  const transaction = {
    id:          generateId(),
    type:        data.type,
    amount:      parseFloat(data.amount),
    category:    data.category,
    description: data.description || '',
    date:        data.date,
  };

  AppState.transactions.push(transaction);
  persistState();
  render();
}

// === Transaction Form Rendering ===

/**
 * Renders (or re-renders) the transaction form inside the given container.
 * Populates the category <select> dynamically from the provided categories array.
 * Wires handleTransactionSubmit to the form's submit event on first render
 * (using a data-wired guard to prevent duplicate listeners).
 *
 * @param {string[]} categories  - Current AppState.categories.
 * @param {HTMLElement} container - The #transaction-form-section element.
 */
function renderTransactionForm(categories, container) {
  // Preserve any existing form so we can check the wired guard
  let form = container.querySelector('#transaction-form');

  if (!form) {
    // Build the form structure once
    form = document.createElement('form');
    form.id = 'transaction-form';
    form.noValidate = true;
    form.innerHTML = `
      <div class="form-group">
        <label for="tx-type">Type <span aria-hidden="true">*</span></label>
        <select id="tx-type" name="type" required>
          <option value="">— Select type —</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div class="form-group">
        <label for="tx-amount">Amount <span aria-hidden="true">*</span></label>
        <input
          type="number"
          id="tx-amount"
          name="amount"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
        />
      </div>

      <div class="form-group">
        <label for="tx-category">Category <span aria-hidden="true">*</span></label>
        <select id="tx-category" name="category" required>
          <option value="">— Select category —</option>
        </select>
      </div>

      <div class="form-group">
        <label for="tx-description">Description</label>
        <input
          type="text"
          id="tx-description"
          name="description"
          placeholder="Optional note"
          autocomplete="off"
        />
      </div>

      <div class="form-group">
        <label for="tx-date">Date <span aria-hidden="true">*</span></label>
        <input
          type="date"
          id="tx-date"
          name="date"
          required
        />
      </div>

      <button type="submit" class="btn btn--primary">Add Transaction</button>
    `;

    container.appendChild(form);
  }

  // Always refresh the category <select> options from the current categories list
  const categorySelect = form.querySelector('#tx-category');
  if (categorySelect) {
    // Preserve the currently selected value (if any) across re-renders
    const currentValue = categorySelect.value;

    categorySelect.innerHTML = '<option value="">— Select category —</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === currentValue) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  // Wire submit handler only once
  if (!form.dataset.wired) {
    form.dataset.wired = 'true';
    form.addEventListener('submit', handleTransactionSubmit);
  }
}

// === Transaction Submit Handler ===

/**
 * Handles the transaction form submit event.
 * - Extracts form data into a plain object.
 * - Calls validateTransactionForm; on failure injects inline field errors.
 * - On success calls addTransaction and resets the form.
 *
 * @param {SubmitEvent} event
 */
function handleTransactionSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;

  // Clear any previous field errors on this form
  form.querySelectorAll('.field-error').forEach(el => el.remove());

  // Collect raw values
  const formData = {
    type:        form.elements['type'].value,
    amount:      form.elements['amount'].value,
    category:    form.elements['category'].value,
    description: form.elements['description'].value,
    date:        form.elements['date'].value,
  };

  const { valid, errors } = validateTransactionForm(formData);

  if (!valid) {
    // Inject <span class="field-error"> immediately after each offending input/select
    Object.entries(errors).forEach(([field, message]) => {
      const fieldEl = form.elements[field];
      if (!fieldEl) return;

      const errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = message;
      fieldEl.insertAdjacentElement('afterend', errorEl);
    });
    return;
  }

  // Valid submission — mutate state and reset form
  addTransaction(formData);
  form.reset();
}

// === Derived Selectors ===

/**
 * Returns a sorted copy of AppState.transactions according to the active
 * AppState.sortOrder. Never mutates the original array.
 *
 * @returns {Transaction[]}
 */
function getSortedTransactions() {
  const copy = [...AppState.transactions];
  switch (AppState.sortOrder) {
    case 'amount-asc':    return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':   return copy.sort((a, b) => b.amount - a.amount);
    case 'category-asc':  return copy.sort((a, b) => a.category.localeCompare(b.category));
    case 'category-desc': return copy.sort((a, b) => b.category.localeCompare(a.category));
    default:              return copy.sort((a, b) => b.amount - a.amount);
  }
}

// === Sort Order Mutator ===

/**
 * Updates the active sort order in AppState, persists, and re-renders.
 *
 * @param {'amount-asc'|'amount-desc'|'category-asc'|'category-desc'} order
 */
function setSortOrder(order) {
  AppState.sortOrder = order;
  persistState();
  render();
}

// === Transaction List Rendering ===

/**
 * Renders sort controls and the full transaction list into the given container.
 * Clears and rebuilds the container on every call (full re-render pattern).
 *
 * Sort controls: a <div class="sort-controls"> with a labeled <select> wired
 * to setSortOrder. A data-wired guard prevents duplicate change listeners.
 *
 * List: a <ul> where each <li> shows type, amount (USD currency), category,
 * description, date, and a delete button with data-id. Income items receive
 * class "transaction--income"; expense items receive "transaction--expense".
 * Delete clicks are handled via a single delegated listener on the <ul>.
 *
 * When transactions is empty, renders a <p class="empty-state"> placeholder.
 *
 * @param {Transaction[]} transactions - Pre-sorted array from getSortedTransactions().
 * @param {HTMLElement}   container    - The #transaction-list-section element.
 */
function renderTransactionList(transactions, container) {
  // Preserve the existing <h2> heading — remove everything else
  const heading = container.querySelector('h2');
  container.innerHTML = '';
  if (heading) container.appendChild(heading);

  // --- Sort controls ---
  const sortControls = document.createElement('div');
  sortControls.className = 'sort-controls';

  const sortLabel = document.createElement('label');
  sortLabel.setAttribute('for', 'sort-order-select');
  sortLabel.textContent = 'Sort by:';

  const sortSelect = document.createElement('select');
  sortSelect.id = 'sort-order-select';
  sortSelect.className = 'sort-controls__select';

  const sortOptions = [
    { value: 'amount-desc', label: 'Amount: High → Low' },
    { value: 'amount-asc',  label: 'Amount: Low → High' },
    { value: 'category-asc',  label: 'Category: A → Z' },
    { value: 'category-desc', label: 'Category: Z → A' },
  ];

  sortOptions.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === AppState.sortOrder) opt.selected = true;
    sortSelect.appendChild(opt);
  });

  // Guard against duplicate listeners across re-renders
  if (!sortSelect.dataset.wired) {
    sortSelect.dataset.wired = 'true';
    sortSelect.addEventListener('change', () => setSortOrder(sortSelect.value));
  }

  sortControls.appendChild(sortLabel);
  sortControls.appendChild(sortSelect);
  container.appendChild(sortControls);

  // --- Transaction list ---
  if (transactions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No transactions recorded yet.';
    container.appendChild(empty);
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'transaction-list';

  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.className = [
      'transaction-list__item',
      tx.type === 'income' ? 'transaction--income' : 'transaction--expense',
    ].join(' ');
    li.dataset.id = tx.id;

    const formattedAmount = tx.amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });

    li.innerHTML = `
      <span class="tx-type">${tx.type === 'income' ? 'Income' : 'Expense'}</span>
      <span class="tx-amount">${formattedAmount}</span>
      <span class="tx-category">${escapeHtml(tx.category)}</span>
      <span class="tx-description">${escapeHtml(tx.description || '—')}</span>
      <span class="tx-date">${escapeHtml(tx.date)}</span>
      <button
        type="button"
        class="delete-btn"
        data-id="${escapeHtml(tx.id)}"
        aria-label="Delete transaction: ${formattedAmount} ${escapeHtml(tx.category)} on ${escapeHtml(tx.date)}"
      >Delete</button>
    `;

    ul.appendChild(li);
  });

  // Single delegated click listener for all delete buttons
  ul.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (id) deleteTransaction(id);
  });

  container.appendChild(ul);
}

// === Transaction Delete ===

/**
 * Removes the transaction matching the given id from AppState,
 * then persists and re-renders.
 *
 * @param {string} id - The id of the transaction to remove.
 */
function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(tx => tx.id !== id);
  persistState();
  render();
}

// === Budget Mutator ===

/**
 * Sets a monthly budget limit for the given category.
 * Validates that limit is a positive number; returns an error string on failure.
 * On success, updates AppState.budgets, persists, and re-renders.
 *
 * @param {string} category - The category name.
 * @param {number|string} limit - The monthly spending limit (must be > 0).
 * @returns {string|null} Error message on failure, or null on success.
 */
function setBudget(category, limit) {
  const parsed = parseFloat(limit);
  if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
    return 'Budget limit must be a number greater than zero.';
  }
  AppState.budgets[category] = parsed;
  persistState();
  render();
  return null;
}

// === Budget Selectors ===

/**
 * Returns a Record<string, number> mapping category names to the total
 * expense amount for transactions in the current calendar month only.
 * Includes only transactions where type === 'expense'.
 *
 * @returns {Record<string, number>}
 */
function getCategoryExpensesThisMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return AppState.transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((map, t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      return map;
    }, {});
}

/**
 * Computes budget progress for a single category.
 *
 * @param {string} category
 * @returns {{ spent: number, limit: number, ratio: number, isOver: boolean }}
 */
function getBudgetProgress(category) {
  const expenses = getCategoryExpensesThisMonth();
  const spent = expenses[category] || 0;
  const limit = AppState.budgets[category];
  const ratio = spent / limit;
  const isOver = spent >= limit;
  return { spent, limit, ratio, isOver };
}

// === Budget Tracker Rendering ===

/**
 * Renders the budget tracker section into the given container.
 * Includes a unified form to set/update a budget for any category,
 * followed by a card for each category that already has a budget limit.
 *
 * @param {typeof AppState} state - The current AppState.
 * @param {HTMLElement} container - The #budget-section element.
 */
function renderBudgetTrackers(state, container) {
  // Preserve the <h2> heading
  const heading = container.querySelector('h2');
  container.innerHTML = '';
  if (heading) container.appendChild(heading);

  // --- Unified budget form ---
  const form = document.createElement('form');
  form.id = 'budget-form';
  form.noValidate = true;
  form.className = 'budget-form';

  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-group';

  const categoryLabel = document.createElement('label');
  categoryLabel.setAttribute('for', 'budget-category-select');
  categoryLabel.textContent = 'Category';

  const categorySelect = document.createElement('select');
  categorySelect.id = 'budget-category-select';
  categorySelect.name = 'budgetCategory';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '— Select category —';
  categorySelect.appendChild(defaultOpt);

  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    // Pre-select if the category already has a budget (convenience)
    categorySelect.appendChild(opt);
  });

  categoryGroup.appendChild(categoryLabel);
  categoryGroup.appendChild(categorySelect);
  form.appendChild(categoryGroup);

  const limitGroup = document.createElement('div');
  limitGroup.className = 'form-group';

  const limitLabel = document.createElement('label');
  limitLabel.setAttribute('for', 'budget-limit-input');
  limitLabel.textContent = 'Monthly Limit';

  const limitInput = document.createElement('input');
  limitInput.type = 'number';
  limitInput.id = 'budget-limit-input';
  limitInput.name = 'budgetLimit';
  limitInput.step = '0.01';
  limitInput.min = '0.01';
  limitInput.placeholder = '0.00';

  limitGroup.appendChild(limitLabel);
  limitGroup.appendChild(limitInput);
  form.appendChild(limitGroup);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn--primary';
  submitBtn.textContent = 'Set Budget';
  form.appendChild(submitBtn);

  // Wire submit handler (data-wired guard to prevent duplicates across re-renders)
  if (!form.dataset.wired) {
    form.dataset.wired = 'true';
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Remove previous error
      const prev = form.querySelector('.field-error');
      if (prev) prev.remove();

      const selectedCategory = categorySelect.value;
      const enteredLimit = limitInput.value;

      if (!selectedCategory) {
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.setAttribute('role', 'alert');
        errorEl.textContent = 'Please select a category.';
        categorySelect.insertAdjacentElement('afterend', errorEl);
        return;
      }

      const error = setBudget(selectedCategory, enteredLimit);
      if (error) {
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.setAttribute('role', 'alert');
        errorEl.textContent = error;
        limitInput.insertAdjacentElement('afterend', errorEl);
      } else {
        form.reset();
      }
    });
  }

  container.appendChild(form);

  // --- Budget cards ---
  const budgetCategories = Object.keys(state.budgets);

  if (budgetCategories.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No budgets set yet.';
    container.appendChild(empty);
    return;
  }

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'budget-list budget-cards';

  budgetCategories.forEach(category => {
    const { spent, limit, ratio, isOver } = getBudgetProgress(category);

    const card = document.createElement('div');
    card.className = 'budget-card' + (isOver ? ' budget--over' : '');

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'budget-card__title';
    cardTitle.textContent = category;

    const spentFormatted = spent.toLocaleString('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    });
    const limitFormatted = limit.toLocaleString('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    });

    const spentLabel = document.createElement('p');
    spentLabel.className = 'budget-card__label';
    spentLabel.textContent = `${spentFormatted} / ${limitFormatted}`;

    const progress = document.createElement('progress');
    progress.className = 'budget-card__progress budget-progress';
    progress.max = 1;
    progress.value = Math.min(ratio, 1);
    progress.setAttribute('aria-label', `${category} budget: ${spentFormatted} of ${limitFormatted}`);

    card.appendChild(cardTitle);
    card.appendChild(spentLabel);
    card.appendChild(progress);
    cardsContainer.appendChild(card);
  });

  container.appendChild(cardsContainer);
}

// === Chart Engine ===

/**
 * Cyclic color palette for donut chart segments (≥ 7 colors).
 * These are hardcoded hex values; text/label colors use CSS vars at draw time.
 */
const CHART_PALETTE = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#e91e63',
  '#00bcd4',
];

/**
 * Draws a donut (ring) chart on the given canvas showing expense totals by category.
 *
 * - Aggregates transactions where type === 'expense' into category totals.
 * - If total === 0, draws a centered placeholder text and returns.
 * - Draws stroke-based arc segments (ring slices) with lineWidth = radius * 0.35.
 * - Draws a center label: "Expenses" and the USD-formatted total.
 * - Injects (or replaces) a <ul class="chart-legend"> below the canvas in #charts-section.
 *
 * Colors for segments are read from the CHART_PALETTE constant.
 * Text colors are read from CSS custom properties via getComputedStyle at draw time.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Transaction[]} data - Array of transaction objects from AppState.transactions.
 */
function drawDonutChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Read text color from active theme via CSS custom properties
  const style = getComputedStyle(document.documentElement);
  const textColor = style.getPropertyValue('--text-primary').trim() || '#1a1a2e';

  // Aggregate expenses by category
  const categoryTotals = {};
  data.forEach(tx => {
    if (tx.type !== 'expense') return;
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  const categories = Object.keys(categoryTotals);
  const total = categories.reduce((sum, cat) => sum + categoryTotals[cat], 0);

  // --- No data: draw placeholder ---
  if (total === 0 || categories.length === 0) {
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(w * 0.055)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expense data', w / 2, h / 2);

    // Remove any old legend
    _clearDonutLegend(canvas);
    return;
  }

  // --- Draw ring segments ---
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 * 0.7;
  const lineWidth = radius * 0.35;

  let startAngle = -Math.PI / 2; // start at 12 o'clock

  categories.forEach((cat, i) => {
    const sweepAngle = (categoryTotals[cat] / total) * 2 * Math.PI;
    const endAngle = startAngle + sweepAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = CHART_PALETTE[i % CHART_PALETTE.length];
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();

    startAngle = endAngle;
  });

  // --- Center label ---
  const formattedTotal = total.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  const labelFontSize = Math.max(11, Math.round(w * 0.04));
  const valueFontSize = Math.max(13, Math.round(w * 0.05));

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `${labelFontSize}px sans-serif`;
  ctx.fillText('Expenses', cx, cy - labelFontSize * 0.8);

  ctx.font = `bold ${valueFontSize}px sans-serif`;
  ctx.fillText(formattedTotal, cx, cy + valueFontSize * 0.8);

  // --- Legend ---
  _renderDonutLegend(canvas, categories, categoryTotals);
}

/**
 * Injects or replaces the <ul class="chart-legend"> immediately after the
 * donut canvas inside its .chart-wrapper parent.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} categories
 * @param {Record<string, number>} categoryTotals
 */
function _renderDonutLegend(canvas, categories, categoryTotals) {
  // Remove any existing legend first
  _clearDonutLegend(canvas);

  const legend = document.createElement('ul');
  legend.className = 'chart-legend';

  categories.forEach((cat, i) => {
    const color = CHART_PALETTE[i % CHART_PALETTE.length];
    const amount = categoryTotals[cat].toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });

    const li = document.createElement('li');
    li.className = 'chart-legend__item';

    const swatch = document.createElement('span');
    swatch.className = 'chart-legend__swatch';
    swatch.setAttribute('aria-hidden', 'true');
    swatch.style.backgroundColor = color;

    const label = document.createElement('span');
    label.className = 'chart-legend__label';
    label.textContent = `${cat} (${amount})`;

    li.appendChild(swatch);
    li.appendChild(label);
    legend.appendChild(li);
  });

  // Insert the legend as a sibling immediately after the canvas
  canvas.insertAdjacentElement('afterend', legend);
}

/**
 * Removes any existing .chart-legend sibling that was injected after the canvas.
 *
 * @param {HTMLCanvasElement} canvas
 */
function _clearDonutLegend(canvas) {
  // Look for a .chart-legend that is the next sibling element
  let next = canvas.nextElementSibling;
  while (next) {
    if (next.classList.contains('chart-legend')) {
      next.remove();
      break;
    }
    next = next.nextElementSibling;
  }
}

/**
 * Draws a bar chart comparing total income versus total expenses.
 *
 * Layout:
 *  - Padding: { top: 48, bottom: 40, left: 60, right: 20 }
 *  - Y-axis: 5 evenly spaced horizontal tick lines with USD labels
 *  - Two side-by-side filled bars (income left, expenses right) with a 20px gap
 *  - Value annotations (USD) centered above each bar
 *  - X-axis labels ("Income" / "Expenses") centered below each bar
 *  - Horizontal baseline at the bottom of the chart area
 *
 * Bar colors are read from CSS custom properties at draw time.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} income   - Total income amount.
 * @param {number} expenses - Total expenses amount.
 */
function drawBarChart(canvas, income, expenses) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const padding = { top: 48, bottom: 40, left: 60, right: 20 };
  const chartWidth  = W - padding.left - padding.right;
  const chartHeight = H - padding.top  - padding.bottom;
  const maxValue    = Math.max(income, expenses, 1);

  // Read theme-aware colors
  const style = getComputedStyle(document.documentElement);
  const incomeColor  = style.getPropertyValue('--color-income').trim()  || '#2ecc71';
  const expenseColor = style.getPropertyValue('--color-expense').trim() || '#e74c3c';
  const textColor    = style.getPropertyValue('--text-primary').trim()  || '#1a1a2e';
  const borderColor  = style.getPropertyValue('--border-color').trim()  || '#dde1e7';

  const fontSize = Math.max(10, Math.round(W * 0.033));
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = textColor;

  // --- Y-axis ticks (5 lines) ---
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = (maxValue / tickCount) * i;
    const y = padding.top + chartHeight - (value / maxValue) * chartHeight;

    // Tick line
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    // Tick label
    const label = value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, padding.left - 6, y);
  }

  // --- Bars ---
  const gap = 20;
  const barWidth = (chartWidth - gap) / 2;
  const baseline = padding.top + chartHeight;

  const bars = [
    { value: income,   color: incomeColor,  label: 'Income' },
    { value: expenses, color: expenseColor, label: 'Expenses' },
  ];

  bars.forEach((bar, i) => {
    const x = padding.left + i * (barWidth + gap);
    const barHeight = (bar.value / maxValue) * chartHeight;
    const y = baseline - barHeight;

    // Draw bar
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Value annotation above bar
    const valueLabel = bar.value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(valueLabel, x + barWidth / 2, y - 4);

    // X-axis label below bar
    ctx.textBaseline = 'top';
    ctx.fillText(bar.label, x + barWidth / 2, baseline + 6);
  });

  // --- Horizontal baseline ---
  ctx.beginPath();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.moveTo(padding.left, baseline);
  ctx.lineTo(W - padding.right, baseline);
  ctx.stroke();
}

/**
 * Reads canvas dimensions from clientWidth/clientHeight, sets canvas.width/height
 * accordingly (with fallbacks for hidden/zero-size canvases), then calls
 * drawDonutChart and drawBarChart with current AppState data.
 */
function renderCharts() {
  // Donut chart
  const donutCanvas = document.getElementById('donut-chart-canvas');
  if (donutCanvas) {
    const cw = donutCanvas.clientWidth  || 300;
    const ch = donutCanvas.clientHeight || 300;
    donutCanvas.width  = cw;
    donutCanvas.height = ch;
    drawDonutChart(donutCanvas, AppState.transactions);
  }

  // Bar chart
  const barCanvas = document.getElementById('bar-chart-canvas');
  if (barCanvas) {
    const bw = barCanvas.clientWidth  || 400;
    const bh = barCanvas.clientHeight || 200;
    barCanvas.width  = bw;
    barCanvas.height = bh;
    const { income, expenses } = getSummary();
    drawBarChart(barCanvas, income, expenses);
  }
}

// === Financial Summary Selector & Rendering ===

/**
 * Computes total income, total expenses, and net balance from AppState.transactions.
 *
 * @returns {{ income: number, expenses: number, balance: number }}
 */
function getSummary() {
  const income   = AppState.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = AppState.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, balance: income - expenses };
}

/**
 * Renders three summary cards (Total Income, Total Expenses, Net Balance)
 * into the given container.
 *
 * @param {{ income: number, expenses: number, balance: number }} summary
 * @param {HTMLElement} container - The #summary-section element.
 */
function renderSummary(summary, container) {
  const heading = container.querySelector('h2');
  container.innerHTML = '';
  if (heading) container.appendChild(heading);

  const fmt = (v) => v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  const cards = [
    { label: 'Total Income',   value: summary.income,   cls: 'summary--income'   },
    { label: 'Total Expenses', value: summary.expenses, cls: 'summary--expense'  },
    {
      label: 'Net Balance',
      value: summary.balance,
      cls: summary.balance >= 0 ? 'summary--positive' : 'summary--negative',
    },
  ];

  const grid = document.createElement('div');
  grid.className = 'summary-cards';

  cards.forEach(({ label, value, cls }) => {
    const card = document.createElement('div');
    card.className = `summary-card ${cls}`;

    const cardLabel = document.createElement('p');
    cardLabel.className = 'summary-card__label';
    cardLabel.textContent = label;

    const cardValue = document.createElement('p');
    cardValue.className = 'summary-card__value';
    cardValue.textContent = fmt(value);

    card.appendChild(cardLabel);
    card.appendChild(cardValue);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// === Render ===

/**
 * Full UI re-render from AppState.
 * Called after every state mutation. Rebuilds all UI sections from scratch.
 */
function render() {
  // Update theme-toggle button label
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = AppState.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }

  // Render transaction form (with live category options)
  const txFormSection = document.getElementById('transaction-form-section');
  if (txFormSection) {
    renderTransactionForm(AppState.categories, txFormSection);
  }

  // Render transaction list with sort controls
  const txListSection = document.getElementById('transaction-list-section');
  if (txListSection) {
    renderTransactionList(getSortedTransactions(), txListSection);
  }

  // Render category list
  const categoryListContainer = document.getElementById('category-list-container');
  if (categoryListContainer) {
    renderCategoryList(AppState.categories, categoryListContainer);
  }

  // Render financial summary
  const summarySection = document.getElementById('summary-section');
  if (summarySection) {
    renderSummary(getSummary(), summarySection);
  }

  // Render budget trackers
  const budgetSection = document.getElementById('budget-section');
  if (budgetSection) {
    renderBudgetTrackers(AppState, budgetSection);
  }

  // Render charts (donut + bar)
  renderCharts();

  // Wire category form (no-op after first call due to guard)
  wireCategoryForm();
}

// === Event Bootstrap ===

document.addEventListener('DOMContentLoaded', () => {
  // 1. Restore state from localStorage
  loadState();

  // 2. Determine theme (saved preference or OS preference)
  detectTheme();

  // 3. Apply theme to <html> and persist (no-op persist if state was just loaded)
  applyTheme(AppState.theme);

  // 4. Wire theme-toggle button
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', handleThemeToggle);
  }

  // 5. Initial render
  render();

  // 6. Re-render charts on viewport resize (responsive canvas sizing)
  window.addEventListener('resize', render);
});
