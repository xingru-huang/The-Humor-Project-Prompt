"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function GoogleLoginButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="login-google-btn">
      <svg className="relative z-10 h-[18px] w-[18px]" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="relative z-10">Continue with Google</span>
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const isUnauthorized = error === "unauthorized";
  const isAuthFailed = error === "auth_failed";
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setAuthChecked(true);
    });
  }, [supabase]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };

  const handleSignOut = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  };

  if (!authChecked) return null;

  return (
    <div className="login-scene">
      <div className={isUnauthorized ? "login-card login-card-alert" : "login-card"}>
        <div className="login-row login-row-1 space-y-1">
          <span className="eyebrow text-[0.85rem]">The Humor Project</span>
          <h1 className="text-5xl font-bold tracking-[-0.08em] text-[var(--foreground)] sm:text-6xl">
            Prompt Testing
          </h1>
        </div>

        <p className="login-row login-row-2 mt-6 text-sm leading-7 text-[var(--muted-foreground)]">
          Build, test, and iterate on humor flavor prompt chains
          with real-time caption generation.
        </p>

        <div className={isUnauthorized ? "login-row login-row-3 mt-6" : "login-row login-row-3 mt-10"}>
          {isUnauthorized ? (
            <div className="space-y-6">
              <div className="status-banner status-banner-danger text-sm">
                Only authorized users can sign in.
              </div>

              <GoogleLoginButton onClick={handleGoogleLogin} />

              {userEmail ? (
                <button
                  onClick={handleSignOut}
                  className="btn-secondary w-full"
                >
                  Clear current session
                </button>
              ) : null}
            </div>
          ) : userEmail ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Signed in as
                </p>
                <p className="mt-1 truncate font-mono text-sm text-[var(--foreground)]">
                  {userEmail}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="btn-secondary w-full"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {isAuthFailed && (
                <div className="status-banner status-banner-danger text-sm">
                  Authentication failed. Please try again.
                </div>
              )}

              <GoogleLoginButton onClick={handleGoogleLogin} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
