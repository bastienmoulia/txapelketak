import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Organizer E2E tests.
 *
 * An organizer is a user with the "organizer" role who has their own admin URL.
 * Compared to an admin, an organizer:
 *   - Can see: Dashboard, Parties, Équipes, Poules tabs
 *   - Cannot see: Administration tab
 *   - Can edit game scores
 *   - Cannot add or delete teams
 *   - Cannot add or delete games
 *
 * Setup (beforeAll):
 *   1. Create a fresh tournament and capture its admin URL
 *   2. Validate the tournament by visiting the admin URL
 *   3. Import organizer-seed.yaml to populate with teams, series, poules, and a game
 *   4. Add an organizer user and capture their URL from the toast
 */
test.describe.serial('Organizer – role-based access', () => {
  const timestamp = Date.now();
  const tournamentName = `Organisateur Test ${timestamp}`;
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
      // Step 1: Create tournament
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests organisateur E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      // Step 2: Validate tournament by visiting the admin URL
      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);

      // Step 3: Import fixture data (teams, series, poules, games)
      await adminPage.importYamlFixture(organizerFixturePath);

      // Step 4: Add an organizer user and capture their admin URL from the toast
      await adminPage.clickTab('Administration');
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
    if (!adminUrl) {
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const adminPage = new AdminPage(page);

    try {
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete organizer test tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  // --- Preconditions ---

  test('should have captured a valid organizer URL', () => {
    expect(organizerUrl).toMatch(/\/tournaments\/[^/]+\/[^/]+$/);
    // Organizer URL must differ from the admin URL (different token)
    expect(organizerUrl).not.toBe(adminUrl);
  });

  // --- Access ---

  test('should allow the organizer to access the tournament', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(adminPage.isAccessDenied()).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
  });

  // --- Tab visibility ---

  test('should show Dashboard, Parties, Équipes and Poules tabs to the organizer', async ({
    page,
  }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Parties' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Équipes' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Poules' })).toBeVisible();
  });

  test('should NOT show the Administration tab to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    await expect(page.getByRole('tab', { name: 'Administration' })).not.toBeVisible();
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

    // Teams should be listed but without admin controls
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
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    await expect(adminPage.gameRow(orgTeam1, orgTeam2)).toBeVisible();
  });

  test('should show the edit game button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    // The edit (pencil) button is visible for admin and organizer
    const gameRow = adminPage.gameRow(orgTeam1, orgTeam2);
    await expect(gameRow.locator('[aria-label*="Modifier"]')).toBeVisible();
  });

  test('should NOT show the delete game button to the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    const gameRow = adminPage.gameRow(orgTeam1, orgTeam2);
    await expect(gameRow.locator('[aria-label*="Supprimer"]')).not.toBeVisible();
  });

  // --- Dashboard ---

  test('should show correct stats on the dashboard for the organizer', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(organizerUrl);

    // Dashboard stats from organizer-seed.yaml: 2 teams, 1 serie, 1 poule, 1 game
    await expect(adminPage.dashboardTeamsCount()).toHaveText('2');
    await expect(adminPage.dashboardSeriesCount()).toHaveText('1');
    await expect(adminPage.dashboardPoulesCount()).toHaveText('1');
    await expect(adminPage.dashboardGamesCount()).toHaveText('1');
  });
});
