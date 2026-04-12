import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">Fate</span>
            <span className="text-muted-foreground">Mirror</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="ghost" size="sm">
              {t('pricing')}
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              {t('login')}
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">{t('getStarted')}</Button>
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground">
            {t('featurePatternsDesc')}
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {t('hero')}
            <br />
            <span className="text-muted-foreground">{t('heroHighlight')}</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('heroDescription')}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-6 text-base">
                {t('cta')}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="px-8 py-6 text-base">
                {t('seePricing')}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-16 text-left sm:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="text-2xl">&#x1f9e0;</div>
              <h3 className="font-semibold">{t('featurePatterns')}</h3>
              <p className="text-sm text-muted-foreground">{t('featurePatternsDesc')}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="text-2xl">&#x1f504;</div>
              <h3 className="font-semibold">{t('featureCognition')}</h3>
              <p className="text-sm text-muted-foreground">{t('featureCognitionDesc')}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="text-2xl">&#x1f333;</div>
              <h3 className="font-semibold">{t('featureTree')}</h3>
              <p className="text-sm text-muted-foreground">{t('featureTreeDesc')}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 px-6 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} FateMirror. {t('footer')}</p>
      </footer>
    </div>
  );
}
