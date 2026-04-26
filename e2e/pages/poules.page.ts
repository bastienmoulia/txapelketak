import { type Locator, type Page } from '@playwright/test';

export class PoulesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private panel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Poules' });
  }

  // --- Read ---

  seriePanel(name: string): Locator {
    return this.panel().locator('p-accordion-panel').filter({ hasText: name });
  }

  poulesContainer(): Locator {
    return this.page.locator('.p-accordion, p-accordion');
  }

  warningMessage(): Locator {
    return this.panel().locator('p-message').filter({ hasText: 'série' });
  }

  async ensureSerieExpanded(serieName: string): Promise<void> {
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: serieName });
    await seriePanel.scrollIntoViewIfNeeded();
    const content = seriePanel.locator('p-accordion-content');
    const isVisible = await content.isVisible();
    if (!isVisible) {
      await seriePanel.locator('.p-accordionheader').click();
      await content.waitFor({ state: 'visible' });
    }
  }

  // --- Standings ---

  standingsTable(serieName: string, pouleName: string): Locator {
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: serieName });
    return seriePanel.locator('p-card').filter({ hasText: pouleName }).locator('.standings-table');
  }

  standingsRows(serieName: string, pouleName: string): Locator {
    return this.standingsTable(serieName, pouleName).locator('tbody tr');
  }

  // --- Admin actions ---

  async addSerie(name: string): Promise<void> {
    await this.panel().getByTestId('add-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#serie-name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#serie-name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editSerie(currentName: string, newName: string): Promise<void> {
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: currentName });
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
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: name });
    await seriePanel.getByTestId('delete-serie-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async addPoule(serieName: string, pouleName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: serieName });
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
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: currentPouleName });
    await pouleCard.scrollIntoViewIfNeeded();
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
    const seriePanel = this.panel().locator('p-accordion-panel').filter({ hasText: serieName });
    const pouleCard = seriePanel.locator('p-card').filter({ hasText: pouleName });
    await pouleCard.scrollIntoViewIfNeeded();
    await pouleCard.getByTestId('delete-poule-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }
}
