import { type Locator, type Page } from '@playwright/test';

export class TournamentDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(tournamentId: string): Promise<void> {
    await this.page.goto(`/tournaments/${tournamentId}`);
  }

  async waitForLoad(): Promise<void> {
    await this.page.getByTestId('loading-state').waitFor({ state: 'hidden', timeout: 15000 });
  }

  isNotFound(): Locator {
    return this.page.getByTestId('not-found-state');
  }

  isWaitingValidation(): Locator {
    return this.page.getByTestId('validation-message');
  }

  // --- Tab navigation ---

  async clickTab(tabLabel: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabLabel }).click();
  }

  // --- Dashboard ---

  dashboardTeamsCount(): Locator {
    return this.page.getByTestId('dashboard-teams-count');
  }

  dashboardSeriesCount(): Locator {
    return this.page.getByTestId('dashboard-series-count');
  }

  dashboardPoulesCount(): Locator {
    return this.page.getByTestId('dashboard-poules-count');
  }

  dashboardGamesCount(): Locator {
    return this.page.getByTestId('dashboard-games-count');
  }

  // --- Teams tab ---

  teamRow(name: string): Locator {
    return this.page
      .getByRole('tabpanel', { name: 'Équipes' })
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: name });
  }

  async hasTeam(name: string): Promise<boolean> {
    return (await this.teamRow(name).count()) > 0;
  }

  // --- Poules tab ---

  seriePanel(name: string): Locator {
    return this.page.locator('p-accordion-panel').filter({ hasText: name });
  }

  poulesContainer(): Locator {
    return this.page.locator('.p-accordion, p-accordion');
  }

  // --- Games tab ---

  private gamesPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Parties' });
  }

  gameRows(): Locator {
    return this.gamesPanel()
      .locator('.p-datatable-tbody tr')
      .filter({ has: this.page.locator('td[data-label]') });
  }

  gameRow(team1Name: string, team2Name: string): Locator {
    return this.gamesPanel()
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
  }

  async hasGame(team1Name: string, team2Name: string): Promise<boolean> {
    return (await this.gameRow(team1Name, team2Name).count()) > 0;
  }

  async filterGamesByTeam(teamName: string): Promise<void> {
    await this.gamesPanel().getByTestId('team-filter-select').click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: teamName })
      .first()
      .click();
  }

  async clearGamesTeamFilter(): Promise<void> {
    await this.gamesPanel()
      .getByTestId('team-filter-select')
      .locator('.p-select-clear-icon')
      .click();
  }

  async filterGamesByDate(date: Date): Promise<void> {
    await this.gamesPanel().getByTestId('date-filter-picker').locator('input').click();
    await this.page
      .locator('.p-datepicker-calendar td:not(.p-datepicker-other-month) .p-datepicker-day')
      .filter({ hasText: String(date.getUTCDate()) })
      .first()
      .click();
  }

  async clearGamesDateFilter(): Promise<void> {
    await this.gamesPanel()
      .getByTestId('date-filter-picker')
      .locator('.p-datepicker-clear-icon')
      .click();
  }
}
