import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL หรือ Key หายไป! ตรวจสอบไฟล์ .env.local นะครับ")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)