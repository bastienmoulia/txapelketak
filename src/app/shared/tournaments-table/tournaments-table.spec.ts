import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentsTable } from './tournaments-table';

describe('TournamentsTable', () => {
  let component: TournamentsTable;
  let fixture: ComponentFixture<TournamentsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentsTable],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentsTable);
    fixture.componentRef.setInput('tournaments', []);
    fixture.componentRef.setInput('getTournamentLink', (tournament: { id: number }) => {
      return `/tournaments/${tournament.id}`;
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
