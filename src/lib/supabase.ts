import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";
import { createClient, processLock } from "@supabase/supabase-js";
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const authStorageKey = `sb-${(supabaseUrl || "https://placeholder.supabase.co").split("//")[1].split(".")[0]}-auth-token`;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "sb_publishable_placeholder",
  {
    auth: {
      storageKey: authStorageKey,
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  },
);
