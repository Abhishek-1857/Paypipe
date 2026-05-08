import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const destination = next && next.startsWith("/") ? next : "/dashboard";

  const supabaseResponse = NextResponse.redirect(
    new URL(destination, request.url)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return supabaseResponse;
  }

  if (token_hash && type) {
    await supabase.auth.verifyOtp({
      token_hash,
      type: type as "magiclink" | "email",
    });
    return supabaseResponse;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
