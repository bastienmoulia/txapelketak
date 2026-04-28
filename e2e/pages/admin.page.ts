import { type Locator, type Page } from '@playwright/test';
import { TournamentBasePage } from './tournament-base.page';

export class AdminPage extends TournamentBasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(adminUrl: string): Promise<void> {
    await this.gotoAdmin(adminUrl);
  }

  private adminPanel(): Locator {
    return this.page.locator('p-tabpanel[value="administration"]');
  }

  // --- Users ---

  async addUser(username: string, email: string, role: 'admin' | 'organizer'): Promise<void> {
    await this.adminPanel().getByTestId('add-user-button').click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#username') });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input#username').fill(username);
    await dialog.locator('input#email').fill(email);
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
    await this.adminPanel().getByTestId('add-user-button').click();
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
    const row = this.adminPanel()
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
    const row = this.adminPanel().locator('.p-datatable-tbody tr').filter({ hasText: username });
    await row.locator('button').filter({ hasText: 'Supprimer' }).click();
    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('button').filter({ hasText: 'Supprimer' }) });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button').filter({ hasText: 'Supprimer' }).last().click();
    await dialog.waitFor({ state: 'hidden' });
  }

  userRow(username: string): Locator {
    return this.adminPanel().locator('.p-datatable-tbody tr').filter({ hasText: username });
  }

  private async selectRole(dialog: Locator, role: 'admin' | 'organizer'): Promise<void> {
    const roleLabel = role === 'admin' ? 'Administrateur' : 'Organisateur';
    await dialog.locator('.p-select').click();
    await this.page
      .locator('.p-select-overlay .p-select-option')
      .filter({ hasText: roleLabel })
      .click();
  }

  // --- Import / Export ---

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

    // Use .first() to avoid strict mode violation: multiple success toasts may be present
    // (e.g. "tournament validated" toast alongside the "Import réussi" toast).
    await this.page
      .locator('.p-toast-message')
      .filter({ hasText: 'Import réussi' })
      .first()
      .waitFor({
        state: 'visible',
        timeout: 30000,
      });
  }

  async exportYaml(): Promise<string> {
    await this.clickTab('Administration');
    const panel = this.adminPanel();
    await panel.waitFor({ state: 'visible' });

    const downloadPromise = this.page.waitForEvent('download');
    await panel.locator('p-button').filter({ hasText: 'Télécharger' }).click();
    const download = await downloadPromise;

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  // --- Tournament deletion ---

  async deleteTournament(tournamentName: string): Promise<void> {
    await this.clickTab('Administration');

    const panel = this.adminPanel();
    await panel.waitFor({ state: 'visible' });

    const deleteButton = panel.locator('p-button').filter({ hasText: 'Supprimer le tournoi' });
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();

    const dialog = this.page
      .locator('.p-dialog')
      .filter({ has: this.page.locator('input#confirmationName') });
    await dialog.waitFor({ state: 'visible' });

    const confirmationInput = dialog.locator('input#confirmationName');
    await confirmationInput.fill(tournamentName);

    const confirmButton = dialog
      .locator('p-button')
      .filter({ hasText: 'Supprimer définitivement' });
    await confirmButton.click();

    await this.page.waitForURL('/', { timeout: 15000 });
  }
}
