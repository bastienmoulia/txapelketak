import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Organizer E2E tests – access control and tab visibility.
 */
test.describe.serial('Organizer – access & tab visibility', () => {
  const timestamp = Date.now();
  const tournamentName = `Org Access ${timestamp}`;
  const organizerUsername = `Orga ${timestamp}`;
  const organizerEmail = `orga${timestamp}@test.com`;
  const organizerFixturePath = 'e2e/fixtures/organizer-seed.yaml';

  let adminUrl = '';
  let organizerUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests accès organisateur E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(organizerFixturePath);

      await adminPage.clickTab('Paramètres');
      organizerUrl = await adminPage.addUserAndGetAdminUrl(
        organizerUsername,
        organizerEmail,
        'organizer',
      );
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!adminUrl) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete organizer test tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  test('should have captured a valid organizer URL', () => {
    expect(organizerUrl).toMatch(/\/tournaments\/[^/]+\/[^/?#]+\/?(?:[?#].*)?$/);
    expect(organizerUrl).not.toBe(adminUrl);
  });

  test('should allow the organizer to access the tournament', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(adminPage.isAccessDenied()).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
  });

  test('should show Dashboard, Parties, Équipes and Phases tabs to the organizer', async ({
    page,
  }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Parties' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Équipes' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Phases' })).toBeVisible();
  });

  test('should NOT show the Paramètres tab to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(page.getByRole('tab', { name: 'Paramètres' })).not.toBeVisible();
  });
});
