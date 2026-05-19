import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
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

    // A bracket of 4 teams should show 2 Demi Finales and 1 Finale round
    await expect(card.getByText('Demi Finale', { exact: false })).toHaveCount(2);
    await expect(card.getByText('Finale', { exact: true })).toBeVisible();

    // Should show 3 match cards (2 semi-finals + 1 final)
    const matchCards = card.locator('.playoff-match-card');
    await expect(matchCards).toHaveCount(3);
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
    await expect(gameRows).toHaveCount(3); // 2 semis + 1 final
  });

  test('should edit a playoff match score', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const phasesPage = new PhasesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Phases');
    await phasesPage.ensureSerieExpanded(serieName);

    const tabPanel = await phasesPage.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });

    // Click edit on the first match card
    const firstMatchEditBtn = card.locator('[data-testid="playoff-match-edit-button"]').first();
    await firstMatchEditBtn.scrollIntoViewIfNeeded();
    await firstMatchEditBtn.click();

    const dialog = page.locator('.p-dialog').last();
    await dialog.waitFor({ state: 'visible' });

    // Fill score fields
    const score1Input = dialog.locator('input').nth(0);
    const score2Input = dialog.locator('input').nth(1);
    await score1Input.fill('3');
    await score2Input.fill('1');
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });

    // Score should be visible on the match card
    await expect(card.locator('.playoff-match-card').first().getByText('3')).toBeVisible();
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

    // The playoff card should no longer be visible
    await expect(card).not.toBeVisible({ timeout: 15000 });
  });

  test('should not show playoff games after deletion', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // After deletion all playoff games should be gone
    const gameRows = page.locator('.p-datatable-tbody tr').filter({
      has: page.locator('td[data-label]'),
    });
    await expect(gameRows).toHaveCount(0);
  });
});
