import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentDetailPage } from './pages/tournament-detail.page';
import { TournamentListPage } from './pages/tournament-list.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Visitor E2E tests – read-only navigation of a tournament.
 *
 * A tournament with data is created in beforeAll; subsequent tests navigate
 * to its public URL as an anonymous visitor.
 */
test.describe('Visitor – read-only navigation', () => {
  const timestamp = Date.now();
  const tournamentName = `Visitor Test ${timestamp}`;
  const team1 = `Équipe 1 ${timestamp}`;
  const team2 = `Équipe 2 ${timestamp}`;
  const serieName = `Série Visiteur ${timestamp}`;
  const pouleName = `Poule Visiteur ${timestamp}`;

  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    // This setup involves many async operations (create tournament, add teams, series, poule,
    // assign teams, add game). Extend the timeout to allow for Firebase roundtrips in CI.
    test.setTimeout(120000);

    // Use a dedicated browser context for setup
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Create tournament
    const newPage = new TournamentNewPage(page);
    await newPage.goto();
    await newPage.fillStep1(tournamentName, 'Tournament for visitor tests');
    await newPage.goToNextStep();
    await newPage.fillStep2(`Admin Visiteur ${timestamp}`, `admin-visitor${timestamp}@test.com`);
    await newPage.submit();

    const adminUrl = await newPage.getAdminUrl();
    const match = adminUrl.match(/\/tournaments\/([^/]+)\/[^/]+$/);
    tournamentId = match?.[1] ?? '';

    // 2. Navigate to admin URL → triggers status change to "ongoing"
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // 3. Add teams
    await adminPage.clickTab('Équipes');
    await adminPage.addTeam(team1);
    await adminPage.addTeam(team2);

    // 4. Add serie + poule
    await adminPage.clickTab('Poules');
    await adminPage.addSerie(serieName);
    await adminPage.addPoule(serieName, pouleName);

    // 5. Add both teams to the poule
    await adminPage.ensureSerieExpanded(serieName);
    const seriePanel = adminPage.seriePanel(serieName);
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: pouleName });
    await pouleCard.getByTestId('add-team-to-poule-button').click();
    const dialog = page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('p-multiselect').click();
    await page.locator('.p-multiselect-option').filter({ hasText: team1 }).click();
    await page.locator('.p-multiselect-option').filter({ hasText: team2 }).click();
    await page.keyboard.press('Escape');
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });

    // 6. Add a game
    await adminPage.clickTab('Parties');
    await adminPage.addGame(team1, team2);

    await context.close();
  });

  test('should show the tournament in the public list', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName, 10000);
    expect(await listPage.hasTournament(tournamentName)).toBe(true);
  });

  test('should display the dashboard tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
    // Stat cards should show non-zero teams and games
    await expect(detailPage.dashboardTeamsCount()).toHaveText('2');
    await expect(detailPage.dashboardGamesCount()).toHaveText('1');
  });

  test('should display the teams tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Équipes');
    await expect(detailPage.teamRow(team1)).toBeVisible();
    await expect(detailPage.teamRow(team2)).toBeVisible();
  });

  test('should NOT show edit/delete buttons for teams as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Équipes');
    // Admin buttons must not be present
    await expect(page.getByTestId('add-team-button')).not.toBeVisible();
    await expect(page.getByTestId('edit-team-button').first()).not.toBeVisible();
    await expect(page.getByTestId('delete-team-button').first()).not.toBeVisible();
  });

  test('should display the series and poules tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Poules');
    await expect(detailPage.poulesContainer()).toBeVisible();
    // The serie panel should list the poule
    await expect(detailPage.seriePanel(serieName)).toBeVisible();
  });

  test('should NOT show admin buttons in poules as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Poules');
    await expect(page.getByTestId('add-serie-button')).not.toBeVisible();
    await expect(page.getByTestId('add-poule-button').first()).not.toBeVisible();
  });

  test('should display the games/matches tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await expect(detailPage.gameRow(team1, team2)).toBeVisible();
  });

  test('should NOT show admin game controls as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await expect(page.getByTestId('add-game-button')).not.toBeVisible();
  });
});
