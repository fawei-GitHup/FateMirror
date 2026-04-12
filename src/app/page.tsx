import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Sparkles, Brain, RefreshCw, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ─── 星空背景 ─── */}
      <div className="starry-bg" />
      <div className="top-glow" />

      {/* ─── Nav ─── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground/90">
            FateMirror
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              {t('pricing')}
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              {t('login')}
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm" className="btn-gradient overflow-visible border-0 text-sm text-white">
              {t('getStarted')}
            </Button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-8">
          {/* Logo Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 ring-1 ring-white/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-gradient">{t('hero')}</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroDescription')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link href="/auth/signup">
              <Button size="lg" className="btn-gradient group overflow-visible border-0 px-8 py-6 text-base text-white">
                {t('cta')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="btn-outline-glow overflow-visible border-white/10 bg-white/[0.03] px-8 py-6 text-base text-foreground/80 hover:border-white/20 hover:bg-white/[0.06]"
              >
                {t('seePricing')}
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── Features ─── */}
        <div className="mt-32 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="card-glow rounded-xl p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{t('featurePatterns')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t('featurePatternsDesc')}
            </p>
          </div>

          <div className="card-glow rounded-xl p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
              <RefreshCw className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{t('featureCognition')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t('featureCognitionDesc')}
            </p>
          </div>

          <div className="card-glow rounded-xl p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <TreePine className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{t('featureTree')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t('featureTreeDesc')}
            </p>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground/50">
          &copy; {new Date().getFullYear()} FateMirror. {t('footer')}
        </p>
      </footer>
    </div>
  );
}
