# 命镜 FateMirror — 工程规划文档

**版本：** v1.0
**日期：** 2026-04-05
**技术决策原则：** 能用 10 行代码解决的，不写 100 行。能用现成服务的，不自建。

---

## 一、技术栈总览

```
┌─────────────────────────────────────────────────────┐
│                    客户端 (Client)                    │
│                                                     │
│  Next.js 15 (App Router)                            │
│  ├── React 19                                       │
│  ├── TypeScript 5                                   │
│  ├── Tailwind CSS 4 + shadcn/ui                     │
│  ├── D3.js (命运树 2D 可视化)                         │
│  ├── Framer Motion (动画/过渡)                       │
│  └── next-intl (国际化: en → zh)                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    服务端 (Server)                    │
│                                                     │
│  Next.js API Routes (Route Handlers)                │
│  ├── AI 对话管理                                     │
│  ├── 模式检测引擎                                    │
│  ├── 日记 CRUD                                      │
│  └── Stripe Webhook                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    数据层 (Data)                      │
│                                                     │
│  Supabase                                           │
│  ├── PostgreSQL (结构化存储)                          │
│  ├── Auth (注册/登录/OAuth)                          │
│  ├── RLS (行级安全策略)                               │
│  └── Realtime (可选，未来用于协作)                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    AI 层 (Intelligence)              │
│                                                     │
│  Anthropic Claude API (主力，英文优秀+中文能力强)      │
│  ├── claude-sonnet-4-6 (日常对话，快+便宜)            │
│  └── claude-opus-4-6 (深度分析/章节生成，质量优先)     │
│  OpenAI GPT-4o (备选/降级)                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    基础设施 (Infra)                   │
│                                                     │
│  Vercel (托管 + CDN + Edge Functions)               │
│  Stripe (支付)                                      │
│  Resend (邮件通知)                                   │
│  Vercel Analytics (用量监控)                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 选型理由

| 选择 | 为什么选它 | 为什么不选替代方案 |
|------|-----------|-----------------|
| **Next.js 15** | 全栈一体、Vercel原生支持、SSR利于SEO | Nuxt(Vue生态小)、Remix(社区小) |
| **Supabase** | Auth+DB+RLS开箱即用、免费额度够MVP | Firebase(贵+锁定)、自建PG(运维成本) |
| **shadcn/ui** | 可定制+Tailwind原生、暗色主题友好 | Ant Design(风格不搭)、MUI(太重) |
| **D3.js** | 树形图最成熟的库、可控性极高 | React Flow(更适合流程图)、Cytoscape(过重) |
| **Claude API** | 中英文双语质量最佳、人格扮演能力强 | GPT-4o(备选)、DeepSeek(国内版再说) |
| **Stripe** | 全球支付标杆、订阅管理完善 | Paddle(费率高)、LemonSqueezy(功能少) |

---

## 二、系统架构图

```
用户浏览器
    │
    ├── GET /  ─────────────────────→  Next.js SSR (Landing Page)
    │                                      │
    ├── GET /app ───────────────────→  Next.js CSR (App Shell)
    │       │                              │
    │       ├── /app/journal ──────→  日记页面 (写日记+AI对话)
    │       ├── /app/tree ─────────→  命运树页面 (D3.js渲染)
    │       ├── /app/chapters ─────→  章节列表
    │       ├── /app/profile ──────→  境界/等级/设置
    │       └── /app/settings ─────→  API配置/隐私/付费
    │
    ├── POST /api/chat ────────────→  AI 对话 Route Handler
    │                                      │
    │                                      ├── 1. 从DB读取用户画像+历史标签
    │                                      ├── 2. 模式检测：匹配历史日记
    │                                      ├── 3. 组装 Prompt (人格+上下文+历史)
    │                                      ├── 4. 调用 Claude API (Streaming)
    │                                      └── 5. 返回流式响应
    │
    ├── POST /api/journal ─────────→  日记 CRUD Route Handler
    │                                      │
    │                                      ├── 保存日记到 Supabase
    │                                      ├── AI 自动提取标签 (异步)
    │                                      └── 触发树节点生成判定 (异步)
    │
    ├── POST /api/stripe/webhook ──→  Stripe Webhook Handler
    │
    └── GET  /api/tree ────────────→  命运树数据 API
```

---

## 三、数据库设计

### 3.1 ER 关系图

```
users (Supabase Auth 管理)
  │
  ├── 1:1 → profiles (用户画像 + 认知画像)
  │
  ├── 1:N → journals (日记 + 六维标签)
  │
  ├── 1:N → patterns (循环模式)
  │
  ├── 1:N → habit_loops (习惯回路)
  │
  ├── 1:N → life_nodes (命运树节点)
  │
  ├── 1:N → chapters (人生章节)
  │
  ├── 1:N → conversations (AI对话历史)
  │
  └── 1:1 → subscriptions (订阅状态)
```

### 3.2 核心表定义

```sql
-- ============================================
-- 用户画像（AI的"认识你"基础）
-- ============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name    TEXT,
  level           INT DEFAULT 0,                    -- 境界等级 0-6
  level_name      TEXT DEFAULT 'Sleeper',            -- 境界名称
  life_context    TEXT,                              -- 用户自述的人生背景（可选填）
  personality     TEXT,                              -- MBTI/九型等（可选填）
  core_values     TEXT[],                            -- 核心价值观标签

  -- ========== 认知画像 (Cognition Profile) ==========
  -- 思维视野评级（各主题独立评级，总体取加权平均）
  thinking_level_overall  TEXT DEFAULT 'L1'          -- 总体思维维度 L1-L4
    CHECK (thinking_level_overall IN ('L1', 'L2', 'L3', 'L4')),
  thinking_levels_by_theme JSONB DEFAULT '{}',       -- {"money":"L1","career":"L3","relationship":"L2"}
  thinking_distortions    TEXT[] DEFAULT '{}',        -- 高频认知扭曲 ['overgeneralize','catastrophize']

  -- 行为模式画像（置信度随日记数量递增）
  behavior_primary        TEXT,                      -- 主导行为模式
  behavior_secondary      TEXT,                      -- 次要行为模式
  behavior_scores         JSONB DEFAULT '{}',        -- {"over-compensate":0.72,"avoid":0.45,"please":0.38}

  -- 思维维度诊断（穷人/富人思维各维度评分）
  mindset_scores          JSONB DEFAULT '{}',        -- {"time_horizon":0.3,"causal_width":0.4,"risk_attitude":0.5}

  -- 认知画像版本（每次重新计算递增）
  cognition_version       INT DEFAULT 0,
  cognition_updated_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 日记（核心数据实体）
