import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DocumentReference } from "@angular/fire/firestore";
import { provideRouter } from "@angular/router";
import { MessageService } from "primeng/api";

import { Finale } from "./finale";
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';

describe("Finale", () => {
  let component: Finale;
  let fixture: ComponentFixture<Finale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Finale],
      providers: [provideRouter([]), MessageService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Finale);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Test Tournament',
      description: '',
      type: 'finale',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      data: { numberOfTeams: 4 },
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
