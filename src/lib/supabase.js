import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Set these in a .env file at the project root (see .env.example):
//   EXPO_PUBLIC_SUPABASE_URL=...
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Create a .env file from .env.example and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
