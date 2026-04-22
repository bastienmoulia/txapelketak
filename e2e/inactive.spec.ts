import { test, expect } from '@playwright/test';
import { TournamentDetailPage } from './pages/tournament-detail.page';

test.describe('Inactive tournament', () => {
  // Persistent tournament kept in waitingValidation status for E2E tests.
  // Not visible in the public list, so we use its known ID directly.
  const inactiveTournamentId = 'nmjKZxepAKXwaIMYhuHg';
  const tournamentName = 'Tournoi inactif';
  const waitingValidationMessage =
    "L'administrateur doit valider ce tournoi avant qu'il puisse être visible. Merci de votre patience.";

  test('should show waiting validation warning and hide tabs', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);

    await detailPage.goto(inactiveTournamentId);
    await detailPage.waitForLoad();

    await expect(
      detailPage.isNotFound(),
      `Expected persistent inactive tournament "${tournamentName}" (${inactiveTournamentId}) to exist`,
    ).not.toBeVisible();

    await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
    await expect(detailPage.isWaitingValidation()).toBeVisible();
    await expect(detailPage.isWaitingValidation()).toHaveText(waitingValidationMessage);

    // The tabs container is not rendered while the tournament is waiting for admin validation.
    await expect(page.getByRole('tab')).toHaveCount(0);
  });
});

test.describe('Not found tournament', () => {
  test('should show not found state for unknown tournament ID', async ({ page }) => {
    const detailPage = new TournamentDetailPage(page);

    await detailPage.goto('unknown-tournament-id-that-does-not-exist');
    await detailPage.waitForLoad();

    await expect(detailPage.isNotFound()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tournoi introuvable' })).toBeVisible();
    await expect(page.getByText("Ce tournoi n'existe pas ou a été supprimé.")).toBeVisible();
  });
});
