import supabase from '../supabase/client.js'

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .order('date', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function createTransaction({ date, description, amount, type, notes }) {
  try {
    // Find the last transaction BEFORE the new row's position in total order (date ASC, id ASC)
    // For inserts on the same date, since the new id will be greater than existing ones,
    // the previous balance should come from the last tx with date <= new date.
    const { data: prev, error: prevError } = await supabase
      .from('finance_transactions')
      .select('id, remaining_balance, date')
      .lte('date', date)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevError) throw prevError;

    const previous_balance = prev?.remaining_balance || 0;
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

    const { data: inserted, error: insertError } = await supabase
      .from('finance_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (insertError) throw insertError;

    // Recalculate balances for subsequent transactions including same-day after this id
    updateSubsequentBalancesAsync(inserted.date, inserted.id, inserted.remaining_balance).catch(err => {
      console.error('Background balance update failed:', err);
    });

    return inserted;
  } catch (error) {
    throw error;
  }
}

async function updateSubsequentBalancesAsync(currentDate, currentId, currentBalance) {
  try {
    const { data: allCandidates, error } = await supabase
      .from('finance_transactions')
      .select('id, date, credit, debit')
      .gte('date', currentDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    // Only include strictly subsequent rows in the total order
    const subsequentTxs = (allCandidates || []).filter(tx => {
      if (tx.date > currentDate) return true;
      if (tx.date === currentDate && tx.id > currentId) return true;
      return false;
    });

    if (subsequentTxs.length === 0) return;

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
  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (
    updates.credit !== undefined ||
    updates.debit !== undefined ||
    updates.date !== undefined
  ) {
    recalculateBalancesAsync(data.id).catch(err => {
      console.error('Background balance recalculation failed:', err);
    });
  }

  return data;
}

async function recalculateBalancesAsync(id) {
  try {
    const { data: currentTx, error: currentError } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (currentError) throw currentError;
    
    // Find previous transaction in total order (date < or same date with smaller id)
    const { data: candidatesPrev, error: prevError } = await supabase
      .from('finance_transactions')
      .select('id, remaining_balance, date')
      .lte('date', currentTx.date)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (prevError) throw prevError;

    const previousCandidateList = (candidatesPrev || []).filter(tx => {
      if (tx.date < currentTx.date) return true;
      if (tx.date === currentTx.date && tx.id < currentTx.id) return true;
      return false;
    });

    const previous_balance = previousCandidateList.length > 0
      ? previousCandidateList[previousCandidateList.length - 1].remaining_balance
      : 0;

    const credit = currentTx.credit;
    const debit = currentTx.debit;
    const remaining_balance = previous_balance + credit - debit;

    await supabase
      .from('finance_transactions')
      .update({
        previous_balance,
        remaining_balance
      })
      .eq('id', id);

    // Recalculate subsequent transactions including same-day ones with larger id
    const { data: candidatesNext, error: subError } = await supabase
      .from('finance_transactions')
      .select('id, date, credit, debit')
      .gte('date', currentTx.date)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (subError) throw subError;

    const subsequentTxs = (candidatesNext || []).filter(tx => {
      if (tx.date > currentTx.date) return true;
      if (tx.date === currentTx.date && tx.id > currentTx.id) return true;
      return false;
    });

    const batchSize = 10;
    let runningBalance = remaining_balance;
    for (let i = 0; i < subsequentTxs.length; i += batchSize) {
      const batch = subsequentTxs.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const tx = batch[j];
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

      if (i + batchSize < subsequentTxs.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error('Error in background balance recalculation:', error);
    throw error;
  }
} 

export async function deleteTransaction(id) {
  try {
    // Get the transaction to be deleted
    const { data: transactionToDelete, error: fetchError } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!transactionToDelete) throw new Error('Transaction not found');
    
    // Get the previous transaction's remaining balance in total order
    const { data: candidatesPrev, error: prevError } = await supabase
      .from('finance_transactions')
      .select('id, remaining_balance, date')
      .lte('date', transactionToDelete.date)
      .order('date', { ascending: true })
      .order('id', { ascending: true });
    
    if (prevError) throw prevError;
    
    const previousCandidateList = (candidatesPrev || []).filter(tx => {
      if (tx.date < transactionToDelete.date) return true;
      if (tx.date === transactionToDelete.date && tx.id < transactionToDelete.id) return true;
      return false;
    });

    const previousBalance = previousCandidateList.length > 0
      ? previousCandidateList[previousCandidateList.length - 1].remaining_balance
      : 0;
    
    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Recalculate balances for all subsequent transactions
    await recalculateBalancesAfterDeletionAsync(transactionToDelete.date, transactionToDelete.id, previousBalance);
    
    return { success: true };
  } catch (error) {
    throw error;
  }
}

async function recalculateBalancesAfterDeletionAsync(deletedDate, deletedId, startingBalance) {
  try {
    const { data: allCandidates, error } = await supabase
      .from('finance_transactions')
      .select('id, date, credit, debit')
      .gte('date', deletedDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    const subsequentTxs = (allCandidates || []).filter(tx => {
      if (tx.date > deletedDate) return true;
      if (tx.date === deletedDate && tx.id > deletedId) return true;
      return false;
    });

    if (subsequentTxs.length === 0) return;

    const batchSize = 10;
    let runningBalance = startingBalance;
    
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
      
      if (i + batchSize < subsequentTxs.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error('Error recalculating balances after deletion:', error);
    throw error;
  }
} 