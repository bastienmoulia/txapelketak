import { expect, test } from '@playwright/test';
import { load } from 'js-yaml';
import { AdminPage } from './pages/admin.page';
import { GamesPage } from './pages/games.page';
import { PhasesPage } from './pages/phases.page';
import { TournamentNewPage } from './pages/tournament-new.page';

/**
 * E2E tests for score entry, game editing, poule standings, and YAML export.
 *
 * These tests cover the most critical missing scenarios:
 *   1. Displaying seeded scores
 *   2. Entering scores on a game with no scores
 *   3. Editing existing scores
 *   4. Verifying poule standings reflect scores correctly
 *   5. Exporting tournament data as YAML
 *
 * Setup (beforeAll):
 *   1. Create a tournament via the wizard
 *   2. Validate by visiting the admin URL
 *   3. Import score-standings-seed.yaml (3 teams, 3 games, 2 with scores)
 *
 * Teardown (afterAll):
 *   Delete the tournament
 */
test.describe.serial('Score entry, standings & export', () => {
  const timestamp = Date.now();
  const tournamentName = `Score Test ${timestamp}`;
  const fixturePath = 'e2e/fixtures/score-standings-seed.yaml';

  const teamAlpha = 'Score Team Alpha';
  const teamBeta = 'Score Team Beta';
  const teamGamma = 'Score Team Gamma';
  const serieName = 'Score Serie';
  const pouleName = 'Score Poule';

  let adminUrl = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create tournament
      const newPage = new TournamentNewPage(page);
      await newPage.goto();
      await newPage.fillStep1(tournamentName, 'Tournoi pour tests scores et classements E2E');
      await newPage.goToNextStep();
      await newPage.fillStep2(`Admin ${timestamp}`, `admin${timestamp}@test.com`);
      await newPage.submit();

      await page.getByTestId('success-state').waitFor({ state: 'visible', timeout: 15000 });
      adminUrl = await newPage.getAdminUrl();

      // Step 2: Validate tournament by visiting the admin URL
      const adminPage = new AdminPage(page);
      await adminPage.goto(adminUrl);

      // Step 3: Import fixture data
      await adminPage.importYamlFixture(fixturePath);

      // Validate seed: all 3 games should be visible
      const gamesPage = new GamesPage(page);
      await adminPage.clickTab('Parties');
      await expect(gamesPage.gameRow(teamAlpha, teamBeta)).toBeVisible();
      await expect(gamesPage.gameRow(teamAlpha, teamGamma)).toBeVisible();
      await expect(gamesPage.gameRow(teamBeta, teamGamma)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!adminUrl) return;

    const context = await browser.newContext();
    const page = await context.newPage();
    const adminPage = new AdminPage(page);

    try {
      await adminPage.goto(adminUrl);
      await adminPage.deleteTournament(tournamentName);
    } catch (error) {
      console.warn('Failed to delete score test tournament in afterAll:', error);
    } finally {
      await context.close();
    }
  });

  // --- Score display ---

  test('should display initial scores from seed data', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Alpha vs Beta: 21 – 15
    const scoreAB = gamesPage.scoreText(teamAlpha, teamBeta);
    await expect(scoreAB).toContainText('21');
    await expect(scoreAB).toContainText('15');

    // Alpha vs Gamma: 18 – 21
    const scoreAG = gamesPage.scoreText(teamAlpha, teamGamma);
    await expect(scoreAG).toContainText('18');
    await expect(scoreAG).toContainText('21');

    // Beta vs Gamma: no scores (should show dashes)
    const scoreBG = gamesPage.scoreText(teamBeta, teamGamma);
    await expect(scoreBG).not.toContainText(/\d/);
  });

  // --- Score entry ---

  test('should enter scores for a game without scores', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Enter scores for Beta vs Gamma
    await gamesPage.editScores(teamBeta, teamGamma, 10, 25);

    // Verify scores are displayed
    const scoreBG = gamesPage.scoreText(teamBeta, teamGamma);
    await expect(scoreBG).toContainText('10');
    await expect(scoreBG).toContainText('25');

    // Verify color coding: Gamma won (25 > 10)
    const gameRow = gamesPage.gameRow(teamBeta, teamGamma);
    // Team Beta (loser) should have red class
    await expect(
      gameRow
        .locator(`td[data-label="Équipe 1"] .text-red-500, td[data-label] .text-red-500`)
        .first(),
    ).toBeVisible();
    // Team Gamma (winner) should have green class
    await expect(
      gameRow
        .locator(`td[data-label="Équipe 2"] .text-green-500, td[data-label] .text-green-500`)
        .first(),
    ).toBeVisible();
  });

  // --- Score editing ---

  test('should edit existing scores on a game', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    await adminPage.goto(adminUrl);
    await adminPage.clickTab('Parties');

    // Edit Alpha vs Beta from 21-15 to 12-21
    await gamesPage.editScores(teamAlpha, teamBeta, 12, 21);

    // Verify updated scores
    const scoreAB = gamesPage.scoreText(teamAlpha, teamBeta);
    await expect(scoreAB).toContainText('12');
    await expect(scoreAB).toContainText('21');
    // 21 should no longer be first team's score (was 21, now 12)
    // The row should now show Beta as winner
    const gameRow = gamesPage.gameRow(teamAlpha, teamBeta);
    await expect(gameRow.locator('.text-green-500').first()).toBeVisible();
    await expect(gameRow.locator('.text-red-500').first()).toBeVisible();
  });

  // --- Standings ---

  test('should verify poule standings reflect all scores', async ({ page }) => {
    const adminPage = new AdminPage(page);
    const gamesPage = new GamesPage(page);
    const poulesPage = new PhasesPage(page);
    await adminPage.goto(adminUrl);

    // Edit scores in the same page session to guarantee Firestore writes are committed
    // before the Poules tab reads standings (avoids cross-page data sync issues on CI).
    await adminPage.clickTab('Parties');
    await gamesPage.editScores(teamBeta, teamGamma, 10, 25);
    await gamesPage.editScores(teamAlpha, teamBeta, 12, 21);

    await adminPage.clickTab('Phases');

    await poulesPage.ensureSerieExpanded(serieName);
    const rows = poulesPage.standingsRows(serieName, pouleName);

    // After all score changes:
    //   Alpha vs Beta: 12-21 → Beta wins
    //   Alpha vs Gamma: 18-21 → Gamma wins
    //   Beta vs Gamma: 10-25 → Gamma wins
    //
    // Gamma: played=2, won=2, pointsInLosses=0, pointsConceded=18+10=28
    // Beta: played=2, won=1, pointsInLosses=10, pointsConceded=21+25=46
    // Alpha: played=2, won=0, pointsInLosses=12+18=30, pointsConceded=21+21=42
    //
    // Sort: won desc → Gamma(2), Beta(1), Alpha(0)

    await expect(rows).toHaveCount(3);

    // Wait for standings to reflect all score changes (real-time sync may lag)
    await expect(async () => {
      // Row 0: Gamma (2 wins)
      const row0 = rows.nth(0);
      await expect(row0.locator('.standings-table__name')).toHaveText(teamGamma, { timeout: 2000 });
      await expect(row0.locator('.standings-table__stat').nth(0)).toHaveText('2', {
        timeout: 2000,
      }); // played
      await expect(row0.locator('.standings-table__stat').nth(1)).toHaveText('2', {
        timeout: 2000,
      }); // won

      // Row 1: Beta (1 win)
      const row1 = rows.nth(1);
      await expect(row1.locator('.standings-table__name')).toHaveText(teamBeta, { timeout: 2000 });
      await expect(row1.locator('.standings-table__stat').nth(0)).toHaveText('2', {
        timeout: 2000,
      }); // played
      await expect(row1.locator('.standings-table__stat').nth(1)).toHaveText('1', {
        timeout: 2000,
      }); // won

      // Row 2: Alpha (0 wins)
      const row2 = rows.nth(2);
      await expect(row2.locator('.standings-table__name')).toHaveText(teamAlpha, { timeout: 2000 });
      await expect(row2.locator('.standings-table__stat').nth(0)).toHaveText('2', {
        timeout: 2000,
      }); // played
      await expect(row2.locator('.standings-table__stat').nth(1)).toHaveText('0', {
        timeout: 2000,
      }); // won
    }).toPass({ timeout: 20000 });
  });

  // --- Export ---

  test('should export tournament data as YAML', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto(adminUrl);

    const yamlContent = await adminPage.exportYaml();

    // Parse the YAML to verify structure
    const data = load(yamlContent) as Record<string, unknown>;
    expect(data).toHaveProperty('teams');
    expect(data).toHaveProperty('series');

    const teams = data['teams'] as { name: string }[];
    expect(teams).toHaveLength(3);
    const teamNames = teams.map((t) => t.name);
    expect(teamNames).toContain(teamAlpha);
    expect(teamNames).toContain(teamBeta);
    expect(teamNames).toContain(teamGamma);

    const series = data['series'] as {
      poules: { games: Record<string, unknown>[] }[];
    }[];
    expect(series).toHaveLength(1);
    const games = series[0].poules[0].games;
    expect(games).toHaveLength(3);

    // All 3 games should have scores (after our edits)
    for (const game of games) {
      expect(game).toHaveProperty('score1');
      expect(game).toHaveProperty('score2');
    }
  });
});
