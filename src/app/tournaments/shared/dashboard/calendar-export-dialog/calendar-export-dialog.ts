import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Team } from '../../../models';

export interface CalendarExportDialogData {
  teams: Team[];
}

export interface CalendarExportDialogResult {
  teamId: string | null;
  action: 'subscribe' | 'download';
}

interface TeamOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-calendar-export-dialog',
  imports: [FormsModule, FloatLabel, Select, Button, TooltipModule, TranslocoPipe],
  templateUrl: './calendar-export-dialog.html',
})
export class CalendarExportDialog {
  private readonly translocoService = inject(TranslocoService);
  private readonly config = inject(DynamicDialogConfig<CalendarExportDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data: { teams: Team[] } = this.config.data ?? { teams: [] };

  private activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  selectedTeamId = signal<string | null>(null);

  teamOptions = computed((): TeamOption[] => {
    this.activeLanguage();
    return [
      {
        label: this.translocoService.translate(
          'tournaments.dashboard.calendarExportDialog.allTeams',
        ),
        value: null,
      },
      ...this.data.teams.map((team) => ({
        label: team.name,
        value: team.ref?.id ?? null,
      })),
    ];
  });

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSubscribe(): void {
    const result: CalendarExportDialogResult = {
      teamId: this.selectedTeamId(),
      action: 'subscribe',
    };
    this.dialogRef.close(result);
  }

  onExport(): void {
    const result: CalendarExportDialogResult = {
      teamId: this.selectedTeamId(),
      action: 'download',
    };
    this.dialogRef.close(result);
  }
}