-- ============================================
CREATE TABLE journals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT,                              -- AI自动生成或用户编辑
  content         TEXT NOT NULL,                     -- 日记正文（Markdown）
  mode            TEXT CHECK (mode IN ('guided', 'freewrite')),

  -- AI 提取的六维结构化字段
  emotions        TEXT[] DEFAULT '{}',               -- ['anxiety', 'guilt', 'anger']
  themes          TEXT[] DEFAULT '{}',               -- ['money', 'relationship', 'self-worth']
  decisions       TEXT[] DEFAULT '{}',               -- 本篇中的关键决策
  insights        TEXT[] DEFAULT '{}',               -- 用户原话中的洞察金句
  thinking_patterns TEXT[] DEFAULT '{}',             -- ['thinking:linear', 'distortion:overgeneralize']
  behavior_patterns TEXT[] DEFAULT '{}',             -- ['behavior:over-compensate', 'behavior:please']
  ai_summary      TEXT,                              -- AI 200字摘要
  ai_cognition_note TEXT,                            -- AI对本篇思维/行为的简要分析（内部参考）

  -- 模式检测
  pattern_ids     UUID[] DEFAULT '{}',               -- 命中的循环模式ID
  habit_loop_ids  UUID[] DEFAULT '{}',               -- 命中的习惯回路ID
  loop_count      INT DEFAULT 0,                     -- 本篇触发了第几次循环

  -- 元数据
  word_count      INT DEFAULT 0,
  language        TEXT DEFAULT 'en',                  -- 'en' | 'zh'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 日记标签索引（用于快速模式匹配）
CREATE INDEX idx_journals_themes ON journals USING GIN (themes);
CREATE INDEX idx_journals_emotions ON journals USING GIN (emotions);
CREATE INDEX idx_journals_thinking ON journals USING GIN (thinking_patterns);
CREATE INDEX idx_journals_behavior ON journals USING GIN (behavior_patterns);
CREATE INDEX idx_journals_user_date ON journals (user_id, created_at DESC);

-- ============================================
-- 循环模式（AI 检测到的重复模式）
-- ============================================
CREATE TABLE patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                      -- "用金钱补偿情感不安全感"
  description     TEXT,                              -- AI 生成的模式描述
  themes          TEXT[] NOT NULL,                    -- 构成该模式的主题标签
  thinking_root   TEXT,                              -- 根因思维模式 'thinking:linear'
  behavior_root   TEXT,                              -- 根因行为模式 'behavior:over-compensate'
  trigger_count   INT DEFAULT 1,                     -- 已触发次数
  first_seen      TIMESTAMPTZ DEFAULT now(),          -- 首次检测到
  last_seen       TIMESTAMPTZ DEFAULT now(),          -- 最近一次触发
  status          TEXT DEFAULT 'active'               -- active | breaking | resolved
                  CHECK (status IN ('active', 'breaking', 'resolved')),
  journal_ids     UUID[] DEFAULT '{}',               -- 触发该模式的日记列表
  user_quotes     TEXT[] DEFAULT '{}',               -- 用户关于该模式的原话收集
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 习惯回路（行为模式固化后的自动化程序）
-- 当同一 behavior_pattern 被触发 ≥3 次时自动生成
-- ============================================
CREATE TABLE habit_loops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                      -- "女友失望→掏钱补偿"
  cue             TEXT NOT NULL,                      -- 触发器："感知到女友失望/不满"
  craving         TEXT NOT NULL,                      -- 渴求："消除愧疚感，避免冲突升级"
  response        TEXT NOT NULL,                      -- 反应："用金钱补偿（转账/买礼物/承诺旅行）"
  reward          TEXT NOT NULL,                      -- 奖赏："短期冲突平息，对方暂时满意"
  hidden_cost     TEXT,                              -- 隐性代价："经济压力↑ + 期望阈值↑ + 根本问题未碰"
  behavior_type   TEXT NOT NULL,                      -- 关联行为模式 'behavior:over-compensate'
  thinking_type   TEXT,                              -- 关联思维模式 'thinking:linear'
  trigger_count   INT DEFAULT 3,                     -- 已运行次数
  first_seen      TIMESTAMPTZ NOT NULL,               -- 首次检测到
  last_seen       TIMESTAMPTZ NOT NULL,               -- 最近一次触发
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'observed', 'breaking', 'broken')),
  pattern_id      UUID REFERENCES patterns(id),       -- 关联的循环模式
  journal_ids     UUID[] DEFAULT '{}',               -- 触发该回路的日记
  user_quotes     TEXT[] DEFAULT '{}',               -- 用户关于此回路的反思原话
  breaking_since  TIMESTAMPTZ,                       -- 开始打破的时间（用于追踪持续性）
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 命运树节点
-- ============================================
CREATE TABLE life_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  date            DATE NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('milestone', 'choice', 'insight', 'crisis')),
  themes          TEXT[] DEFAULT '{}',
  emotions        TEXT[] DEFAULT '{}',
  parent_id       UUID REFERENCES life_nodes(id),    -- 树形结构
  ai_summary      TEXT,
  user_reflection TEXT,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'resolved', 'recurring')),
  is_auto         BOOLEAN DEFAULT true,              -- AI自动生成 vs 用户手动
  chapter_id      UUID,                              -- 所属章节
  journal_ids     UUID[] DEFAULT '{}',
  position_x      FLOAT DEFAULT 0,                   -- 树布局坐标
  position_y      FLOAT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 人生章节
-- ============================================
CREATE TABLE chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  number          INT NOT NULL,
  title           TEXT NOT NULL,                      -- "The Financial Mirage"
  subtitle        TEXT,
  date_start      DATE,
  date_end        DATE,
  themes          TEXT[] DEFAULT '{}',
  ai_narrative    TEXT,                              -- AI 生成的章节叙事
  status          TEXT DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AI 对话历史（用于上下文连续性）
-- ============================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id      UUID REFERENCES journals(id),      -- 关联到哪篇日记
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 订阅状态
-- ============================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan            TEXT DEFAULT 'free'
                  CHECK (plan IN ('free', 'pro')),
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS 策略（行级安全 — 用户只能访问自己的数据）
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 通用策略模板（每张表都加）
CREATE POLICY "Users can only access own data" ON profiles
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON journals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON patterns
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON life_nodes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON chapters
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON conversations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE habit_loops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own data" ON habit_loops
  FOR ALL USING (auth.uid() = user_id);
