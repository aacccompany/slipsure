import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Merchant dashboard routes - protected
  if (pathname.startsWith('/dashboard')) {
    // For client-side auth, we'll let the client handle redirects
    // This is a simple check - full auth validation happens client-side
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
