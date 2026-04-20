import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentListPage } from './pages/tournament-list.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * E2E tests for the tournament creation wizard.
 *
 * These tests cover the full creation flow:
 * 1. Wizard UI displays correctly
 * 2. Validation prevents advancing without required data
 * 3. Tournament is created successfully and returns an admin URL
 * 4. Created tournament starts in waitingValidation status (hidden from public list)
 * 5. Visiting the admin URL validates and publishes the tournament
 */
test.describe.serial('Tournament creation', () => {
  const timestamp = Date.now();
  const tournamentName = `Création Test ${timestamp}`;
  const adminUsername = `Admin ${timestamp}`;
  const adminEmail = `admin${timestamp}@test.com`;

  let adminUrl = '';

  test.afterAll(async ({ browser }) => {
    if (!adminUrl) {
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const adminPage = new AdminPage(page);

    try {
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete created tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  test('should display the creation wizard on step 1', async ({ page }) => {
    const newPage = new TournamentNewPage(page);
    await newPage.goto();

    await expect(page.getByTestId('field-name')).toBeVisible();
    await expect(page.getByTestId('btn-next')).toBeVisible();
  });

  test('should NOT advance to step 2 when the tournament name is empty', async ({ page }) => {
    const newPage = new TournamentNewPage(page);
    await newPage.goto();

    // Click "Next" without filling in the name
    await newPage.goToNextStep();

    // Should still be on step 1 – the name field remains visible
    await expect(page.getByTestId('field-name')).toBeVisible();
    // Step 2 creator fields must NOT be visible
    await expect(page.getByTestId('field-creator-username')).not.toBeVisible();
  });

  test('should advance to step 2 after filling in the tournament name', async ({ page }) => {
    const newPage = new TournamentNewPage(page);
    await newPage.goto();

    await newPage.fillStep1(tournamentName, 'Description du tournoi de test E2E création');
    await newPage.goToNextStep();

    // Step 2 should now be visible
    await expect(page.getByTestId('field-creator-username')).toBeVisible();
    await expect(page.getByTestId('field-creator-email')).toBeVisible();
    await expect(page.getByTestId('btn-submit')).toBeVisible();
  });

  test('should create a tournament and display the admin URL', async ({ page }) => {
    const newPage = new TournamentNewPage(page);
    await newPage.goto();

    await newPage.fillStep1(tournamentName, 'Description du tournoi de test E2E création');
    await newPage.goToNextStep();
    await newPage.fillStep2(adminUsername, adminEmail);
    await newPage.submit();

    await expect(page.getByTestId('success-state')).toBeVisible({ timeout: 15000 });

    adminUrl = await newPage.getAdminUrl();
    expect(adminUrl).toMatch(/\/tournaments\/[^/]+\/[^/]+$/);
  });

  test('should NOT show the tournament in the public list before visiting the admin URL', async ({
    page,
  }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();

    // Tournament has "waitingValidation" status – must be filtered out of the public list
    const found = await listPage.hasTournament(tournamentName);
    expect(found).toBe(false);
  });

  test('should validate the tournament when the admin URL is visited', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    // Visiting the admin URL triggers automatic status change to "ongoing"
    await expect(adminPage.isAccessDenied()).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tableau de bord' })).toBeVisible();
  });

  test('should appear in the public list after validation', async ({ page }) => {
    const listPage = new TournamentListPage(page);
    await listPage.goto();

    // Give Firestore a moment to propagate the status change
    await listPage.waitForTournamentToAppear(tournamentName, 30000);
    const found = await listPage.hasTournament(tournamentName);
    expect(found).toBe(true);
  });
});
