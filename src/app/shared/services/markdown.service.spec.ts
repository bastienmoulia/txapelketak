import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
  let service: MarkdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarkdownService);
  });

  it('should return empty string for empty input', () => {
    expect(service.toSafeHtml('')).toBe('');
  });

  it('should render markdown headings and emphasis', () => {
    const html = service.toSafeHtml('# Title\n\n**Bold** and _italic_');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('should sanitize unsafe script tags', () => {
    const html = service.toSafeHtml('Hello<script>alert(1)</script>');

    expect(html).toContain('Hello');
    expect(html).not.toContain('<script>');
  });
});
