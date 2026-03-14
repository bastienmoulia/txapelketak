import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Tournament } from '../../home/tournament.interface';

import { TournamentsTable } from './tournaments-table';

describe('TournamentsTable', () => {
  let component: TournamentsTable;
  let fixture: ComponentFixture<TournamentsTable>;
  const getTournamentLink = (tournament: Tournament): string => {
    return `/custom/${tournament.id}`;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentsTable],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentsTable);
    fixture.componentRef.setInput('tournaments', []);
    fixture.componentRef.setInput('getTournamentLink', getTournamentLink);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when no tournaments are provided', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Aucun tournoi disponible');
  });

  it('should disable open button for paused and waitingValidation tournaments', async () => {
    fixture.componentRef.setInput('tournaments', [
      {
        id: 1,
        name: 'T1',
        description: '',
        type: 'poules',
        status: 'paused',
        createdAt: '2024-01-01',
      },
      {
        id: 2,
        name: 'T2',
        description: '',
        type: 'poules',
        status: 'waitingValidation',
        createdAt: '2024-01-02',
      },
      {
        id: 3,
        name: 'T3',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-03',
      },
    ] satisfies Tournament[]);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];

    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(false);
  });

  it('should use getTournamentLink input to build button links', async () => {
    const calledWith: Tournament[] = [];
    fixture.componentRef.setInput('getTournamentLink', (tournament: Tournament) => {
      calledWith.push(tournament);
      return `/custom/${tournament.id}`;
    });
    fixture.componentRef.setInput('tournaments', [
      {
        id: 42,
        name: 'T42',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-01',
      },
    ] satisfies Tournament[]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(calledWith.length).toBeGreaterThan(0);
    expect(calledWith.some((tournament) => tournament.id === 42)).toBe(true);
  });
});
