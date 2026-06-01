'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminToken } from '@/lib/admin-auth';

export async function adminLogin(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email    = (formData.get('email')    as string)?.trim();
  const password = formData.get('password') as string;

  const adminEmail    = process.env.ADMIN_EMAIL    ?? '';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  const adminSecret   = process.env.ADMIN_SECRET   ?? '';

  if (!adminEmail || !adminPassword || !adminSecret) {
    return { error: 'Admin credentials are not configured on the server.' };
  }

  if (email !== adminEmail || password !== adminPassword) {
    return { error: 'Invalid email or password.' };
  }

  const token = await createAdminToken(adminSecret);
  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86_400,
    path: '/',
  });

  redirect('/admin');
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  redirect('/admin/login');
}
