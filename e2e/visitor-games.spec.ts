import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { AdminPage } from './pages/admin.page';
import { GamesPage } from './pages/games.page';
import { TournamentBasePage } from './pages/tournament-base.page';
import { TournamentNewPage } from './pages/tournament-new.page';

const seed = yaml.load(readFileSync('e2e/fixtures/visitor-seed.yaml', 'utf8')) as {
  teams: { id: string; name: string }[];
  series: {
    name: string;
    poules: {
      name: string;
      games: { team1: string; team2: string; date: string }[];
    }[];
  }[];
};

/**
 * Visitor E2E tests – games tab display, filters, and admin control visibility.
 *
 * Setup:
 *   1. Create a tournament via the wizard
 *   2. Validate by visiting the admin URL
 *   3. Import visitor-seed.yaml (3 teams, 3 games)
 */
test.describe('Visitor – games', () => {
  const timestamp = Date.now();
  const tournamentName = `Visitor Games Test ${timestamp}`;
  const fixturePath = 'e2e/fixtures/visitor-seed.yaml';
  const team1 = seed.teams[0].name;
  const team2 = seed.teams[1].name;
  const team3 = seed.teams[2].name;
  const games = seed.series[0].poules[0].games;
  const firstGamesDate = new Date(games[0].date);
  const thirdGameDate = new Date(games[2].date);

  let tournamentId = '';
  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create tournament
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Test visitor games E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Visitor ${timestamp}`, `visitor${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();
      const match = adminUrl.match(/\/tournaments\/([^/]+)\//);
      tournamentId = match?.[1] ?? '';

      // Step 2: Validate tournament by visiting the admin URL
      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);

      // Step 3: Import fixture data
      await adminPage.importYamlFixture(fixturePath);

      // Wait for import to complete
      await page.waitForTimeout(1000);

      // Validate seed: all 3 games should be visible
      const gamesPage = new GamesPage(page);
      await adminPage.clickTab('Parties');

      // Wait for games to load
      await expect(gamesPage.gameRow(team1, team2)).toBeVisible({ timeout: 20000 });
      await expect(gamesPage.gameRow(team1, team3)).toBeVisible();
      await expect(gamesPage.gameRow(team2, team3)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!adminUrl) return;

    const context = await browser.newContext();
    const page = await context.newPage();
    const adminPage = new AdminPage(page);

    try {
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete visitor games test tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  test('should display the games/matches tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const gamesPage = new GamesPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Parties');
    await expect(gamesPage.gameRow(team1, team2)).toBeVisible();
    await expect(gamesPage.gameRow(team1, team3)).toBeVisible();
    await expect(gamesPage.gameRow(team2, team3)).toBeVisible();
  });

  test('should NOT show admin game controls as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Parties');
    await expect(page.getByTestId('add-game-button')).not.toBeVisible();
  });

  test('should filter games by team as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const gamesPage = new GamesPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Parties');
    await gamesPage.filterByTeam(team1);

    await expect(gamesPage.gameRow(team1, team2)).toBeVisible();
    await expect(gamesPage.gameRow(team1, team3)).toBeVisible();
    await expect(gamesPage.gameRow(team2, team3)).not.toBeVisible();
  });

  test('should filter games by date and clear the date filter as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const gamesPage = new GamesPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Parties');
    await gamesPage.filterByDate(firstGamesDate);

    await expect(gamesPage.gameRow(team1, team2)).toBeVisible();
    await expect(gamesPage.gameRow(team1, team3)).toBeVisible();
    await expect(gamesPage.gameRow(team2, team3)).not.toBeVisible();

    await gamesPage.clearDateFilter();

    await expect(gamesPage.gameRows()).toHaveCount(3);
  });

  test('should combine team and date filters and clear them as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const gamesPage = new GamesPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Parties');
    await gamesPage.filterByTeam(team2);
    await gamesPage.filterByDate(thirdGameDate);

    await expect(gamesPage.gameRow(team2, team3)).toBeVisible();
    await expect(gamesPage.gameRow(team1, team2)).not.toBeVisible();
    await expect(gamesPage.gameRow(team1, team3)).not.toBeVisible();

    await gamesPage.clearTeamFilter();
    await gamesPage.clearDateFilter();

    await expect(gamesPage.gameRows()).toHaveCount(3);
  });
});
