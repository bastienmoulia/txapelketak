import { expect, test } from '@playwright/test';

import { AdminPage } from './pages/admin.page';
import { GamesPage } from './pages/games.page';
import { PhasesPage } from './pages/phases.page';
import { TournamentNewPage } from './pages/tournament-new.page';

test.describe.serial('Admin – playoffs import', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Playoffs Import ${timestamp}`;
  const fixturePath = 'e2e/fixtures/admin-playoffs-import-seed.yaml';
  const serieName = 'Playoffs Import Serie';
  const playoffName = 'Imported Bracket';
  const team1 = 'Import Team One';
  const team2 = 'Import Team Four';
  const team3 = 'Import Team Two';
  const team4 = 'Import Team Three';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests import playoffs E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin.import.${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);
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

  test('should import playoffs in Phases tab', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const phasesPage = new PhasesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Phases');
    await phasesPage.ensureSerieExpanded(serieName);

    const tabPanel = await phasesPage.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });
    await expect(card).toBeVisible({ timeout: 15000 });
  });

  test('should import playoff games and scores in Games tab', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await expect(gamesPage.gameRows()).toHaveCount(3);

    await expect(gamesPage.hasGame(team1, team2)).resolves.toBe(true);
    await expect(gamesPage.hasGame(team3, team4)).resolves.toBe(true);

    const semiFinal1Score = gamesPage.scoreText(team1, team2);
    await expect(semiFinal1Score).toContainText('13');
    await expect(semiFinal1Score).toContainText('11');

    const semiFinal2Score = gamesPage.scoreText(team3, team4);
    await expect(semiFinal2Score).toContainText('10');
    await expect(semiFinal2Score).toContainText('12');
  });
});
