import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutePrefixes = [
  '/journal',
  '/tree',
  '/chapters',
  '/profile',
  '/settings',
];

const authPagesToRedirectWhenSignedIn = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
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

  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutePrefixes.some((prefix) =>
    matchesPrefix(pathname, prefix)
  );
  const shouldRedirectSignedInUser = authPagesToRedirectWhenSignedIn.some(
    (route) => pathname === route
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && shouldRedirectSignedInUser) {
    const url = request.nextUrl.clone();
    url.pathname = '/journal';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
