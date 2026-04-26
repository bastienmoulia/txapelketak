import { type Locator, type Page } from '@playwright/test';

export class TournamentBasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoPublic(tournamentId: string): Promise<void> {
    await this.page.goto(`/tournaments/${tournamentId}`);
  }

  async gotoAdmin(adminUrl: string): Promise<void> {
    await this.page.goto(adminUrl);
    await this.waitForAdminLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.getByTestId('loading-state').waitFor({ state: 'hidden', timeout: 15000 });
  }

  async waitForAdminLoad(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Tableau de bord' }).waitFor({
      state: 'visible',
    });
  }

  isNotFound(): Locator {
    return this.page.getByTestId('not-found-state');
  }

  isWaitingValidation(): Locator {
    return this.page.getByTestId('validation-message');
  }

  isAccessDenied(): Locator {
    return this.page.getByTestId('admin-denied');
  }

  async clickTab(tabLabel: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabLabel }).click();
  }
}
