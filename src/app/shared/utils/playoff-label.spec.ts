import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';
import { getPlayoffGameLabel, getPlayoffRoundKey } from './playoff-label';

describe('playoff-label utils', () => {
  let translocoService: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTesting()],
    });
    translocoService = TestBed.inject(TranslocoService);
  });

  describe('getPlayoffRoundKey', () => {
    it('should return the i18n key for roundSize 2', () => {
      expect(getPlayoffRoundKey(2)).toBe('finale.rounds.2');
    });

    it('should return the i18n key for roundSize 4', () => {
      expect(getPlayoffRoundKey(4)).toBe('finale.rounds.4');
    });

    it('should return the i18n key for roundSize 8', () => {
      expect(getPlayoffRoundKey(8)).toBe('finale.rounds.8');
    });

    it('should return the i18n key for roundSize 16', () => {
      expect(getPlayoffRoundKey(16)).toBe('finale.rounds.16');
    });

    it('should return the i18n key for roundSize 32', () => {
      expect(getPlayoffRoundKey(32)).toBe('finale.rounds.32');
    });
  });

  describe('getPlayoffGameLabel', () => {
    it('should return null when game has no roundSize', () => {
      expect(getPlayoffGameLabel({}, translocoService)).toBeNull();
    });

    it('should return null when roundSize is undefined', () => {
      expect(getPlayoffGameLabel({ roundSize: undefined }, translocoService)).toBeNull();
    });

    it('should return "Finale" for roundSize 2 without match number', () => {
      expect(getPlayoffGameLabel({ roundSize: 2 }, translocoService)).toBe('Finale');
    });

    it('should return "Finale" for roundSize 2 even with matchNumber 1', () => {
      expect(getPlayoffGameLabel({ roundSize: 2, matchNumber: 1 }, translocoService)).toBe(
        'Finale',
      );
    });

    it('should return "Demi-finale 1" for roundSize 4, matchNumber 1', () => {
      expect(getPlayoffGameLabel({ roundSize: 4, matchNumber: 1 }, translocoService)).toBe(
        'Demi-finale 1',
      );
    });

    it('should return "Demi-finale 2" for roundSize 4, matchNumber 2', () => {
      expect(getPlayoffGameLabel({ roundSize: 4, matchNumber: 2 }, translocoService)).toBe(
        'Demi-finale 2',
      );
    });

    it('should return "Quart de finale 3" for roundSize 8, matchNumber 3', () => {
      expect(getPlayoffGameLabel({ roundSize: 8, matchNumber: 3 }, translocoService)).toBe(
        'Quart de finale 3',
      );
    });

    it('should return translated label without number when matchNumber is undefined', () => {
      expect(getPlayoffGameLabel({ roundSize: 4 }, translocoService)).toBe('Demi-finale');
    });

    it('should fall back to game.name when translation key is not found', () => {
      expect(
        getPlayoffGameLabel(
          { roundSize: 64, matchNumber: 1, name: 'Custom name' },
          translocoService,
        ),
      ).toBe('Custom name');
    });

    it('should return null when translation key is not found and no game.name', () => {
      expect(getPlayoffGameLabel({ roundSize: 64, matchNumber: 1 }, translocoService)).toBeNull();
    });
  });
});
