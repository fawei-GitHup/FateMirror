import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('root layout avoids remote google font imports', () => {
  const layoutSource = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

  assert.ok(
    !layoutSource.includes("from 'next/font/google'"),
    'Root layout should not depend on next/font/google during build',
  );
});

test('global styles provide local font variables for Tailwind theme', () => {
  const globalsSource = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

  assert.ok(globalsSource.includes('--font-sans:'), 'globals.css should define --font-sans');
  assert.ok(globalsSource.includes('--font-mono:'), 'globals.css should define --font-mono');
});
