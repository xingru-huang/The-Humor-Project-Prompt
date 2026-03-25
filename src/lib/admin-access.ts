import type { SupabaseClient } from "@supabase/supabase-js";

type AdminAccessProfile = {
  id?: string | null;
  is_superadmin?: boolean | null;
  is_matrix_admin?: boolean | null;
};

export function hasAdminAccess(profile: AdminAccessProfile | null | undefined) {
  return Boolean(profile?.is_superadmin || profile?.is_matrix_admin);
}

export async function loadAdminAccessProfile(
  supabase: Pick<SupabaseClient, "from">,
  email: string | null | undefined
) {
  if (!email) {
    return { data: null, error: null };
  }

  return supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("email", email)
    .maybeSingle();
}
