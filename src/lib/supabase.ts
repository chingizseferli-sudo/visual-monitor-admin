import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_ENV_NAME = "VITE_SUPABASE_URL";
const SUPABASE_KEY_ENV_NAME = "VITE_SUPABASE_ANON_KEY";

const supabaseUrl = import.meta.env[SUPABASE_URL_ENV_NAME];
const supabaseKey = import.meta.env[SUPABASE_KEY_ENV_NAME];
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

function getValueState(value: unknown) {
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "string" && value.trim() === "") return "empty_string";
  return "value";
}

function getUrlHost(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return "missing";

  try {
    return new URL(value).host;
  } catch {
    return "invalid_url";
  }
}

const createClientUrl = supabaseUrl || "https://missing-supabase-url.supabase.co";
const createClientKey = supabaseKey || "missing-supabase-anon-key";

console.info("Supabase client env diagnostic", {
  urlEnvName: SUPABASE_URL_ENV_NAME,
  keyEnvName: SUPABASE_KEY_ENV_NAME,
  urlHost: getUrlHost(supabaseUrl),
  envUrlState: getValueState(supabaseUrl),
  envKeyState: getValueState(supabaseKey),
  createClientUrlState: getValueState(createClientUrl),
  createClientKeyState: getValueState(createClientKey),
});

if (!hasSupabaseConfig) {
  console.error("Missing Supabase Vite environment variables.", {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseKey),
  });
}

export const supabase = createClient(createClientUrl, createClientKey, {
  auth: {
    persistSession: hasSupabaseConfig,
    autoRefreshToken: hasSupabaseConfig,
    detectSessionInUrl: hasSupabaseConfig,
  },
});
