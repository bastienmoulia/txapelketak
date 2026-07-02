import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideTranslocoTesting } from '../testing/transloco-testing.providers';
import { Faq } from './faq';

describe('Faq', () => {
  let component: Faq;
  let fixture: ComponentFixture<Faq>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Faq],
      providers: [provideRouter([]), providePrimeNG({}), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Faq);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the FAQ title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('FAQ');
  });

  it('should expose FAQ entries built from product features', () => {
    expect(component.items().length).toBe(7);
  });
});
