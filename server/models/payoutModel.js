import supabase from '../supabase/client.js';

export async function getAllPayouts() {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}