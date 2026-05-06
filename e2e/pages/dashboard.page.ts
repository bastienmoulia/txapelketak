import { type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  teamsCount(): Locator {
    return this.page.getByTestId('dashboard-teams-count');
  }

  seriesCount(): Locator {
    return this.page.getByTestId('dashboard-series-count');
  }

  poulesCount(): Locator {
    return this.page.getByTestId('dashboard-poules-count');
  }

  gamesCount(): Locator {
    return this.page.getByTestId('dashboard-games-count');
  }

  playedCount(): Locator {
    return this.page.getByTestId('dashboard-played-count');
  }

  upcomingGameCommentButton(team1Name: string, team2Name: string): Locator {
    return this.page
      .getByTestId('dashboard-upcoming-game')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name })
      .locator('[aria-label="Voir le commentaire de cette partie"]');
  }
}
