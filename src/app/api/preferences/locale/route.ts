import { NextResponse } from 'next/server';
import { defaultLocale, resolveLocale } from '@/i18n/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = resolveLocale(body?.locale ?? defaultLocale);
  const response = NextResponse.json({ locale });
  response.cookies.set('locale', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
