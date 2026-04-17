// ===========================
// Google Apps Script Backend
// ===========================
// Deploy as Web App: New > Project > Code.gs > Deploy > New Deployment > Web App
// Set "Execute as" to your account and "Who has access" to "Anyone"

const MyAdmin = 'transactions';
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * Handle GET requests - fetch transactions and calculate summaries
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MyAdmin);
    const data = sheet.getDataRange().getValues();
    
    // Headers are in row 1
    const headers = data[0];
    const transactions = [];
    
    // Skip header row, process all transactions
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Check if ID exists (not empty row)
        transactions.push({
          id: row[0],
          date: row[1],
          type: row[2],
          amount: row[3],
          category: row[4],
          account: row[5],
          toAccount: row[6],
          notes: row[7],
          createdAt: row[8]
        });
      }
    }
    
    // Calculate summaries
    const summaries = calculateSummaries(transactions);
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        data: transactions,
        summaries: summaries
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests - create/update/delete transactions
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    let response;
    
    switch(action) {
      case 'CREATE':
        response = createTransaction(payload.data);
        break;
      case 'UPDATE':
        response = updateTransaction(payload.data);
        break;
      case 'DELETE':
        response = deleteTransaction(payload.id);
        break;
      default:
        response = { success: false, error: 'Invalid action' };
    }
    
    return ContentService.createTextOutput(
      JSON.stringify(response)
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Create a new transaction
 */
function createTransaction(transactionData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MyAdmin);
    
    // Generate unique ID
    const id = Utilities.getUuid();
    
    // Prepare row data
    const newRow = [
      id,
      transactionData.date,
      transactionData.type,
      transactionData.amount,
      transactionData.category,
      transactionData.account,
      transactionData.toAccount || '',
      transactionData.notes || '',
      new Date()
    ];
    
    // Append to sheet
    sheet.appendRow(newRow);
    
    return {
      success: true,
      message: 'Transaction created successfully',
      id: id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Update an existing transaction
 */
function updateTransaction(transactionData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MyAdmin);
    const data = sheet.getDataRange().getValues();
    
    // Find row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === transactionData.id) {
        // Update the row
        sheet.getRange(i + 1, 1, 1, 9).setValues([[
          transactionData.id,
          transactionData.date,
          transactionData.type,
          transactionData.amount,
          transactionData.category,
          transactionData.account,
          transactionData.toAccount || '',
          transactionData.notes || '',
          new Date()
        ]]);
        
        return {
          success: true,
          message: 'Transaction updated successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Transaction not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Delete a transaction
 */
function deleteTransaction(id) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MyAdmin);
    const data = sheet.getDataRange().getValues();
    
    // Find and delete row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Transaction deleted successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Transaction not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Calculate financial summaries
 */
function calculateSummaries(transactions) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let totalBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  const accountBalances = {};
  
  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();
    const isCurrentMonth = txMonth === currentMonth && txYear === currentYear;
    
    // Calculate account balances
    if (!accountBalances[tx.account]) {
      accountBalances[tx.account] = 0;
    }
    
    if (tx.type === 'INCOME') {
      accountBalances[tx.account] += tx.amount;
      totalBalance += tx.amount;
      if (isCurrentMonth) monthlyIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      accountBalances[tx.account] -= tx.amount;
      totalBalance -= tx.amount;
      if (isCurrentMonth) monthlyExpense += tx.amount;
    } else if (tx.type === 'TRANSFER') {
      accountBalances[tx.account] -= tx.amount;
      if (!accountBalances[tx.toAccount]) {
        accountBalances[tx.toAccount] = 0;
      }
      accountBalances[tx.toAccount] += tx.amount;
    }
  });
  
  return {
    totalBalance: totalBalance,
    monthlyIncome: monthlyIncome,
    monthlyExpense: monthlyExpense,
    accountBalances: accountBalances
  };
}
