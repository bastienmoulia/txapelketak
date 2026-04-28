import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TournamentNew } from './tournament-new';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

describe('TournamentNew', () => {
  let component: TournamentNew;
  let fixture: ComponentFixture<TournamentNew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentNew],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentNew);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1', () => {
    expect(component.currentStep()).toBe(0);
  });

  it('should have 2 steps', () => {
    expect(component.steps().length).toBe(2);
  });

  it('should have 1 tournament type options', () => {
    expect(component.typeOptions().length).toBe(1);
  });

  it('should mark step 1 as invalid when name is empty', () => {
    component.form.get('name')?.setValue('');
    expect(component.isStep1Valid()).toBe(false);
  });

  it('should mark step 1 as valid when name is filled', () => {
    component.form.get('name')?.setValue('Mon Tournoi');
    expect(component.isStep1Valid()).toBe(true);
  });

  it('should keep markdown text in description control', () => {
    const markdown = '## Titre\n\n- item';
    component.form.get('description')?.setValue(markdown);
    expect(component.form.get('description')?.value).toBe(markdown);
  });

  it('should not advance to step 2 when name is empty', () => {
    component.form.get('name')?.setValue('');
    component.nextStep();
    expect(component.currentStep()).toBe(0);
  });

  it('should advance to step 2 when name is filled', () => {
    component.form.get('name')?.setValue('Mon Tournoi');
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it('should go back to step 1 from step 2', () => {
    component.form.get('name')?.setValue('Mon Tournoi');
    component.nextStep();
    expect(component.currentStep()).toBe(1);
    component.previousStep();
    expect(component.currentStep()).toBe(0);
  });

  it('should not go below step 0 when calling previousStep', () => {
    component.previousStep();
    expect(component.currentStep()).toBe(0);
  });

  it('should default tournament type to poules', () => {
    expect(component.form.get('type')?.value).toBe('poules');
  });

  it('should mark step 2 as invalid when creator info is empty', () => {
    expect(component.isStep2Valid()).toBe(false);
  });

  it('should mark step 2 as valid when creator info is filled', () => {
    component.form.get('creatorUsername')?.setValue('MonPseudo');
    component.form.get('creatorEmail')?.setValue('test@example.com');
    expect(component.isStep2Valid()).toBe(true);
  });

  it('should mark step 2 as invalid when email is not valid', () => {
    component.form.get('creatorUsername')?.setValue('MonPseudo');
    component.form.get('creatorEmail')?.setValue('not-an-email');
    expect(component.isStep2Valid()).toBe(false);
  });

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(component.submitted()).toBe(false);
  });

  it('should submit when form is valid and show success state', () => {
    component.form.get('name')?.setValue('Mon Tournoi');
    component.form.get('type')?.setValue('poules');
    component.form.get('creatorUsername')?.setValue('MonPseudo');
    component.form.get('creatorEmail')?.setValue('test@example.com');
    component.onSubmit();
    expect(component.submitted()).toBe(true);
  });
});
