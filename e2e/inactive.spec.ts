import { test, expect } from '@playwright/test';
import { TournamentBasePage } from './pages/tournament-base.page';

test.describe('Inactive tournament', () => {
  // Persistent tournament kept in waitingValidation status for E2E tests.
  // Not visible in the public list, so we use its known ID directly.

  // TODO: create the tournament dynamically in a beforeAll and delete it in afterAll, instead of relying on a hardcoded ID. This would make the test more robust and self-contained, but requires implementing tournament deletion in the admin page first.
  const inactiveTournamentId = 'O8API0S4ePpTTITpRwhF';
  const tournamentName = 'Tournoi inactif';
  const waitingValidationMessage =
    "L'administrateur doit valider ce tournoi avant qu'il puisse être visible. Merci de votre patience.";

  test('should show waiting validation warning and hide tabs', async ({ page }) => {
    const basePage = new TournamentBasePage(page);

    await basePage.gotoPublic(inactiveTournamentId);
    await basePage.waitForLoad();

    await expect(
      basePage.isNotFound(),
      `Expected persistent inactive tournament "${tournamentName}" (${inactiveTournamentId}) to exist`,
    ).not.toBeVisible();

    await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
    await expect(basePage.isWaitingValidation()).toBeVisible();
    await expect(basePage.isWaitingValidation()).toHaveText(waitingValidationMessage);

    // The tabs container is not rendered while the tournament is waiting for admin validation.
    await expect(page.getByRole('tab')).toHaveCount(0);
  });
});

test.describe('Not found tournament', () => {
  test('should show not found state for unknown tournament ID', async ({ page }) => {
    const basePage = new TournamentBasePage(page);

    await basePage.gotoPublic('unknown-tournament-id-that-does-not-exist');
    await basePage.waitForLoad();

    await expect(basePage.isNotFound()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tournoi introuvable' })).toBeVisible();
    await expect(page.getByText("Ce tournoi n'existe pas ou a été supprimé.")).toBeVisible();
  });
});
