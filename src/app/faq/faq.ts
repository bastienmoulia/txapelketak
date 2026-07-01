import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { Header } from '../shared/header/header';

@Component({
  selector: 'app-faq',
  imports: [Header, RouterLink, TranslocoModule, AccordionModule, ButtonModule],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq {
  readonly items = signal([
    'overview',
    'formats',
    'live',
    'roles',
    'calendar',
    'yaml',
    'languages',
  ]);
}
