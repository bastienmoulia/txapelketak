import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentListPage } from './pages/tournament-list.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for the full tournament management lifecycle.
 *
 * These tests run serially since they share tournament state:
 * 1. Create tournament → get admin URL
 * 2. Validate tournament (navigate to admin URL)
 * 3. Manage teams
 * 4. Manage series & poules
 * 5. Manage users
 * 6. Manage games
 * 7. Verify dashboard reflects changes
 */
test.describe.serial('Admin – tournament lifecycle', () => {
  const timestamp = Date.now();
  const tournamentName = `Test Tournament ${timestamp}`;
  const teamAlpha = `Équipe Alpha ${timestamp}`;
  const teamBeta = `Équipe Beta ${timestamp}`;
  const teamBetaEdited = `Équipe B ${timestamp}`;
  const teamGamma = `Équipe Gamma ${timestamp}`;
  const serieName = `Série 1 ${timestamp}`;
  const serieNameEdited = `Série A ${timestamp}`;
  const pouleName = `Poule A ${timestamp}`;
  const poulesNameEdited = `Poule A-2 ${timestamp}`;
  const pouleNameB = `Poule B ${timestamp}`;
  const userUsername = `Organisateur ${timestamp}`;
  const userEmail = `organisateur${timestamp}@test.com`;
  const userUsernameEdited = `Organisateur2 ${timestamp}`;
  const userEmailEdited = `organisateur2${timestamp}@test.com`;
  const gameSeedTeam1 = 'Admin Seed Team One';
  const gameSeedTeam2 = 'Admin Seed Team Two';
  const gameSeedFixturePath = 'e2e/fixtures/admin-game-seed.yaml';

  let adminUrl = '';
  let tournamentId = '';

  // --- Tournament creation ---

  test('should create a new tournament', async ({ page }) => {
    const newPage = new TournamentNewPage(page);
    await newPage.goto();

    await test.step('fill step 1: tournament info', async () => {
      await newPage.fillStep1(tournamentName, 'Description du tournoi de test E2E');
      await newPage.goToNextStep();
    });

    await test.step('fill step 2: creator info', async () => {
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();
    });

    await test.step('verify success and capture admin URL', async () => {
      await expect(page.getByTestId('success-state')).toBeVisible({ timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();
      expect(adminUrl).toMatch(/\/tournaments\/[^/]+\/[^/]+$/);
      // Extract tournament ID from admin URL: /tournaments/{id}/{token}
      const match = adminUrl.match(/\/tournaments\/([^/]+)\/[^/]+$/);
      tournamentId = match?.[1] ?? '';
      expect(tournamentId).not.toBe('');
    });
  });

  test('should NOT show the tournament in the public list before validation', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();

    // The tournament has "waitingValidation" status – it must be filtered out
    const found = await listPage.hasTournament(tournamentName);
    expect(found).toBe(false);
  });

  test('should validate the tournament by visiting the admin URL', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // Visiting the admin URL triggers automatic status change to "ongoing"
    await expect(adminPage.isAccessDenied()).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
  });

  test('should appear in the public list after validation', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();

    // Give Firestore a moment to propagate the status change
    await listPage.waitForTournamentToAppear(tournamentName, 30000);
    const found = await listPage.hasTournament(tournamentName);
    expect(found).toBe(true);
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

    await adminPage.deleteTeam(teamBetaEdited);
    await expect(adminPage.teamRow(teamBetaEdited)).not.toBeVisible();
  });

  test('should reflect team count on the dashboard', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // teamAlpha is the only remaining team
    await expect(adminPage.dashboardTeamsCount()).toHaveText('1');
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

    await adminPage.deletePoule(serieName, pouleNameB);
    await expect(
      adminPage.seriePanel(serieName).locator('p-card').filter({ hasText: pouleNameB }),
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

    await adminPage.deleteSerie(serieNameEdited);
    await expect(adminPage.seriePanel(serieNameEdited)).not.toBeVisible();
  });

  test('should reflect series and poules count on the dashboard', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // All series deleted → counts should be 0
    await expect(adminPage.dashboardSeriesCount()).toHaveText('0');
    await expect(adminPage.dashboardPoulesCount()).toHaveText('0');
  });

  // --- Users management ---

  test('should add a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Utilisateurs');

    await adminPage.addUser(userUsername, userEmail, 'organizer');
    await expect(adminPage.userRow(userUsername)).toBeVisible();
  });

  test('should edit a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Utilisateurs');

    await adminPage.editUser(userUsername, userUsernameEdited, userEmailEdited);
    await expect(adminPage.userRow(userUsernameEdited)).toBeVisible();
    await expect(adminPage.userRow(userUsername)).not.toBeVisible();
  });

  test('should delete a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Utilisateurs');

    await adminPage.deleteUser(userUsernameEdited);
    await expect(adminPage.userRow(userUsernameEdited)).not.toBeVisible();
  });

  // --- Games management (requires teams + serie + poule) ---

  test('should set up data for game management', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    await adminPage.importYamlFixture(gameSeedFixturePath);
    await adminPage.clickTab('Tableau de bord');
    await expect(adminPage.dashboardTeamsCount()).toHaveText('2');
    await expect(adminPage.dashboardSeriesCount()).toHaveText('1');
    await expect(adminPage.dashboardPoulesCount()).toHaveText('1');
  });

  test('should add a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await adminPage.addGame(gameSeedTeam1, gameSeedTeam2);
    await expect(adminPage.gameRow(gameSeedTeam1, gameSeedTeam2)).toBeVisible();
  });

  test('should delete a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await adminPage.deleteGame(gameSeedTeam1, gameSeedTeam2);
    await expect(adminPage.gameRow(gameSeedTeam1, gameSeedTeam2)).not.toBeVisible();
  });

  test('should reflect games count on the dashboard after adding a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // Re-add a game and verify dashboard updates
    await adminPage.clickTab('Parties');
    await adminPage.addGame(gameSeedTeam1, gameSeedTeam2);

    await adminPage.clickTab('Tableau de bord');
    await expect(adminPage.dashboardGamesCount()).toHaveText('1');
  });
});
