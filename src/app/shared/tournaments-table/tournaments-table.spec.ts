import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { Tournament } from '../../home/tournament.interface';

import { TournamentsTable } from './tournaments-table';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

function createRef(id: string): DocumentReference {
  return { id } as DocumentReference;
}

describe('TournamentsTable', () => {
  let component: TournamentsTable;
  let fixture: ComponentFixture<TournamentsTable>;
  const getTournamentLink = (tournament: Tournament): string => {
    return `/custom/${tournament.ref.id}`;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentsTable],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
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

  it('should disable open button for waitingValidation tournaments', async () => {
    fixture.componentRef.setInput('tournaments', [
      {
        ref: createRef('1'),
        name: 'T1',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-01',
      },
      {
        ref: createRef('2'),
        name: 'T2',
        description: '',
        type: 'poules',
        status: 'waitingValidation',
        createdAt: '2024-01-02',
      },
      {
        ref: createRef('3'),
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

    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(false);
  });

  it('should have sortable column header for Nom', async () => {
    const sortIcons = Array.from(
      fixture.nativeElement.querySelectorAll('p-sorticon'),
    ) as HTMLElement[];

    expect(sortIcons.length).toBe(1);
  });

  it('should sort tournaments by name when clicking Nom header', async () => {
    fixture.componentRef.setInput('tournaments', [
      {
        ref: createRef('1'),
        name: 'Zeta',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-01',
      },
      {
        ref: createRef('2'),
        name: 'Alpha',
        description: '',
        type: 'finale',
        status: 'ongoing',
        createdAt: '2024-01-02',
      },
    ] satisfies Tournament[]);
    fixture.detectChanges();
    await fixture.whenStable();

    const sortableHeaders = Array.from(
      fixture.nativeElement.querySelectorAll('th.p-datatable-sortable-column'),
    ) as HTMLTableCellElement[];
    const nomHeader = sortableHeaders[0];
    nomHeader.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr td:first-child'),
    ) as HTMLTableCellElement[];
    expect(rows[0].textContent?.trim()).toBe('Alpha');
    expect(rows[1].textContent?.trim()).toBe('Zeta');
  });

  it('should use getTournamentLink input to build button links', async () => {
    const calledWith: Tournament[] = [];
    fixture.componentRef.setInput('getTournamentLink', (tournament: Tournament) => {
      calledWith.push(tournament);
      return `/custom/${tournament.ref.id}`;
    });
    fixture.componentRef.setInput('tournaments', [
      {
        ref: createRef('42'),
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
    expect(calledWith.some((tournament) => tournament.ref.id === '42')).toBe(true);
  });
});
