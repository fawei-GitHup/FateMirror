# Docs Authority Map

Last updated: 2026-04-09

This directory contains documents with different authority levels.

Do not treat every file in `docs/` as equally current.

## Tier 1: Current operator truth

Use these first when you need the current state of the repository:

- `STATUS.md`
- `SCHEMA_CHANGE_ACCEPTANCE_CHECKLIST.md`
- `2026-04-08-browser-audit.md`
- `2026-04-09-life-os-repo-alignment-audit.md`

## Tier 2: Current setup and repo guidance

Use these when you need setup context or top-level repository framing:

- repo root `README.md`
- repo root `.env.example`
- repo root `CLAUDE.md`

## Tier 3: Historical planning and design context

These files are useful for background, product intent, and earlier planning decisions.
They are not the default source of current runtime truth.

- `PRD.md`
- `ENGINEERING.md`
- `2026-04-07-cost-model.md`
- `2026-04-07-prd-monetization-addendum.md`
- `BILLING_SETUP.md`

## Tier 4: External framework package

These files are not FateMirror product docs. They are the imported higher-level governance framework:

- `life_os_framework_docs_v11/`
- `00_INDEX_AND_READING_ORDER.md`

## Rule

If a Tier 3 planning doc conflicts with code or `STATUS.md`, treat:

1. `src/` and `supabase/migrations/` as runtime truth
2. `STATUS.md` as current operator truth
3. Tier 3 docs as historical context
