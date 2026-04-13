import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Sparkles, Brain, RefreshCw, TreePine, BookOpen, MessageCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocaleToggle } from '@/components/layout/LocaleToggle';

/* ─── Locale-aware mockup data ─── */

const MOCKUP_DATA = {
  zh: {
    journal: {
      entries: [
        { title: '回忆海南演唱会', date: '4月12日', tags: ['怀念', '伤感', '记忆'], loops: 0 },
        { title: '愤怒背后的模式', date: '4月11日', tags: ['愤怒', '身份', '领悟'], loops: 2 },
        { title: '感恩练习第七天', date: '4月11日', tags: ['感恩', '成长', '习惯'], loops: 0 },
        { title: '打破深夜刷手机', date: '4月10日', tags: ['焦虑', '习惯', '希望'], loops: 3 },
      ],
      title: '日记',
      count: '6 篇日记',
      newBtn: '+ 新建',
    },
    chat: {
      title: '引导式对话',
      status: '进行中',
      mo1: '嘿，最近有什么一直在你脑海里转的事情吗？大事小事都行，聊聊看。',
      user1: '工作上什么都答应，感觉快被掏空了...',
      mo2: '「什么都答应」\u200B——我好奇的是，当你说\u201C好\u201D的时候，你真正害怕的是说\u201C不\u201D之后会发生什么？',
    },
    profile: {
      title: '认知画像',
      thinking: '思维维度',
      thinkingLevel: 'L3 系统性',
      behaviorTitle: '行为原型',
      behaviors: [
        { name: '证明者', score: 82, color: '#C084FC' },
        { name: '讨好者', score: 68, color: '#60A5FA' },
        { name: '控制者', score: 45, color: '#22D3EE' },
        { name: '回避者', score: 35, color: '#34D399' },
      ],
      patternLabel: '🔄 模式发现',
      patternDesc: '「每次对别人说好，就是对自己说不」— 5天内出现3次',
    },
    tree: {
      title: '命运树',
      nodeCount: '20 节点',
      nodes: [
        { x: 200, y: 280, r: 10, color: '#3B82F6', label: '职业十字路口' },
        { x: 120, y: 220, r: 7, color: '#22C55E', label: '讨好型人格' },
        { x: 280, y: 220, r: 7, color: '#EF4444', label: '愤怒即威胁' },
        { x: 70, y: 155, r: 6, color: '#A855F7', label: '无法说不' },
        { x: 155, y: 155, r: 6, color: '#22C55E', label: '第一次说不' },
        { x: 240, y: 155, r: 6, color: '#3B82F6', label: '重新定义成功' },
        { x: 320, y: 155, r: 6, color: '#A855F7', label: '自我接纳' },
        { x: 40, y: 95, r: 5, color: '#A855F7', label: '内疚螺旋' },
        { x: 100, y: 95, r: 5, color: '#22C55E', label: '数字排毒' },
        { x: 185, y: 95, r: 5, color: '#3B82F6', label: '家庭对质' },
        { x: 270, y: 95, r: 5, color: '#EF4444', label: '职场面具' },
        { x: 340, y: 95, r: 5, color: '#22C55E', label: '放下完美' },
        { x: 140, y: 45, r: 4, color: '#3B82F6', label: '写给父亲' },
        { x: 260, y: 45, r: 4, color: '#22C55E', label: '感恩转变' },
      ],
      legend: [
        { color: '#22C55E', label: '里程碑' },
        { color: '#3B82F6', label: '决策点' },
        { color: '#A855F7', label: '顿悟' },
        { color: '#EF4444', label: '危机' },
      ],
    },
  },
  en: {
    journal: {
      entries: [
        { title: 'Concert Memories', date: 'Apr 12', tags: ['nostalgia', 'sadness', 'memory'], loops: 0 },
        { title: 'Pattern Behind Anger', date: 'Apr 11', tags: ['anger', 'identity', 'insight'], loops: 2 },
        { title: 'Gratitude Day Seven', date: 'Apr 11', tags: ['gratitude', 'growth', 'habits'], loops: 0 },
        { title: 'Breaking Doom Scroll', date: 'Apr 10', tags: ['anxiety', 'habits', 'hope'], loops: 3 },
      ],
      title: 'Journal',
      count: '6 entries',
      newBtn: '+ New',
    },
    chat: {
      title: 'Guided Chat',
      status: 'Active',
      mo1: "Hey, what's been on your mind lately? Big or small, let's talk about it.",
      user1: "I say yes to everything at work. I feel completely drained...",
      mo2: '"Say yes to everything" — I\'m curious: when you say "yes," what are you really afraid will happen if you say "no"?',
    },
    profile: {
      title: 'Cognition Profile',
      thinking: 'Thinking Dimension',
      thinkingLevel: 'L3 Systemic',
      behaviorTitle: 'Behavior Archetypes',
      behaviors: [
        { name: 'Prover', score: 82, color: '#C084FC' },
        { name: 'Pleaser', score: 68, color: '#60A5FA' },
        { name: 'Controller', score: 45, color: '#22D3EE' },
        { name: 'Avoider', score: 35, color: '#34D399' },
      ],
      patternLabel: '🔄 Pattern Detected',
      patternDesc: '"Every yes to others is a no to yourself" — appeared 3× in 5 days',
    },
    tree: {
      title: 'Destiny Tree',
      nodeCount: '20 nodes',
      nodes: [
        { x: 200, y: 280, r: 10, color: '#3B82F6', label: 'Career Crossroads' },
        { x: 120, y: 220, r: 7, color: '#22C55E', label: 'People-Pleasing' },
        { x: 280, y: 220, r: 7, color: '#EF4444', label: 'Anger = Threat' },
        { x: 70, y: 155, r: 6, color: '#A855F7', label: "Can't Say No" },
        { x: 155, y: 155, r: 6, color: '#22C55E', label: 'First No' },
        { x: 240, y: 155, r: 6, color: '#3B82F6', label: 'Redefine Success' },
        { x: 320, y: 155, r: 6, color: '#A855F7', label: 'Self-Acceptance' },
        { x: 40, y: 95, r: 5, color: '#A855F7', label: 'Guilt Spiral' },
        { x: 100, y: 95, r: 5, color: '#22C55E', label: 'Digital Detox' },
        { x: 185, y: 95, r: 5, color: '#3B82F6', label: 'Family Talk' },
        { x: 270, y: 95, r: 5, color: '#EF4444', label: 'Work Mask' },
        { x: 340, y: 95, r: 5, color: '#22C55E', label: 'Let Go Perfect' },
        { x: 140, y: 45, r: 4, color: '#3B82F6', label: 'Letter to Dad' },
        { x: 260, y: 45, r: 4, color: '#22C55E', label: 'Gratitude Shift' },
      ],
      legend: [
        { color: '#22C55E', label: 'Milestone' },
        { color: '#3B82F6', label: 'Decision' },
        { color: '#A855F7', label: 'Insight' },
        { color: '#EF4444', label: 'Crisis' },
      ],
    },
  },
} as const;

