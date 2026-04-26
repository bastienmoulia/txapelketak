import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TeamsPage } from './pages/teams.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for teams management (add, edit, delete).
 */
test.describe.serial('Admin – teams management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Teams ${timestamp}`;
  const teamAddAlpha = `Équipe Alpha ${timestamp}`;
  const teamAddBeta = `Équipe Beta ${timestamp}`;
  const teamEditSource = `Équipe Edit Source ${timestamp}`;
  const teamEditTarget = `Équipe Edit Target ${timestamp}`;
  const teamDeleteOnly = 'Admin Seed Team Delete';
  const fixturePath = 'e2e/fixtures/admin-game-seed.yaml';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests équipes admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);

      const teamsPage = new TeamsPage(page);
      await adminPage.clickTab('Équipes');
      await expect(teamsPage.teamRow(teamDeleteOnly)).toBeVisible();
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

  test('should add teams', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await test.step('add first team', async () => {
      await teamsPage.addTeam(teamAddAlpha);
      await expect(teamsPage.teamRow(teamAddAlpha)).toBeVisible();
    });

    await test.step('add second team', async () => {
      await teamsPage.addTeam(teamAddBeta);
      await expect(teamsPage.teamRow(teamAddBeta)).toBeVisible();
    });
  });

  test('should edit a team', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await teamsPage.addTeam(teamEditSource);
    await expect(teamsPage.teamRow(teamEditSource)).toBeVisible();

    await teamsPage.editTeam(teamEditSource, teamEditTarget);
    await expect(teamsPage.teamRow(teamEditTarget)).toBeVisible();
    await expect(teamsPage.teamRow(teamEditSource)).not.toBeVisible();
  });

  test('should delete a team', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await teamsPage.deleteTeam(teamDeleteOnly);
    await expect(teamsPage.teamRow(teamDeleteOnly)).not.toBeVisible();
  });
});
