import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for tournament management operations.
 *
 * Tournament creation is done in beforeAll; these tests focus exclusively on
 * admin management: teams, series & poules, users, games, and role-specific UI.
 *
 * 1. beforeAll – Create and validate tournament, capture adminUrl/tournamentId
 * 2. Manage teams (add, edit, delete)
 * 3. Manage series & poules (add, edit, delete)
 * 4. Manage users (add, edit, delete) – Administration tab
 * 5. Manage games (setup via YAML import, add, delete)
 * 6. Verify dashboard reflects changes
 * 7. afterAll – Clean up tournament
 */
test.describe.serial('Admin – tournament management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Test ${timestamp}`;
  const teamAlpha = `Équipe Alpha ${timestamp}`;
  const teamBeta = `Équipe Beta ${timestamp}`;
  const teamBetaEdited = `Équipe B ${timestamp}`;
  const teamDeleteOnly = 'Admin Seed Team Delete';
  const serieName = `Série 1 ${timestamp}`;
  const serieNameEdited = `Série A ${timestamp}`;
  const pouleName = `Poule A ${timestamp}`;
  const poulesNameEdited = `Poule A-2 ${timestamp}`;
  const pouleNameB = `Poule B ${timestamp}`;
  const pouleDeleteSerie = 'Admin Seed Poule Delete Serie';
  const pouleDeleteName = 'Admin Seed Poule Delete B';
  const serieDeleteOnly = 'Admin Seed Serie Delete';
  const userUsername = `Organisateur ${timestamp}`;
  const userEmail = `organisateur${timestamp}@test.com`;
  const userUsernameEdited = `Organisateur2 ${timestamp}`;
  const userEmailEdited = `organisateur2${timestamp}@test.com`;
  const userDeleteOnly = `Organisateur delete ${timestamp}`;
  const userDeleteOnlyEmail = `organisateur-delete-${timestamp}@test.com`;
  const gameAddSerieName = 'Admin Seed Game Add Serie';
  const gameAddPouleName = 'Admin Seed Game Add Poule';
  const gameAddSeedTeam1 = 'Admin Seed Game Add Team One';
  const gameAddSeedTeam2 = 'Admin Seed Game Add Team Two';
  const gameDeleteSeedTeam1 = 'Admin Seed Game Delete Team One';
  const gameDeleteSeedTeam2 = 'Admin Seed Game Delete Team Two';
  const gameSeedFixturePath = 'e2e/fixtures/admin-game-seed.yaml';

  let adminUrl = '';
  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create tournament via the creation wizard
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Description du tournoi de test admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const match = adminUrl.match(/\/tournaments\/([^/]+)\/[^/]+$/);
      tournamentId = match?.[1] ?? '';

      // Step 2: Validate tournament by visiting the admin URL (changes status to "ongoing")
      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);

      // Step 3: Seed independent datasets used by delete tests.
      await adminPage.importYamlFixture(gameSeedFixturePath);
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
      console.warn('Failed to delete tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  // --- Preconditions ---

  test('should have a valid admin URL and tournament ID', () => {
    expect(adminUrl).toMatch(/\/tournaments\/[^/]+\/[^/]+$/);
    expect(tournamentId).not.toBe('');
  });

  test('should show Administration tab for admin user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    await expect(page.getByRole('tab', { name: 'Administration' })).toBeVisible();
  });

  // --- Teams management ---

  test('should add teams', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await test.step('add first team', async () => {
      await adminPage.addTeam(teamAlpha);
      await expect(adminPage.teamRow(teamAlpha)).toBeVisible();
    });

    await test.step('add second team', async () => {
      await adminPage.addTeam(teamBeta);
      await expect(adminPage.teamRow(teamBeta)).toBeVisible();
    });
  });

  test('should edit a team', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await adminPage.editTeam(teamBeta, teamBetaEdited);
    await expect(adminPage.teamRow(teamBetaEdited)).toBeVisible();
    await expect(adminPage.teamRow(teamBeta)).not.toBeVisible();
  });

  test('should delete a team', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await adminPage.deleteTeam(teamDeleteOnly);
    await expect(adminPage.teamRow(teamDeleteOnly)).not.toBeVisible();
  });

  // --- Series & Poules management ---

  test('should add a serie and poules', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await test.step('add serie', async () => {
      await adminPage.addSerie(serieName);
      await expect(adminPage.seriePanel(serieName)).toBeVisible();
    });

    await test.step('add first poule', async () => {
      await adminPage.addPoule(serieName, pouleName);
      await expect(
        adminPage.seriePanel(serieName).locator('p-card').filter({ hasText: pouleName }),
      ).toBeVisible();
    });

    await test.step('add second poule', async () => {
      await adminPage.addPoule(serieName, pouleNameB);
      await expect(
        adminPage.seriePanel(serieName).locator('p-card').filter({ hasText: pouleNameB }),
      ).toBeVisible();
    });
  });

  test('should edit a poule', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await adminPage.editPoule(serieName, pouleName, poulesNameEdited);
    await expect(
      adminPage.seriePanel(serieName).locator('p-card').filter({ hasText: poulesNameEdited }),
    ).toBeVisible();
    await expect(
      adminPage.seriePanel(serieName).locator('p-card').filter({ hasText: pouleName }),
    ).not.toBeVisible();
  });

  test('should delete a poule', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await adminPage.deletePoule(pouleDeleteSerie, pouleDeleteName);
    await expect(
      adminPage.seriePanel(pouleDeleteSerie).locator('p-card').filter({ hasText: pouleDeleteName }),
    ).not.toBeVisible();
  });

  test('should edit a serie', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await adminPage.editSerie(serieName, serieNameEdited);
    await expect(adminPage.seriePanel(serieNameEdited)).toBeVisible();
    await expect(adminPage.seriePanel(serieName)).not.toBeVisible();
  });

  test('should delete a serie', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await adminPage.deleteSerie(serieDeleteOnly);
    await expect(adminPage.seriePanel(serieDeleteOnly)).not.toBeVisible();
  });

  // --- Users management (Administration tab) ---

  test('should add a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Administration');

    await adminPage.addUser(userUsername, userEmail, 'organizer');
    await expect(adminPage.userRow(userUsername)).toBeVisible();
  });

  test('should edit a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Administration');

    await adminPage.editUser(userUsername, userUsernameEdited, userEmailEdited);
    await expect(adminPage.userRow(userUsernameEdited)).toBeVisible();
    await expect(adminPage.userRow(userUsername)).not.toBeVisible();
  });

  test('should delete a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Administration');

    await adminPage.addUser(userDeleteOnly, userDeleteOnlyEmail, 'organizer');
    await expect(adminPage.userRow(userDeleteOnly)).toBeVisible();

    await adminPage.deleteUser(userDeleteOnly);
    await expect(adminPage.userRow(userDeleteOnly)).not.toBeVisible();
    await expect(adminPage.userRow(userUsernameEdited)).toBeVisible();
  });

  // --- Games management (requires teams + serie + poule) ---

  test('should add a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await adminPage.addGame(gameAddSeedTeam1, gameAddSeedTeam2, {
      serieName: gameAddSerieName,
      pouleName: gameAddPouleName,
    });
    await expect(adminPage.gameRow(gameAddSeedTeam1, gameAddSeedTeam2)).toBeVisible();
  });

  test('should delete a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await adminPage.deleteGame(gameDeleteSeedTeam1, gameDeleteSeedTeam2);
    await expect(adminPage.gameRow(gameDeleteSeedTeam1, gameDeleteSeedTeam2)).not.toBeVisible();
  });
});
