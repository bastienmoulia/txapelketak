import { type Locator, type Page } from '@playwright/test';

export class TeamsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async ensureTeamsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Équipes' }).click();
  }

  teamRow(name: string): Locator {
    return this.page.locator('.p-datatable-tbody tr').filter({ hasText: name });
  }

  async hasTeam(name: string): Promise<boolean> {
    await this.ensureTeamsTab();
    return (await this.teamRow(name).count()) > 0;
  }

  // --- Admin actions ---

  async addTeam(name: string): Promise<void> {
    await this.ensureTeamsTab();
    await this.page.getByTestId('add-team-button').click();
    const dialog = this.page.locator('.p-dialog').filter({ has: this.page.locator('input#name') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#name').fill(name);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async editTeam(currentName: string, newName: string): Promise<void> {
    await this.ensureTeamsTab();
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: currentName });
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
    await this.ensureTeamsTab();
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: name });
    await row.getByTestId('delete-team-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  teamCommentButton(name: string): Locator {
    return this.teamRow(name).getByTestId('team-comment-button');
  }

  async editTeamComment(name: string, newComment: string): Promise<void> {
    await this.ensureTeamsTab();
    const row = this.page.locator('.p-datatable-tbody tr').filter({ hasText: name });
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
    const commentTextarea = dialog.locator('textarea#teamComment');
    await commentTextarea.clear();
    if (newComment) {
      await commentTextarea.fill(newComment);
    }
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
  }
}
