import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { PoulesPage } from './pages/poules.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for series and poules management (add, edit, delete).
 */
test.describe.serial('Admin – series & poules management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Poules ${timestamp}`;
  const serieAddName = `Série 1 ${timestamp}`;
  const serieEditSource = `Série Edit Source ${timestamp}`;
  const serieEditTarget = `Série Edit Target ${timestamp}`;
  const pouleAddNameA = `Poule A ${timestamp}`;
  const pouleAddNameB = `Poule B ${timestamp}`;
  const pouleEditSource = `Poule Edit Source ${timestamp}`;
  const pouleEditTarget = `Poule Edit Target ${timestamp}`;
  const pouleEditSerie = `Série Poule Edit ${timestamp}`;
  const pouleDeleteSerie = 'Admin Seed Poule Delete Serie';
  const pouleDeleteName = 'Admin Seed Poule Delete B';
  const serieDeleteOnly = 'Admin Seed Serie Delete';
  const fixturePath = 'e2e/fixtures/admin-game-seed.yaml';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests poules admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);

      const poulesPage = new PoulesPage(page);
      await adminPage.clickTab('Poules');
      await expect(poulesPage.seriePanel(pouleDeleteSerie)).toBeVisible();
      await expect(poulesPage.seriePanel(serieDeleteOnly)).toBeVisible();
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

  test('should add a serie and poules', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const poulesPage = new PoulesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await test.step('add serie', async () => {
      await poulesPage.addSerie(serieAddName);
      await expect(poulesPage.seriePanel(serieAddName)).toBeVisible();
    });

    await test.step('add first poule', async () => {
      await poulesPage.addPoule(serieAddName, pouleAddNameA);
      await expect(await poulesPage.pouleCard(serieAddName, pouleAddNameA)).toBeVisible();
    });

    await test.step('add second poule', async () => {
      await poulesPage.addPoule(serieAddName, pouleAddNameB);
      await expect(await poulesPage.pouleCard(serieAddName, pouleAddNameB)).toBeVisible();
    });
  });

  test('should edit a poule', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const poulesPage = new PoulesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await poulesPage.addSerie(pouleEditSerie);
    await poulesPage.addPoule(pouleEditSerie, pouleEditSource);
    await expect(await poulesPage.pouleCard(pouleEditSerie, pouleEditSource)).toBeVisible();

    await poulesPage.editPoule(pouleEditSerie, pouleEditSource, pouleEditTarget);
    await expect(await poulesPage.pouleCard(pouleEditSerie, pouleEditTarget)).toBeVisible();
    await expect(await poulesPage.pouleCard(pouleEditSerie, pouleEditSource)).toHaveCount(0);
  });

  test('should delete a poule', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const poulesPage = new PoulesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await expect(await poulesPage.pouleCard(pouleDeleteSerie, pouleDeleteName)).toBeVisible();
    await poulesPage.deletePoule(pouleDeleteSerie, pouleDeleteName);
    await expect(await poulesPage.pouleCard(pouleDeleteSerie, pouleDeleteName)).toHaveCount(0);
  });

  test('should edit a serie', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const poulesPage = new PoulesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await poulesPage.addSerie(serieEditSource);
    await expect(poulesPage.seriePanel(serieEditSource)).toBeVisible();

    await poulesPage.editSerie(serieEditSource, serieEditTarget);
    await expect(poulesPage.seriePanel(serieEditTarget)).toBeVisible();
    await expect(poulesPage.seriePanel(serieEditSource)).not.toBeVisible();
  });

  test('should delete a serie', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const poulesPage = new PoulesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Poules');

    await poulesPage.deleteSerie(serieDeleteOnly);
    await expect(poulesPage.seriePanel(serieDeleteOnly)).not.toBeVisible();
  });
});