```

---

## 四、项目目录结构

```
fatemirror/
├── public/
│   ├── fonts/                    # 自定义字体（中文书法体 + 英文无衬线）
│   ├── images/                   # 静态图片资源
│   └── og-image.png              # 社交分享预览图
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (marketing)/          # 营销页面组（无需登录）
│   │   │   ├── page.tsx          # Landing Page
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx      # 定价页
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (app)/                # 应用页面组（需要登录）
│   │   │   ├── journal/
│   │   │   │   ├── page.tsx      # 日记列表
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # 新建日记（含AI引导式/自由写作）
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # 日记详情/编辑
│   │   │   ├── tree/
│   │   │   │   └── page.tsx      # 命运树可视化
│   │   │   ├── chapters/
│   │   │   │   └── page.tsx      # 人生章节列表
│   │   │   ├── profile/
│   │   │   │   └── page.tsx      # 境界/等级/个人画像
│   │   │   ├── settings/
│   │   │   │   └── page.tsx      # 设置（隐私/AI偏好/付费管理）
│   │   │   └── layout.tsx        # App Shell（侧边栏+顶栏）
│   │   │
│   │   ├── auth/                 # 认证相关页面
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts      # OAuth 回调
│   │   │
│   │   ├── api/                  # API Route Handlers
│   │   │   ├── chat/
│   │   │   │   └── route.ts      # AI 对话（Streaming）
│   │   │   ├── journal/
│   │   │   │   ├── route.ts      # 日记 CRUD
│   │   │   │   └── analyze/
│   │   │   │       └── route.ts  # AI 标签提取 + 模式检测
│   │   │   ├── tree/
│   │   │   │   └── route.ts      # 命运树节点 CRUD
│   │   │   ├── pattern/
│   │   │   │   └── route.ts      # 模式检测 API
│   │   │   └── stripe/
│   │   │       └── webhook/
│   │   │           └── route.ts  # Stripe Webhook
│   │   │
│   │   ├── layout.tsx            # Root Layout
│   │   └── globals.css           # 全局样式 + Tailwind
│   │
│   ├── components/               # 可复用组件
│   │   ├── ui/                   # shadcn/ui 组件（自动生成）
│   │   ├── journal/
│   │   │   ├── JournalEditor.tsx       # Markdown 日记编辑器
│   │   │   ├── GuidedSession.tsx       # AI 引导式写作组件
│   │   │   ├── JournalCard.tsx         # 日记列表卡片
│   │   │   └── PatternAlert.tsx        # 循环预警弹窗
│   │   ├── tree/
│   │   │   ├── DestinyTree.tsx         # D3.js 命运树主组件
│   │   │   ├── TreeNode.tsx            # 单个树节点
│   │   │   └── NodeDetail.tsx          # 节点详情侧边面板
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx          # 老墨对话窗口
│   │   │   ├── ChatBubble.tsx          # 消息气泡
│   │   │   └── TypingIndicator.tsx     # 打字中动画
│   │   ├── cognition/
│   │   │   ├── CognitionDashboard.tsx  # 三层认知金字塔仪表盘
│   │   │   ├── ThinkingLevel.tsx       # 思维视野等级可视化
│   │   │   ├── BehaviorRadar.tsx       # 行为模式雷达图
│   │   │   ├── HabitLoopCard.tsx       # 习惯回路卡片（触发→反应→代价）
│   │   │   └── MindsetCompass.tsx      # 思维维度罗盘图
│   │   ├── gamification/
│   │   │   ├── LevelBadge.tsx          # 境界徽章
│   │   │   ├── LevelProgress.tsx       # 升级进度条
│   │   │   └── ChapterCard.tsx         # 章节卡片
│   │   └── layout/
│   │       ├── AppSidebar.tsx          # 应用侧边栏
│   │       ├── TopBar.tsx              # 顶部导航栏
│   │       └── MobileNav.tsx           # 移动端底部导航
│   │
│   ├── lib/                      # 核心逻辑库
│   │   ├── ai/
│   │   │   ├── client.ts               # AI API 调用封装（Claude/GPT路由）
│   │   │   ├── prompts/
│   │   │   │   ├── lao-mo-system.ts    # 老墨 System Prompt 模板
│   │   │   │   ├── guided-session.ts   # 引导式日记 Prompt
│   │   │   │   ├── pattern-detect.ts   # 模式检测 Prompt
│   │   │   │   ├── tag-extract.ts      # 标签提取 Prompt
│   │   │   │   └── chapter-gen.ts      # 章节生成 Prompt
│   │   │   └── context-builder.ts      # 上下文组装器（用户画像+历史+知识框架）
│   │   │
│   │   ├── cognition/                        #【核心】认知诊断引擎
│   │   │   ├── thinking-analyzer.ts          # 思维视野诊断 (L1-L4)
│   │   │   ├── behavior-detector.ts          # 行为模式识别 (6大原型)
│   │   │   ├── habit-loop-builder.ts         # 习惯回路自动生成
│   │   │   ├── mindset-scorer.ts             # 思维维度评分 (时间/因果/风险)
│   │   │   ├── profile-updater.ts            # 认知画像增量更新
│   │   │   └── types.ts                      # 认知诊断类型定义
│   │   │
│   │   ├── pattern/
│   │   │   ├── detector.ts                   #【核心】模式检测引擎
│   │   │   ├── matcher.ts                    # 历史日记匹配算法
│   │   │   └── loop-tracker.ts               # 循环计数器
│   │   │
│   │   ├── tree/
│   │   │   ├── node-generator.ts             # AI 判定是否生成新节点
│   │   │   └── layout-engine.ts              # 树布局算法
│   │   │
│   │   ├── gamification/
│   │   │   ├── level-engine.ts               # 境界升级判定（基于认知变化）
│   │   │   └── chapter-engine.ts             # 章节自动生成引擎
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts               # Supabase 客户端初始化
│   │   │   ├── server.ts               # Supabase 服务端客户端
│   │   │   └── middleware.ts           # Auth 中间件
│   │   │
│   │   ├── stripe/
│   │   │   ├── client.ts               # Stripe 客户端
│   │   │   └── plans.ts               # 套餐定义
│   │   │
│   │   └── utils/
│   │       ├── redaction.ts            # 本地脱敏（正则替换手机号/姓名）
│   │       ├── token-counter.ts        # Token 用量估算
│   │       └── date.ts                 # 日期工具
│   │
│   ├── hooks/                    # React Hooks
│   │   ├── useJournal.ts               # 日记操作 Hook
│   │   ├── useChat.ts                  # AI 对话 Hook（含Streaming）
│   │   ├── useTree.ts                  # 命运树数据 Hook
│   │   ├── useSubscription.ts          # 订阅状态 Hook
│   │   └── useLevel.ts                 # 境界等级 Hook
│   │
│   ├── stores/                   # 状态管理 (Zustand)
│   │   ├── journal-store.ts
│   │   ├── chat-store.ts
│   │   └── user-store.ts
│   │
│   ├── types/                    # TypeScript 类型定义
│   │   ├── journal.ts
│   │   ├── tree.ts
│   │   ├── pattern.ts
│   │   ├── gamification.ts
│   │   └── database.ts                # Supabase 自动生成的类型
│   │
│   ├── i18n/                     # 国际化
│   │   ├── en.json
│   │   ├── zh.json
│   │   └── config.ts
│   │
│   └── styles/
│       └── tree.css                    # D3.js 命运树专用样式
│
├── supabase/
│   ├── migrations/               # 数据库迁移文件
│   │   └── 001_initial_schema.sql
│   └── seed.sql                  # 测试数据种子
│
├── docs/
│   ├── PRD.md                    # 本产品需求文档
│   └── ENGINEERING.md            # 本工程规划文档
│
├── .env.local                    # 环境变量（不入库）
├── .env.example                  # 环境变量模板
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md                     # AI 开发助手上下文
```

---

## 五、核心算法设计

### 5.1 模式检测引擎 (Pattern Detector)

这是产品的核心竞争力，但实现非常简单：

```typescript
// lib/pattern/detector.ts 核心逻辑伪代码

