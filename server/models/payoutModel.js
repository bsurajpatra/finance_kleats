import supabase from '../supabase/client.js';

export async function getAllPayouts() {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deletePayout(id) {
  try {
    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
}