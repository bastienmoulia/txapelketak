import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for user management (Paramètres tab).
 */
test.describe.serial('Admin – users management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Users ${timestamp}`;
  const userAddUsername = `Organisateur ${timestamp}`;
  const userAddEmail = `organisateur${timestamp}@test.com`;
  const userEditUsername = `Organisateur Edit ${timestamp}`;
  const userEditEmail = `organisateur-edit-${timestamp}@test.com`;
  const userEditTargetUsername = `Organisateur Edit 2 ${timestamp}`;
  const userEditTargetEmail = `organisateur-edit2-${timestamp}@test.com`;
  const userDeleteOnly = `Organisateur delete ${timestamp}`;
  const userDeleteOnlyEmail = `organisateur-delete-${timestamp}@test.com`;

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests utilisateurs admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
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

  test('should add a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Paramètres');

    await adminPage.addUser(userAddUsername, userAddEmail, 'organizer');
    await expect(adminPage.userRow(userAddUsername)).toBeVisible();
  });

  test('should edit a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Paramètres');

    await adminPage.addUser(userEditUsername, userEditEmail, 'organizer');
    await expect(adminPage.userRow(userEditUsername)).toBeVisible();

    await adminPage.editUser(userEditUsername, userEditTargetUsername, userEditTargetEmail);
    await expect(adminPage.userRow(userEditTargetUsername)).toBeVisible();
    await expect(adminPage.userRow(userEditUsername)).not.toBeVisible();
  });

  test('should delete a user', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Paramètres');

    await adminPage.addUser(userDeleteOnly, userDeleteOnlyEmail, 'organizer');
    await expect(adminPage.userRow(userDeleteOnly)).toBeVisible();

    await adminPage.deleteUser(userDeleteOnly);
    await expect(adminPage.userRow(userDeleteOnly)).not.toBeVisible();
    await expect(adminPage.userRow(userEditTargetUsername)).toBeVisible();
  });
});
