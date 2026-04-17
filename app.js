/**
 * Personal Finance Management Dashboard
 * Frontend Logic (Vanilla JavaScript)
 * 
 * IMPORTANT: Before using this, update the GAS_WEB_APP_URL with your deployed Google Apps Script URL
 */

// ===========================
// Configuration
// ===========================
// Replace this with your Google Apps Script Web App URL
// Deploy Code.gs as Web App and copy the deployment URL here
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVRrMiuMZCsU12SFb0V6Cxy3mnKnNY1V0mV7CY3jrjmPbCT9DDWmPVj0B_a82NvnPy/exec'; // UPDATE THIS

// Category mappings based on transaction type
const CATEGORIES = {
  INCOME: ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Other'],
  EXPENSE: ['Food & Dining', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'],
  TRANSFER: ['']
};

// ===========================
// State Management
// ===========================
let allTransactions = [];

// ===========================
// DOM Elements
// ===========================
const elements = {
  transactionForm: document.getElementById('transactionForm'),
  dateInput: document.getElementById('transactionDate'),
  typeSelect: document.getElementById('transactionType'),
  amountInput: document.getElementById('transactionAmount'),
  categorySelect: document.getElementById('transactionCategory'),
  accountSelect: document.getElementById('transactionAccount'),
  toAccountSelect: document.getElementById('transactionToAccount'),
  toAccountField: document.getElementById('toAccountField'),
  notesInput: document.getElementById('transactionNotes'),
  submitBtn: document.getElementById('submitBtn'),
  formSpinner: document.getElementById('formSpinner'),
  tableSpinner: document.getElementById('tableSpinner'),
  tableContainer: document.getElementById('tableContainer'),
  transactionTableBody: document.getElementById('transactionTableBody'),
  alertContainer: document.getElementById('alertContainer'),
  totalBalance: document.getElementById('totalBalance'),
  monthlyIncome: document.getElementById('monthlyIncome'),
  monthlyExpense: document.getElementById('monthlyExpense'),
  categoryLabel: document.getElementById('categoryLabel')
};

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  elements.dateInput.value = today;

  // Attach event listeners
  elements.transactionForm.addEventListener('submit', handleFormSubmit);
  elements.typeSelect.addEventListener('change', handleTypeChange);

  // Load initial data
  loadTransactions();
}

// ===========================
// Event Handlers
// ===========================

/**
 * Handle transaction type change to update categories and show/hide transfer fields
 */
