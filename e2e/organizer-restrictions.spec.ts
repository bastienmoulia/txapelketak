import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { DashboardPage } from './pages/dashboard.page';
import { GamesPage } from './pages/games.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Organizer E2E tests – restrictions on teams, games, and dashboard stats.
 */
test.describe.serial('Organizer – restrictions', () => {
  const timestamp = Date.now();
  const tournamentName = `Org Restrictions ${timestamp}`;
  const organizerUsername = `Orga ${timestamp}`;
  const organizerEmail = `orga${timestamp}@test.com`;
  const orgTeam1 = 'Org Team One';
  const orgTeam2 = 'Org Team Two';
  const organizerFixturePath = 'e2e/fixtures/organizer-seed.yaml';

  let adminUrl = '';
  let organizerUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests restrictions organisateur E2E');
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

  // --- Teams tab restrictions ---

  test('should NOT show add-team button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Équipes');

    await expect(page.getByTestId('add-team-button')).not.toBeVisible();
  });

  test('should NOT show edit-team or delete-team buttons to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Équipes');

    // On attend soit une ligne d'équipe, soit le message d'absence
    const row = page.locator('.p-datatable-tbody tr').first();
    const emptyMsg = page.locator('p-message');
    await Promise.race([
      row.waitFor({ state: 'visible', timeout: 10000 }),
      emptyMsg.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
    // Vérifie l'absence des boutons d'édition/suppression
    await expect(page.getByTestId('edit-team-button').first()).not.toBeVisible();
    await expect(page.getByTestId('delete-team-button').first()).not.toBeVisible();
  });

  // --- Games tab restrictions ---

  test('should NOT show add-game button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    await expect(page.getByTestId('add-game-button')).not.toBeVisible();
  });

  test('should show the game row (organizer can see games)', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    const gameRow = gamesPage.gameRow(orgTeam1, orgTeam2);
    await expect(gameRow).toBeVisible();
    await expect(gameRow).toContainText(orgTeam1);
    await expect(gameRow).toContainText(orgTeam2);
  });

  test('should show the edit game button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    const gameRow = gamesPage.gameRow(orgTeam1, orgTeam2);
    await expect(gameRow.locator('[aria-label*="Modifier"]')).toBeVisible();
  });

  test('should NOT show the delete game button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    const gameRow = gamesPage.gameRow(orgTeam1, orgTeam2);
    await expect(gameRow.locator('[aria-label*="Supprimer"]')).not.toBeVisible();
  });

  // --- Dashboard ---

  test('should show correct stats on the dashboard for the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const dashboardPage = new DashboardPage(page);
    await adminPage.goto(organizerUrl);

    await expect(dashboardPage.teamsCount()).toHaveText('2');
    await expect(dashboardPage.seriesCount()).toHaveText('1');
    // await expect(dashboardPage.poulesCount()).toHaveText('1');
    await expect(dashboardPage.gamesCount()).toHaveText('1');
  });
});
