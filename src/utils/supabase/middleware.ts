import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const privatePrefixes = [
    "/admin",
    "/assets",
    "/billing",
    "/brand-kits",
    "/characters",
    "/characters-and-worlds",
    "/community/publish",
    "/credits",
    "/dashboard",
    "/director",
    "/image",
    "/media",
    "/settings",
    "/story",
    "/suite/director",
    "/video",
    "/world",
  ];
  const isPrivate = privatePrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let validSupabaseUrl = false;

  try {
    const parsed = new URL(supabaseUrl ?? "");
    validSupabaseUrl = parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    validSupabaseUrl = false;
  }

  if (!validSupabaseUrl || !supabaseAnonKey) {
    if (isPrivate) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    const destination = request.nextUrl.searchParams.get("next");
    if (destination?.startsWith("/") && !destination.startsWith("//")) {
      const target = new URL(destination, request.url);
      url.pathname = target.pathname;
      url.search = target.search;
    } else {
      url.pathname = "/dashboard";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
