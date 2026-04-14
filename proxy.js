import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Protected routes — require auth
const PROTECTED = ['/dashboard', '/test', '/admin'];
// Admin-only routes
const ADMIN_ONLY = ['/admin'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Check if route needs protection
  const needsAuth = PROTECTED.some(p => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin-only check
  const isAdminRoute = ADMIN_ONLY.some(p => pathname.startsWith(p));
  if (isAdminRoute && user.user_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/test/:path*', '/admin/:path*'],
};
