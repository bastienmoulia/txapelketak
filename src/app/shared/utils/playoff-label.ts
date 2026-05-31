import { TranslocoService } from '@jsverse/transloco';

/**
 * Returns the i18n key for a playoff round size.
 * Example: `getPlayoffRoundKey(2)` → `'finale.rounds.2'`
 */
export function getPlayoffRoundKey(roundSize: number): string {
  return `finale.rounds.${roundSize}`;
}

/**
 * Returns the translated label for a playoff game (e.g. "Finale", "Demi-finale 2").
 * Returns `null` if the game is not a playoff game (no `roundSize`).
 *
 * When `roundSize === 2` (finale), the match number is omitted.
 */
export function getPlayoffGameLabel(
  game: { roundSize?: number; matchNumber?: number; name?: string },
  translocoService: TranslocoService,
): string | null {
  if (game.roundSize == null) return null;

  const key = getPlayoffRoundKey(game.roundSize);
  const translated = translocoService.translate(key);

  if (!translated || translated === key) {
    return game.name ?? null;
  }

  if (game.roundSize === 2) {
    return translated;
  }

  return game.matchNumber != null ? `${translated} ${game.matchNumber}` : translated;
}
