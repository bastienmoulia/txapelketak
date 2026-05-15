import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';
import { AuthStore } from '../../../store/auth.store';
import { PoulesStore } from '../../../store/poules.store';
import { TournamentActionsService } from '../../../shared/services/tournament-actions.service';
import { Phases } from './phases';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('Phases', () => {
  let component: Phases;
  let fixture: ComponentFixture<Phases>;
  let poulesStore: InstanceType<typeof PoulesStore>;
  let authStore: InstanceType<typeof AuthStore>;
  let mockTournamentActions: {
    saveSerie: ReturnType<typeof vi.fn>;
    deleteSerie: ReturnType<typeof vi.fn>;
    savePoule: ReturnType<typeof vi.fn>;
    addTeamToPouleSilent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockTournamentActions = {
      saveSerie: vi.fn(),
      deleteSerie: vi.fn(),
      savePoule: vi.fn(),
      addTeamToPouleSilent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Phases],
      providers: [
        ...provideTranslocoTesting(),
        { provide: TournamentActionsService, useValue: mockTournamentActions },
      ],
    }).compileComponents();

    poulesStore = TestBed.inject(PoulesStore);
    authStore = TestBed.inject(AuthStore);

    fixture = TestBed.createComponent(Phases);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default active serie to first sorted serie', async () => {
    poulesStore.patchSeries([
      { ref: createRef('serie-b'), name: 'Serie B', poules: [] },
      { ref: createRef('serie-a'), name: 'Serie A', poules: [] },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.activeSerie()).toBe('serie-a');
  });

  it('should call savePoule and add teams when adding poule from dialog', async () => {
    const serieRef = createRef('serie-1');
    const teamRef = createRef('team-1');
    const createdPouleRef = createRef('poule-1');

    mockTournamentActions.savePoule.mockResolvedValue(createdPouleRef);

    const close$ = new Subject<
      | {
          serieRef: DocumentReference;
          name: string;
          ref?: DocumentReference;
          teamRefs?: DocumentReference[];
        }
      | undefined
    >();

    const openSpy = vi
      .spyOn(component['dialogService'], 'open')
      .mockReturnValue({ onClose: close$ } as never);

    component.onAddPoule(serieRef);
    close$.next({ serieRef, name: 'Poule A', teamRefs: [teamRef] });

    await Promise.resolve();
    await Promise.resolve();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(mockTournamentActions.savePoule).toHaveBeenCalledWith({
      serieRef,
      name: 'Poule A',
      ref: undefined,
    });
    expect(mockTournamentActions.addTeamToPouleSilent).toHaveBeenCalledWith({
      poule: {
        ref: createdPouleRef,
        name: 'Poule A',
        refTeams: [],
      },
      teamRef,
    });
  });

  it('should show add serie button for admin', async () => {
    authStore.setUser({ role: 'admin' } as never);
    fixture.detectChanges();
    await fixture.whenStable();

    const addButton = fixture.nativeElement.querySelector('[data-testid="add-serie-button"]');
    expect(addButton).toBeTruthy();
  });
});