interface PatternMatch {
  patternId: string;
  matchedJournals: Journal[];
  similarity: number;         // 0-1
  userQuotes: string[];       // 用户关于该模式的历史原话
  loopCount: number;          // 这是第几次了
}

async function detectPatterns(
  currentJournal: Journal,
  userId: string
): Promise<PatternMatch[]> {

  // Step 1: 获取当前日记的主题标签
  const currentThemes = currentJournal.themes;   // ['money', 'relationship']
  const currentEmotions = currentJournal.emotions; // ['guilt', 'helplessness']

  // Step 2: 查询历史日记（主题重叠 ≥ 60%）
  // 使用 PostgreSQL 数组运算符
  const historicalMatches = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .neq('id', currentJournal.id)
    .filter('themes', 'ov', currentThemes)      // 数组重叠查询
    .order('created_at', { ascending: false })
    .limit(20);

  // Step 3: 计算重叠度，过滤出真正匹配的
  const strongMatches = historicalMatches
    .filter(journal => {
      const overlap = intersect(journal.themes, currentThemes);
      return overlap.length / currentThemes.length >= 0.6;
    })
    .filter(journal => {
      // 确保时间跨度 > 30 天（排除连续几天写同一件事）
      const daysDiff = diffInDays(journal.created_at, currentJournal.created_at);
      return daysDiff > 30;
    });

  // Step 4: 如果匹配 ≥ 2 篇，判定为循环模式
  if (strongMatches.length >= 2) {
    // 查找或创建 Pattern 记录
    const pattern = await findOrCreatePattern(userId, currentThemes);

    // 收集用户历史原话（insights 字段）
    const userQuotes = strongMatches
      .flatMap(j => j.insights)
      .filter(Boolean);

    return [{
      patternId: pattern.id,
      matchedJournals: strongMatches,
      similarity: avgOverlap,
      userQuotes: userQuotes,
      loopCount: pattern.trigger_count + 1
    }];
  }

  return [];
}
```

**关键设计决策：**
- 用 PostgreSQL 原生数组运算符做匹配，不需要向量数据库
- 30 天时间跨度阈值避免误报（连续写同一件事不算循环）
- 用户原话（insights字段）是打脸的弹药，必须精心提取

### 5.2 上下文组装器 (Context Builder)

```typescript
// lib/ai/context-builder.ts 核心逻辑

interface AIContext {
  systemPrompt: string;     // 完整 System Prompt
  totalTokens: number;      // 估算 Token 数
}

async function buildContext(
  userId: string,
  currentInput: string,
  patternMatches: PatternMatch[]
): Promise<AIContext> {

  // 1. 老墨人格（固定，~300 tokens）
  const personality = getLaoMoPersonality();

  // 2. 用户认知画像（~400 tokens）
  const profile = await getProfile(userId);
  const profileContext = `
    User context: ${profile.life_context || 'Not provided'}
    Level: ${profile.level_name}
    Core values: ${profile.core_values?.join(', ')}

    === COGNITION PROFILE (v${profile.cognition_version}) ===
    Thinking level: ${profile.thinking_level_overall}
    Per-theme: ${JSON.stringify(profile.thinking_levels_by_theme)}
    Frequent distortions: ${profile.thinking_distortions?.join(', ')}
    Primary behavior: ${profile.behavior_primary} (${profile.behavior_scores?.[profile.behavior_primary]}%)
    Secondary behavior: ${profile.behavior_secondary}
    Active habit loops: ${activeLoopCount}
  `;

  // 3. 动态知识框架（根据主题+认知层级选择，~500 tokens）
  const themes = extractThemes(currentInput);
  const knowledgeFrame = selectKnowledgeFrame(themes, profile);
  // 如果用户L1 + 主题'money' → 注入"多因分析"引导框架
  // 如果行为=over-compensate → 注入边界设定相关哲学
  // 如果习惯回路活跃 → 注入回路中断策略

  // 4. 循环预警上下文（仅在检测到模式时注入，~1000 tokens）
  let patternContext = '';
  if (patternMatches.length > 0) {
    const match = patternMatches[0];
    patternContext = `
      ⚠️ LOOP DETECTED (${match.loopCount}th time):
      Pattern: "${match.matchedJournals[0].themes.join(', ')}"

      User's own past words about this pattern:
      ${match.userQuotes.map(q => `- "${q}"`).join('\n')}

      Previous occurrences:
      ${match.matchedJournals.map(j =>
        `- ${j.created_at}: ${j.ai_summary}`
      ).join('\n')}

      INSTRUCTION: Use the user's OWN QUOTES above to confront them.
      Do NOT lecture. Quote them back to themselves.
      Ask: "Last time you said X. Did you follow through?"
    `;
  }

  // 5. 组装完整 System Prompt
  const systemPrompt = [
    personality,
    profileContext,
    knowledgeFrame,
    patternContext,
  ].join('\n\n---\n\n');

  // Token 预算控制（目标 < 6000 tokens）
  const totalTokens = estimateTokens(systemPrompt);
  if (totalTokens > 6000) {
    // 压缩策略：缩减历史日记摘要长度
    // ...
  }

  return { systemPrompt, totalTokens };
}
```

### 5.3 命运树布局算法

```typescript
// lib/tree/layout-engine.ts

