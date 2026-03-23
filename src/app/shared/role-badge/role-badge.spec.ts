import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

import { RoleBadge } from './role-badge';

describe('RoleBadge', () => {
  let component: RoleBadge;
  let fixture: ComponentFixture<RoleBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleBadge],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render admin badge for admin role', () => {
    fixture.componentRef.setInput('role', 'admin');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-badge"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="organizer-badge"]')).toBeNull();
  });

  it('should render organizer badge for organizer role', () => {
    fixture.componentRef.setInput('role', 'organizer');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="organizer-badge"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-badge"]')).toBeNull();
  });

  it('should not render badge when role is empty', () => {
    fixture.componentRef.setInput('role', '');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-badge"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="organizer-badge"]')).toBeNull();
  });
});
