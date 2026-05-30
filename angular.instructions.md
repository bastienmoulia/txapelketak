---
description: 'Angular best practices from angular.dev context file.'
applyTo: 'src/**/*.{ts,html,css,scss}'
---

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- NEVER call component methods directly from templates (except for output bindings). Always use the `call` pipe (or `async`) from `ngxtension/call-apply` (syntax: `value | call: fn`). The function passed to `call` must be a pure function that does NOT use `this`. For functions that need captured state, use a factory function outside the class that returns a closure, and assign the result to a class property.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Icons (Lucide)

This project uses [lucide-angular](https://lucide.dev/guide/packages/lucide-angular) for all icons. **Never use PrimeNG icon classes (`pi pi-*`).**

### Adding new icons

1. Find the icon name at [lucide.dev/icons](https://lucide.dev/icons/) — names are kebab-case (e.g. `triangle-alert`).
2. Import the PascalCase export and add it to `src/app/shared/icons/lucide.providers.ts`:
   ```typescript
   import { TriangleAlert, ... } from 'lucide-angular';
   // Add to the LucideIconProvider({ ... }) object
   ```
3. Import `LucideAngularModule` in the component `imports` array (no `.pick()` needed — icons are provided globally).

### Using icons in templates

**Standalone icon:**
```html
<lucide-icon name="triangle-alert" />
<!-- small inline icon: -->
<lucide-icon name="clock" [size]="14" class="mr-1 inline-block align-text-bottom" />
<!-- spinning loader: -->
<lucide-icon name="loader-circle" class="animate-spin" />
```

**Inside a PrimeNG button** (never use `icon="pi pi-..."` — use `iconTemplate`):
```html
<p-button label="Save">
  <ng-template #icon><lucide-icon name="save" [size]="16" /></ng-template>
</p-button>
```

**Inside a PrimeNG message** (never use `icon="pi pi-..."` — use `iconTemplate`):
```html
<p-message severity="warn">
  <ng-template #icon><lucide-icon name="triangle-alert" [size]="16" /></ng-template>
  Message text
</p-message>
```

**Dynamic icon (e.g., toggle):**
```html
<p-button>
  <ng-template #icon>
    @if (expanded()) {
      <lucide-icon name="chevron-up" [size]="16" />
    } @else {
      <lucide-icon name="chevron-down" [size]="16" />
    }
  </ng-template>
</p-button>
```

**Inside a PrimeNG menu (`p-menu`):** Store the icon name in `data.icon` on the `MenuItem`, then use `itemTemplate`:
```typescript
items = computed<MenuItem[]>(() => [
  { label: 'Sun', data: { icon: 'sun' }, command: () => {} },
]);
```
```html
<p-menu [model]="items()">
  <ng-template #item let-item>
    <div class="flex items-center gap-2">
      <lucide-icon [name]="item.data.icon" [size]="16" />
      <span>{{ item.label }}</span>
    </div>
  </ng-template>
</p-menu>
```

**Icon-only buttons** must include `[ariaLabel]` and `[pTooltip]` for accessibility.

## UX Best Practices

- Always show a confirmation modal (`p-dialog`) before any deletion operation. The modal must:
  - Display the name of the item to be deleted using the `shared.confirm.deleteMessage` translation key.
  - Have a "Cancel" button (`severity="secondary"`) and a "Delete" button (`severity="danger"`).
  - Use the `shared.confirm.deleteHeader` key for the dialog header.
