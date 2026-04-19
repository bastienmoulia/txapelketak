import { type Locator, type Page } from '@playwright/test';

export class TournamentListPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/tournaments');
  }

  createButton(): Locator {
    return this.page.getByRole('button', { name: 'Créer' });
  }

  async clickCreate(): Promise<void> {
    await this.createButton().click();
  }

  tournamentRow(name: string): Locator {
    return this.page
      .locator('.p-datatable-tbody tr')
      .filter({ has: this.page.locator('td').first().filter({ hasText: name }) });
  }

  async hasTournament(name: string): Promise<boolean> {
    return (await this.tournamentRow(name).count()) > 0;
  }

  async openTournament(name: string): Promise<void> {
    await this.tournamentRow(name).first().locator('button').click();
  }

  async waitForTournamentToAppear(name: string, timeout = 10000): Promise<void> {
    await this.tournamentRow(name).first().waitFor({ timeout });
  }
}
