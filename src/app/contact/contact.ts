import { Component, computed, inject, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import {
  ContactIssueRequest,
  ContactIssueResponse,
  FirebaseService,
} from '../shared/services/firebase.service';
import { Header } from '../shared/header/header';
import { ContactFormModel } from './contact.types';

const GITHUB_USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

function createInitialModel(): ContactFormModel {
  return {
    name: '',
    githubUsername: '',
    subject: '',
    message: '',
    website: '',
  };
}

@Component({
  selector: 'app-contact',
  imports: [
    Header,
    RouterLink,
    TranslocoModule,
    FormRoot,
    FormField,
    ButtonModule,
    FloatLabel,
    InputText,
    MessageModule,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly firebaseService = inject(FirebaseService);
  private readonly translocoService = inject(TranslocoService);

  readonly contactModel = signal<ContactFormModel>(createInitialModel());
  readonly submitError = signal<string | null>(null);
  readonly createdIssue = signal<ContactIssueResponse | null>(null);

  readonly contactForm = form(this.contactModel, (contact) => {
    required(contact.name);
    maxLength(contact.name, 80);
    maxLength(contact.githubUsername, 39);
    pattern(contact.githubUsername, GITHUB_USERNAME_PATTERN, {
      when: ({ value }) => value().trim().length > 0,
    });
    required(contact.subject);
    maxLength(contact.subject, 120);
    required(contact.message);
    minLength(contact.message, 10);
    maxLength(contact.message, 5000);
  });

  readonly isSubmitting = computed(() => this.contactForm().submitting());

  async onSubmit(): Promise<void> {
    this.submitError.set(null);
    this.createdIssue.set(null);
    this.contactForm().markAsTouched();

    try {
      const success = await submit(this.contactForm, async (formState) => {
        const result = await this.firebaseService.createContactIssue(
          this.buildPayload(formState().value()),
        );
        this.createdIssue.set(result);
      });

      if (!success) {
        return;
      }

      this.contactModel.set(createInitialModel());
      this.contactForm().reset();
    } catch (error) {
      console.error('Contact submission failed', error);
      this.submitError.set(this.extractSubmitErrorMessage(error));
    }
  }

  onReset(): void {
    this.contactModel.set(createInitialModel());
    this.contactForm().reset();
    this.submitError.set(null);
    this.createdIssue.set(null);
  }

  showFieldError(field: FieldTree<unknown>): boolean {
    return field().touched() && field().errors().length > 0;
  }

  fieldErrorMessage(field: FieldTree<unknown>): string {
    const error = field().errors()[0];

    if (!error) {
      return '';
    }

    if (error.message) {
      return error.message;
    }

    switch (error.kind) {
      case 'required':
        return this.translocoService.translate('contact.form.errors.required');
      case 'minLength':
        return this.translocoService.translate('contact.form.errors.minLength', {
          count: this.readNumericErrorDetail(error, 'minLength'),
        });
      case 'maxLength':
        return this.translocoService.translate('contact.form.errors.maxLength', {
          count: this.readNumericErrorDetail(error, 'maxLength'),
        });
      case 'pattern':
        return this.translocoService.translate('contact.form.errors.githubUsername');
      default:
        return this.translocoService.translate('contact.form.errors.invalid');
    }
  }

  private buildPayload(model: ContactFormModel): ContactIssueRequest {
    return {
      name: model.name.trim(),
      githubUsername: model.githubUsername.trim() || undefined,
      subject: model.subject.trim(),
      message: model.message.trim(),
      locale: this.translocoService.getActiveLang(),
      website: model.website,
    };
  }

  private extractSubmitErrorMessage(error: unknown): string {
    const details = this.readErrorDetails(error);

    switch (details.code) {
      case 'functions/unavailable':
        return this.translocoService.translate('contact.form.submitUnavailable');
      case 'functions/permission-denied':
      case 'functions/failed-precondition':
      case 'functions/invalid-argument':
      case 'functions/internal':
        return details.message || this.translocoService.translate('contact.form.submitError');
      default:
        return details.message || this.translocoService.translate('contact.form.submitError');
    }
  }

  private readErrorDetails(error: unknown): { code?: string; message?: string } {
    if (!error || typeof error !== 'object') {
      return {};
    }

    const details = error as Record<string, unknown>;
    const code = typeof details['code'] === 'string' ? details['code'] : undefined;
    const rawMessage = typeof details['message'] === 'string' ? details['message'] : undefined;

    return {
      code,
      message: this.normalizeErrorMessage(rawMessage),
    };
  }

  private normalizeErrorMessage(message: string | undefined): string | undefined {
    if (!message) {
      return undefined;
    }

    return message
      .replace(/^FirebaseError:\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .trim();
  }

  private readNumericErrorDetail(error: object, key: 'minLength' | 'maxLength'): number {
    const details = error as Record<string, unknown>;

    if (key in details) {
      const value = details[key];
      if (typeof value === 'number') {
        return value;
      }
    }

    return 0;
  }
}
