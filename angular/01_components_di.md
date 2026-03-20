# Angular: Components, Directives, Pipes, and DI

## Component Lifecycle Hooks (in order)

```typescript
@Component({ selector: 'app-patient', template: '' })
export class PatientComponent implements OnInit, OnChanges, OnDestroy {

  @Input() patientId!: number;
  private destroy$ = new Subject<void>();

  constructor(private patientService: PatientService) {
    // Constructor: DI only. Don't call services here.
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Fires BEFORE ngOnInit and whenever @Input changes
    // changes['patientId'].currentValue, .previousValue, .isFirstChange()
    if (changes['patientId'] && !changes['patientId'].isFirstChange()) {
      this.loadPatient();
    }
  }

  ngOnInit(): void {
    // Fires once after first ngOnChanges. Safe to call services here.
    this.loadPatient();
  }

  ngAfterViewInit(): void {
    // DOM is ready. Safe to use @ViewChild references here.
  }

  ngOnDestroy(): void {
    // Clean up subscriptions, intervals, event listeners
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatient(): void {
    this.patientService.getById(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(patient => this.patient = patient);
  }
}
```

**Trap:** `@ViewChild` is `undefined` in `ngOnInit()` — only available in `ngAfterViewInit()`.

---

## Component Communication

```typescript
// Parent → Child: @Input
@Component({ selector: 'app-child', template: '' })
export class ChildComponent {
  @Input() patient!: Patient;
  @Input({ required: true }) title!: string;           // Angular 16+: required input
  @Input({ transform: booleanAttribute }) disabled = false;  // transform
}

// Child → Parent: @Output + EventEmitter
export class ChildComponent {
  @Output() saved = new EventEmitter<Patient>();
  @Output() cancelled = new EventEmitter<void>();

  onSave(patient: Patient): void {
    this.saved.emit(patient);
  }
}

// Parent template
// <app-child [patient]="selectedPatient" (saved)="onPatientSaved($event)"></app-child>

// ViewChild — parent accesses child directly (use sparingly)
export class ParentComponent implements AfterViewInit {
  @ViewChild(ChildComponent) child!: ChildComponent;

  ngAfterViewInit(): void {
    this.child.reset();  // call child method
  }
}
```

---

## Dependency Injection

```typescript
// providedIn: 'root' — singleton, tree-shakeable (preferred)
@Injectable({ providedIn: 'root' })
export class PatientService { ... }

// Scoped to a component subtree
@Component({
  providers: [PatientService]  // new instance for this component and its children
})
export class PatientFormComponent { ... }

// Injection tokens for non-class values
export const API_URL = new InjectionToken<string>('API_URL');

// Provide
providers: [{ provide: API_URL, useValue: 'https://api.example.com' }]

// Inject
constructor(@Inject(API_URL) private apiUrl: string) {}

// Angular 14+ inject() function — works outside constructor
export class PatientService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_URL);
}
```

---

## Directives

### Structural Directives

```html
<!-- *ngIf — creates/destroys DOM -->
<div *ngIf="patient; else loading">{{ patient.name }}</div>
<ng-template #loading><p>Loading...</p></ng-template>

<!-- @if (Angular 17+ control flow) -->
@if (patient) {
  <p>{{ patient.name }}</p>
} @else {
  <p>Loading...</p>
}

<!-- *ngFor -->
<li *ngFor="let p of patients; let i = index; trackBy: trackById">
  {{ i }}. {{ p.name }}
</li>

<!-- @for (Angular 17+) — track is REQUIRED -->
@for (p of patients; track p.id) {
  <li>{{ p.name }}</li>
} @empty {
  <li>No patients found.</li>
}

<!-- *ngSwitch -->
<div [ngSwitch]="status">
  <span *ngSwitchCase="'active'">Active</span>
  <span *ngSwitchDefault>Inactive</span>
</div>
```

### Attribute Directives

```typescript
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  @Input('appHighlight') color = 'yellow';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.renderer.setStyle(this.el.nativeElement, 'background', this.color);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.renderer.removeStyle(this.el.nativeElement, 'background');
  }
}
// Usage: <span [appHighlight]="'lightblue'">Patient Name</span>
```

---

## Pipes

```typescript
// Built-in
{{ patient.dob | date:'MM/dd/yyyy' }}
{{ amount | currency:'USD' }}
{{ name | uppercase }}
{{ value | json }}
{{ longText | slice:0:100 }}

// Custom pipe
@Pipe({ name: 'fullName', pure: true })
export class FullNamePipe implements PipeTransform {
  transform(patient: Patient, format: 'lastFirst' | 'firstLast' = 'firstLast'): string {
    return format === 'lastFirst'
      ? `${patient.lastName}, ${patient.firstName}`
      : `${patient.firstName} ${patient.lastName}`;
  }
}

// Usage: {{ patient | fullName:'lastFirst' }}
```

**Pure vs Impure pipes:**
- **Pure** (default): Only re-runs when input reference changes. Performant.
- **Impure**: Re-runs on every change detection cycle. Use only when tracking mutable data (e.g., filtering an array that mutates).

---

## Content Projection

```typescript
// Single slot
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content></ng-content>
    </div>
  `
})

// Multi-slot
@Component({
  template: `
    <ng-content select="[card-header]"></ng-content>
    <ng-content select="[card-body]"></ng-content>
    <ng-content></ng-content>
  `
})

// Usage
<app-card>
  <h2 card-header>Title</h2>
  <p card-body>Content</p>
</app-card>
```
