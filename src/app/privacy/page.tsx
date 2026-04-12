import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
  const t = await getTranslations('legal.privacy');

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('body1')}</p>
      <p className="text-sm text-muted-foreground">{t('body2')}</p>
      <p className="text-sm text-muted-foreground">{t('body3')}</p>
    </main>
  );
}
