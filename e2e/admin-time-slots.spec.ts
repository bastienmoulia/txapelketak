import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * Admin E2E tests for time slots management (Paramètres tab).
 */
test.describe.serial('Admin – time slots management', () => {
  const timestamp = Date.now();
  const tournamentName = `Admin Time Slots ${timestamp}`;

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests créneaux admin E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin-timeslots-${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();
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

  test('should add and delete a time slot', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Paramètres');

    const datepickerInput = page.getByTestId('time-slot-datepicker').locator('input');
    const addTimeSlotButton = page.getByTestId('add-time-slot-button');
    const timeSlotItems = page.locator('[data-testid="time-slots-list"] li');

    const initialCount = await timeSlotItems.count();

    // Opening the datepicker initializes a rounded date value in the component.
    await datepickerInput.click();
    await expect(addTimeSlotButton).toBeEnabled();

    await addTimeSlotButton.click();

    await expect
      .poll(async () => await timeSlotItems.count(), {
        timeout: 10000,
      })
      .toBe(initialCount + 1);

    await page.getByTestId('delete-time-slot-button').first().click();

    await expect
      .poll(async () => await timeSlotItems.count(), {
        timeout: 10000,
      })
      .toBe(initialCount);
  });
});
