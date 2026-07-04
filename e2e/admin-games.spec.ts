import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { GamesPage } from './pages/games.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for games management (add, delete).
 */
test.describe.serial('Admin – games management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Games ${timestamp}`;
  const gameAddSerieName = 'Admin Seed Game Add Serie';
  const gameAddPouleName = 'Admin Seed Game Add Poule';
  const gameAddSeedTeam1 = 'Admin Seed Game Add Team One';
  const gameAddSeedTeam2 = 'Admin Seed Game Add Team Two';
  const gameDeleteSeedTeam1 = 'Admin Seed Game Delete Team One';
  const gameDeleteSeedTeam2 = 'Admin Seed Game Delete Team Two';
  const fixturePath = 'e2e/fixtures/admin-game-seed.yaml';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests parties admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);

      const gamesPage = new GamesPage(page);
      await adminPage.clickTab('Parties');
      await expect(gamesPage.gameRow(gameDeleteSeedTeam1, gameDeleteSeedTeam2)).toBeVisible();
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
      console.warn('Failed to delete tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  test('should add a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await expect(gamesPage.gameRow(gameAddSeedTeam1, gameAddSeedTeam2)).not.toBeVisible();
    await gamesPage.addGame(gameAddSeedTeam1, gameAddSeedTeam2, {
      serieName: gameAddSerieName,
      pouleName: gameAddPouleName,
    });
    await expect(gamesPage.gameRow(gameAddSeedTeam1, gameAddSeedTeam2)).toBeVisible();
  });

  test('should show score history in edit dialog after score update', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.editScores(gameDeleteSeedTeam1, gameDeleteSeedTeam2, 11, 9);

    const row = gamesPage.gameRow(gameDeleteSeedTeam1, gameDeleteSeedTeam2);
    await row.locator('[aria-label="Modifier cette partie"]').click();

    const dialog = page.locator('.p-dialog').filter({ hasText: 'Modifier la partie' });
    await dialog.waitFor({ state: 'visible' });

    const historyButton = dialog.getByTestId('game-history-button');
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    const historyPopover = page.getByTestId('game-history-popover');
    await historyPopover.waitFor({ state: 'visible' });
    await expect(historyPopover).toContainText('11');
    await expect(historyPopover).toContainText('9');

    await dialog.locator('button').filter({ hasText: 'Annuler' }).click();
    await dialog.waitFor({ state: 'hidden' });
  });

  test('should delete a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.deleteGame(gameDeleteSeedTeam1, gameDeleteSeedTeam2);
    await expect(gamesPage.gameRow(gameDeleteSeedTeam1, gameDeleteSeedTeam2)).not.toBeVisible();
  });
});
