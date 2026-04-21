import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Tambahkan pengecekan sederhana agar tidak crash saat build
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
