import { expect, type Locator, type Page } from '@playwright/test';

export class PhasesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async ensurePhasesTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Phases' }).click();
  }

  private serieTab(name: string): Locator {
    return this.page.getByRole('tab', { name, exact: false });
  }

  private async serieTabPanel(name: string): Promise<Locator> {
    const tab = this.serieTab(name);
    const controls = await tab.getAttribute('aria-controls');
    if (!controls) {
      throw new Error(`Unable to resolve tab panel for serie: ${name}`);
    }
    return this.page.locator(`#${controls}`);
  }

  // --- Read ---

  /**
   * Returns the tab panel content for a given serie name.
   * With the tab-based UI, this returns the serie tab itself.
   */
  seriePanel(name: string): Locator {
    return this.serieTab(name);
  }

  poulesContainer(): Locator {
    return this.page.locator('p-tabs');
  }

  warningMessage(): Locator {
    return this.page.locator('p-message').filter({ hasText: 'série' });
  }

  async ensureSerieExpanded(serieName: string): Promise<void> {
    await this.ensurePhasesTab();
    const serieTab = this.serieTab(serieName);
    // Click the label text to avoid hitting edit/delete icon buttons embedded in the tab.
    await serieTab.getByText(serieName, { exact: false }).first().click();
    const tabPanel = await this.serieTabPanel(serieName);
    await expect(tabPanel).toBeVisible({ timeout: 10000 });
  }

  async pouleCard(serieName: string, pouleName: string): Promise<Locator> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    return tabPanel.locator('p-card').filter({ hasText: pouleName });
  }

  // --- Standings ---

  standingsTable(serieName: string, pouleName: string): Locator {
    const tabPanel = this.page.locator('p-tabpanel:visible').first();
    return tabPanel.locator('p-card').filter({ hasText: pouleName }).locator('.standings-table');
  }

  standingsRows(serieName: string, pouleName: string): Locator {
    return this.standingsTable(serieName, pouleName).locator('tbody tr');
  }

  // --- Admin actions ---

  async addSerie(name: string): Promise<void> {
    await this.ensurePhasesTab();
    await this.page.getByTestId('add-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#serie-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#serie-name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editSerie(currentName: string, newName: string): Promise<void> {
    await this.ensurePhasesTab();
    const serieTab = this.serieTab(currentName);
    const editBtn = serieTab.getByTestId('edit-serie-button');
    await editBtn.click();
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
    await this.ensurePhasesTab();
    const serieTab = this.serieTab(name);
    const editBtn = serieTab.getByTestId('edit-serie-button');
    await editBtn.click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#serie-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-serie-button').click();
    const confirmDialog = this.page.getByRole('alertdialog', {
      name: 'Confirmer la suppression',
    });
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  async addPoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    await tabPanel.locator('[data-testid="add-poule-button"] button').click();
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
    const tabPanel = await this.serieTabPanel(serieName);
    const pouleCard = tabPanel.locator('p-card').filter({ hasText: currentPouleName });
    const editBtn = pouleCard.getByTestId('edit-poule-button');
    // Ensure the tab is selected and button is interactable
    await expect(async () => {
      await this.ensureSerieExpanded(serieName);
      await pouleCard.scrollIntoViewIfNeeded();
      await expect(editBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await editBtn.click();
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

  async addTeamToPouleFromModal(
    serieName: string,
    pouleName: string,
    teamName: string,
  ): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    const pouleCard = tabPanel.locator('p-card').filter({ hasText: pouleName });
    const editBtn = pouleCard.getByTestId('edit-poule-button');
    await editBtn.click();

    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#poule-name') });
    await dialog.waitFor({ state: 'visible' });

    await dialog.locator('p-select[name="team-select"] .p-select-dropdown').click();
    await this.page.locator('.p-select-overlay').getByText(teamName, { exact: true }).click();
    await dialog.getByTestId('dialog-add-team-button').click();

    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async removeTeamFromPouleFromModal(
    serieName: string,
    pouleName: string,
    teamName: string,
  ): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    const pouleCard = tabPanel.locator('p-card').filter({ hasText: pouleName });
    const editBtn = pouleCard.getByTestId('edit-poule-button');
    await editBtn.click();

    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#poule-name') });
    await dialog.waitFor({ state: 'visible' });

    const teamRow = dialog
      .getByTestId('dialog-team-list')
      .locator('div')
      .filter({ hasText: teamName })
      .first();
    await teamRow.getByTestId('dialog-remove-team-button').click();

    const confirmDialog = this.page.getByRole('alertdialog', {
      name: 'Confirmer la suppression',
    });
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await confirmDialog.waitFor({ state: 'hidden' });

    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deletePoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    const pouleCard = tabPanel.locator('p-card').filter({ hasText: pouleName });
    const editBtn = pouleCard.getByTestId('edit-poule-button');
    // Ensure the tab is selected and button is interactable
    await expect(async () => {
      await this.ensureSerieExpanded(serieName);
      await pouleCard.scrollIntoViewIfNeeded();
      await expect(editBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await editBtn.click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#poule-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-poule-button').click();
    const confirmDialog = this.page.getByRole('alertdialog', {
      name: 'Confirmer la suppression',
    });
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }
}
