import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'it-system-default-jwt-secret-key-change-in-wrangler-toml'
);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public files/APIs bypass
  if (
    path.startsWith('/_next') || 
    path.startsWith('/static') || 
    path.startsWith('/api/auth') || 
    path.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session-token')?.value;

  let session: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch (e) {
      // Invalid token
    }
  }

  // Redirect logged-in users away from login page
  if (path === '/login') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-Based Authorization
  if (path.startsWith('/dashboard/assets') && session.role === 'USER') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if ((path.startsWith('/dashboard/departments') || path.startsWith('/api/departments') || path.startsWith('/dashboard/settings') || path.startsWith('/api/settings') || path.startsWith('/dashboard/roles') || path.startsWith('/api/roles')) && session.role !== 'ADMIN') {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (path.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (path.startsWith('/tech') && session.role !== 'TECH' && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (path.startsWith('/approver') && session.role !== 'APPROVER' && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Pass session to headers so server components can access it easily without parsing cookies again
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(session.id));
  requestHeaders.set('x-user-email', session.email);
  requestHeaders.set('x-user-name', encodeURIComponent(session.name));
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Apply proxy to all routes except login, public static folders
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
