import { inject, Injectable, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { filter, merge } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private currentRouteTitle: string | undefined;

  constructor() {
    super();

    merge(
      this.translocoService.langChanges$,
      this.translocoService.events$.pipe(filter((e) => e.type === 'translationLoadSuccess')),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyTitle(this.currentRouteTitle));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.currentRouteTitle = this.buildTitle(snapshot) ?? undefined;
    this.applyTitle(this.currentRouteTitle);
  }

  private applyTitle(routeTitle: string | undefined): void {
    if (!this.hasLoadedActiveLang()) {
      return;
    }

    const applicationTitle = this.translate('app.title');

    if (!routeTitle) {
      this.titleService.setTitle(applicationTitle);
      return;
    }

    const pageTitle = this.isTranslationKey(routeTitle) ? this.translate(routeTitle) : routeTitle;

    if (pageTitle === applicationTitle) {
      this.titleService.setTitle(applicationTitle);
      return;
    }

    this.titleService.setTitle(`${pageTitle} | ${applicationTitle}`);
  }

  private hasLoadedActiveLang(): boolean {
    const activeLang = this.translocoService.getActiveLang();
    const translation = this.translocoService.getTranslation(activeLang);

    return Object.keys(translation ?? {}).length > 0;
  }

  private translate(value: string): string {
    return this.translocoService.translate(value);
  }

  private isTranslationKey(value: string): boolean {
    return value.startsWith('routes.') || value.startsWith('app.');
  }
}
