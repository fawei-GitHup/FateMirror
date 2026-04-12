import test from 'node:test';
import assert from 'node:assert/strict';
import { capLevelForPlan, getEntitlements } from '../src/lib/billing/entitlements.ts';
import { resolveLocale } from '../src/i18n/config.ts';
import en from '../src/i18n/en.json' with { type: 'json' };
import zh from '../src/i18n/zh.json' with { type: 'json' };

test('free plan entitlements enforce product limits', () => {
  const free = getEntitlements('free');
  const pro = getEntitlements('pro');

  assert.equal(free.chatSessionsPerDay, 3);
  assert.equal(free.guidedSessionsPerMonth, null);
  assert.equal(free.treeNodeLimit, 10);
  assert.equal(free.chaptersEnabled, false);
  assert.equal(capLevelForPlan(4, 'free'), 2);
  assert.equal(free.aiRequestsPerDay, 40);
  assert.equal(free.aiTokensPerDay, 120000);
  assert.equal(free.aiCostUsdPerDay, 0.2);

  assert.equal(pro.chatSessionsPerDay, 5);
  assert.equal(pro.guidedSessionsPerMonth, 150);
  assert.equal(pro.treeNodeLimit, null);
  assert.equal(pro.chaptersEnabled, true);
  assert.equal(capLevelForPlan(4, 'pro'), 4);
  assert.equal(pro.aiRequestsPerDay, null);
  assert.equal(pro.aiTokensPerDay, null);
  assert.equal(pro.aiCostUsdPerDay, null);
});

test('locale resolver accepts supported locales and falls back safely', () => {
  assert.equal(resolveLocale('zh'), 'zh');
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('fr'), 'en');
  assert.equal(resolveLocale(undefined), 'en');
});

test('locale bundles include translated dynamic labels for levels, statuses, and legal pages', () => {
  for (const bundle of [en, zh]) {
    assert.ok(bundle.levels.level0);
    assert.ok(bundle.levels.level6);
    assert.ok(bundle.statuses.active);
    assert.ok(bundle.statuses.open);
    assert.ok(bundle.statuses.resolved);
    assert.ok(bundle.legal.terms.title);
    assert.ok(bundle.legal.privacy.title);
    assert.ok(bundle.actionTasks.markComplete);
  }
});