function handleTypeChange() {
  const type = elements.typeSelect.value;
  
  // Clear and update categories
  elements.categorySelect.innerHTML = '<option value="">Select Category</option>';
  if (CATEGORIES[type]) {
    CATEGORIES[type].forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      elements.categorySelect.appendChild(option);
    });
  }

  // Show/hide transfer fields
  if (type === 'TRANSFER') {
    elements.toAccountField.classList.remove('hidden-field');
    elements.categorySelect.disabled = true;
    elements.categoryLabel.textContent = 'Category';
  } else {
    elements.toAccountField.classList.add('hidden-field');
    elements.categorySelect.disabled = false;
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate GAS URL
  if (GAS_WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
    showAlert('Please update the GAS_WEB_APP_URL in app.js with your Google Apps Script deployment URL', 'danger');
    return;
  }

  // Validate form
  if (!elements.transactionForm.checkValidity()) {
    showAlert('Please fill in all required fields', 'danger');
    return;
  }

  // Show loading state
  toggleFormSpinner(true);
  elements.submitBtn.disabled = true;

  try {
    const transactionData = {
      date: elements.dateInput.value,
      type: elements.typeSelect.value,
      amount: parseFloat(elements.amountInput.value),
      category: elements.categorySelect.value,
      account: elements.accountSelect.value,
      toAccount: elements.typeSelect.value === 'TRANSFER' ? elements.toAccountSelect.value : '',
      notes: elements.notesInput.value
    };

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'CREATE',
        data: transactionData
      })
    });

    const result = await response.json();

    if (result.success) {
      showAlert('Transaction added successfully!', 'success');
      elements.transactionForm.reset();
      const today = new Date().toISOString().split('T')[0];
      elements.dateInput.value = today;
      
      // Reload data
      await loadTransactions();
    } else {
      showAlert(`Error: ${result.error || 'Failed to add transaction'}`, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Network error: ${error.message}. Make sure your GAS_WEB_APP_URL is correct.`, 'danger');
  } finally {
    toggleFormSpinner(false);
    elements.submitBtn.disabled = false;
  }
}

// ===========================
// Data Operations
// ===========================

/**
 * Load all transactions and update UI
 */
async function loadTransactions() {
  try {
    toggleTableSpinner(true);

    // Validate GAS URL first
    if (GAS_WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
      showAlert('Please update the GAS_WEB_APP_URL in app.js with your Google Apps Script deployment URL', 'danger');
      toggleTableSpinner(false);
      return;
    }

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET'
    });

    const result = await response.json();

    if (result.success) {
      allTransactions = result.data || [];
      
      // Sort by date descending (most recent first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update summaries
      updateSummaries(result.summaries);

      // Render table
      renderTransactionTable();

      // Show table container
      elements.tableContainer.style.display = 'block';
    } else {
      showAlert(`Error loading transactions: ${result.error}`, 'danger');
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    showAlert(`Network error: ${error.message}`, 'danger');
  } finally {
    toggleTableSpinner(false);
  }
}

/**
 * Update summary cards with calculated data
 */
function updateSummaries(summaries) {
  // Format currency
  elements.totalBalance.textContent = formatCurrency(summaries.totalBalance);
  elements.monthlyIncome.textContent = formatCurrency(summaries.monthlyIncome);
  elements.monthlyExpense.textContent = formatCurrency(summaries.monthlyExpense);

  // Update date info
  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('incomeDate').textContent = monthYear;
  document.getElementById('expenseDate').textContent = monthYear;
}

/**
 * Render transaction table rows
 */
function renderTransactionTable() {
  elements.transactionTableBody.innerHTML = '';

  if (allTransactions.length === 0) {
    elements.transactionTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="fas fa-inbox"></i> No transactions yet
        </td>
      </tr>
    `;
    return;
  }

  // Render last 20 transactions
  allTransactions.slice(0, 20).forEach(tx => {
    const row = createTransactionRow(tx);
    elements.transactionTableBody.appendChild(row);
  });
}

/**
 * Create a transaction table row element
 */
function createTransactionRow(tx) {
  const tr = document.createElement('tr');
  
  // Format date
  const dateObj = new Date(tx.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: '2-digit' 
  });

  // Determine transfer display
  let accountDisplay = tx.account;
  if (tx.type === 'TRANSFER') {
    accountDisplay = `${tx.account} → ${tx.toAccount}`;
  }

  tr.innerHTML = `
    <td>${formattedDate}</td>
    <td>
      <span class="badge badge-${tx.type.toLowerCase()}">
        ${tx.type === 'INCOME' ? 'Income' : tx.type === 'EXPENSE' ? 'Expense' : 'Transfer'}
      </span>
    </td>
    <td>${tx.category || '-'}</td>
    <td class="fw-bold">
      ${tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}${formatCurrency(tx.amount)}
    </td>
    <td>${accountDisplay}</td>
    <td>
      <small>${tx.notes || '-'}</small>
    </td>
    <td>
      <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction('${tx.id}')">
        <i class="fas fa-trash-alt"></i>
      </button>
    </td>
  `;

  return tr;
}

/**
 * Delete a transaction
 */
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) {
    return;
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'DELETE',
        id: id
      })
    });

    const result = await response.json();

    if (result.success) {
      showAlert('Transaction deleted successfully', 'success');
      await loadTransactions();
    } else {
      showAlert(`Error: ${result.error}`, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Network error: ${error.message}`, 'danger');
  }
}

// ===========================
// UI Helpers
// ===========================

/**
 * Toggle form spinner visibility
 */
function toggleFormSpinner(show) {
  if (show) {
    elements.formSpinner.classList.add('show');
  } else {
    elements.formSpinner.classList.remove('show');
  }
}

/**
 * Toggle table spinner visibility
 */
function toggleTableSpinner(show) {
  if (show) {
    elements.tableSpinner.classList.add('show');
  } else {
    elements.tableSpinner.classList.remove('show');
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  elements.alertContainer.appendChild(alert);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

/**
 * Format number as currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

// ===========================
// Export for debugging (optional)
// ===========================
window.FinanceApp = {
  loadTransactions,
  allTransactions: () => allTransactions,
  updateSummaries,
  deleteTransaction
};
