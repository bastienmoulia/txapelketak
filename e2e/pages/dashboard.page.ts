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
}