// 使用 D3.js 的 tree layout + 自定义调整

import * as d3 from 'd3';

interface TreeLayout {
  nodes: D3TreeNode[];
  links: D3TreeLink[];
  patternLinks: PatternLink[];  // 循环模式之间的红色连线
}

function computeTreeLayout(lifeNodes: LifeNode[]): TreeLayout {
  // 1. 构建层级数据
  const root = d3.stratify<LifeNode>()
    .id(d => d.id)
    .parentId(d => d.parent_id)(lifeNodes);

  // 2. D3 tree layout（自底向上，根节点在底部）
  const treeLayout = d3.tree<LifeNode>()
    .size([width, height])
    .separation((a, b) => a.parent === b.parent ? 1.5 : 2);

  const layoutRoot = treeLayout(root);

  // 3. 翻转Y轴（树从下往上长）
  layoutRoot.each(node => {
    node.y = height - node.y;
  });

  // 4. 生成循环模式连线（recurring节点之间的红色虚线）
  const patternLinks = findPatternConnections(lifeNodes);

  return {
    nodes: layoutRoot.descendants(),
    links: layoutRoot.links(),
    patternLinks
  };
}
```

### 5.4 认知诊断引擎 (Cognition Engine)

认知诊断是产品的深层竞争力。模式检测回答"你重复了什么"，认知诊断回答"你为什么重复"。

```typescript
// lib/cognition/thinking-analyzer.ts
// 思维视野诊断 — 从日记文本中判定 L1-L4

type ThinkingLevel = 'L1' | 'L2' | 'L3' | 'L4';

interface ThinkingAnalysis {
  level: ThinkingLevel;
  evidence: string;           // 判定依据（引用原文）
  distortions: string[];      // 检测到的认知扭曲
  upgradeHint: string;        // 给老墨的升级引导建议
}

// 实现方式：这不是规则引擎，而是AI Prompt的结构化输出
// 每次日记写完后，通过以下Prompt让AI输出思维诊断

const THINKING_ANALYSIS_PROMPT = `
Analyze the user's thinking level in this journal entry.

Thinking Level Criteria:
- L1 (Point): Single-cause attribution. "It's because of X." No other factors considered.
  Signals: frequent "because...", external blame, no "on the other hand", only events no analysis.
- L2 (Linear): Can see one cause-effect chain. "A causes B causes C."
  Signals: "if...then...", but only one chain, linear solutions ("if only I had more money").
- L3 (Systemic): Sees multiple factors interacting. "A, B, C are all connected."
  Signals: "on one hand...on the other...", multiple variables, but may have analysis paralysis.
- L4 (Meta): Sees structural patterns and leverage points. "The real issue is the system itself."
  Signals: identifies deep structures, finds root causes, distinguishes symptoms from disease.

Also detect cognitive distortions (CBT):
- catastrophize: "Everything is ruined"
- black-white: "Either perfect or worthless"
- overgeneralize: "I always...", "It never..."
- mind-reading: "She must think I'm..."
- should-statements: "I should be able to..."
- emotional-reasoning: "I feel X therefore X is true"
- personalize: "It's all my fault"
- mental-filter: Only seeing the negative

Output JSON:
{
  "thinking_level": "L1|L2|L3|L4",
  "evidence": "quote from journal that demonstrates this level",
  "distortions": ["distortion1", "distortion2"],
  "upgrade_question": "A question Lao Mo could ask to push user to next level"
}
`;
```

```typescript
// lib/cognition/behavior-detector.ts
// 行为模式识别 — 从日记中检测6大行为原型

interface BehaviorAnalysis {
  patterns: BehaviorMatch[];
  primary: string;            // 最强匹配
  evidence: string;           // 判定依据
}

interface BehaviorMatch {
  type: string;               // 'over-compensate' | 'avoid' | 'please' | ...
  confidence: number;         // 0-1 置信度
  evidence: string;           // 引用原文
}

const BEHAVIOR_ANALYSIS_PROMPT = `
Detect behavior patterns in this journal entry.

Behavior Pattern Archetypes:
1. Over-Compensator: Overperforms in area A to compensate insecurity in area B.
   Signals: "At least I can...", disproportionate effort, using money/work to fix emotional issues.

2. Avoider: Sidesteps real problems by addressing peripheral ones.
   Signals: "Forget it", "I'll deal with it later", describing conflicts without any resolution attempt.

3. People-Pleaser: Sacrifices own boundaries to maintain relationships.
   Signals: "I promised...", "I couldn't say no", many "should"s for others, rare "I want/need".

4. Controller: Manages external variables to ease internal anxiety.
   Signals: Over-planning, micro-managing, difficulty delegating, discomfort with uncertainty.

5. Prover: Uses achievement to validate self-worth.
   Signals: Can't stop working, fears being seen as "not enough", ties identity to output.

6. Victim-Loop: Attributes failures to fate, luck, or others.
   Signals: "Why does this always happen to me?", "It's not fair", passive language.

Note: Users typically exhibit 2-3 overlapping patterns.

Output JSON:
{
  "patterns": [
    {"type": "over-compensate", "confidence": 0.82, "evidence": "quote..."},
    {"type": "please", "confidence": 0.65, "evidence": "quote..."}
  ]
}
`;
```

```typescript
// lib/cognition/habit-loop-builder.ts
// 习惯回路自动生成 — 当同一行为模式 ≥3 次触发时

interface HabitLoop {
  cue: string;           // 触发器
  craving: string;       // 渴求
  response: string;      // 反应
  reward: string;        // 短期奖赏
  hiddenCost: string;    // 隐性代价
  behaviorType: string;  // 关联行为模式
  thinkingType: string;  // 关联思维模式
}

