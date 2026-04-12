import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, resolveLocale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get('locale')?.value ?? defaultLocale);

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  };
});
