# Angular Multiple Choice Practice Questions

---

**Q1.** In which lifecycle hook is it safe to use `@ViewChild` references?
A) `ngOnChanges`
B) `ngOnInit`
C) `ngAfterViewInit`
D) Constructor

**Answer: C** — The view DOM is not rendered until after `ngAfterViewInit`.

---

**Q2.** What is the difference between `switchMap` and `mergeMap`?
A) `switchMap` runs requests sequentially; `mergeMap` runs them in parallel
B) `switchMap` cancels the previous inner observable when a new one arrives; `mergeMap` runs them concurrently
C) `mergeMap` cancels previous observables; `switchMap` keeps all running
D) They are functionally identical

**Answer: B**

---

**Q3.** What does `ChangeDetectionStrategy.OnPush` do?
A) Runs change detection continuously
B) Disables change detection entirely
C) Only re-checks when an @Input reference changes, an async pipe emits, or an event fires
D) Triggers change detection on every keypress

**Answer: C**

---

**Q4.** Which Angular form approach is preferred for complex, dynamic forms?
A) Template-driven forms
B) Reactive forms
C) FormsModule
D) Dynamic forms (deprecated)

**Answer: B**

---

**Q5.** What does the `async` pipe do?
A) Makes a function asynchronous
B) Subscribes to an Observable/Promise, returns the latest value, and unsubscribes on component destroy
C) Runs code in a Web Worker
D) Delays template rendering by one tick

**Answer: B**

---

**Q6.** What is a `BehaviorSubject`?
A) An Observable that never completes
B) A Subject that requires a subscription before emitting
C) A Subject that holds a current value and emits it to new subscribers immediately
D) An Observable that replays all past emissions

**Answer: C**

---

**Q7.** What is the purpose of `trackBy` in `*ngFor`?
A) Enables two-way binding in lists
B) Sorts the list before rendering
C) Helps Angular identify which items changed, preventing unnecessary DOM recreation
D) Tracks click events on list items

**Answer: C**

---

**Q8.** When should you use `exhaustMap`?
A) When you want to cancel the previous request on new input
B) When you want to queue requests in order
C) When you want to ignore new emissions while an inner observable is still active (e.g., form submit)
D) When you want to run all requests in parallel

**Answer: C**

---

**Q9.** In Angular's DI system, `providedIn: 'root'` means:
A) The service is only available in the root module
B) A single instance is created and shared across the entire app (singleton), and it's tree-shakeable
C) The service is created every time it's injected
D) The service must be declared in AppModule providers

**Answer: B**

---

**Q10.** What does `formGroup.patchValue()` do vs `setValue()`?
A) `patchValue` validates; `setValue` skips validation
B) `patchValue` accepts partial values; `setValue` requires values for all controls
C) They are identical
D) `setValue` is deprecated; use `patchValue` instead

**Answer: B**

---

**Q11.** What is the purpose of a route resolver?
A) Redirect the user if authentication fails
B) Pre-fetch data before the component activates
C) Match URL patterns to component names
D) Handle HTTP errors from route navigation

**Answer: B**

---

**Q12.** An impure pipe differs from a pure pipe in that:
A) An impure pipe can only be used once
B) An impure pipe re-evaluates on every change detection cycle, even if the input reference hasn't changed
C) An impure pipe is always faster
D) An impure pipe cannot accept arguments

**Answer: B** — Use impure pipes cautiously; prefer immutable data with pure pipes.

---

**Q13.** What problem does `shareReplay(1)` solve?
A) Delays an observable by 1 tick
B) Prevents an observable from completing
C) Shares a single HTTP request among multiple subscribers and caches the last emission for late subscribers
D) Replays the first emission to all subscribers

**Answer: C**

---

**Q14.** In Angular 17+, what is required in `@for` that is optional in `*ngFor`?
A) An `else` block
B) A `trackBy` function
C) A `track` expression
D) An initial value

**Answer: C** — `@for (item of items; track item.id)` — `track` is required.

---

**Q15.** What is the `takeUntil` operator used for?
A) Limiting the number of emissions
B) Automatically unsubscribing from an observable when a notifier emits
C) Filtering values below a threshold
D) Delaying emissions until a condition is met

**Answer: B** — `takeUntil(this.destroy$)` is the classic pattern for component cleanup.

---

**Q16.** What does a `CanDeactivate` guard protect against?
A) Unauthorized users accessing a route
B) Users navigating away from a component with unsaved changes
C) Lazy loading a module before it's ready
D) Routing loops

**Answer: B**

---

**Q17.** `combineLatest` vs `forkJoin` — what's the key difference?
A) `forkJoin` emits on every source emission; `combineLatest` waits for all to complete
B) `combineLatest` emits on every source emission and keeps updating; `forkJoin` waits for all sources to complete then emits once
C) They are identical
D) `combineLatest` requires observables to complete; `forkJoin` does not

**Answer: B**