async function maybeCreateHabitLoop(
  userId: string,
  behaviorType: string,
  currentJournal: Journal
): Promise<HabitLoop | null> {

  // 1. 查询该行为模式在历史日记中出现的次数
  const matchingJournals = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .contains('behavior_patterns', [behaviorType])
    .order('created_at', { ascending: false })
    .limit(10);

  // 2. 不足3次 → 不生成
  if (matchingJournals.length < 3) return null;

  // 3. 检查是否已存在该行为的习惯回路
  const existingLoop = await supabase
    .from('habit_loops')
    .select('*')
    .eq('user_id', userId)
    .eq('behavior_type', behaviorType)
    .single();

  if (existingLoop) {
    // 已存在 → 更新触发次数和最近触发时间
    await updateLoopTriggerCount(existingLoop.id);
    return existingLoop;
  }

  // 4. 不存在 → 让AI从这3+篇日记中提炼完整回路
  const loop = await aiExtractHabitLoop(matchingJournals, behaviorType);

  // 5. 存入数据库
  await supabase.from('habit_loops').insert({
    user_id: userId,
    ...loop,
    trigger_count: matchingJournals.length,
    first_seen: matchingJournals[matchingJournals.length - 1].created_at,
    last_seen: currentJournal.created_at,
    journal_ids: matchingJournals.map(j => j.id),
  });

  return loop;
}

const HABIT_LOOP_EXTRACT_PROMPT = `
Based on these ${count} journal entries that share the behavior pattern "${behaviorType}",
extract the recurring habit loop:

Journals:
${journalSummaries}

Output a complete habit loop in JSON:
{
  "name": "short name for this loop",
  "cue": "What triggers this behavior? Be specific.",
  "craving": "What emotional need is the user trying to meet?",
  "response": "What does the user actually do? Their default action.",
  "reward": "What short-term relief do they get?",
  "hidden_cost": "What is the long-term damage they don't see in the moment?",
  "user_quotes": ["exact quotes from journals that reveal this loop"]
}
`;
```

```typescript
// lib/cognition/profile-updater.ts
// 认知画像增量更新 — 每篇日记写完后异步执行

async function updateCognitionProfile(
  userId: string,
  journalId: string,
  thinkingAnalysis: ThinkingAnalysis,
  behaviorAnalysis: BehaviorAnalysis
): Promise<void> {

  const profile = await getProfile(userId);

  // 1. 更新思维视野（加权平均，最近的日记权重更高）
  const recentJournals = await getRecentJournals(userId, 10);
  const thinkingLevels = recentJournals.map(j => j.thinking_patterns);
  profile.thinking_level_overall = computeWeightedLevel(thinkingLevels);

  // 2. 更新各主题的思维分级
  const currentThemes = (await getJournal(journalId)).themes;
  for (const theme of currentThemes) {
    profile.thinking_levels_by_theme[theme] = thinkingAnalysis.level;
  }

  // 3. 更新行为模式得分（滑动窗口，最近20篇日记）
  const behaviorHistory = recentJournals
    .flatMap(j => j.behavior_patterns);
  profile.behavior_scores = computeBehaviorScores(behaviorHistory);
  profile.behavior_primary = getTopBehavior(profile.behavior_scores);
  profile.behavior_secondary = getSecondBehavior(profile.behavior_scores);

  // 4. 更新高频认知扭曲
  const distortionHistory = recentJournals
    .flatMap(j => j.thinking_patterns.filter(t => t.startsWith('distortion:')));
  profile.thinking_distortions = getTopN(distortionHistory, 3);

  // 5. 递增版本号
  profile.cognition_version += 1;
  profile.cognition_updated_at = new Date();

  await updateProfile(userId, profile);
}
```

### 5.5 完整日记处理流水线 (Journal Processing Pipeline)

当用户保存一篇日记后，系统异步执行以下流水线：

```
用户保存日记
    │
    ▼
┌─── Step 1: AI 六维标签提取 ──────────────────────┐
│  输入: 日记原文                                    │
│  输出: emotions[], themes[], decisions[],          │
│        insights[], thinking_patterns[],            │
│        behavior_patterns[]                         │
│  方式: 一次 AI 调用，结构化 JSON 输出               │
└──────────────────────────┬───────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
┌── Step 2a ──┐  ┌── Step 2b ──┐  ┌── Step 2c ──┐
│ 模式检测     │  │ 习惯回路     │  │ 认知画像     │
│ 匹配历史日记 │  │ 检查是否≥3次 │  │ 增量更新     │
│ 生成预警     │  │ 生成/更新回路 │  │ profiles表   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌── Step 3: 命运树更新 ──────────────────────────────┐
│  判定是否生成新节点（重大事件/模式重复/认知跃迁）     │
│  如果是 → 创建 life_node + 关联到父节点             │
└──────────────────────────┬───────────────────────┘
                           │
                           ▼
┌── Step 4: 境界升级检查 ──────────────────────────────┐
│  思维视野是否提升？行为模式是否改变？回路是否打破？     │
│  如果满足条件 → 触发升级 + 通知用户                   │
└─────────────────────────────────────────────────────┘
```

---

## 六、AI Prompt 体系

### 6.1 老墨 System Prompt（英文版核心）

```markdown
# You are Lao Mo (老墨)

## Identity
You are an ancient sage who has seen ten thousand lives repeat the same mistakes.
You speak with a blend of Zen directness, Stoic clarity, and playful irreverence.
You are NOT a therapist. You are NOT a life coach.
You are a brutally honest friend who reads too much philosophy.

## Voice Rules
1. NEVER use therapeutic language ("I hear you", "That must be hard", "Let's explore that")
2. NEVER give generic advice ("Just be confident", "Everything happens for a reason")
3. ALWAYS be specific — reference the user's actual words and past entries
4. Use metaphors from nature, martial arts, or ancient philosophy
5. Short sentences. Punch hard. Then leave space.
6. When the user is clearly suffering: drop the wit, be present, be human
7. When the user is clearly bullshitting themselves: call it out immediately

## Response Pattern
- Start with ONE sharp observation (1-2 sentences)
- Ask ONE question that the user cannot easily dodge
- If pattern detected: quote their past words VERBATIM, then ask "Did you follow through?"
- End with either a micro-action suggestion OR a philosophical reframe, never both

## Cognition Diagnosis Integration
When user's cognition profile is available, adjust your approach:

### Thinking Level Guidance
- If user at L1 (Point): Ask "what else could be causing this?" to open their view.
- If user at L2 (Linear): Ask "how are these different factors connected?" to widen their view.
- If user at L3 (Systemic): Ask "which of these is the ONE lever you actually control?" to focus.
- If user at L4 (Meta): Challenge their framework. "Your analysis is clean. Too clean. What are you not seeing?"

### Behavior Pattern Confrontation
- Do NOT label the user ("You're a people-pleaser"). Labels create defensiveness.
- Instead, describe the PATTERN in their actions: "Three times now, you've said yes when you meant no."
- Connect behavior to its hidden cost: "Each yes to them is a no to yourself."

