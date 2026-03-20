# Angular: RxJS

RxJS is the most commonly tested Angular topic. Know these operators cold.

## Observable Fundamentals

```typescript
import { Observable, of, from, interval, Subject, BehaviorSubject } from 'rxjs';

// Creating observables
const obs1$ = of(1, 2, 3);                    // emits values synchronously then completes
const obs2$ = from([1, 2, 3]);                // from array/promise/iterable
const obs3$ = interval(1000);                  // emits 0, 1, 2... every 1s
const obs4$ = new Observable<number>(sub => {
  sub.next(1);
  sub.next(2);
  sub.complete();
});

// Subscribing — always unsubscribe!
const sub = obs1$.subscribe({
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('done'),
});

sub.unsubscribe();
```

---

## Subjects

```typescript
// Subject — no initial value, late subscribers miss past emissions
const subject$ = new Subject<string>();
subject$.next('hello');  // missed by future subscribers

// BehaviorSubject — holds current value, late subscribers get it immediately
const behavior$ = new BehaviorSubject<Patient | null>(null);
behavior$.next(patient);
console.log(behavior$.getValue());  // access current value synchronously

// ReplaySubject — replays last N emissions to new subscribers
const replay$ = new ReplaySubject<number>(3);  // replay last 3

// AsyncSubject — only emits the LAST value, on complete
const async$ = new AsyncSubject<number>();
```

**BehaviorSubject is the most common in Angular services for state.**

---

## Essential Operators

### Transformation
```typescript
import { map, switchMap, mergeMap, concatMap, exhaustMap } from 'rxjs/operators';

// map — transform each value
patients$.pipe(
  map(patients => patients.filter(p => p.isActive))
);

// switchMap — cancels previous inner observable (use for search/autocomplete)
searchQuery$.pipe(
  switchMap(query => this.patientService.search(query))
  // If new search query arrives, previous HTTP request is CANCELLED
);

// mergeMap — runs all inner observables concurrently
patientIds$.pipe(
  mergeMap(id => this.patientService.getById(id))
  // All requests run in parallel, results arrive out of order
);

// concatMap — queues inner observables, runs one at a time in order
saveRequests$.pipe(
  concatMap(req => this.service.save(req))
  // Wait for each save to complete before starting next
);

// exhaustMap — ignores new emissions while inner is active (use for login/submit)
submitClick$.pipe(
  exhaustMap(() => this.authService.login(credentials))
  // Double-click won't trigger a second login call
);
```

**The most common exam question: which *Map to use?**
| Operator | Use case |
|----------|----------|
| `switchMap` | Search, autocomplete, route params — cancel old |
| `mergeMap` | Parallel requests where order doesn't matter |
| `concatMap` | Sequential operations, order matters |
| `exhaustMap` | Submit buttons, login — ignore new until done |

### Filtering
```typescript
import { filter, take, takeUntil, debounceTime, distinctUntilChanged, first } from 'rxjs/operators';

// filter — only pass matching values
patients$.pipe(filter(p => p.isActive));

// take — complete after N emissions
clicks$.pipe(take(1));  // one-shot observable

// takeUntil — complete when notifier emits (CRITICAL for cleanup)
this.patientService.getAll().pipe(
  takeUntil(this.destroy$)
).subscribe(...);

// debounceTime — wait for pause in emissions (search input)
searchInput.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged()  // skip if value hasn't changed
);

// first — like take(1) but completes immediately
patients$.pipe(first(p => p.id === targetId));
```

### Combination
```typescript
import { combineLatest, forkJoin, merge, zip, withLatestFrom } from 'rxjs';

// forkJoin — wait for all to COMPLETE, emit array of last values (like Promise.all)
forkJoin([
  this.patientService.getById(1),
  this.appointmentService.getForPatient(1)
]).subscribe(([patient, appointments]) => { ... });

// combineLatest — emits when ANY source emits, with latest from ALL
combineLatest([patient$, appointments$]).pipe(
  map(([patient, appts]) => ({ patient, appts }))
);

// merge — pass through all emissions from all sources
merge(save$, autosave$).subscribe(result => ...);

// withLatestFrom — combine with latest value from another, but only when source emits
saveClicks$.pipe(
  withLatestFrom(formValue$),
  switchMap(([_, value]) => this.service.save(value))
);
```

### Error Handling
```typescript
import { catchError, retry, retryWhen, throwError, EMPTY } from 'rxjs';

// catchError — handle error and return fallback or rethrow
this.service.getPatients().pipe(
  catchError(err => {
    this.error = err.message;
    return of([]);        // return fallback value
    // return EMPTY;      // complete without value
    // return throwError(() => err);  // rethrow
  })
);

// retry — resubscribe N times on error
this.service.getPatients().pipe(retry(3));
```

---

## async Pipe (Prefer over manual subscribe)

```typescript
// Component TS
patients$ = this.patientService.getAll();  // don't subscribe manually

// Template
<div *ngIf="patients$ | async as patients">
  <li *ngFor="let p of patients">{{ p.name }}</li>
</div>
```

**Benefits:** Auto-unsubscribes, triggers change detection, works with OnPush.

---

## Cleanup Pattern

```typescript
@Component({ ... })
export class PatientListComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.service.getAll().pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => this.patients = data);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Angular 16+: takeUntilDestroyed()
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class PatientListComponent {
  constructor() {
    this.service.getAll()
      .pipe(takeUntilDestroyed())  // auto cleanup, no ngOnDestroy needed
      .subscribe(data => this.patients = data);
  }
}
```

---

## Hot vs Cold Observables

- **Cold**: Each subscriber gets its own execution (HTTP requests, `of`, `from`). Default.
- **Hot**: Shared execution, subscribers see only future emissions (DOM events, Subjects).

```typescript
// Making cold observable hot with share
const shared$ = this.http.get('/api/patients').pipe(
  shareReplay(1)  // multicasts, caches last emission for late subscribers
);
```
