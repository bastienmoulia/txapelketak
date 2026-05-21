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

  async serieTabPanel(name: string): Promise<Locator> {
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

    const teamMultiSelect = dialog.locator('p-multiselect[name="team-select"]');
    await teamMultiSelect.click();

    const overlay = this.page.locator('.p-multiselect-overlay:visible').last();
    await expect(overlay).toBeVisible();
    await overlay.getByText(teamName, { exact: true }).first().click();

    const addTeamButton = dialog.getByTestId('dialog-add-team-button');
    await expect(addTeamButton).toBeEnabled();
    await addTeamButton.click();

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

  // --- Playoffs ---

  playoffCard(serieName: string, playoffName: string): Locator {
    const tabPanel = this.page.locator('p-tabpanel:visible').first();
    return tabPanel.locator('p-card').filter({ hasText: playoffName });
  }

  async addPlayoffs(serieName: string, playoffName: string, teamNames: string[]): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    await tabPanel.getByTestId('add-playoffs-button').click();

    const dialog = this.page.locator('.p-dynamic-dialog, .p-dialog').last();
    await dialog.waitFor({ state: 'visible' });

    // Fill name
    await dialog.locator('input#playoffs-name').fill(playoffName);

    // Add each team and verify it appears in the order list before proceeding.
    const orderList = dialog.getByTestId('playoffs-dialog-order-list');
    for (const teamName of teamNames) {
      const multiSelect = dialog.locator('p-multiselect[name="team-select"]');
      await multiSelect.click();

      const overlay = this.page.locator('.p-multiselect-overlay:visible').last();
      await expect(overlay).toBeVisible();

      const filterInput = overlay.locator('input.p-multiselect-filter');
      const hasFilter = (await filterInput.count()) > 0;
      if (hasFilter) {
        await filterInput.fill(teamName);
      }

      // PrimeNG multiselect options may render with different internal markup.
      const roleOption = overlay.getByRole('option', { name: teamName, exact: true });
      let option =
        (await roleOption.count()) > 0
          ? roleOption.first()
          : overlay.locator('.p-multiselect-option').filter({ hasText: teamName }).first();

      // Fallback: some renders fail to refresh filtered options immediately.
      if (!(await option.isVisible().catch(() => false)) && hasFilter) {
        await filterInput.fill('');
        const fallbackRoleOption = overlay.getByRole('option', { name: teamName, exact: true });
        option =
          (await fallbackRoleOption.count()) > 0
            ? fallbackRoleOption.first()
            : overlay.locator('.p-multiselect-option').filter({ hasText: teamName }).first();
      }

      await expect(option).toBeVisible();
      await option.click({ force: true });

      await dialog.getByTestId('playoffs-dialog-add-team-button').click();
      await expect(orderList.getByText(teamName, { exact: true })).toBeVisible({ timeout: 5000 });
      await this.page.keyboard.press('Escape');
    }

    // Go to step 2
    await dialog.getByTestId('playoffs-dialog-next-button').click();
    await expect(dialog.getByTestId('playoffs-dialog-bracket-preview')).toBeVisible({
      timeout: 10000,
    });
    // Save
    await dialog.getByTestId('playoffs-dialog-save-button').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async deletePlayoff(serieName: string, playoffName: string): Promise<void> {
    await this.ensureSerieExpanded(serieName);
    const tabPanel = await this.serieTabPanel(serieName);
    const card = tabPanel.locator('p-card').filter({ hasText: playoffName });
    const editBtn = card.getByTestId('edit-playoff-button');
    const innerButton = editBtn.locator('button');
    if ((await innerButton.count()) > 0) {
      await innerButton.first().scrollIntoViewIfNeeded();
      await innerButton.first().click({ force: true });
    } else {
      await editBtn.click();
    }

    const dialog = this.page.locator('.p-dynamic-dialog, .p-dialog').last();
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByTestId('delete-playoff-button').click();

    const roleDialog = this.page
      .getByRole('alertdialog')
      .filter({ has: this.page.locator('button') })
      .last();
    const primeDialog = this.page.locator('.p-confirmdialog:visible').last();

    let confirmDialog: Locator;
    try {
      await roleDialog.waitFor({ state: 'visible', timeout: 2500 });
      confirmDialog = roleDialog;
    } catch {
      try {
        await expect(primeDialog).toBeVisible({ timeout: 2500 });
        confirmDialog = primeDialog;
      } catch {
        // Some UI flows may delete immediately without a confirm dialog.
        return;
      }
    }

    const acceptByClass = confirmDialog
      .locator('.p-confirmdialog-accept-button, .p-confirm-dialog-accept, .p-button-danger')
      .first();

    if ((await acceptByClass.count()) > 0) {
      await acceptByClass.click();
    } else {
      const acceptByLabel = confirmDialog
        .getByRole('button', { name: /Supprimer|Confirmer|Delete|Confirm/i })
        .first();
      if ((await acceptByLabel.count()) > 0) {
        await acceptByLabel.click();
      } else {
        await confirmDialog.locator('button').last().click();
      }
    }
    await confirmDialog.waitFor({ state: 'hidden' });

    // Depending on the UI flow, the edit dialog may close immediately on delete click
    // or only after confirming deletion.
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  playoffMatchCard(playoffName: string, matchLabel: string): Locator {
    return this.page.locator('.playoff-match-card').filter({ hasText: matchLabel });
  }

  playoffMatchCardByTeams(playoffName: string, teamA: string, teamB: string): Locator {
    const playoffCard = this.page.locator('p-card').filter({ hasText: playoffName }).first();
    return playoffCard.locator('.playoff-match-card').filter({ hasText: teamA }).filter({ hasText: teamB });
  }

  async editPlayoffMatch(
    playoffName: string,
    matchLabel: string,
    scoreTeam1: number,
    scoreTeam2: number,
  ): Promise<void> {
    const matchCard = this.playoffMatchCard(playoffName, matchLabel);
    await matchCard.scrollIntoViewIfNeeded();
    await matchCard.getByTestId('playoff-match-edit-button').click();

    const dialog = this.page.locator('.p-dialog').last();
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input[name="scoreTeam1"], #scoreTeam1').fill(String(scoreTeam1));
    await dialog.locator('input[name="scoreTeam2"], #scoreTeam2').fill(String(scoreTeam2));
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async setPlayoffMatchByeByTeams(
    playoffName: string,
    teamA: string,
    teamB: string,
  ): Promise<void> {
    const matchCard = this.playoffMatchCardByTeams(playoffName, teamA, teamB).first();
    await expect(matchCard).toBeVisible({ timeout: 15000 });
    await matchCard.scrollIntoViewIfNeeded();
    await matchCard.getByTestId('playoff-match-edit-button').click();

    const dialog = this.page.locator('.p-dialog').last();
    await dialog.waitFor({ state: 'visible' });

    const byeToggleLabel = dialog.locator('label[for="gameIsBye"]');
    await expect(byeToggleLabel).toBeVisible({ timeout: 5000 });
    await byeToggleLabel.click();

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