type MockLocale = keyof typeof MOCKUP_DATA;

/* ─── App Showcase Mockups ─── */

function JournalMockup({ locale }: { locale: MockLocale }) {
  const d = MOCKUP_DATA[locale].journal;
  const entries = d.entries;

  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      {/* Mock header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{d.title}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{d.count}</span>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">{d.newBtn}</div>
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

function ChatMockup({ locale }: { locale: MockLocale }) {
  const d = MOCKUP_DATA[locale].chat;
  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{d.title}</span>
        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">{d.status}</span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="rounded-xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">{d.mo1}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-xl rounded-tr-sm bg-primary/10 px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">{d.user1}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="rounded-xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80">{d.mo2}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileMockup({ locale }: { locale: MockLocale }) {
  const d = MOCKUP_DATA[locale].profile;
  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{d.title}</span>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400">Lv.4</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">{d.thinking}</span>
            <span className="text-[11px] font-semibold text-primary">{d.thinkingLevel}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary/60 to-primary" />
          </div>
        </div>
        <div className="space-y-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">{d.behaviorTitle}</span>
          {d.behaviors.map((b) => (
            <div key={b.name} className="flex items-center gap-3">
              <span className="w-24 text-[11px] text-foreground/70">{b.name}</span>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full" style={{ width: `${b.score}%`, backgroundColor: b.color, opacity: 0.7 }} />
                </div>
              </div>
              <span className="w-8 text-right text-[10px] text-muted-foreground">{b.score}%</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3">
          <p className="text-[11px] font-medium text-amber-400/80">{d.patternLabel}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{d.patternDesc}</p>
        </div>
      </div>
    </div>
  );
}

function TreeMockup({ locale }: { locale: MockLocale }) {
  const d = MOCKUP_DATA[locale].tree;
  const nodes = d.nodes;

  const branches: [number, number, number, number][] = [
    [200, 280, 120, 220], [200, 280, 280, 220],
    [120, 220, 70, 155], [120, 220, 155, 155],
    [280, 220, 240, 155], [280, 220, 320, 155],
    [70, 155, 40, 95], [70, 155, 100, 95],
    [155, 155, 185, 95],
    [240, 155, 270, 95],
    [320, 155, 340, 95],
    [185, 95, 140, 45],
    [270, 95, 260, 45],
  ];

  return (
    <div className="card-glow overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
        <TreePine className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{d.title}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{d.nodeCount}</span>
      </div>
      <div className="flex items-center justify-center p-4">
        <svg viewBox="0 0 400 320" className="h-[260px] w-full">
          {/* Branches */}
          {branches.map(([x1, y1, x2, y2], i) => {
            const midY = (y1 + y2) / 2;
            const thickness = Math.max(1.5, 5 - i * 0.3);
            return (
              <path
                key={`b${i}`}
                d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                stroke="rgba(120,80,50,0.7)"
                strokeWidth={thickness}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
          {/* Glow circles */}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={n.r * 2.5} fill={n.color} opacity={0.15} />
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.9} />
              {/* Label */}
              <rect
                x={n.x - n.label.length * 5}
                y={i % 2 === 0 ? n.y - n.r - 18 : n.y + n.r + 6}
                width={n.label.length * 10 + 8}
                height={14}
                rx={4}
                fill="rgba(0,0,0,0.6)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.5}
              />
              <text
                x={n.x + 4}
                y={i % 2 === 0 ? n.y - n.r - 8 : n.y + n.r + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize={8}
                fontFamily="system-ui"
              >
                {n.label}
              </text>
            </g>
          ))}
          {/* Legend */}
          <g transform="translate(10, 305)">
            {d.legend.map((item, i) => (
              <g key={i} transform={`translate(${i * 85}, 0)`}>
                <circle cx={5} cy={0} r={3} fill={item.color} />
                <text x={12} y={3} fill="rgba(255,255,255,0.5)" fontSize={8}>{item.label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const rawLocale = await getLocale();
  const locale: MockLocale = rawLocale === 'zh' ? 'zh' : 'en';
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
          <LocaleToggle />
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
            <JournalMockup locale={locale} />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseJournal')}</p>
          </div>
          <div>
            <ChatMockup locale={locale} />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseChat')}</p>
          </div>
        </div>

        {/* Row 2: Tree + Profile */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <TreeMockup locale={locale} />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseTree')}</p>
          </div>
          <div>
            <ProfileMockup locale={locale} />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">{t('showcaseProfile')}</p>
          </div>
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