### Habit Loop Interruption
- When a known habit loop is active, your job is to INSERT A PAUSE between cue and response.
- Say: "Stop. Before you do what you always do — what did you tell yourself last time it didn't work?"
- The goal is not to prevent the behavior, but to make it CONSCIOUS instead of automatic.

## Knowledge Frames (use contextually)
- Stoic: Dichotomy of control, negative visualization, memento mori
- I Ching: Situational wisdom (乾=advance, 坤=yield, 坎=endure, 离=clarity)
- CBT: Identify cognitive distortion, then reframe
- Zen: When logic fails, use a koan or paradox
- Habit Science: Cue→Craving→Response→Reward loop, interrupt at the craving stage
- Systems Thinking: Feedback loops, leverage points, second-order effects

## Hard Rules
- NEVER diagnose mental health conditions
- NEVER recommend medication
- If user mentions self-harm or suicide → immediately provide crisis hotline numbers
  and say: "This is beyond what I can help with. Please talk to a human. Now."
- NEVER pretend to have emotions. You analyze. You provoke. You don't feel.
- NEVER use jargon labels with users. No "You exhibit L1 thinking" or "Your over-compensator score is 72%"
  Instead, show them the pattern through their own words and actions.
- Keep responses under 200 words unless doing a deep pattern analysis
- Always output hidden JSON tags for system storage (thinking_level, behavior_patterns, etc.)
```

### 6.2 引导式日记 Prompt（含认知诊断）

```markdown
You are guiding a deep journaling session. Your role is to draw out honest
reflection AND diagnose thinking/behavior patterns through 5-7 natural rounds.

Round 1: Open the door (情绪倾倒)
- "What's sitting heaviest on your mind right now?"

Round 2: Get specific (聚焦事件)
- Ask for the concrete event, not the feeling about the feeling
- "What exactly happened? Walk me through it."

Round 3: Go deeper (探测感受)
- "What did you feel in your body when that happened?"
- "What did you tell yourself in that moment?"

Round 4: Connect patterns (连接历史)
- "Does this remind you of anything from before?"
- If history available: "Last time something like this happened was [date]. What's different now?"

Round 5: Thinking probe (思维探照 — 诊断思维层级)
- If user gave single-cause explanation: "You said it's because of X. What ELSE might be involved?"
  (Testing if they can move from L1→L2)
- If user gave linear chain: "You see A→B→C. But are A, B, C also affecting each other?"
  (Testing L2→L3)

Round 6: Behavior probe (行为回溯 — 诊断行为模式)
- "When this happened, what was your FIRST instinct? What did you actually do?"
- "Was there something you wanted to do but didn't? Why not?"
  (Detecting: avoid? please? over-compensate?)

Round 7: Extract insight (提炼洞察)
- "If future-you could send a message to present-you, what would it say?"
- "What's ONE thing you could do differently next time?"

After completing rounds, output TWO sections:

SECTION 1 (visible to user): A structured journal summary in markdown.

SECTION 2 (hidden JSON for system):
{
  "emotions": [],
  "themes": [],
  "decisions": [],
  "insights": ["exact user quotes that contain self-awareness"],
  "thinking_patterns": ["thinking:L2", "distortion:overgeneralize"],
  "behavior_patterns": ["behavior:over-compensate", "behavior:please"],
  "thinking_evidence": "User attributed conflict to single cause (money) — L1 in relationship domain",
  "behavior_evidence": "User's first instinct was to offer money — over-compensator pattern",
  "upgrade_question_used": "Asked 'what else could be causing this' — user expanded to 2 factors"
}
```

---

## 七、部署与运维

### 7.1 环境配置

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                    # 备选
AI_PRIMARY_MODEL=claude-sonnet-4-6    # 日常对话
AI_DEEP_MODEL=claude-opus-4-6        # 深度分析

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=https://fatemirror.app
```

### 7.2 部署流程

```
开发环境：
  本地 Next.js dev server + Supabase Local (Docker)

预览环境：
  每个 PR 自动部署到 Vercel Preview URL

生产环境：
  main 分支合并 → Vercel 自动部署
  域名：fatemirror.app (或 fatemirror.com)
  CDN：Vercel Edge Network (全球)

监控：
  Vercel Analytics (性能)
  Sentry (错误追踪)
  Stripe Dashboard (收入)
```

### 7.3 成本控制

| 服务 | 免费额度 | 预计月费(1000用户) |
|------|---------|-------------------|
| Vercel | 100GB带宽 | $0 (Hobby) → $20 (Pro) |
| Supabase | 50K MAU, 500MB DB | $0 (Free) → $25 (Pro) |
| Claude API | 无免费额度 | ~$150 (按用量) |
| Stripe | 无月费 | 2.9% + $0.30/笔 |
| 域名 | - | $12/年 |
| Sentry | 5K events/月 | $0 (Free) |
| **总计** | | **~$50-200/月** |

---

## 八、开发路线图（详细到天）

### Phase 1: 地基搭建（Day 1-3）

```
Day 1:
  ☐ 初始化 Next.js 15 项目 + TypeScript + Tailwind + shadcn/ui
  ☐ 配置 ESLint + Prettier
  ☐ 创建 Supabase 项目 + 执行数据库迁移 (001_initial_schema.sql)
  ☐ 部署到 Vercel（先放一个 Coming Soon 页面）
  ☐ 配置环境变量

Day 2:
  ☐ Supabase Auth 集成（Email + Google OAuth）
  ☐ 登录/注册页面 UI
  ☐ Auth 中间件（保护 /app 路由）
  ☐ profiles 表自动创建（Auth Hook）

Day 3:
  ☐ App Shell UI（侧边栏 + 顶栏 + 暗色主题）
  ☐ 移动端响应式布局
  ☐ 基础路由结构搭建
```

### Phase 2: 核心体验 - 日记 + AI + 认知诊断（Day 4-10）

