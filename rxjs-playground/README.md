# RxJS Playground

Runnable Node.js examples for every concept in `../angular/02_rxjs.md`.

## Run any example

```bash
cd rxjs-playground
node 01_creating.js
node 02_subjects.js
node 03_operators.js
node 04_switchmap_family.js   # ← most important for the assessment
node 05_combination.js
node 06_error_handling.js
node 07_cleanup.js
node 08_real_world.js
```

## Learning order

| File | Concept | Why it matters |
|------|---------|---------------|
| `01_creating.js` | `of`, `from`, `interval`, `new Observable` | Foundation — what an observable is |
| `02_subjects.js` | `Subject`, `BehaviorSubject`, `ReplaySubject` | State management in Angular services |
| `03_operators.js` | `map`, `filter`, `tap`, `scan`, `distinctUntilChanged` | Core transformation toolkit |
| `04_switchmap_family.js` | `switchMap`, `mergeMap`, `concatMap`, `exhaustMap` | **Most tested topic** |
| `05_combination.js` | `forkJoin`, `combineLatest`, `withLatestFrom` | Combining multiple streams |
| `06_error_handling.js` | `catchError`, `retry`, `finalize` | Production-ready error handling |
| `07_cleanup.js` | `takeUntil`, unsubscribe patterns | Preventing memory leaks |
| `08_real_world.js` | Full search-as-you-type pipeline | All operators working together |
