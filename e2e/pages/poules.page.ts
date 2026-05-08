import { expect, type Locator, type Page } from '@playwright/test';

export class PoulesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async ensurePoulesTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Poules' }).click();
  }

  private serieTab(name: string): Locator {
    return this.page.getByRole('tab', { name, exact: false });
  }

  private activeTabPanel(): Locator {
    return this.page.getByRole('tabpanel').first();
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
    await this.ensurePoulesTab();
    const serieTab = this.serieTab(serieName);
    await serieTab.click();
    await expect(serieTab).toHaveAttribute('aria-selected', 'true');
    await expect(this.activeTabPanel()).toBeVisible({ timeout: 10000 });
  }

  // --- Standings ---

  standingsTable(serieName: string, pouleName: string): Locator {
    const tabPanel = this.activeTabPanel();
    return tabPanel.locator('p-card').filter({ hasText: pouleName }).locator('.standings-table');
  }

  standingsRows(serieName: string, pouleName: string): Locator {
    return this.standingsTable(serieName, pouleName).locator('tbody tr');
  }

  // --- Admin actions ---

  async addSerie(name: string): Promise<void> {
    await this.ensurePoulesTab();
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
    await this.ensurePoulesTab();
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
    await this.ensurePoulesTab();
    const serieTab = this.serieTab(name);
    const deleteBtn = serieTab.getByTestId('delete-serie-button');
    await deleteBtn.click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async addPoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    await this.page.locator('[data-testid="add-poule-button"]:visible').first().click();
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
    const tabPanel = this.activeTabPanel();
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

  async deletePoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = this.activeTabPanel();
    const pouleCard = tabPanel.locator('p-card').filter({ hasText: pouleName });
    const deleteBtn = pouleCard.getByTestId('delete-poule-button');
    // Ensure the tab is selected and button is interactable
    await expect(async () => {
      await this.ensureSerieExpanded(serieName);
      await pouleCard.scrollIntoViewIfNeeded();
      await expect(deleteBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await deleteBtn.click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }
}
