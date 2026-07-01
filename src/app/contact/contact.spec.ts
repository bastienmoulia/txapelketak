import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { vi } from 'vitest';
import { provideTranslocoTesting } from '../testing/transloco-testing.providers';
import { Contact } from './contact';
import { FirebaseService } from '../shared/services/firebase.service';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;
  let firebaseService: Pick<FirebaseService, 'createContactIssue'>;

  beforeEach(async () => {
    firebaseService = {
      createContactIssue: vi.fn().mockResolvedValue({
        issueNumber: 42,
        issueUrl: 'https://github.com/bastienmoulia/txapelketak/issues/42',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        provideRouter([]),
        providePrimeNG({}),
        ...provideTranslocoTesting(),
        { provide: FirebaseService, useValue: firebaseService as FirebaseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit an invalid form', async () => {
    await component.onSubmit();

    expect(firebaseService.createContactIssue).not.toHaveBeenCalled();
    expect(component.showFieldError(component.contactForm.name)).toBe(true);
  });

  it('should submit a valid signal form', async () => {
    component.contactForm.name().value.set('Alice');
    component.contactForm.githubUsername().value.set('alice-dev');
    component.contactForm.subject().value.set('Besoin d’aide');
    component.contactForm.message().value.set('Bonjour, je voudrais comprendre l’export YAML.');

    await component.onSubmit();

    expect(firebaseService.createContactIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alice',
        githubUsername: 'alice-dev',
        subject: 'Besoin d’aide',
      }),
    );
    expect(component.createdIssue()?.issueNumber).toBe(42);
  });

  it('should expose a useful backend error message', async () => {
    firebaseService.createContactIssue = vi
      .fn()
      .mockRejectedValue(new Error('GITHUB_CONTACT_TOKEN is not configured in Firebase Functions'));

    component.contactForm.name().value.set('Alice');
    component.contactForm.subject().value.set('Besoin d’aide');
    component.contactForm.message().value.set('Bonjour, je voudrais comprendre l’export YAML.');

    await component.onSubmit();

    expect(component.submitError()).toContain('GITHUB_CONTACT_TOKEN is not configured');
  });
});
