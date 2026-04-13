import { type Locator, type Page } from '@playwright/test';

export class AdminPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(adminUrl: string): Promise<void> {
    await this.page.goto(adminUrl);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait until neither loading indicator nor access denied is shown
    await this.page.getByTestId('admin-loading').waitFor({ state: 'hidden', timeout: 15000 });
  }

  isAccessDenied(): Locator {
    return this.page.getByTestId('admin-denied');
  }

  // --- Tab navigation ---

  async clickTab(tabLabel: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabLabel }).click();
    await this.page.waitForLoadState('networkidle');
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

  dashboardPlayedCount(): Locator {
    return this.page.getByTestId('dashboard-played-count');
  }

  // --- Teams ---

  async addTeam(name: string): Promise<void> {
    await this.page.getByTestId('add-team-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editTeam(currentName: string, newName: string): Promise<void> {
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: currentName });
    await row.getByTestId('edit-team-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    const input = dialog.locator('input#name');
    await input.clear();
    await input.fill(newName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteTeam(name: string): Promise<void> {
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: name });
    await row.getByTestId('delete-team-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  teamRow(name: string): Locator {
    return this.page.locator('.p-datatable-tbody tr').filter({ hasText: name });
  }

  // --- Series & Poules ---

  async addSerie(name: string): Promise<void> {
    await this.page.getByTestId('add-serie-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#serie-name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editSerie(currentName: string, newName: string): Promise<void> {
    const seriePanel = this.page.locator('p-accordion-panel').filter({ hasText: currentName });
    await seriePanel.getByTestId('edit-serie-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    const input = dialog.locator('input#serie-name');
    await input.clear();
    await input.fill(newName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteSerie(name: string): Promise<void> {
    const seriePanel = this.page.locator('p-accordion-panel').filter({ hasText: name });
    await seriePanel.getByTestId('delete-serie-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async addPoule(serieName: string, pouleName: string): Promise<void> {
    const seriePanel = this.page.locator('p-accordion-panel').filter({ hasText: serieName });
    // Expand accordion if needed
    const accordionHeader = seriePanel.locator('.p-accordionheader, p-accordion-header');
    if ((await accordionHeader.getAttribute('aria-expanded')) === 'false') {
      await accordionHeader.click();
    }
    await seriePanel.getByTestId('add-poule-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#poule-name').fill(pouleName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editPoule(serieName: string, currentPouleName: string, newPouleName: string): Promise<void> {
    const seriePanel = this.page.locator('p-accordion-panel').filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: currentPouleName });
    await pouleCard.getByTestId('edit-poule-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    const input = dialog.locator('input#poule-name');
    await input.clear();
    await input.fill(newPouleName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deletePoule(serieName: string, pouleName: string): Promise<void> {
    const seriePanel = this.page.locator('p-accordion-panel').filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: pouleName });
    await pouleCard.getByTestId('delete-poule-button').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  seriePanel(name: string): Locator {
    return this.page.locator('p-accordion-panel').filter({ hasText: name });
  }

  poulesWarningMessage(): Locator {
    return this.page.locator('p-message').filter({ hasText: 'série' });
  }

  // --- Users ---

  async addUser(username: string, email: string, role: 'admin' | 'organizer'): Promise<void> {
    await this.page.locator('button').filter({ hasText: 'Ajouter' }).first().click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#username').fill(username);
    await dialog.locator('input#email').fill(email);
    // Select role via p-select
    await this.selectRole(dialog, role);
    await dialog
      .locator('button')
      .filter({ hasText: 'Enregistrer' })
      .click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editUser(currentUsername: string, newUsername: string, newEmail: string): Promise<void> {
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: currentUsername });
    await row.locator('button').filter({ hasText: 'Modifier' }).click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    const usernameInput = dialog.locator('input#username');
    await usernameInput.clear();
    await usernameInput.fill(newUsername);
    const emailInput = dialog.locator('input#email');
    await emailInput.clear();
    await emailInput.fill(newEmail);
    await dialog.locator('button').filter({ hasText: 'Enregistrer' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteUser(username: string): Promise<void> {
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: username });
    await row.locator('button').filter({ hasText: 'Supprimer' }).click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  userRow(username: string): Locator {
    return this.page.locator('.p-datatable-tbody tr').filter({ hasText: username });
  }

  private async selectRole(
    dialog: Locator,
    role: 'admin' | 'organizer',
  ): Promise<void> {
    const roleLabel = role === 'admin' ? 'Administrateur' : 'Organisateur';
    await dialog.locator('.p-select').click();
    // Wait for dropdown
    await this.page.locator('.p-select-overlay .p-select-option').filter({ hasText: roleLabel }).click();
  }

  // --- Games ---

  async addGame(team1Name: string, team2Name: string): Promise<void> {
    await this.page.getByTestId('add-game-button').click();
    // Step 1: pick serie + poule
    let dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    // Select the first available serie
    await dialog.locator('.p-select').first().click();
    await this.page.locator('.p-select-overlay .p-select-option').first().click();
    // Select the first available poule
    await dialog.locator('.p-select').last().click();
    await this.page.locator('.p-select-overlay .p-select-option').first().click();
    await dialog.locator('button').filter({ hasText: 'Suivant' }).click();
    // Step 2: fill teams
    dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    // Select team 1
    await dialog.locator('.p-select').first().click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: team1Name })
      .click();
    // Select team 2
    await dialog.locator('.p-select').nth(1).click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: team2Name })
      .click();
    await dialog.locator('button').filter({ hasText: 'Enregistrer' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteGame(team1Name: string, team2Name: string): Promise<void> {
    const row = this.page
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
    await row.locator('[aria-label*="upprimer"]').click();
    const dialog = this.page.locator('.p-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  gameRow(team1Name: string, team2Name: string): Locator {
    return this.page
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
  }
}
