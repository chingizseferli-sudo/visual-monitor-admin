import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

const ADMIN_AUTH_STORAGE_KEY = "visual-monitor-admin-auth";
const CUSTOMER_AUTH_STORAGE_KEY = "visual-monitor-customer-auth";

function getAuthStorageKey() {
  if (typeof window !== "undefined") {
    const path = window.location.pathname || "";

    if (path.startsWith("/admin")) {
      return ADMIN_AUTH_STORAGE_KEY;
    }
  }

  return CUSTOMER_AUTH_STORAGE_KEY;
}

if (!hasSupabaseConfig) {
  console.error("Missing Supabase Vite environment variables.", {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseKey),
  });
}

export const supabase = createClient(
  supabaseUrl || "https://missing-supabase-url.supabase.co",
  supabaseKey || "missing-supabase-anon-key",
  {
    auth: {
      storageKey: getAuthStorageKey(),
      persistSession: hasSupabaseConfig,
      autoRefreshToken: hasSupabaseConfig,
      detectSessionInUrl: hasSupabaseConfig,
    },
  }
);
