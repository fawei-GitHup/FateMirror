const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const projectRef = 'suzaythybmyylxraevpa';
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '005_ai_usage_events.sql'),
  'utf8'
);

async function waitForDashboard(page) {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url.includes(`/dashboard/project/${projectRef}`)) {
      return;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Timed out waiting for Supabase dashboard login/session.');
}

async function clickIfVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function ensureSqlEditor(page) {
  await page.goto(`https://supabase.com/dashboard/project/${projectRef}/sql/new`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForDashboard(page);
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function fillEditor(page, text) {
  const textarea = page.locator('textarea.inputarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 30_000 });
  await textarea.evaluate((node) => node.focus());
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
}

async function runQuery(page) {
  await page.keyboard.press('Control+Enter');
}

async function verifyTable(page) {
  await fillEditor(page, "select to_regclass('public.ai_usage_events') as table_name;");
  await runQuery(page);
  await page.waitForTimeout(4000);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  return bodyText.includes('ai_usage_events');
}

(async () => {
  const userDataDir = path.join(process.cwd(), 'output', 'playwright', 'supabase-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1440, height: 960 },
  });
  const page = context.pages()[0] || (await context.newPage());

  console.log('OPENING_SUPABASE_SQL_EDITOR');
  await ensureSqlEditor(page);

  const needsLogin = page.url().includes('/sign-in') || (await page.getByText(/sign in/i).first().isVisible().catch(() => false));
  if (needsLogin) {
    console.log('PLEASE_LOGIN_IN_BROWSER');
    await waitForDashboard(page);
    await ensureSqlEditor(page);
  }

  await clickIfVisible(page, [
    'button:has-text("New query")',
    'button:has-text("SQL Editor")',
  ]).catch(() => {});

  await fillEditor(page, sql);
  const editorShot = path.join(process.cwd(), 'output', 'playwright', 'supabase-ai-usage-editor.png');
  await page.screenshot({ path: editorShot, fullPage: true });
  await runQuery(page);
  await page.waitForTimeout(8000);
  const resultShot = path.join(process.cwd(), 'output', 'playwright', 'supabase-ai-usage-result.png');
  await page.screenshot({ path: resultShot, fullPage: true });
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log(`SQL_EDITOR_TEXT ${bodyText.slice(0, 2000).replace(/\s+/g, ' ')}`);

  const tableFound = await verifyTable(page);
  const screenshotPath = path.join(process.cwd(), 'output', 'playwright', 'supabase-ai-usage-events.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (!tableFound) {
    throw new Error(`Migration run finished, but ai_usage_events was not found. Screenshot: ${screenshotPath}`);
  }

  console.log(`SUPABASE_MIGRATION_APPLIED ${screenshotPath}`);
  await context.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
