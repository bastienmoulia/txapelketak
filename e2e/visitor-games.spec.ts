import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { GamesPage } from './pages/games.page';
import { TournamentBasePage } from './pages/tournament-base.page';
import { TournamentListPage } from './pages/tournament-list.page';

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
 * Uses the persistent "Tournoi visiteur" tournament (read-only).
 */
test.describe('Visitor – games', () => {
  const tournamentName = 'Tournoi visiteur';
  const team1 = seed.teams[0].name;
  const team2 = seed.teams[1].name;
  const team3 = seed.teams[2].name;
  const games = seed.series[0].poules[0].games;
  const firstGamesDate = new Date(games[0].date);
  const thirdGameDate = new Date(games[2].date);

  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);

    await listPage.openTournament(tournamentName);
    await page.waitForURL(/\/tournaments\/[^/]+\/[^/?#]+\/?(?:[?#].*)?$/);
    const match = page.url().match(/\/tournaments\/[^/]+\/[^/?#]+\/?(?:[?#].*)?$/);
    tournamentId = match?.[1] ?? '';
    expect(
      tournamentId,
      `Expected persistent tournament "${tournamentName}" to exist and be reachable from the public list`,
    ).not.toBe('');

    await context.close();
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
