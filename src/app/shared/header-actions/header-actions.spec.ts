import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderActions } from './header-actions';

describe('HeaderActions', () => {
  let component: HeaderActions;
  let fixture: ComponentFixture<HeaderActions>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderActions],
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

  it('should initialize dark mode from localStorage', async () => {
    localStorage.setItem('txapelketak:theme-mode', 'dark');

    const darkFixture = TestBed.createComponent(HeaderActions);
    darkFixture.detectChanges();
    await darkFixture.whenStable();

    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });
});
