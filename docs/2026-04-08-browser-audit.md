# FateMirror Browser Audit

Date: 2026-04-08
Scope: Headed Playwright browser audit of core product flows, UI/UX review, bug log, and optimization proposals.
Status: In progress

## Audit Setup

- Local URL: `http://localhost:3000`
- Method: Direct Playwright automation in headed mode
- Runtime: temporary local `playwright` install via `npm install --no-save playwright`
- Notes:
  - Audit is being recorded live.
  - No product code changes are included in this document.

## Flow Log

### 1. Environment / Launch

- `next dev` reachable on port `3000`
- Home page responds with HTTP `200`
- Direct Playwright Chrome launch confirmed

### 2. Public Pages

- `/`, `/pricing`, `/privacy`, `/terms` load successfully in headed Playwright
- No public-page console errors observed during initial pass
- Screenshots captured in `output/playwright/`

### 3. Authentication

- Email/password login works for the existing test account
- Post-login redirect to `/journal` works
- No frontend console errors observed during login

### 4. Journal Flows

- `Journal` list page loads correctly after login
- `New Journal` mode selector loads correctly
- Freewrite save flow works for the journal record itself, but AI extract failed in a fresh browser profile without stored BYOK config
- Observed failure:
  - `500 POST /api/journal/extract` when the browser profile has no local AI key and the server has no managed AI key
  - UX issue: current error handling is opaque; the app does not clearly explain that extraction depends on a browser-stored key in BYOK mode

### 5. Settings / AI Config

- Re-tested after local server restart
- Current browser state can simultaneously show:
  - `AI unavailable`
  - `Custom AI active`
- This is a UX contradiction
  - The server-managed status card is technically correct about missing server env keys
  - But for an end user who already saved a browser-local key, the page still reads like the product is broken
- Screenshot: `output/playwright/audit-settings-after-restart.png`

### 6. Tree / Profile / Chapters

- Pending

### 7. Multilingual Journal Retest After Restart

- Restarted `next dev` and confirmed local site responds with HTTP `200`
- Re-tested freewrite using mixed-language content:
  - Chinese
  - English
  - Japanese
- Flow result:
  - mode selector works
  - selecting `Freewrite` reveals the editor correctly
  - save succeeds
  - redirect to journal detail succeeds
- Saved journal URL pattern confirmed: `/journal/<uuid>`
- Screenshot set:
  - `output/playwright/audit-new-journal-entry.png`
  - `output/playwright/audit-freewrite-mode-selected.png`
  - `output/playwright/audit-freewrite-save-debug.png`
- Important issue found:
  - saved entry remained `Untitled Entry`
  - extracted AI summary / tags did not appear on the detail page in this retest
  - server log later clarified the root cause:
    - `/api/journal/extract` and `/api/journal/process` were failing with `PGRST205`
    - message: `Could not find the table 'public.ai_usage_events' in the schema cache`
  - user-facing result:
    - save appears to work
    - journal body persists
    - AI enrichment silently fails from the user's perspective
- Secondary UX issue:
  - the mode selector and editor are effectively two sub-states on the same `/journal/new` route
  - this is workable, but it makes automation and probably user orientation less clear because URL state does not change when mode changes

### 8. Guided Session Retest After Restart

- Guided mode loads correctly after selecting the card
- Initial Lao Mo prompt renders correctly
- Multilingual input tested in one message:
  - Chinese
  - English
  - Spanish
- Observed failure:
  - assistant reply rendered as `Internal server error`
  - `End & preview` button remained visible
  - preview action failed with:
    - `Failed to prepare the guided preview. Please try again.`
- Screenshot set:
  - `output/playwright/audit-guided-selected.png`
  - `output/playwright/audit-guided-after-message.png`
  - `output/playwright/audit-guided-preview-modal.png`
- Root cause from server log:
  - `/api/chat` failed with `PGRST205`
  - `public.ai_usage_events` exists in the database but was not yet available through the Supabase schema cache
  - this makes the new usage-tracking layer a production blocker until schema cache is refreshed

### 9. Supabase Usage Table Verification

- Browser automation successfully created `ai_usage_events` in Supabase SQL Editor
- Follow-up operational step executed:
  - `NOTIFY pgrst, 'reload schema';`
