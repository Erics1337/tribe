import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createPool } from '../packages/db/src/index.js';
import { Store } from '../apps/api/src/store.js';
import { issueSession } from '../apps/api/src/security.js';
const db = createPool('postgresql://tribe:local-tribe@localhost:54328/tribe');
let session = JSON.parse(readFileSync('.data/local-session.json', 'utf8'));
test.afterAll(async () => db.end());
test.beforeEach(async ({ page }) => {
  const owner = await db.query('SELECT user_id FROM sessions WHERE id=$1', [session.sessionId]);
  session = await issueSession(db, owner.rows[0].user_id);
  await new Store(db).setConnection(owner.rows[0].user_id, 'did:plc:' + 'b'.repeat(24), 'inner');
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Local session JSON' }).fill(JSON.stringify(session));
  await page.getByRole('button', { name: 'Open local preview' }).click();
  await expect(page.getByText('Your people. Your pace.', { exact: true })).toBeVisible();
});
test('catch up, manage circles, publish, comment and export', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByText('Maya Chen', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '.data/home-preview.png', fullPage: true });
  await page.getByText('Circles', { exact: true }).last().click();
  await expect(page.getByText('Make space for your people.', { exact: true })).toBeVisible();
  await expect(page.getByText('Your connections', { exact: true })).toBeVisible();
  await page.getByText('Share', { exact: true }).last().click();
  const caption = 'A quiet little moment from the browser walkthrough ' + Date.now();
  await page.getByRole('textbox', { name: 'Moment caption' }).fill(caption);
  await page.getByRole('button', { name: 'Review audience' }).click();
  await expect(page.getByText('Sharing with 1 person', { exact: true })).toBeVisible();
  await expect(page.getByText('Maya Chen', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Share privately' }).click();
  await expect(page.getByText(caption, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open moment and options' }).first().click();
  await page.getByRole('textbox', { name: 'Your reply' }).fill('A small hello.');
  await page.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(page.getByText('A small hello.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByText('You', { exact: true }).last().click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download your archive' }).click();
  expect((await download).suggestedFilename()).toBe('tribe-export.zip');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'AT Protocol handle' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('circle move stays private and the public network is distinct', async ({ page }) => {
  await page.getByText('Circles', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Manage Maya Chen' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Manage Maya Chen' }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Manage Maya Chen' }).click();
  await page.getByRole('button', { name: 'Inner', exact: true }).last().click();
  await page.getByText('Home', { exact: true }).last().click();
  await page.getByText('Beyond your circles', { exact: true }).click();
  await expect(page.getByText('Public network', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Filtering public posts doesn’t make them private. Your Tribe moments and circle assignments stay separate.',
      { exact: true },
    ),
  ).toBeVisible();
});