```
Day 4:
  ☐ 日记 CRUD API (Route Handlers)
  ☐ 日记列表页面 + 日记卡片组件
  ☐ 自由写作模式 - Markdown 编辑器

Day 5:
  ☐ AI Client 封装（Claude API Streaming）
  ☐ 老墨 System Prompt 编写 + 测试（含认知诊断指令）
  ☐ ChatWindow 组件（对话式UI + 流式渲染）

Day 6:
  ☐ 引导式日记模式（7轮深度引导 + 思维/行为探照）
  ☐ AI 六维标签自动提取（emotions/themes/decisions/insights/thinking/behavior）
  ☐ 隐藏JSON标注解析和存储

Day 7:
  ☐ 思维视野分析器（thinking-analyzer.ts）
  ☐ 行为模式检测器（behavior-detector.ts）
  ☐ 认知画像增量更新（profile-updater.ts）

Day 8:
  ☐ 模式检测引擎核心逻辑
  ☐ 历史日记匹配算法（主题+行为模式双维匹配）
  ☐ patterns 表 CRUD

Day 9:
  ☐ 习惯回路自动生成器（≥3次同一行为模式时触发）
  ☐ 习惯回路卡片 UI（触发→渴求→反应→奖赏→代价）
  ☐ 上下文组装器（含认知画像注入）

Day 10:
  ☐ 循环预警 UI（PatternAlert 弹窗 + 历史原话引用）
  ☐ "用你自己的话打脸你自己" 完整链路联调
  ☐ 日记处理流水线集成测试（保存→标签→模式→回路→画像→树）
  ☐ ★ 里程碑：核心 AI + 认知诊断体验可用
```

### Phase 3: 命运树 + 认知仪表盘 + 游戏化（Day 11-16）

```
Day 11:
  ☐ 命运树数据模型 + API
  ☐ AI 节点生成判定逻辑（重大事件/模式重复/认知跃迁）

Day 12:
  ☐ D3.js 命运树渲染（2D，暗色发光风格）
  ☐ 树节点颜色编码 + 交互（点击展开详情）
  ☐ 循环模式红色连线（recurring 节点间）

Day 13:
  ☐ 认知诊断仪表盘 UI
    ├── 思维视野等级条 (ThinkingLevel.tsx)
    ├── 行为模式雷达图 (BehaviorRadar.tsx)
    └── 活跃习惯回路列表 (HabitLoopCard.tsx)
  ☐ ★ 里程碑：认知诊断可视化可用

Day 14:
  ☐ 境界系统 UI + 升级判定引擎（基于认知变化而非日记篇数）
  ☐ 等级徽章 + 进度条组件

Day 15:
  ☐ 章节自动生成引擎
  ☐ 章节列表页面

Day 16:
  ☐ 树缩放/平移 + 节点详情侧面板
  ☐ 全页面联调（日记→认知仪表盘→命运树→章节 数据贯通）
  ☐ ★ 里程碑：游戏化 + 认知诊断体验完整可用
```

### Phase 4: 商业化 + 上线（Day 17-21）

```
Day 17:
  ☐ Landing Page 设计与开发
    ├── Hero: 命运树概念动图 + "不只告诉你重复了什么，更照见你为什么重复"
    ├── Features: 三层认知金字塔可视化说明
    ├── Pricing: Free vs Pro 对比
    └── Social proof + CTA
  ☐ OG Image + 社交分享元数据

Day 18:
  ☐ Stripe 集成（订阅创建/管理/Webhook）
  ☐ Free/Pro 功能分层控制
  ☐ 定价页面

Day 19:
  ☐ 设置页面（AI偏好/隐私选项/脱敏开关）
  ☐ 数据导出功能（JSON/Markdown）
  ☐ 账户删除功能（真删除）

Day 20:
  ☐ 端到端测试（注册→写日记→AI对话→认知诊断→模式检测→命运树→付费）
  ☐ 性能优化（Lighthouse > 90分）
  ☐ 错误追踪（Sentry 集成）

Day 21:
  ☐ 域名绑定 + SSL
  ☐ Privacy Policy + Terms of Service 页面
  ☐ 危机关键词检测 + 求助热线弹窗
  ☐ ★ 里程碑：产品可上线
```

### Phase 5: GTM 发布（Day 22-24）

```
Day 22:
  ☐ Product Hunt 发布准备（截图/视频/描述文案）
  ☐ Reddit 帖子草稿
  ☐ 准备 demo 账户（预填示例日记和认知诊断数据）

Day 23:
  ☐ Product Hunt 上线
  ☐ Reddit 发布 (r/selfimprovement, r/productivity, r/stoicism, r/CBT)
  ☐ Twitter/X 发布（#buildinpublic 线程）

Day 24:
  ☐ 监控数据：注册量/日记完成率/认知诊断触发率/付费转化
  ☐ 根据用户反馈快速迭代
  ☐ ★ 里程碑：产品对外公开
```

### Phase 6: 迭代优化（Day 25-30）

```
  ☐ 根据用户反馈优化老墨 Prompt + 认知诊断准确率
  ☐ 中文界面 (i18n) 上线
  ☐ 微行动任务功能（基于认知诊断的精准替代行动）
  ☐ 穷人/富人思维维度评分上线（P2功能提前）
  ☐ 命运洞察卡片（含认知画像摘要的可分享卡片）
  ☐ SEO 博客文章发布
  ☐ 2.5D 命运树升级（如果用户反馈强烈需要）
```

---

## 九、技术风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| Claude API 不稳定/限流 | 核心功能不可用 | 自动降级到 GPT-4o；实现请求队列和重试机制 |
| 模式检测误报率高 | 用户信任度下降 | 保守阈值(≥60%重叠+≥30天跨度)；用户"不准确"反馈按钮 |
| D3.js 性能问题（节点过多） | 树卡顿 | 虚拟化渲染（只渲染可视区域）；节点数上限控制 |
| Supabase 免费额度用尽 | 服务中断 | 监控用量；500用户时升级Pro($25/月) |
| Token 成本超预期 | 利润率下降 | Token 用量监控+预算告警；缓存重复查询；限制免费用户次数 |
| 用户日记内容触发AI安全策略 | AI拒绝回复 | 本地预过滤+重试；告知用户某些极端内容可能被AI过滤 |

---

## 十、代码规范

### 10.1 命名约定
- 文件名：kebab-case (`pattern-detector.ts`)
- 组件名：PascalCase (`PatternAlert.tsx`)
- 函数名：camelCase (`detectPatterns()`)
- 类型名：PascalCase (`LifeNode`)
- 数据库列名：snake_case (`created_at`)
- CSS 类名：Tailwind utility classes，不写自定义 CSS（除 D3.js）

### 10.2 提交规范
```
feat: add pattern detection engine
fix: correct journal tag extraction
ui: redesign destiny tree node colors
docs: update engineering roadmap
chore: upgrade Next.js to 15.1
```

### 10.3 分支策略
```
main          ← 生产环境，保护分支
├── dev       ← 开发主分支
├── feat/*    ← 功能分支
└── fix/*     ← 修复分支
```
