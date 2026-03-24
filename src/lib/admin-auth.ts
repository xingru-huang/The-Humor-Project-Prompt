import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireAdminApiContext() {
  const supabase = await createSupabaseServerClient();
  const [
    {
      data: { user },
    },
    {
      data: { session },
    },
  ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = user.email ?? "";
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    return {
      errorResponse: NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      ),
    };
  }

  if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase,
    user,
    accessToken: session?.access_token ?? null,
    profile,
    profileId: profile.id ?? null,
  };
}
