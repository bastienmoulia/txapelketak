import { type Locator, type Page } from '@playwright/test';

export class MainPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  themeButton(): Locator {
    return this.page.getByTestId('theme-button');
  }

  languageButton(): Locator {
    return this.page.getByTestId('language-button');
  }

  async selectDarkTheme(): Promise<void> {
    await this.themeButton().click();
    await this.page.getByText('Sombre', { exact: true }).click();
  }

  async selectEnglishLanguage(): Promise<void> {
    await this.languageButton().click();
    await this.page.getByText('English', { exact: true }).click();
  }

  htmlElement(): Locator {
    return this.page.locator('html');
  }

  heroSubtitleEnglish(): Locator {
    return this.page.getByText('Manage your tournaments simply and efficiently');
  }
}
