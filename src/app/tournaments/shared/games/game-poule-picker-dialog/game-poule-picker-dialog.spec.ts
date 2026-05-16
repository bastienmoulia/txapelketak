import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GamePoulePickerDialog } from './game-poule-picker-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentReference } from '@angular/fire/firestore';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { Poule, Serie } from '../../../models';

describe('GamePoulePickerDialog', () => {
  let component: GamePoulePickerDialog;
  let fixture: ComponentFixture<GamePoulePickerDialog>;
  let mockConfig: DynamicDialogConfig;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const serieRef = { id: 'serie-1' } as DocumentReference;
    const poule1Ref = { id: 'poule-1' } as DocumentReference;
    const poule2Ref = { id: 'poule-2' } as DocumentReference;

    mockConfig = {
      data: {
        series: [
          {
            ref: serieRef,
            name: 'Serie A',
            poules: [
              { ref: poule1Ref, name: 'Poule A', refTeams: [] } as Poule,
              { ref: poule2Ref, name: 'Poule B', refTeams: [] } as Poule,
            ],
          } as Serie,
        ],
      },
    } as DynamicDialogConfig;

    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GamePoulePickerDialog],
      providers: [
        { provide: DynamicDialogConfig, useValue: mockConfig },
        { provide: DynamicDialogRef, useValue: mockRef },
        ...provideTranslocoTesting(),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GamePoulePickerDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable next button when serie is not selected', () => {
    expect(component.isNextDisabled()).toBe(true);
  });

  it('should disable next button when poule is not selected', () => {
    const serie = mockConfig.data.series[0];
    component.selectedSerie.set(serie);

    expect(component.isNextDisabled()).toBe(true);
  });

  it('should enable next button when both serie and poule are selected', () => {
    const serie = mockConfig.data.series[0];
    const poule = serie.poules[0];
    component.selectedSerie.set(serie);
    component.selectedPoule.set(poule);

    expect(component.isNextDisabled()).toBe(false);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();

    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should return selected poule on next', () => {
    const serie = mockConfig.data.series[0];
    const poule = serie.poules[0];
    component.selectedSerie.set(serie);
    component.selectedPoule.set(poule);

    component.onNext();

    expect(mockRef.close).toHaveBeenCalledWith(poule);
  });
});
