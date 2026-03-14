import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Tournament } from './tournament.interface';
import { TournamentsTable } from '../shared/tournaments-table/tournaments-table';
import { HeaderActions } from '../shared/header-actions/header-actions';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, ButtonModule, CardModule, TournamentsTable, HeaderActions],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  firestore = inject(Firestore, { optional: true });
  tournaments = signal<Tournament[]>([]);

  recentTournaments = computed(() =>
    [...this.tournaments()]
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5),
  );

  constructor() {
    if (this.firestore) {
      const tournamentsCollection = collection(this.firestore, 'tournaments');
      collectionData(tournamentsCollection)
        .pipe(takeUntilDestroyed())
        .subscribe((data) => {
          this.tournaments.set(data as Tournament[]);
        });
    }
  }

  features = signal<Feature[]>([
    {
      icon: 'pi pi-trophy',
      title: 'Créez votre tournoi',
      description: 'Configurez facilement vos tournois : poules, phases finales, ou les deux.',
    },
    {
      icon: 'pi pi-users',
      title: 'Gérez les joueurs',
      description: 'Ajoutez vos participants et organisez-les en groupes ou en têtes de série.',
    },
    {
      icon: 'pi pi-chart-bar',
      title: 'Suivez les scores',
      description:
        'Saisissez les résultats en temps réel et consultez les classements mis à jour automatiquement.',
    },
    {
      icon: 'pi pi-link',
      title: 'Accès par URL',
      description:
        "Partagez votre tournoi simplement avec un lien. Pas d'inscription requise, aucune donnée personnelle.",
    },
    {
      icon: 'pi pi-euro',
      title: '100% gratuit',
      description:
        'Créez et organisez autant de tournois que vous le souhaitez, complètement gratuitement.',
    },
    {
      icon: 'pi pi-code',
      title: 'Libre et open source',
      description: 'Code source ouvert, aucune publicité, aucune limitation. À vous de jouer.',
    },
  ]);

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.id}`;
  }
}
