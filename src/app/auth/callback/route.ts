import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasAdminAccess, loadAdminAccessProfile } from "@/lib/admin-access";
import { getSupabaseConfig } from "@/lib/supabase-config";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await loadAdminAccessProfile(supabase, user?.email);

      if (!hasAdminAccess(profile)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unauthorized`);
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
