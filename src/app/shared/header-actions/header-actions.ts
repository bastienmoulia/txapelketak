import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

type ThemeMode = 'light' | 'dark' | 'auto';
type LanguageCode = 'fr';

@Component({
  selector: 'app-header-actions',
  imports: [ButtonModule, MenuModule],
  templateUrl: './header-actions.html',
  styleUrl: './header-actions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderActions {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeStorageKey = 'txapelketak:theme-mode';
  private readonly languageStorageKey = 'txapelketak:language';
  private readonly mobileBreakpoint = '(max-width: 640px)';

  private mediaQuery?: MediaQueryList;
  private mobileMediaQuery?: MediaQueryList;

  themeMode = signal<ThemeMode>(this.readThemeMode());
  language = signal<LanguageCode>(this.readLanguage());
  isMobile = signal<boolean>(false);

  themeLabel = computed(() => {
    switch (this.themeMode()) {
      case 'light':
        return 'Clair';
      case 'dark':
        return 'Sombre';
      default:
        return 'Auto';
    }
  });

  themeIcon = computed(() => {
    switch (this.themeMode()) {
      case 'light':
        return 'pi pi-sun';
      case 'dark':
        return 'pi pi-moon';
      default:
        return 'pi pi-desktop';
    }
  });

  languageLabel = computed(() => 'Français');

  languageCode = computed(() => this.language().toUpperCase());

  themeItems = computed<MenuItem[]>(() => [
    {
      label: 'Clair',
      icon: 'pi pi-sun',
      command: () => this.setThemeMode('light'),
    },
    {
      label: 'Sombre',
      icon: 'pi pi-moon',
      command: () => this.setThemeMode('dark'),
    },
    {
      label: 'Auto',
      icon: 'pi pi-desktop',
      command: () => this.setThemeMode('auto'),
    },
  ]);

  languageItems = computed<MenuItem[]>(() => [
    {
      label: 'Français',
      icon: 'pi pi-language',
      command: () => this.setLanguage('fr'),
    },
  ]);

  constructor() {
    this.initializeThemeHandling();
    this.initializeMobileDetection();
    this.applyLanguage();
  }

  toggleMenu(menu: { toggle: (event: Event) => void }, event: Event): void {
    menu.toggle(event);
  }

  private setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    this.persistValue(this.themeStorageKey, mode);
    this.applyTheme();
  }

  private setLanguage(language: LanguageCode): void {
    this.language.set(language);
    this.persistValue(this.languageStorageKey, language);
    this.applyLanguage();
  }

  private initializeMobileDetection(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.mobileMediaQuery = window.matchMedia?.(this.mobileBreakpoint);
    this.isMobile.set(Boolean(this.mobileMediaQuery?.matches));

    const handleMobileChange = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
    this.mobileMediaQuery?.addEventListener?.('change', handleMobileChange);
    this.destroyRef.onDestroy(() => {
      this.mobileMediaQuery?.removeEventListener?.('change', handleMobileChange);
    });
  }

  private initializeThemeHandling(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    this.applyTheme();

    const handlePreferenceChange = () => {
      if (this.themeMode() === 'auto') {
        this.applyTheme();
      }
    };

    this.mediaQuery?.addEventListener?.('change', handlePreferenceChange);
    this.destroyRef.onDestroy(() => {
      this.mediaQuery?.removeEventListener?.('change', handlePreferenceChange);
    });
  }

  private applyTheme(): void {
    const shouldUseDarkMode =
      this.themeMode() === 'dark' ||
      (this.themeMode() === 'auto' && Boolean(this.mediaQuery?.matches));

    this.document.documentElement.classList.toggle('app-dark', shouldUseDarkMode);
  }

  private applyLanguage(): void {
    this.document.documentElement.lang = this.language();
  }

  private readThemeMode(): ThemeMode {
    const value = this.readStoredValue(this.themeStorageKey);

    return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
  }

  private readLanguage(): LanguageCode {
    return this.readStoredValue(this.languageStorageKey) === 'fr' ? 'fr' : 'fr';
  }

  private readStoredValue(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  }

  private persistValue(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  }
}
