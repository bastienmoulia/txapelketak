import { Injectable, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private sanitizer = inject(DomSanitizer);

  constructor() {
    marked.use({ gfm: true, breaks: true });
  }

  toSafeHtml(markdown: string): string {
    const source = markdown?.trim() ?? '';

    if (!source) {
      return '';
    }

    const html = marked.parse(source) as string;
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }
}
