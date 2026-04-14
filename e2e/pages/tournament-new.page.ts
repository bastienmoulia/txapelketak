import { type Page } from '@playwright/test';

export class TournamentNewPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/tournaments/new');
  }

  async fillStep1(name: string, description?: string): Promise<void> {
    const nameInput = this.page.getByTestId('field-name');
    await nameInput.waitFor();
    await nameInput.fill(name);

    if (description !== undefined) {
      await this.page.getByTestId('field-description').fill(description);
    }
  }

  async goToNextStep(): Promise<void> {
    await this.page.getByTestId('btn-next').click();
  }

  async fillStep2(username: string, email: string): Promise<void> {
    await this.page.getByTestId('field-creator-username').fill(username);
    await this.page.getByTestId('field-creator-email').fill(email);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('btn-submit').click();
  }

  async getAdminUrl(): Promise<string> {
    const link = this.page.getByTestId('admin-link');
    await link.waitFor({ state: 'visible', timeout: 15000 });
    return (await link.getAttribute('href')) ?? '';
  }

  async isSuccessVisible(): Promise<boolean> {
    return this.page.getByTestId('success-state').isVisible();
  }
}
