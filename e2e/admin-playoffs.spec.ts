import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { GamesPage } from './pages/games.page';
import { PhasesPage } from './pages/phases.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for playoffs management (generate, display, delete).
 */
test.describe.serial('Admin – playoffs management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Playoffs ${timestamp}`;
  const serieName = 'Playoffs Seed Serie';
  const playoffName = `Playoffs ${timestamp}`;
  const team1 = 'Playoffs Team One';
  const team2 = 'Playoffs Team Two';
  const team3 = 'Playoffs Team Three';
  const team4 = 'Playoffs Team Four';
  const fixturePath = 'e2e/fixtures/admin-playoffs-seed.yaml';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests playoffs admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);

      const phasesPage = new PhasesPage(page);
      await adminPage.clickTab('Phases');
      await expect(phasesPage.seriePanel(serieName)).toBeVisible();
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

  test('should generate a playoff bracket and display all rounds', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const phasesPage = new PhasesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Phases');

    await phasesPage.addPlayoffs(serieName, playoffName, [team1, team2, team3, team4]);

    // The playoff card should be visible with the bracket name
    await phasesPage.ensureSerieExpanded(serieName);
    const tabPanel = await phasesPage.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });
    await expect(card).toBeVisible({ timeout: 15000 });
  });

  test('should show playoff games in the Games tab', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Playoff games should appear in the games list
    const gameRows = page.locator('.p-datatable-tbody tr').filter({
      has: page.locator('td[data-label]'),
    });
    await expect(gameRows.first()).toBeVisible({ timeout: 15000 });
    await expect(gameRows).toHaveCount(3, { timeout: 20000 }); // 2 semis + 1 final
  });

  test('should edit a playoff match score', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.editScores(team1, team4, 3, 1);

    const editedRow = gamesPage.gameRow(team1, team4);
    await expect(editedRow).toContainText('3');
    await expect(editedRow).toContainText('1');
  });

  test('should delete a playoff', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const phasesPage = new PhasesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Phases');

    await phasesPage.ensureSerieExpanded(serieName);
    const tabPanel = await phasesPage.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });
    await expect(card).toBeVisible({ timeout: 10000 });

    await phasesPage.deletePlayoff(serieName, playoffName);
  });

  test('should not show playoff games after deletion', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // After deletion all playoff games should be gone
    const gameRows = page.locator('.p-datatable-tbody tr').filter({
      has: page.locator('td[data-label]'),
    });
    await expect(gameRows).toHaveCount(0, { timeout: 20000 });
  });
});

test.describe.serial('Admin – playoffs import', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Playoffs Import ${timestamp}`;
  const fixturePath = 'e2e/fixtures/admin-playoffs-import-seed.yaml';
  const serieName = 'Playoffs Import Serie';
  const playoffName = 'Imported Bracket';

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

  test('should import playoff bracket and render rounds and matches', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const phasesPage = new PhasesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Phases');

    await phasesPage.ensureSerieExpanded(serieName);
    const tabPanel = await phasesPage.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });

    await expect(card).toBeVisible({ timeout: 15000 });
  });

  test('should import playoff games in Games tab with scores', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    const gameRows = page.locator('.p-datatable-tbody tr').filter({
      has: page.locator('td[data-label]'),
    });
    await expect(gameRows).toHaveCount(3, { timeout: 20000 });
    await expect(gameRows.filter({ hasText: /13\s*-\s*11|13.*11/ })).toHaveCount(1);
    await expect(gameRows.filter({ hasText: /10\s*-\s*12|10.*12/ })).toHaveCount(1);
  });
