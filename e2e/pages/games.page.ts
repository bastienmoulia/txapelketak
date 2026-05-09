import { type Locator, type Page } from '@playwright/test';

export class GamesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async ensureGamesTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Parties' });
    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click();
    }
  }

  // --- Read ---

  gameRow(team1Name: string, team2Name: string): Locator {
    return this.page
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
  }

  gameRows(): Locator {
    return this.page
      .locator('.p-datatable-tbody tr')
      .filter({ has: this.page.locator('td[data-label]') });
  }

  async hasGame(team1Name: string, team2Name: string): Promise<boolean> {
    await this.ensureGamesTab();
    return (await this.gameRow(team1Name, team2Name).count()) > 0;
  }

  scoreText(team1Name: string, team2Name: string): Locator {
    return this.gameRow(team1Name, team2Name).locator(
      'td[data-label*="Score"], td[data-label*="score"]',
    );
  }

  // --- Filters ---

  async filterByTeam(teamName: string): Promise<void> {
    await this.ensureGamesTab();
    await this.page.getByTestId('team-filter-select').click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: teamName })
      .first()
      .click();
  }

  async clearTeamFilter(): Promise<void> {
    await this.ensureGamesTab();
    await this.page.getByTestId('team-filter-select').locator('.p-select-clear-icon').click();
  }

  async filterByDate(date: Date): Promise<void> {
    await this.ensureGamesTab();
    await this.page.getByTestId('date-filter-picker').locator('input').click();
    await this.page
      .locator('.p-datepicker-calendar td:not(.p-datepicker-other-month) .p-datepicker-day')
      .filter({ hasText: String(date.getUTCDate()) })
      .first()
      .click();
  }

  async clearDateFilter(): Promise<void> {
    await this.ensureGamesTab();
    await this.page.getByTestId('date-filter-picker').locator('.p-datepicker-clear-icon').click();
  }

  // --- Admin actions ---

  async addGame(
    team1Name: string,
    team2Name: string,
    options?: { serieName?: string; pouleName?: string },
  ): Promise<void> {
    await this.ensureGamesTab();
    await this.page.getByTestId('add-game-button').click();
    // Step 1: pick serie + poule
    let dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('.p-select') })
      .first();
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('.p-select').first().click();
    const serieOption = options?.serieName
      ? this.page
          .locator('.p-select-overlay .p-select-option')
          .filter({ hasText: options.serieName })
      : this.page.locator('.p-select-overlay .p-select-option').first();
    await serieOption.click();
    await dialog.locator('.p-select').last().click();
    const pouleOption = options?.pouleName
      ? this.page
          .locator('.p-select-overlay .p-select-option')
          .filter({ hasText: options.pouleName })
      : this.page.locator('.p-select-overlay .p-select-option').first();
    await pouleOption.click();
    await dialog.locator('button').filter({ hasText: 'Suivant' }).click();
    // Step 2: fill teams
    dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('.p-select') })
      .first();
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('.p-select').first().click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: team1Name })
      .click();
    await dialog.locator('.p-select').nth(1).click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: team2Name })
      .click();
    await dialog.locator('button').filter({ hasText: 'Enregistrer' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteGame(team1Name: string, team2Name: string): Promise<void> {
    const row = this.gameRow(team1Name, team2Name);
    await row.locator('[aria-label*="Modifier"]').click();
    const editDialog = this.page.locator('.p-dialog').filter({ hasText: 'Modifier la partie' });
    await editDialog.waitFor({ state: 'visible' });
    await editDialog.getByTestId('delete-game-button').click();
    const confirmDialog = this.page.getByRole('alertdialog', {
      name: 'Confirmer la suppression',
    });
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  async editScores(
    team1Name: string,
    team2Name: string,
    score1: number,
    score2: number,
  ): Promise<void> {
    const row = this.gameRow(team1Name, team2Name);
    await row.locator('[aria-label*="Modifier"]').click();

    const dialog = this.page.locator('.p-dialog').filter({ hasText: 'Modifier la partie' });
    await dialog.waitFor({ state: 'visible' });

    const score1Input = dialog.locator('input#score1');
    await score1Input.click({ clickCount: 3 });
    await score1Input.fill(String(score1));

    const score2Input = dialog.locator('input#score2');
    await score2Input.click({ clickCount: 3 });
    await score2Input.fill(String(score2));

    const saveButton = dialog.locator('button[type="submit"]');
    await saveButton.click();
    await dialog.waitFor({ state: 'hidden' });
  }

  gameCommentButton(team1Name: string, team2Name: string): Locator {
    return this.gameRow(team1Name, team2Name).locator(
      '[aria-label="Voir le commentaire de cette partie"]',
    );
  }

  async editGameComment(team1Name: string, team2Name: string, comment: string): Promise<void> {
    await this.ensureGamesTab();
    const row = this.gameRow(team1Name, team2Name);
    await row.locator('[aria-label="Modifier cette partie"]').click();

    const dialog = this.page.locator('.p-dialog').filter({ hasText: 'Modifier la partie' });
    await dialog.waitFor({ state: 'visible' });

    const commentTextarea = dialog.locator('textarea#gameComment');
    await commentTextarea.clear();
    if (comment) {
      await commentTextarea.fill(comment);
    }

    const saveButton = dialog.locator('button[type="submit"]');
    await saveButton.click();
    await dialog.waitFor({ state: 'hidden' });
  }
}
