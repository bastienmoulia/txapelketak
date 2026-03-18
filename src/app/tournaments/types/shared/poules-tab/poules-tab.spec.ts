import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

import { PoulesTab } from './poules-tab';

describe('PoulesTab', () => {
  let component: PoulesTab;
  let fixture: ComponentFixture<PoulesTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoulesTab],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PoulesTab);
    fixture.componentRef.setInput('teams', []);
    fixture.componentRef.setInput('series', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
