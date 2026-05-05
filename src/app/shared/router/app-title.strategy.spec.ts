import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';
import { AppTitleStrategy } from './app-title.strategy';

@Component({
  template: '',
  standalone: true,
})
class TestComponent {}

describe('AppTitleStrategy', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            title: 'routes.home',
            component: TestComponent,
          },
        ]),
        {
          provide: TitleStrategy,
          useClass: AppTitleStrategy,
        },
        ...provideTranslocoTesting(),
      ],
    }).compileComponents();
  });

  it('sets the translated browser title from the active route', async () => {
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigateByUrl('/');

    expect(title.getTitle()).toBe('Accueil · Txapelketak');
  });

  it('uses plain route titles without trying to translate them', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            title: 'Open de Bayonne',
            component: TestComponent,
          },
        ]),
        {
          provide: TitleStrategy,
          useClass: AppTitleStrategy,
        },
        ...provideTranslocoTesting(),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigateByUrl('/');

    expect(title.getTitle()).toBe('Open de Bayonne · Txapelketak');
  });
});
