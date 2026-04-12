import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Sparkles, Brain, RefreshCw, TreePine, BookOpen, MessageCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── App Showcase Mockups ─── */

function JournalMockup() {
  const entries = [
    { title: 'Why do I always say yes?', date: 'Apr 8', tags: ['exhaustion', 'boundaries', 'work'], loops: 2, mode: 'freewrite' },
    { title: 'The conversation I keep avoiding', date: 'Apr 9', tags: ['fear', 'family', 'career'], loops: 1, mode: 'guided' },
    { title: 'Breaking the midnight scroll', date: 'Apr 10', tags: ['anxiety', 'habits', 'hope'], loops: 3, mode: 'freewrite' },
    { title: 'The pattern behind my anger', date: 'Apr 11', tags: ['anger', 'identity', 'clarity'], loops: 2, mode: 'guided' },
  ];

  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      {/* Mock header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Journal</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">6 entries</span>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">+ New</div>
      </div>
      {/* Mock entries */}
      <div className="divide-y divide-white/[0.03]">
        {entries.map((e) => (
          <div key={e.title} className="px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-foreground/90">{e.title}</p>
                <div className="flex gap-1.5">
                  {e.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground/60">{e.date}</span>
                {e.loops > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <RefreshCw className="h-2.5 w-2.5 text-amber-400/70" />
                    <span className="text-[10px] text-amber-400/70">{e.loops}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMockup() {
  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      {/* Mock header */}
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Guided Session</span>
        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">Live</span>
      </div>
      {/* Mock conversation */}
      <div className="space-y-4 p-5">
        {/* Lao Mo message */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="rounded-xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">
              Hey, nice to meet you. What&apos;s been on your mind lately? Big or small, let&apos;s talk about it.
            </p>
          </div>
        </div>
        {/* User message */}
        <div className="flex justify-end">
          <div className="rounded-xl rounded-tr-sm bg-primary/10 px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">
              I keep saying yes to everything at work and I&apos;m burned out...
            </p>
          </div>
        </div>
        {/* Lao Mo response */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="rounded-xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">
              &ldquo;Saying yes to everything&rdquo; — I&apos;m curious, when you say yes, what are you actually afraid would happen if you said no?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileMockup() {
  const behaviors = [
    { name: 'Prover', score: 82, color: 'bg-purple-400' },
    { name: 'People-Pleaser', score: 68, color: 'bg-blue-400' },
    { name: 'Controller', score: 45, color: 'bg-cyan-400' },
    { name: 'Avoider', score: 35, color: 'bg-emerald-400' },
  ];

  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      {/* Mock header */}
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Cognition Profile</span>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400">Lv.3</span>
      </div>
      <div className="space-y-4 p-5">
        {/* Thinking Level */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Thinking Level</span>
            <span className="text-[11px] font-semibold text-primary">L3 Systemic</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary/60 to-primary" />
          </div>
        </div>
        {/* Behavior Archetypes */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">Behavior Archetypes</span>
          {behaviors.map((b) => (
            <div key={b.name} className="flex items-center gap-3">
              <span className="w-24 text-[11px] text-foreground/70">{b.name}</span>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className={`h-full rounded-full ${b.color}/60`} style={{ width: `${b.score}%` }} />
                </div>
              </div>
              <span className="w-8 text-right text-[10px] text-muted-foreground">{b.score}%</span>
            </div>
          ))}
        </div>
        {/* Pattern detected */}
        <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3">
          <p className="text-[11px] font-medium text-amber-400/80">🔄 Pattern Detected</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            &ldquo;Every yes to them is a no to myself&rdquo; — seen 3 times in 5 days
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ─── 顶部蓝色光晕 ─── */}
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
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 text-center sm:pt-24">
        <div className="max-w-3xl space-y-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 ring-1 ring-white/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-gradient">{t('hero')}</span>
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroDescription')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link href="/auth/signup">
              <button className="btn-rainbow group overflow-visible text-base">
                {t('cta')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn-gradient overflow-visible rounded-xl border-0 px-8 py-2.5 text-base text-white" style={{ '--button-color': '148, 163, 184' } as React.CSSProperties}>
                {t('seePricing')}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Product Showcase ─── */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-24 sm:pt-32">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('showcaseTitle')}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('showcaseDesc')}
          </p>
        </div>

        {/* Row 1: Journal + Chat */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <JournalMockup />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseJournal')}</p>
          </div>
          <div>
            <ChatMockup />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseChat')}</p>
          </div>
        </div>

        {/* Row 2: Profile (centered) */}
        <div className="mx-auto mt-6 max-w-md">
          <ProfileMockup />
          <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseProfile')}</p>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-24 sm:pt-32">
        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
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
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 mt-24 border-t border-white/[0.04] px-6 py-8 text-center sm:mt-32">
        <p className="text-xs text-muted-foreground/50">
          &copy; {new Date().getFullYear()} FateMirror. {t('footer')}
        </p>
      </footer>
    </div>
  );
}
