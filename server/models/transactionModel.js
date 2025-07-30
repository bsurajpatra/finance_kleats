import supabase from '../supabase/client.js'

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .order('date', { ascending: true }) 
  if (error) throw error
  return data
}

export async function createTransaction({ date, description, amount, type, notes }) {
  try {
    // Get the latest transaction for balance calculation
    const { data: latest, error: latestError } = await supabase
      .from('finance_transactions')
      .select('remaining_balance')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (latestError) throw latestError;
    
    const previous_balance = latest?.remaining_balance || 0;
    let credit = 0, debit = 0, remaining_balance = previous_balance;
    
    if (type === 'credit') {
      credit = amount;
      remaining_balance = previous_balance + amount;
    } else if (type === 'debit') {
      debit = amount;
      remaining_balance = previous_balance - amount;
    }
    
    const transactionData = {
      date,
      description,
      credit,
      debit,
      previous_balance,
      remaining_balance,
      notes
    };
    
    // Insert the new transaction
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert([transactionData])
      .select();
    
    if (error) throw error;
    
    // Start background process to update subsequent transactions if needed
    updateSubsequentBalancesAsync(date, remaining_balance).catch(err => {
      console.error('Background balance update failed:', err);
    });
    
    return data[0];
  } catch (error) {
    throw error;
  }
}

// Async function to update subsequent transaction balances
async function updateSubsequentBalancesAsync(currentDate, currentBalance) {
  try {
    const { data: subsequentTxs, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .gt('date', currentDate)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    if (subsequentTxs.length === 0) return;
    
    // Process in batches
    const batchSize = 10;
    let runningBalance = currentBalance;
    
    for (let i = 0; i < subsequentTxs.length; i += batchSize) {
      const batch = subsequentTxs.slice(i, i + batchSize);
      
      for (const tx of batch) {
        const newRemainingBalance = runningBalance + tx.credit - tx.debit;
        
        await supabase
          .from('finance_transactions')
          .update({
            previous_balance: runningBalance,
            remaining_balance: newRemainingBalance
          })
          .eq('id', tx.id);
        
        runningBalance = newRemainingBalance;
      }
      
      // Small delay between batches
      if (i + batchSize < subsequentTxs.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error('Error updating subsequent balances:', error);
    throw error;
  }
}

export async function updateTransaction(id, updates) {
  // If credit or debit is being updated, we need to recalculate balances
  if (updates.credit !== undefined || updates.debit !== undefined) {
    // Start balance recalculation in background
    recalculateBalancesAsync(id, updates).catch(err => {
      console.error('Background balance recalculation failed:', err);
    });
  }
  
  // Return immediately with the update
  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// Async function to handle balance recalculation in background
async function recalculateBalancesAsync(id, updates) {
  try {
    // Get the current transaction to find the previous transaction's balance
    const { data: currentTx, error: currentError } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (currentError) throw currentError;
    
    // Find the previous transaction (by date, excluding current one)
    const { data: previousTx, error: prevError } = await supabase
      .from('finance_transactions')
      .select('remaining_balance')
      .lt('date', currentTx.date)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (prevError) throw prevError;
    
    const previous_balance = previousTx?.remaining_balance || 0;
    
    // Calculate new remaining balance based on updated credit/debit
    const credit = updates.credit !== undefined ? updates.credit : currentTx.credit;
    const debit = updates.debit !== undefined ? updates.debit : currentTx.debit;
    const remaining_balance = previous_balance + credit - debit;
    
    // Update current transaction with recalculated balance
    await supabase
      .from('finance_transactions')
      .update({
        previous_balance,
        remaining_balance
      })
      .eq('id', id);
    
    // Update all subsequent transactions' balances in batches
    const { data: subsequentTxs, error: subError } = await supabase
      .from('finance_transactions')
      .select('*')
      .gte('date', currentTx.date)
      .order('date', { ascending: true });
    
    if (subError) throw subError;
    
    // Process in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < subsequentTxs.length; i += batchSize) {
      const batch = subsequentTxs.slice(i, i + batchSize);
      
      // Update batch
      for (let j = 0; j < batch.length; j++) {
        const tx = batch[j];
        const prevTx = j === 0 && i === 0 ? null : 
          (j === 0 ? subsequentTxs[i - 1] : batch[j - 1]);
        const prevBalance = prevTx ? prevTx.remaining_balance : previous_balance;
        const newRemainingBalance = prevBalance + tx.credit - tx.debit;
        
        await supabase
          .from('finance_transactions')
          .update({
            previous_balance: prevBalance,
            remaining_balance: newRemainingBalance
          })
          .eq('id', tx.id);
      }
      
      // Small delay to prevent overwhelming the database
      if (i + batchSize < subsequentTxs.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error('Error in background balance recalculation:', error);
    throw error;
  }
} 