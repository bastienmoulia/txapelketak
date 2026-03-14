import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderActions } from './header-actions';

describe('HeaderActions', () => {
  let component: HeaderActions;
  let fixture: ComponentFixture<HeaderActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderActions],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderActions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
