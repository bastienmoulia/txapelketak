import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

import { Teams } from './teams';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Teams);
    fixture.componentRef.setInput('teams', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sortable column headers for Nom, Série and Poule', async () => {
    fixture.componentRef.setInput('teams', [{ ref: null!, name: 'Team A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const sortIcons = Array.from(
      fixture.nativeElement.querySelectorAll('p-sorticon'),
    ) as HTMLElement[];

    expect(sortIcons.length).toBe(3);
  });

  it('should display serieName and pouleName for teams with context', async () => {
    fixture.componentRef.setInput('teams', [
      { ref: null!, name: 'Team A', serieName: 'Série 1', pouleName: 'Poule A' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const cells = Array.from(fixture.nativeElement.querySelectorAll('td')) as HTMLElement[];
    const cellTexts = cells.map((c) => c.textContent?.trim());

    expect(cellTexts).toContain('Team A');
    expect(cellTexts).toContain('Série 1');
    expect(cellTexts).toContain('Poule A');
  });
});
