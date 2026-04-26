import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { PoulesPage } from './pages/poules.page';
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
 * Visitor E2E tests – poules display and admin button visibility.
 *
 * Uses the persistent "Tournoi visiteur" tournament (read-only).
 */
test.describe('Visitor – poules', () => {
  const tournamentName = 'Tournoi visiteur';
  const serieName = seed.series[0].name;

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

  test('should display the series and poules tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const poulesPage = new PoulesPage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Poules');
    await expect(poulesPage.poulesContainer()).toBeVisible();
    await expect(poulesPage.seriePanel(serieName)).toBeVisible();
  });

  test('should NOT show admin buttons in poules as a visitor', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();

    await basePage.clickTab('Poules');
    await expect(page.getByTestId('add-serie-button')).not.toBeVisible();
    await expect(page.getByTestId('add-poule-button').first()).not.toBeVisible();
  });
});
