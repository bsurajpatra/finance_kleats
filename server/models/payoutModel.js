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

export async function updatePayout(id, updateData) {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

export async function createPayout(payoutData) {
  try {
    // Only send the required fields, explicitly excluding any ID
    const dataToInsert = {
      date: payoutData.date,
      funds_released: payoutData.funds_released
    };
    
    const { data, error } = await supabase
      .from('payouts')
      .insert([dataToInsert])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('createPayout error:', error);
    throw error;
  }
}