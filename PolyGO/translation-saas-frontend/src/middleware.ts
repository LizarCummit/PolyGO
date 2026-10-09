import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Skip auth check for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return res;
  }

  // Check if we're in development mode and if the user has a special query parameter
  const isDevelopmentMode = process.env.NODE_ENV === 'development';
  const hasDevBypass = req.nextUrl.searchParams.has('dev_bypass');
  
  // If in development mode and has the bypass parameter, allow access to protected routes
  if (isDevelopmentMode && hasDevBypass) {
    // Add a cookie to remember the bypass for this session
    const response = NextResponse.next();
    response.cookies.set('dev_bypass', 'true', { 
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      httpOnly: false // Allow JavaScript to access the cookie
    });
    return response;
  }

  // Check if the user has the dev bypass cookie
  const hasDevBypassCookie = req.cookies.has('dev_bypass');
  if (isDevelopmentMode && hasDevBypassCookie) {
    return res;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not signed in and the current path is not /login or /signup,
  // redirect the user to /login
  if (!session && !['/login', '/signup'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is signed in and the current path is /login or /signup,
  // redirect the user to /lectures
  if (session && ['/login', '/signup'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/lectures', req.url));
  }

  // If user is not signed in and trying to access protected routes,
  // redirect to /login
  const protectedRoutes = ['/account', '/lectures', '/research'];
  if (!session && protectedRoutes.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Log the request path for debugging
  console.log('Incoming request path:', req.nextUrl.pathname);

  // Add CORS headers for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 