# FateMirror Repo Status

Last updated: 2026-04-09
Status owner: repository operators
Authority level: canonical operator status for this repository

## Purpose

This file is the current operator-facing truth source for repository status.

Use this file for:

- current stack and runtime model
- current product loop status
- current managed AI strategy
- current billing strategy
- current operational risks
- current next execution priorities

Do not use older planning docs as the default source of current runtime truth.

## Current Runtime Truth

### Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase Auth + Postgres + RLS
- D3.js
- next-intl
- Zustand

### Managed AI strategy

- Free plan: `deepseek-chat`
- Pro chat: `claude-sonnet-4-6`
- Pro deep analysis: `claude-opus-4-6`
- Pipeline tasks: `claude-haiku-4-5-20251001`
- Browser BYOK supported:
  - `openai`
  - `gemini`
  - `claude`
  - `kimi`
  - `deepseek`
  - `openrouter`

### Billing strategy

- Main checkout path: PayPal
- Creem remains integrated for supporting flows and webhook handling

## Core Product Loop Status

Current bounded loop status:

- auth: working
- chat: working
- guided journaling: working
- guided preview: working
- freewrite save: working
- journal extraction: working
- downstream journal processing: working

Known constraint:

- AI usage logging is fail-open when `ai_usage_events` is unavailable through Supabase REST/schema cache
- this preserves user flows but can reduce operator observability
- settings now surface that degradation state to the operator, but there is still no dedicated diagnostics panel

## Current Governance Truth Hierarchy

For this repo, use the following order:

1. runtime truth
   - `src/`
   - `supabase/migrations/`
2. operator truth
   - `docs/STATUS.md`
   - `README.md`
   - focused current audit docs in `docs/`
3. assistant and historical context
   - `CLAUDE.md`
   - older planning docs
   - exploratory documents not explicitly marked current

Rule:

No assistant-context file may contradict runtime truth or this status file.

## Current High-Priority Risks

### 1. Schema rollout verification gap

Recent evidence showed that:

- SQL migration success did not guarantee REST visibility
- `ai_usage_events` existed in SQL but was missing in Supabase schema cache

Operational consequence:

- user flows are protected
- analytics may silently degrade

### 2. Documentation authority must stay maintained

Main planning docs are now labeled and `docs/README.md` maps authority tiers.
The remaining risk is not missing labels, but letting future documents bypass the same hierarchy.

## Current Execution Priorities

Priority 1:

- continue browser audit and document evidence-driven UX fixes

Priority 2:

- keep `docs/README.md`, `STATUS.md`, and document authority labels aligned as docs change

Priority 3:

- consider a dedicated operator diagnostics view instead of surfacing degraded status only inside settings

## Acceptance Rule

This file should be updated when any of the following changes:

- managed model routing
- billing primary path
- runtime framework major version
- bounded product loop state
- top operational risk
- execution priorities
