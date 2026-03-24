import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ??
      process.env.SUPABASE_PROJECT_ID,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
