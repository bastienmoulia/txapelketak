import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { DashboardPage } from './pages/dashboard.page';
import { GamesPage } from './pages/games.page';
import { TeamsPage } from './pages/teams.page';
import { TournamentBasePage } from './pages/tournament-base.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * E2E tests for comments on games and teams.
 *
 * Covers:
 * - Visitors should not see/add/edit comments
 * - Posting a new comment on a game (admin/orga)
 * - Posting a new comment on a team (admin only – team edit is admin-restricted)
 * - Editing and deleting comments (admin/orga for games, admin only for teams)
 * - Visibility and update of comments in the UI:
 *   - Dashboard and Games pages for game comments
 *   - Teams page for team comments
 * - Edge cases: empty comment removes the comment button
 */
test.describe.serial('Comments – games and teams', () => {
  const timestamp = Date.now();
  const tournamentName = `Comments Test ${timestamp}`;
  const fixturePath = 'e2e/fixtures/comments-seed.yaml';
  const organizerUsername = `Org Comments ${timestamp}`;
  const organizerEmail = `orgcomments${timestamp}@test.com`;

  // Seeded team/game names
  const team1 = 'Comment Team One';
  const team2 = 'Comment Team Two';
  const seededTeamComment = 'Seeded team comment';
  const seededGameComment = 'Seeded game comment';

  // Values used in edit / re-add tests
  const editedGameComment = 'Edited game comment';
  const editedTeamComment = 'Edited team comment';
  const newGameComment = 'New game comment';
  const newTeamComment = 'New team comment for team two';
  const orgGameComment = 'Organizer game comment';

  let adminUrl = '';
  let organizerUrl = '';
  let tournamentId = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests commentaires E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);
      await adminPage.importYamlFixture(fixturePath);

      // Capture tournament ID from the admin URL path (/tournaments/{id}/...)
      const match = adminUrl.match(/\/tournaments\/([^/]+)\//);
      tournamentId = match?.[1] ?? '';

      // Create an organizer for organizer-specific tests
      organizerUrl = await adminPage.addUserAndGetAdminUrl(
        organizerUsername,
        organizerEmail,
        'organizer',
      );
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
      console.warn('Failed to delete comments test tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  // ─── Visitor: no comment buttons ──────────────────────────────────────────

  test('visitor should not see game comment button in games tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);
    const gamesPage = new GamesPage(page);

    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();
    await basePage.clickTab('Parties');

    await expect(gamesPage.gameRow(team1, team2)).toBeVisible();

    // The actions column (including the comment button) is hidden for visitors
    await expect(
      page.locator('[aria-label="Voir le commentaire de cette partie"]').first(),
    ).not.toBeVisible();
  });

  test('visitor should not see team comment button in teams tab', async ({ page }) => {
    const basePage = new TournamentBasePage(page);

    await basePage.gotoPublic(tournamentId);
    await basePage.waitForLoad();
    await basePage.clickTab('Équipes');

    // Comment button requires admin or organizer role
    await expect(page.getByTestId('team-comment-button').first()).not.toBeVisible();
  });

  // ─── Admin: game comment visibility in games tab ───────────────────────────

  test('admin should see game comment button for seeded game in games tab', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await expect(gamesPage.gameCommentButton(team1, team2)).toBeVisible();
  });

  test('admin can view seeded game comment text via popover', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.gameCommentButton(team1, team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(seededGameComment);
  });

  // ─── Admin: game comment visibility on dashboard ───────────────────────────

  test('admin should see game comment button on dashboard in upcoming games', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const dashboardPage = new DashboardPage(page);

    await adminPage.goto(adminUrl);
    // Already on the Dashboard tab by default

    await expect(dashboardPage.upcomingGameCommentButton(team1, team2)).toBeVisible();
  });

  test('admin can view game comment text from dashboard popover', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const dashboardPage = new DashboardPage(page);

    await adminPage.goto(adminUrl);

    await dashboardPage.upcomingGameCommentButton(team1, team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(seededGameComment);
  });

  // ─── Admin: game comment edit / clear / re-add ────────────────────────────

  test('admin can edit a game comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.editGameComment(team1, team2, editedGameComment);

    await expect(gamesPage.gameCommentButton(team1, team2)).toBeVisible();
    await gamesPage.gameCommentButton(team1, team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(editedGameComment);
  });

  test('admin can remove a game comment by saving with an empty comment field', async ({
    page,
  }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Clear the comment (empty string)
    await gamesPage.editGameComment(team1, team2, '');

    // The comment button should no longer be visible
    await expect(gamesPage.gameCommentButton(team1, team2)).not.toBeVisible();
  });

  test('admin can add a comment to a game that previously had no comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Game has no comment after the previous test cleared it
    await expect(gamesPage.gameCommentButton(team1, team2)).not.toBeVisible();

    // Add a new comment
    await gamesPage.editGameComment(team1, team2, newGameComment);

    await expect(gamesPage.gameCommentButton(team1, team2)).toBeVisible();
    await gamesPage.gameCommentButton(team1, team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(newGameComment);
  });

  // ─── Admin: team comment visibility in teams tab ───────────────────────────

  test('admin should see team comment button for seeded team with comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await expect(teamsPage.teamCommentButton(team1)).toBeVisible();
  });

  test('admin can view seeded team comment text via popover', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await teamsPage.teamCommentButton(team1).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(seededTeamComment);
  });

  // ─── Admin: team comment edit / clear / re-add ────────────────────────────

  test('admin can edit a team comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    await teamsPage.editTeamComment(team1, editedTeamComment);

    await expect(teamsPage.teamCommentButton(team1)).toBeVisible();
    await teamsPage.teamCommentButton(team1).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(editedTeamComment);
  });

  test('admin can remove a team comment by saving with an empty comment field', async ({
    page,
  }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    // Clear the comment (empty string)
    await teamsPage.editTeamComment(team1, '');

    // The comment button should no longer be visible
    await expect(teamsPage.teamCommentButton(team1)).not.toBeVisible();
  });

  test('admin can add a comment to a team that previously had no comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');

    // team2 has no comment in the seed
    await expect(teamsPage.teamCommentButton(team2)).not.toBeVisible();

    // Add a comment via the edit dialog
    await teamsPage.editTeamComment(team2, newTeamComment);

    await expect(teamsPage.teamCommentButton(team2)).toBeVisible();
    await teamsPage.teamCommentButton(team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(newTeamComment);
  });

  // ─── Organizer: game comment visibility and editing ────────────────────────

  test('organizer should see game comment button in games tab', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    // The game has a comment (added back by the admin in a previous test)
    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    await expect(gamesPage.gameCommentButton(team1, team2)).toBeVisible();
  });

  test('organizer can edit a game comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);

    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Parties');

    await gamesPage.editGameComment(team1, team2, orgGameComment);

    await expect(gamesPage.gameCommentButton(team1, team2)).toBeVisible();
    await gamesPage.gameCommentButton(team1, team2).click();
    const popover = page.locator('.p-popover');
    await popover.waitFor({ state: 'visible' });
    await expect(popover.locator('p')).toContainText(orgGameComment);
  });

  // ─── Organizer: team comment visibility (read-only) ───────────────────────

  test('organizer should see team comment button for team with comment', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const teamsPage = new TeamsPage(page);

    // Ensure team2 has a comment in this test to avoid cross-test timing dependencies.
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Équipes');
    await teamsPage.editTeamComment(team2, newTeamComment);
    await expect(teamsPage.teamCommentButton(team2)).toBeVisible();

    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Équipes');

    await expect(teamsPage.teamCommentButton(team2)).toBeVisible();
  });

  test('organizer should NOT see team edit button (team editing is admin-only)', async ({
    page,
  }) => {
    const adminPage = new AdminPage(page);

    await adminPage.goto(organizerUrl);
    await adminPage.clickTab('Équipes');

    // Edit team button is restricted to admin role only
    await expect(page.getByTestId('edit-team-button').first()).not.toBeVisible();
  });
});
