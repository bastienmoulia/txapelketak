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
    // Wait for the admin page to finish loading: the "Tableau de bord" tab appears
    // once the user has been authenticated and the tournament data has been fetched.
    await this.page.getByRole('tab', { name: 'Tableau de bord' }).waitFor({
      state: 'visible',
      timeout: 30000,
    });
  }

  isAccessDenied(): Locator {
    return this.page.getByTestId('admin-denied');
  }

  // --- Tab navigation ---

  async clickTab(tabLabel: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabLabel }).click();
  }

  private teamsPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Équipes' });
  }

  private gamesPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Parties' });
  }

  private usersPanel(): Locator {
    // Users section lives inside the "Administration" tab panel (not a separate tab).
    return this.page.getByRole('tabpanel', { name: 'Administration' });
  }

  private poulesPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Poules' });
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
    await this.teamsPanel().getByTestId('add-team-button').click();
    const dialog = this.page.locator('.p-dialog').filter({ has: this.page.locator('input#name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editTeam(currentName: string, newName: string): Promise<void> {
    const row = this.teamsPanel().locator('.p-datatable-tbody tr').filter({ hasText: currentName });
    const editButton = row.getByRole('button', { name: 'Modifier cette équipe' });
    await editButton.click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#name') })
      .filter({ hasText: "Modifier l'équipe" });
    try {
      await dialog.waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      await editButton.evaluate((element) => {
        (element as HTMLElement).click();
      });
      await dialog.waitFor({ state: 'visible' });
    }
    const input = dialog.locator('input#name');
    await input.clear();
    await input.fill(newName);
    const saveButton = dialog.getByRole('button', { name: 'Enregistrer' });
    await saveButton.click();
    try {
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      await saveButton.evaluate((element) => {
        (element as HTMLElement).click();
      });
      await dialog.waitFor({ state: 'hidden' });
    }
    await this.teamRow(newName).waitFor({ state: 'visible' });
  }

  async deleteTeam(name: string): Promise<void> {
    const row = this.teamsPanel().locator('.p-datatable-tbody tr').filter({ hasText: name });
    await row.getByTestId('delete-team-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.getByTestId('delete-confirm-button') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  teamRow(name: string): Locator {
    return this.teamsPanel().locator('.p-datatable-tbody tr').filter({ hasText: name });
  }

  // --- Series & Poules ---

  async addSerie(name: string): Promise<void> {
    await this.poulesPanel().getByTestId('add-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#serie-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#serie-name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editSerie(currentName: string, newName: string): Promise<void> {
    const seriePanel = this.poulesPanel()
      .locator('p-accordion-panel')
      .filter({ hasText: currentName });
    await seriePanel.getByTestId('edit-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#serie-name') });
    await dialog.waitFor({ state: 'visible' });
    const input = dialog.locator('input#serie-name');
    await input.clear();
    await input.fill(newName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deleteSerie(name: string): Promise<void> {
    const seriePanel = this.poulesPanel().locator('p-accordion-panel').filter({ hasText: name });
    await seriePanel.getByTestId('delete-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.getByTestId('delete-confirm-button') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async addPoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const seriePanel = this.poulesPanel()
      .locator('p-accordion-panel')
      .filter({ hasText: serieName });
    await seriePanel.getByTestId('add-poule-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#poule-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#poule-name').fill(pouleName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editPoule(
    serieName: string,
    currentPouleName: string,
    newPouleName: string,
  ): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const seriePanel = this.poulesPanel()
      .locator('p-accordion-panel')
      .filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: currentPouleName });
    await pouleCard.getByTestId('edit-poule-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#poule-name') });
    await dialog.waitFor({ state: 'visible' });
    const input = dialog.locator('input#poule-name');
    await input.clear();
    await input.fill(newPouleName);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deletePoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const seriePanel = this.poulesPanel()
      .locator('p-accordion-panel')
      .filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: pouleName });
    await pouleCard.getByTestId('delete-poule-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.getByTestId('delete-confirm-button') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-confirm-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  seriePanel(name: string): Locator {
    return this.poulesPanel().locator('p-accordion-panel').filter({ hasText: name });
  }

  /**
   * Ensures that the accordion panel for a given serie is expanded, so that
   * its poule cards are visible and interactable.
   */
  async ensureSerieExpanded(serieName: string): Promise<void> {
    const seriePanel = this.poulesPanel()
      .locator('p-accordion-panel')
      .filter({ hasText: serieName });
    const content = seriePanel.locator('p-accordion-content');
    const isVisible = await content.isVisible();
    if (!isVisible) {
      await seriePanel.locator('.p-accordionheader').click();
      await content.waitFor({ state: 'visible' });
    }
  }

  poulesWarningMessage(): Locator {
    return this.poulesPanel().locator('p-message').filter({ hasText: 'série' });
  }

  // --- Users ---

  async addUser(username: string, email: string, role: 'admin' | 'organizer'): Promise<void> {
    await this.usersPanel().locator('button').filter({ hasText: 'Ajouter' }).first().click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#username') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#username').fill(username);
    await dialog.locator('input#email').fill(email);
    // Select role via p-select
    await this.selectRole(dialog, role);
    await dialog.locator('button').filter({ hasText: 'Enregistrer' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  /**
   * Adds a user and returns the admin/organizer URL shown in the sticky toast.
   * Must be called after navigating to the Administration tab.
   */
  async addUserAndGetAdminUrl(
    username: string,
    email: string,
    role: 'admin' | 'organizer',
  ): Promise<string> {
    await this.usersPanel().locator('button').filter({ hasText: 'Ajouter' }).first().click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#username') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#username').fill(username);
    await dialog.locator('input#email').fill(email);
    await this.selectRole(dialog, role);
    await dialog.locator('button').filter({ hasText: 'Enregistrer' }).click();
    await dialog.waitFor({ state: 'hidden' });

    // After creation, a sticky toast appears containing a link with the user's admin URL.
    const toastLink = this.page
      .locator('.p-toast-message')
      .locator('a[href*="/tournaments/"]')
      .first();
    await toastLink.waitFor({ state: 'visible', timeout: 10000 });
    const href = await toastLink.getAttribute('href');
    return href ?? '';
  }

  async editUser(currentUsername: string, newUsername: string, newEmail: string): Promise<void> {
    const row = this.usersPanel()
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: currentUsername });
    await row.locator('button').filter({ hasText: 'Modifier' }).click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#username') });
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
    const row = this.usersPanel().locator('.p-datatable-tbody tr').filter({ hasText: username });
    await row.locator('button').filter({ hasText: 'Supprimer' }).click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  userRow(username: string): Locator {
    return this.usersPanel().locator('.p-datatable-tbody tr').filter({ hasText: username });
  }

  private async selectRole(dialog: Locator, role: 'admin' | 'organizer'): Promise<void> {
    const roleLabel = role === 'admin' ? 'Administrateur' : 'Organisateur';
    await dialog.locator('.p-select').click();
    // Wait for dropdown
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: roleLabel })
      .click();
  }

  // --- Games ---

  async addGame(team1Name: string, team2Name: string): Promise<void> {
    await this.gamesPanel().getByTestId('add-game-button').click();
    // Step 1: pick serie + poule
    let dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('.p-select') })
      .first();
    await dialog.waitFor({ state: 'visible' });
    // Select the first available serie
    await dialog.locator('.p-select').first().click();
    await this.page.locator('.p-select-overlay .p-select-option').first().click();
    // Select the first available poule
    await dialog.locator('.p-select').last().click();
    await this.page.locator('.p-select-overlay .p-select-option').first().click();
    await dialog.locator('button').filter({ hasText: 'Suivant' }).click();
    // Step 2: fill teams
    dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('.p-select') })
      .first();
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
    const row = this.gamesPanel()
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
    await row.locator('[aria-label*="Supprimer"]').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  gameRow(team1Name: string, team2Name: string): Locator {
    return this.gamesPanel()
      .locator('.p-datatable-tbody tr')
      .filter({ hasText: team1Name })
      .filter({ hasText: team2Name });
  }

  async importYamlFixture(filePath: string): Promise<void> {
    await this.clickTab('Administration');
    const fileInput = this.page.locator('input[type="file"][accept=".yaml,.yml"]');
    await fileInput.setInputFiles(filePath);

    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Importer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Importer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });

    await this.page.locator('.p-toast-message').filter({ hasText: 'Import réussi' }).waitFor({
      state: 'visible',
      timeout: 30000,
    });
  }

  // --- Tournament deletion ---

  async deleteTournament(tournamentName: string): Promise<void> {
    // Navigate to administration tab to access delete tournament button
    await this.clickTab('Administration');

    // Wait for the admin panel to be visible
    const adminPanel = this.page.getByRole('tabpanel', { name: 'Administration' });
    await adminPanel.waitFor({ state: 'visible' });

    // Find and click the delete tournament button by its text
    const deleteButton = adminPanel.locator('p-button').filter({ hasText: 'Supprimer le tournoi' });
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();

    // Fill confirmation dialog
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#confirmationName') });
    await dialog.waitFor({ state: 'visible' });

    // Type tournament name to confirm
    const confirmationInput = dialog.locator('input#confirmationName');
    await confirmationInput.fill(tournamentName);

    // Click confirm button in the dialog
    const confirmButton = dialog
      .locator('p-button')
      .filter({ hasText: 'Supprimer définitivement' });
    await confirmButton.click();

    // Wait for deletion to complete (page should navigate to home)
    await this.page.waitForURL('/', { timeout: 15000 });
  }
}
