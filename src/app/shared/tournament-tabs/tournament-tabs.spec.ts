import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';
import { Tournament } from '../../home/tournament.interface';

import { TournamentTabs } from './tournament-tabs';

function createTournament(type: 'poules' | 'finale' | 'poules_finale'): Tournament {
  return {
    ref: { id: '1' } as DocumentReference,
    name: 'Tournoi de test',
    description: 'Description de test',
    type,
    status: 'ongoing',
    createdAt: '2026-03-16T00:00:00.000Z',
  };
}

describe('TournamentTabs', () => {
  let component: TournamentTabs;
  let fixture: ComponentFixture<TournamentTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentTabs],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentTabs);
    fixture.componentRef.setInput('tournament', createTournament('poules'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('tabs computed', () => {
    it('should always include dashboard, games, and teams tabs', () => {
      const routes = component.tabs().map((t) => t.route);
      expect(routes).toContain('dashboard');
      expect(routes).toContain('games');
      expect(routes).toContain('teams');
    });

    it('should include poules tab for type "poules"', () => {
      fixture.componentRef.setInput('tournament', createTournament('poules'));
      fixture.detectChanges();

      const routes = component.tabs().map((t) => t.route);
      expect(routes).toContain('poules');
      expect(routes).not.toContain('finale');
    });

    it('should include finale tab for type "finale"', () => {
      fixture.componentRef.setInput('tournament', createTournament('finale'));
      fixture.detectChanges();

      const routes = component.tabs().map((t) => t.route);
      expect(routes).toContain('finale');
      expect(routes).not.toContain('poules');
    });

    it('should include both poules and finale tabs for type "poules_finale"', () => {
      fixture.componentRef.setInput('tournament', createTournament('poules_finale'));
      fixture.detectChanges();

      const routes = component.tabs().map((t) => t.route);
      expect(routes).toContain('poules');
      expect(routes).toContain('finale');
    });

    it('should not include settings tab when role is empty', () => {
      const routes = component.tabs().map((t) => t.route);
      expect(routes).not.toContain('settings');
    });

    it('should not include settings tab for organizer role', () => {
      fixture.componentRef.setInput('role', 'organizer');
      fixture.detectChanges();

      const routes = component.tabs().map((t) => t.route);
      expect(routes).not.toContain('settings');
    });

    it('should include settings tab for admin role', () => {
      fixture.componentRef.setInput('role', 'admin');
      fixture.detectChanges();

      const routes = component.tabs().map((t) => t.route);
      expect(routes).toContain('settings');
    });
  });
});
