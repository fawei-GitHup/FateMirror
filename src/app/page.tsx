import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Sparkles, Brain, RefreshCw, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-gradient">Fate</span>
            <span className="text-foreground/70">Mirror</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t('pricing')}
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t('login')}
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm" className="btn-gradient border-0 text-white">
              {t('getStarted')}
            </Button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-20 text-center md:pt-32">
        <div className="max-w-4xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('featurePatternsDesc')}
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-gradient">{t('hero')}</span>
            <br />
            <span className="text-muted-foreground">{t('heroHighlight')}</span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('heroDescription')}
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button size="lg" className="btn-gradient group border-0 px-8 py-6 text-base text-white">
                {t('cta')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="border-border/50 bg-card/50 px-8 py-6 text-base backdrop-blur hover:border-primary/30 hover:bg-card"
              >
                {t('seePricing')}
              </Button>
            </Link>
          </div>

          {/* ─── Glow separator ─── */}
          <div className="separator-glow mx-auto mt-20 w-2/3" />

          {/* ─── Features ─── */}
          <div className="grid grid-cols-1 gap-5 pt-8 text-left sm:grid-cols-3">
            <div className="card-glow group rounded-2xl bg-card/60 p-6 backdrop-blur">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{t('featurePatterns')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featurePatternsDesc')}
              </p>
            </div>

            <div className="card-glow group rounded-2xl bg-card/60 p-6 backdrop-blur">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500/20">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{t('featureCognition')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featureCognitionDesc')}
              </p>
            </div>

            <div className="card-glow group rounded-2xl bg-card/60 p-6 backdrop-blur">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition-colors group-hover:bg-violet-500/20">
                <TreePine className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{t('featureTree')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featureTreeDesc')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-20 border-t border-border/30 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground/60">
          &copy; {new Date().getFullYear()} FateMirror. {t('footer')}
        </p>
      </footer>
    </div>
  );
}
