import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentListPage } from './pages/tournament-list.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * E2E tests for hidden tournament filtering.
 *
 * Tournaments whose names begin with '_' are considered hidden and must not appear
 * in the public tournament list unless the visitor opts in by setting
 * `localStorage.showHidden = 'true'`.
 *
 * Filtering is performed at the Firestore query level (not client-side), so this
 * test also validates that the Firebase query correctly excludes hidden tournaments.
 */
test.describe.serial('Hidden tournament (underscore prefix)', () => {
  const timestamp = Date.now();
  const tournamentName = `_Hidden Test ${timestamp}`;
  const adminUsername = `Admin ${timestamp}`;
  const adminEmail = `admin${timestamp}@test.com`;

  let adminUrl = '';

  test.afterAll(async ({ browser }) => {
    if (!adminUrl) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    const adminPage = new AdminPage(page);
    try {
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete hidden tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  test('should not appear in the public list after validation', async ({ page }) => {
    test.setTimeout(120000);

    const newPage = new TournamentNewPage(page);
    const listPage = new TournamentListPage(page);
    const adminPage = new AdminPage(page);

    await test.step('create tournament with underscore prefix', async () => {
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Hidden tournament E2E test');
      await newPage.goToNextStep();
      await newPage.fillStep2(adminUsername, adminEmail);
      await newPage.submit();

      await expect(page.getByTestId('success-state')).toBeVisible({ timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();
      expect(adminUrl).toMatch(/\/tournaments\/[^/]+\/[^/]+$/);
    });

    await test.step('validate tournament to set status to ongoing', async () => {
      await adminPage.goto(adminUrl);
      await expect(page.locator('.p-toast').first()).toContainText('Tournoi validé');
    });

    await test.step('hidden tournament must not appear in the public list', async () => {
      await listPage.goto();
      const found = await listPage.hasTournament(tournamentName);
      expect(found).toBe(false);
    });
  });

  test('should appear in the list when showHidden is enabled in localStorage', async ({ page }) => {
    test.setTimeout(30000);

    const listPage = new TournamentListPage(page);

    await page.evaluate(() => localStorage.setItem('showHidden', 'true'));
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);
    expect(await listPage.hasTournament(tournamentName)).toBe(true);
  });
});
