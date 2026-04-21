import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { TournamentDetailPage } from './pages/tournament-detail.page';
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
 * Visitor E2E tests – navigation of a tournament.
 *
 * Uses the persistent "Tournoi visiteur" tournament (already seeded with visitor-seed data).
 * No setup/teardown needed – the tournament is never modified by these tests.
 */
test.describe('Visitor navigation', () => {
  const tournamentName = 'Tournoi visiteur';
  const team1 = seed.teams[0].name;
  const team2 = seed.teams[1].name;
  const team3 = seed.teams[2].name;
  const serieName = seed.series[0].name;
  const games = seed.series[0].poules[0].games;
  const firstGamesDate = new Date(games[0].date);
  const thirdGameDate = new Date(games[2].date);

  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    // Use the existing "Tournoi visiteur" tournament that already has visitor-seed data.
    // Retrieve its ID by navigating to the public list and extracting the URL.
    const context = await browser.newContext();
    const page = await context.newPage();

    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);

    // Click the tournament row to navigate to it, then extract the ID from the URL
    await listPage.openTournament(tournamentName);
    await page.waitForURL(/\/tournaments\/[^/]+$/);
    const match = page.url().match(/\/tournaments\/([^/]+)$/);
    tournamentId = match?.[1] ?? '';

    await context.close();
  });

  test('should show the tournament in the public list', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);
    expect(await listPage.hasTournament(tournamentName)).toBe(true);
  });

  test('should display the dashboard tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
    // Stat cards should show non-zero teams
    await expect(detailPage.dashboardTeamsCount()).not.toHaveText('0');
  });

  test('should display the teams tab', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Équipes');
    await expect(detailPage.teamRow(team1)).toBeVisible();
    await expect(detailPage.teamRow(team2)).toBeVisible();
    await expect(detailPage.teamRow(team3)).toBeVisible();
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
    await expect(detailPage.gameRow(team1, team3)).toBeVisible();
    await expect(detailPage.gameRow(team2, team3)).toBeVisible();
  });

  test('should NOT show admin game controls as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await expect(page.getByTestId('add-game-button')).not.toBeVisible();
  });

  test('should filter games by team as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await detailPage.filterGamesByTeam(team1);

    await expect(detailPage.gameRow(team1, team2)).toBeVisible();
    await expect(detailPage.gameRow(team1, team3)).toBeVisible();
    await expect(detailPage.gameRow(team2, team3)).not.toBeVisible();
  });

  test('should filter games by date and clear the date filter as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await detailPage.filterGamesByDate(firstGamesDate);

    await expect(detailPage.gameRow(team1, team2)).toBeVisible();
    await expect(detailPage.gameRow(team1, team3)).toBeVisible();
    await expect(detailPage.gameRow(team2, team3)).not.toBeVisible();

    await detailPage.clearGamesDateFilter();

    await expect(detailPage.gameRows()).toHaveCount(3);
  });

  test('should combine team and date filters and clear them as a visitor', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);
    await detailPage.goto(tournamentId);
    await detailPage.waitForLoad();

    await detailPage.clickTab('Parties');
    await detailPage.filterGamesByTeam(team2);
    await detailPage.filterGamesByDate(thirdGameDate);

    await expect(detailPage.gameRow(team2, team3)).toBeVisible();
    await expect(detailPage.gameRow(team1, team2)).not.toBeVisible();
    await expect(detailPage.gameRow(team1, team3)).not.toBeVisible();

    await detailPage.clearGamesTeamFilter();
    await detailPage.clearGamesDateFilter();

    await expect(detailPage.gameRows()).toHaveCount(3);
  });
});
