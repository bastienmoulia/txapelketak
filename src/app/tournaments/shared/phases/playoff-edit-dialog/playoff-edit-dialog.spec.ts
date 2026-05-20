import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { PlayoffEditDialog } from './playoff-edit-dialog';

describe('PlayoffEditDialog', () => {
  let component: PlayoffEditDialog;
  let fixture: ComponentFixture<PlayoffEditDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const playoffRef = { id: 'playoff-1' } as DocumentReference;

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PlayoffEditDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              playoff: {
                ref: playoffRef,
                name: 'Playoff A',
                orderedTeamRefs: [],
                size: 2,
                hiddenFromVisitors: true,
              },
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayoffEditDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize fields from playoff', () => {
    expect(component.playoffName()).toBe('Playoff A');
    expect(component.hiddenFromVisitors()).toBe(true);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should close with delete action on delete', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });

  it('should close with playoff data on save', () => {
    component.playoffName.set('Playoff B');
    component.hiddenFromVisitors.set(false);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith({
      ref: playoffRef,
      name: 'Playoff B',
      hiddenFromVisitors: false,
    });
  });

  it('should allow saving with empty playoff name', () => {
    component.playoffName.set('   ');
    component.hiddenFromVisitors.set(true);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith({
      ref: playoffRef,
      name: '',
      hiddenFromVisitors: true,
    });
  });
});
