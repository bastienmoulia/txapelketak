import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TeamBulkDialog } from './team-bulk-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('TeamBulkDialog', () => {
  let component: TeamBulkDialog;
  let fixture: ComponentFixture<TeamBulkDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TeamBulkDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        { provide: DynamicDialogConfig, useValue: { data: {} } },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamBulkDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should not close when bulk names is empty', () => {
    component.bulkNames.set('');
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with parsed team names on save', () => {
    component.bulkNames.set('Team A\nTeam B\n\nTeam C');
    component.onSave();
    const result = mockRef.close.mock.calls[0][0];
    expect(result).toHaveLength(3);
    expect(result.map((t: { name: string }) => t.name)).toEqual(['Team A', 'Team B', 'Team C']);
  });
});
