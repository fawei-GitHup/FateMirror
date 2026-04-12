const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.goto('https://supabase.com/dashboard/project/suzaythybmyylxraevpa', {
    waitUntil: 'domcontentloaded',
  });
  await page.bringToFront();
  console.log('OPENED_SUPABASE_DASHBOARD');
  setInterval(() => {}, 1 << 30);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
