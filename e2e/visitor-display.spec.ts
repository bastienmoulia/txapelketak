import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { DashboardPage } from './pages/dashboard.page';
import { TeamsPage } from './pages/teams.page';
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
 * Visitor E2E tests – tournament list, dashboard, and teams display.
 *
 * Uses the persistent "Tournoi visiteur" tournament (read-only).
 */
test.describe('Visitor – display & teams', () => {
  const tournamentName = 'Tournoi visiteur';
  const team1 = seed.teams[0].name;
  const team2 = seed.teams[1].name;
  const team3 = seed.teams[2].name;

  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);

    await listPage.openTournament(tournamentName);
    await page.waitForURL(/\/tournaments\/[^/]+$/);
    const match = page.url().match(/\/tournaments\/([^/]+)$/);
    tournamentId = match?.[1] ?? '';
    expect(
      tournamentId,
      `Expected persistent tournament "${tournamentName}" to exist and be reachable from the public list`,
    ).not.toBe('');

    await context.close();
  });

  test('should show the tournament in the public list', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();
    await listPage.waitForTournamentToAppear(tournamentName);
    expect(await listPage.hasTournament(tournamentName)).toBe(true);
  });

  test('should display the dashboard tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const dashboardPage = new DashboardPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
    await expect(dashboardPage.teamsCount()).not.toHaveText('0');
  });

  test('should display the teams tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const teamsPage = new TeamsPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Équipes');
    await expect(teamsPage.teamRow(team1)).toBeVisible();
    await expect(teamsPage.teamRow(team2)).toBeVisible();
    await expect(teamsPage.teamRow(team3)).toBeVisible();
  });

  test('should NOT show edit/delete buttons for teams as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Équipes');
    await expect(page.getByTestId('add-team-button')).not.toBeVisible();
    await expect(page.getByTestId('edit-team-button').first()).not.toBeVisible();
    await expect(page.getByTestId('delete-team-button').first()).not.toBeVisible();
  });
});
