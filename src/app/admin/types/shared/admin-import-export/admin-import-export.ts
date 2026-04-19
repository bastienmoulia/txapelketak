import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { dump, load } from 'js-yaml';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { Tournament } from '../../../../home/tournament.interface';
import { Team } from '../../../../tournaments/types/shared/teams/teams';
import { Game, Serie } from '../../../../tournaments/types/poules/poules';

export interface TournamentYamlTeam {
  id: string;
  name: string;
}

export interface TournamentYamlGame {
  team1: string;
  team2: string;
  score1?: number;
  score2?: number;
  date?: string;
  referees?: string[];
}

export interface TournamentYamlPoule {
  name: string;
  teams: string[];
  games: TournamentYamlGame[];
}

export interface TournamentYamlSerie {
  name: string;
  poules: TournamentYamlPoule[];
}

export interface TournamentYamlData {
  tournament: {
    name: string;
    description: string;
    type: string;
    status: string;
  };
  teams: TournamentYamlTeam[];
  series: TournamentYamlSerie[];
}

@Component({
  selector: 'app-admin-import-export',
  imports: [ButtonModule, ConfirmDialogModule, DividerModule, MessageModule, TranslocoModule],
  providers: [ConfirmationService],
  templateUrl: './admin-import-export.html',
  styleUrl: './admin-import-export.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminImportExport {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private confirmationService = inject(ConfirmationService);

  tournament = input.required<Tournament>();
  teams = input<Team[]>([]);
  series = input<Serie[]>([]);

  importError = signal<string | null>(null);
  parsedImportData = signal<TournamentYamlData | null>(null);
  isImporting = signal(false);
  pendingImportCounts = signal<{ teamsCount: number; seriesCount: number } | null>(null);

  onExport(): void {
    const data = this.buildExportData();
    const yamlContent = dump(data, { indent: 2 });
    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const tournamentName = this.tournament()
      .name.replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${tournamentName}_export_${today}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsed = load(content) as TournamentYamlData;
        if (!this.isValidYamlData(parsed)) {
          this.importError.set(this.translocoService.translate('admin.importExport.invalidFile'));
          this.parsedImportData.set(null);
        } else {
          this.importError.set(null);
          this.parsedImportData.set(parsed);
          this.openImportConfirmDialog(parsed);
        }
      } catch {
        this.importError.set(this.translocoService.translate('admin.importExport.invalidFile'));
        this.parsedImportData.set(null);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private openImportConfirmDialog(data: TournamentYamlData): void {
    this.pendingImportCounts.set({ teamsCount: data.teams.length, seriesCount: data.series.length });
    this.confirmationService.confirm({
      header: this.translocoService.translate('admin.importExport.importConfirmTitle'),
      message: this.translocoService.translate('admin.importExport.importConfirmMessage'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('admin.importExport.importConfirm'),
      rejectLabel: this.translocoService.translate('shared.actions.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.confirmImport();
      },
      reject: () => {
        this.cancelImport();
      },
    });
  }

  private async confirmImport(): Promise<void> {
    const data = this.parsedImportData();
    if (!data) {
      return;
    }

    this.isImporting.set(true);
    try {
      await this.firebaseService.importTournamentData(this.tournament().ref, data);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.importExport.importSuccess'),
        detail: this.translocoService.translate('admin.importExport.importSuccessDetail'),
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: this.translocoService.translate('admin.importExport.importError'),
        detail: this.translocoService.translate('admin.importExport.importErrorDetail'),
      });
    } finally {
      this.isImporting.set(false);
      this.parsedImportData.set(null);
      this.pendingImportCounts.set(null);
    }
  }

  private cancelImport(): void {
    this.parsedImportData.set(null);
    this.importError.set(null);
    this.pendingImportCounts.set(null);
  }

  private buildExportData(): TournamentYamlData {
    const tournament = this.tournament();
    const teams = this.teams();
    const series = this.series();

    const yamlTeams: TournamentYamlTeam[] = teams.map((team) => ({
      id: team.ref.id,
      name: team.name,
    }));

    const yamlSeries: TournamentYamlSerie[] = series.map((serie) => ({
      name: serie.name,
      poules: (serie.poules ?? []).map((poule) => ({
        name: poule.name,
        teams: (poule.refTeams ?? []).map((ref) => ref.id),
        games: (poule.games ?? []).map((game: Game) => {
          const yamlGame: TournamentYamlGame = {
            team1: game.refTeam1.id,
            team2: game.refTeam2.id,
          };
          if (game.scoreTeam1 != null) yamlGame.score1 = game.scoreTeam1;
          if (game.scoreTeam2 != null) yamlGame.score2 = game.scoreTeam2;
          if (game.date != null) yamlGame.date = game.date.toISOString();
          if (game.referees && game.referees.length > 0) {
            yamlGame.referees = game.referees;
          }
          return yamlGame;
        }),
      })),
    }));

    return {
      tournament: {
        name: tournament.name,
        description: tournament.description ?? '',
        type: tournament.type,
        status: tournament.status,
      },
      teams: yamlTeams,
      series: yamlSeries,
    };
  }

  private isValidYamlData(data: unknown): data is TournamentYamlData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (!d['tournament'] || typeof d['tournament'] !== 'object') return false;
    if (!Array.isArray(d['teams'])) return false;
    if (!Array.isArray(d['series'])) return false;
    return true;
  }
}
