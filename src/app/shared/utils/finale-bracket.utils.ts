import { FinaleGame } from '../../tournaments/types/poules/poules.model';

export interface PhaseDefinition {
  phaseName: string;
  phaseOrder: number;
  gameCount: number;
  isThirdPlace?: boolean;
}

export function getPhaseDefinitions(
  finaleSize: number,
  translations: {
    final: string;
    thirdPlace: string;
    semifinal: string;
    quarterfinal: string;
    roundOf16: string;
    roundOf32: string;
  },
): PhaseDefinition[] {
  const phases: PhaseDefinition[] = [];

  let size = finaleSize;
  let order = 1;

  const phaseNameMap: Record<number, string> = {
    2: translations.final,
    4: translations.semifinal,
    8: translations.quarterfinal,
    16: translations.roundOf16,
    32: translations.roundOf32,
  };

  while (size >= 2) {
    const phaseName = phaseNameMap[size] ?? `1/${size / 2} de finale`;
    phases.push({
      phaseName,
      phaseOrder: order,
      gameCount: size / 2,
    });
    size = size / 2;
    order++;
  }

  // Add third place match (same phaseOrder as final if finaleSize >= 4)
  if (finaleSize >= 4) {
    phases.push({
      phaseName: translations.thirdPlace,
      phaseOrder: phases.length,
      gameCount: 1,
      isThirdPlace: true,
    });
  }

  return phases;
}

export function generateFinaleBracket(
  serieName: string,
  finaleSize: number,
  translations: {
    final: string;
    thirdPlace: string;
    semifinal: string;
    quarterfinal: string;
    roundOf16: string;
    roundOf32: string;
    winnerOf: (game: string) => string;
    loserOf: (game: string) => string;
  },
): Omit<FinaleGame, 'ref'>[] {
  const phases = getPhaseDefinitions(finaleSize, translations);
  const games: Omit<FinaleGame, 'ref'>[] = [];

  // Generate main bracket games (not third place)
  const mainPhases = phases.filter((p) => !p.isThirdPlace);

  for (const phase of mainPhases) {
    for (let i = 1; i <= phase.gameCount; i++) {
      const gameName = `${serieName} - ${phase.phaseName} ${i}`;
      let team1Label: string | undefined;
      let team2Label: string | undefined;

      if (phase.phaseOrder > 1) {
        const prevPhase = mainPhases.find((p) => p.phaseOrder === phase.phaseOrder - 1);
        if (prevPhase) {
          const prevGame1Index = (i - 1) * 2 + 1;
          const prevGame2Index = (i - 1) * 2 + 2;
          const prevGame1Name = `${serieName} - ${prevPhase.phaseName} ${prevGame1Index}`;
          const prevGame2Name = `${serieName} - ${prevPhase.phaseName} ${prevGame2Index}`;
          team1Label = translations.winnerOf(prevGame1Name);
          team2Label = translations.winnerOf(prevGame2Name);
        }
      }

      games.push({
        name: gameName,
        phase: phase.phaseName,
        phaseOrder: phase.phaseOrder,
        matchNumber: i,
        team1Label,
        team2Label,
      });
    }
  }

  // Generate third place match if finaleSize >= 4
  const thirdPlacePhase = phases.find((p) => p.isThirdPlace);
  if (thirdPlacePhase) {
    const semifinalPhase = mainPhases.find(
      (p) => p.phaseOrder === thirdPlacePhase.phaseOrder - 1,
    );
    let team1Label: string | undefined;
    let team2Label: string | undefined;
    if (semifinalPhase) {
      const semi1Name = `${serieName} - ${semifinalPhase.phaseName} 1`;
      const semi2Name = `${serieName} - ${semifinalPhase.phaseName} 2`;
      team1Label = translations.loserOf(semi1Name);
      team2Label = translations.loserOf(semi2Name);
    }
    const gameName = `${serieName} - ${thirdPlacePhase.phaseName}`;
    games.push({
      name: gameName,
      phase: thirdPlacePhase.phaseName,
      phaseOrder: thirdPlacePhase.phaseOrder,
      matchNumber: 1,
      team1Label,
      team2Label,
    });
  }

  return games;
}
