import supabase from '../supabase/client.js'

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .order('date', { ascending: true }) // order by date
  if (error) throw error
  return data
} 