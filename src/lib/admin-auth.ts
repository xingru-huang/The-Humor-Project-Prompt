import { NextResponse } from "next/server";
import { hasAdminAccess, loadAdminAccessProfile } from "@/lib/admin-access";
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

  const { data: profile, error: profileError } = await loadAdminAccessProfile(
    supabase,
    user.email
  );

  if (profileError) {
    return {
      errorResponse: NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      ),
    };
  }

  if (!hasAdminAccess(profile)) {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase,
    user,
    accessToken: session?.access_token ?? null,
    profile,
    profileId: profile?.id ?? null,
  };
}
