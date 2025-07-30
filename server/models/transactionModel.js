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
    console.log('Starting createTransaction with:', { date, description, amount, type, notes });
    
    // Fetch latest transaction for balance - get the most recent one by date
    console.log('Fetching latest transaction by date...');
    const { data: latest, error: latestError } = await supabase
      .from('finance_transactions')
      .select('remaining_balance')
      .order('date', { ascending: false })  // Get the most recent by date
      .order('id', { ascending: false })    // Secondary sort by ID for consistency
      .limit(1)
      .maybeSingle();
    
    if (latestError) {
      console.error('Error fetching latest transaction:', latestError);
      throw latestError;
    }
    
    console.log('Latest transaction data:', latest);
    const previous_balance = latest?.remaining_balance || 0;
    console.log('Previous balance:', previous_balance);
    
    let credit = 0, debit = 0, remaining_balance = previous_balance;
    if (type === 'credit') {
      credit = amount;
      remaining_balance = previous_balance + amount;
    } else if (type === 'debit') {
      debit = amount;
      remaining_balance = previous_balance - amount;
    }
    
    console.log('Calculated values:', { credit, debit, remaining_balance });
    
    const transactionData = {
      date,
      description,
      credit,
      debit,
      previous_balance,
      remaining_balance,
      notes
      // Don't specify 'id' - let Supabase handle it
    };
    
    console.log('Inserting transaction data:', transactionData);
    
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert([transactionData])
      .select();
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    console.log('Transaction created successfully:', data);
    return data[0]; // Return the first (and only) inserted record
  } catch (error) {
    console.error('Error in createTransaction:', error);
    throw error;
  }
} 