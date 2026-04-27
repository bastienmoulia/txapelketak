import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { FinaleTab } from './finale-tab';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('FinaleTab', () => {
  let component: FinaleTab;
  let fixture: ComponentFixture<FinaleTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinaleTab],
      providers: [MessageService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FinaleTab);
    fixture.componentRef.setInput('series', []);
    fixture.componentRef.setInput('teams', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
