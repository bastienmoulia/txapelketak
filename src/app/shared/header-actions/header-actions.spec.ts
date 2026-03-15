import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

import { HeaderActions } from './header-actions';

function createMatchMedia(width: number): typeof window.matchMedia {
  return ((query: string) => {
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    if (maxWidthMatch) {
      const breakpoint = Number(maxWidthMatch[1]);
      return {
        media: query,
        matches: width <= breakpoint,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => true,
      } as MediaQueryList;
    }

    return {
      media: query,
      matches: false,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMedia(width),
  });
}

describe('HeaderActions', () => {
  let component: HeaderActions;
  let fixture: ComponentFixture<HeaderActions>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    setViewportWidth(1024);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderActions],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderActions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render two action buttons with current labels', () => {
    fixture.detectChanges();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Auto');
    expect(buttons[1].textContent).toContain('Français');
  });

  it('should show 2-character label on language button when mobile', () => {
    setViewportWidth(375);
    const mobileFixture = TestBed.createComponent(HeaderActions);
    mobileFixture.detectChanges();

    const buttons = Array.from(
      mobileFixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];

    expect(buttons[1].textContent).toContain('FR');
    expect(buttons[1].textContent).not.toContain('Français');
  });

  it('should adapt language label depending on viewport width', () => {
    const cases = [
      { width: 1024, expected: 'Français', unexpected: 'FR' },
      { width: 640, expected: 'FR', unexpected: 'Français' },
      { width: 375, expected: 'FR', unexpected: 'Français' },
    ];

    for (const testCase of cases) {
      setViewportWidth(testCase.width);
      const viewportFixture = TestBed.createComponent(HeaderActions);
      viewportFixture.detectChanges();

      const buttons = Array.from(
        viewportFixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];

      expect(buttons[1].textContent).toContain(testCase.expected);
      expect(buttons[1].textContent).not.toContain(testCase.unexpected);

      viewportFixture.destroy();
    }
  });

  it('should initialize dark mode from localStorage', async () => {
    localStorage.setItem('txapelketak:theme-mode', 'dark');

    const darkFixture = TestBed.createComponent(HeaderActions);
    darkFixture.detectChanges();
    await darkFixture.whenStable();

    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });
});