- Direct verification against Supabase REST with service role credentials still returned `404`
- Interpretation:
  - the table exists at the SQL layer
  - but the REST API/schema cache path used by the app still does not expose it
  - therefore all new code paths that call `supabase.from('ai_usage_events')` remain blocked

### 10. Post-Fix Retest

- Implemented fail-open handling for `ai_usage_events`
- New behavior:
  - if the usage table is unavailable via Supabase REST/schema cache
  - AI features continue working
  - usage logging is skipped instead of crashing the request

#### Retest: Guided Session

- `POST /api/chat` recovered to `200`
- Multilingual guided input now returns a normal Lao Mo reply
- `End & preview` remains available
- Preview modal renders again instead of failing immediately
- Screenshot set:
  - `output/playwright/retest-guided-after-message.png`
  - `output/playwright/retest-guided-preview.png`

#### Retest: Freewrite

- Focused save test now passes end-to-end
- Observed sequence:
  - `POST /api/journal` returns `200`
  - app redirects to `/journal/<uuid>`
  - title extraction appears on detail page
  - summary, emotions, themes, thinking patterns, insights, and decisions render correctly
- Mixed-language content tested again:
  - Chinese
  - English
- Screenshot:
  - `output/playwright/retest-freewrite-detail-final.png`

## Findings

1. High: Settings page communicates contradictory AI state when BYOK is active
   - Evidence: page shows `AI unavailable` while also showing `Custom AI active`
   - Impact: users may think AI is broken even when their browser-local key is valid
   - Area: `Settings / AI Access`

2. Medium: Settings page still communicates AI status in a contradictory way when BYOK is active
   - Evidence: page shows `AI unavailable` while also showing `Custom AI active`
   - Impact: users may think AI is broken even though chat and extract can work with browser-local keys
   - Area: `Settings / AI Access`

3. Medium: Operational rollout still has an observability gap around usage logging
   - Evidence:
     - SQL table creation succeeded
     - REST visibility remained inconsistent
     - app now degrades gracefully, but silent usage-log skipping can hide deployment issues
   - Impact: product works, but cost analytics may be incomplete until Supabase REST fully exposes the table
   - Area: `AI usage tracking / operations`

4. Medium: `/journal/new` keeps mode selection and editor entry in the same URL state
   - Evidence: selecting `Freewrite` stays on `/journal/new`
   - Impact: weaker mental model, harder to deep-link, less explicit back-navigation behavior, and slightly more fragile automation/testability
   - Area: `New Journal`

## Strengths

- The local app restarts cleanly and becomes reachable quickly
- Multilingual raw content persists correctly after save
- Freewrite mode selection is visually clear once the card is selected
- Post-save redirect into journal detail is fast and stable
- Guided conversation recovered after the fail-open fix
- Freewrite extraction and detail rendering recovered after the fail-open fix

## Weaknesses

- AI status communication is too implementation-oriented instead of user-oriented
- Save success and AI extraction success are not communicated as separate states
- Usage tracking currently prioritizes product continuity over operator visibility when the analytics table is unavailable
- Some flows rely on state hidden behind `localStorage`, which increases ambiguity when the page messaging still centers server env vars
- Operational changes that affect Supabase schema must be followed by an explicit schema cache refresh or a verified wait period
- Operational rollout currently lacks a guaranteed verification step that checks both SQL visibility and REST visibility

## Optimization Proposal

- Split AI status into two explicit sections:
  - `Server-managed AI`
  - `Your browser key`
- On `New Journal`, show an extraction status banner after save:
  - `Saving journal`
  - `Extracting title and tags`
  - `Analysis finished`
  - or `Extraction failed, retry`
- Consider route-level clarity:
  - `/journal/new?mode=freewrite`
  - `/journal/new?mode=guided`
- If async extraction continues after save, show skeletons or a labeled pending state on the detail page instead of a plain untitled entry with no explanation
- For operational safety, add a deployment checklist item:
  - run migration
  - verify table existence
  - refresh Supabase schema cache
  - verify `/rest/v1/<table>` resolves successfully
  - smoke test `/api/chat`, `/api/journal/extract`, `/api/journal/process`
- Add operator-visible warnings when usage logging is unavailable:
  - server log warning
  - optional admin diagnostics panel
