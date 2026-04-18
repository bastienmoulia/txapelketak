import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Poule, Serie } from '../../../poules/poules';

interface GamePoulePickerDialogData {
  series: Serie[];
}

@Component({
  selector: 'app-game-poule-picker-dialog',
  imports: [TranslocoPipe, FormsModule, FloatLabel, Select, Button],
  templateUrl: './game-poule-picker-dialog.html',
  styleUrl: './game-poule-picker-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePoulePickerDialog {
  private readonly config = inject(DynamicDialogConfig<GamePoulePickerDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { series: [] };

  selectedSerie = signal<Serie | null>(null);
  selectedPoule = signal<Poule | null>(null);

  sortedSeries = computed(() =>
    [...this.data.series]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules].sort((a, b) => a.name.localeCompare(b.name)),
      })),
  );

  poulesForSelectedSerie = computed(() => {
    const serie = this.selectedSerie();
    if (!serie) return [];
    return [...serie.poules].sort((a, b) => a.name.localeCompare(b.name));
  });

  isNextDisabled = computed(() => !this.selectedSerie() || !this.selectedPoule());

  onSerieChange(): void {
    this.selectedPoule.set(null);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onNext(): void {
    const poule = this.selectedPoule();
    if (poule) {
      this.dialogRef.close(poule);
    }
  }
}
