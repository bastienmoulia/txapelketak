import { expect, test } from '@playwright/test';
import { MainPage } from './pages/main.page';

test('has title', async ({ page }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto();
  await expect(page).toHaveTitle(/Txapelketak/);
});

test('can switch theme to dark mode', async ({ page }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto();
  await mainPage.selectDarkTheme();

  await expect(mainPage.htmlElement()).toHaveClass(/app-dark/);
  await expect(page.evaluate(() => localStorage.getItem('txapelketak:theme-mode'))).resolves.toBe(
    'dark',
  );
});

test('can switch language to english', async ({ page }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto();
  await mainPage.selectEnglishLanguage();

  await expect(mainPage.htmlElement()).toHaveAttribute('lang', 'en');
  await expect(mainPage.heroSubtitleEnglish()).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('txapelketak:language'))).resolves.toBe(
    'en',
  );
});
