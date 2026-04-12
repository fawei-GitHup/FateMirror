# Schema Change Acceptance Checklist

Purpose: prevent a migration from being treated as complete before the product and the operational path are both verified.

Use this checklist for any change that adds, removes, or materially changes database tables, columns, policies, or runtime assumptions tied to Supabase.

## Before migration

- confirm the migration is the single current version to apply
- confirm the target environment
- confirm rollback or fail-open behavior for the affected feature
- confirm which product flows depend on the schema change

## SQL layer acceptance

- apply the migration
- verify the target table or column exists in SQL
- verify required indexes exist
- verify required defaults and constraints exist
- verify RLS or access assumptions still hold

## API layer acceptance

- verify Supabase REST visibility for the new table or changed object
- refresh or wait for schema cache if required
- verify the app path used by runtime code can resolve the object

For a new table, acceptance is not complete until both are true:

- SQL can read it
- the runtime path used by the app can read or write it

## Product smoke tests

Run the exact feature flows touched by the schema change.

Examples:

- `/api/chat`
- `/api/journal/extract`
- `/api/journal/process`
- save journal flow
- settings diagnostics or admin visibility flow

## Observability acceptance

- confirm logs do not show unresolved schema errors
- confirm fallback behavior is understood
- confirm analytics or usage tracking is either live or explicitly degraded

## Evidence to record

- migration file name
- environment used
- verification method
- smoke-tested flows
- screenshots or logs when relevant
- unresolved follow-up items

## Release rule

Do not mark a schema rollout complete if:

- SQL succeeded but runtime access still fails
- smoke tests were skipped
- the product now depends on fail-open behavior without operator awareness

## Recent example

The `ai_usage_events` rollout proved why this checklist is necessary:

- SQL creation succeeded
- REST/schema cache did not expose the table immediately
- runtime AI flows started failing
- product continuity was restored only after adding fail-open handling

That is a valid incident pattern and should not be repeated as an untracked rollout style.
