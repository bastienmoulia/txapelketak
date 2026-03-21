import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';

import { Home } from './home';
import { provideTranslocoTesting } from '../testing/transloco-testing.providers';

function createRef(id: string): DocumentReference {
  return { id } as DocumentReference;
}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Txapelketak');
  });

  it('should display a link to create a tournament', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Créer un tournoi');
  });

  it('should display the list of tournaments', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('app-tournaments-table');
    expect(table).toBeTruthy();
  });

  it('should have 0 tournaments by default (no Firestore in tests)', () => {
    expect(component.tournaments().length).toBe(0);
  });

  it('should have 0 recent tournaments by default (no Firestore in tests)', () => {
    expect(component.recentTournaments().length).toBe(0);
  });

  it('should limit recentTournaments to 5', () => {
    component.tournaments.set([
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
        status: 'ongoing',
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
      {
        ref: createRef('4'),
        name: 'T4',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-04',
      },
      {
        ref: createRef('5'),
        name: 'T5',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-05',
      },
      {
        ref: createRef('6'),
        name: 'T6',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-06',
      },
    ]);
    expect(component.recentTournaments().length).toBe(5);
  });

  it('should display the 5 most recently created tournaments', () => {
    component.tournaments.set([
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
        status: 'ongoing',
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
      {
        ref: createRef('4'),
        name: 'T4',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-04',
      },
      {
        ref: createRef('5'),
        name: 'T5',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-05',
      },
      {
        ref: createRef('6'),
        name: 'T6',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2024-01-06',
      },
    ]);
    const recent = component.recentTournaments();
    expect(recent[0].ref.id).toBe('6');
    expect(recent[4].ref.id).toBe('2');
  });

  it('should display 6 feature cards', () => {
    expect(component.features().length).toBe(6);
  });
});
