import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      const secret = process.env.ADMIN_SECRET ?? '';
      if (secret && (await verifyAdminToken(token, secret))) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_token')?.value;
  const secret = process.env.ADMIN_SECRET ?? '';

  if (!token || !secret || !(await verifyAdminToken(token, secret))) {
    const res = NextResponse.redirect(new URL('/admin/login', request.url));
    res.cookies.delete('admin_token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
