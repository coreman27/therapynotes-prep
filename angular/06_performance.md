# Angular: Performance, Change Detection, and Modern Features

## Change Detection

Angular's default change detection checks every component on every event. Understanding this is a senior-level expectation.

### Default vs OnPush

```typescript
// Default: Angular checks this component on every CD cycle
@Component({ ... })
export class DefaultComponent { }

// OnPush: Angular ONLY checks when:
// 1. An @Input reference changes
// 2. An async pipe emits
// 3. An event fires in this component
// 4. markForCheck() / detectChanges() called manually
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ patient.name }}`
})
export class PatientCardComponent {
  @Input() patient!: Patient;  // must be new reference to trigger CD
}
```

**Key rule:** With OnPush, mutating an object won't trigger re-render. You must provide a new reference:

```typescript
// WRONG with OnPush — reference unchanged, no re-render
updatePatient(): void {
  this.patient.name = 'New Name';  // mutating!
}

// CORRECT — new reference triggers OnPush
updatePatient(): void {
  this.patient = { ...this.patient, name: 'New Name' };
}
```

### Manual change detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientListComponent {
  constructor(private cdr: ChangeDetectorRef) {}

  onDataUpdate(data: Patient[]): void {
    this.patients = data;
    this.cdr.markForCheck();     // schedule check for this + ancestors
    // or: this.cdr.detectChanges();  // immediate check of subtree
  }

  pauseChecks(): void {
    this.cdr.detach();   // completely opt out of CD
  }

  resumeChecks(): void {
    this.cdr.reattach();
  }
}
```

---

## Lazy Loading

```typescript
// Route-based lazy loading (most important)
const routes: Routes = [
  {
    path: 'billing',
    loadChildren: () =>
      import('./billing/billing.routes').then(m => m.BILLING_ROUTES)
  }
];

// Standalone component lazy loading
{
  path: 'reports/:id',
  loadComponent: () =>
    import('./reports/report.component').then(c => c.ReportComponent)
}

// Preloading strategies
import { PreloadAllModules, QuicklinkStrategy } from '@angular/router';

provideRouter(routes,
  withPreloading(PreloadAllModules)  // preload all in background
  // or: withPreloading(QuicklinkStrategy)  // preload visible links
)
```

---

## trackBy in *ngFor

Without `trackBy`, Angular destroys and recreates all DOM nodes when the array changes.

```typescript
@Component({
  template: `
    <li *ngFor="let p of patients; trackBy: trackById">{{ p.name }}</li>

    <!-- Angular 17+ @for requires track -->
    @for (p of patients; track p.id) { <li>{{ p.name }}</li> }
  `
})
export class PatientListComponent {
  trackById(index: number, patient: Patient): number {
    return patient.id;  // DOM nodes are reused when ID matches
  }
}
```

---

## Pure Pipes for Performance

Prefer pure pipes over methods in templates — they're memoized.

```typescript
// BAD: method called on EVERY change detection cycle
{{ getFullName(patient) }}

// GOOD: pure pipe only re-runs when input reference changes
{{ patient | fullName }}
```

---

## Standalone Components (Angular 14+)

Modern Angular preference over NgModules.

```typescript
@Component({
  selector: 'app-patient-card',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],  // import directly, no NgModule
  template: `...`,
})
export class PatientCardComponent { }

// App bootstrap without NgModule
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
  ]
});
```

---

## Defer Blocks (Angular 17+)

Lazy-load template sections based on conditions.

```html
<!-- Load component when it enters the viewport -->
@defer (on viewport) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="chart-skeleton"></div>
} @loading (minimum 500ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart.</p>
}

<!-- Load on interaction -->
@defer (on interaction(triggerEl)) {
  <app-patient-history />
}

<!-- Programmatic trigger -->
@defer (when showDetails) {
  <app-patient-detail />
}
```

---

## Signals vs RxJS — When to Use Which

| Scenario | Use |
|----------|-----|
| Local component state | Signals |
| Computed derived state | Signals (`computed()`) |
| Side effects on state change | Signals (`effect()`) |
| HTTP requests | RxJS (`HttpClient` returns Observable) |
| Complex async flows (retry, debounce) | RxJS operators |
| Event streams (DOM events, WebSocket) | RxJS |
| Cross-component state | Service with signals OR BehaviorSubject |

```typescript
// Interop: convert between the two
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

const patients$ = this.http.get<Patient[]>('/api/patients');
const patients = toSignal(patients$, { initialValue: [] });  // Observable → Signal

const searchTerm = signal('');
const searchTerm$ = toObservable(searchTerm);  // Signal → Observable
```
