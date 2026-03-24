const projectId =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : "";
export const supabaseAnonKey = anonKey ?? "";

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase config is missing. Set NEXT_PUBLIC_SUPABASE_PROJECT_ID/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_PROJECT_ID/SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}
