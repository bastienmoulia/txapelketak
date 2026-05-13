import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

import { FinaleGameFormDialog } from './finale-game-form-dialog';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('FinaleGameFormDialog', () => {
  let component: FinaleGameFormDialog;
  let fixture: ComponentFixture<FinaleGameFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinaleGameFormDialog],
      providers: [
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              teams: [],
              role: '',
              isEditing: false,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinaleGameFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
