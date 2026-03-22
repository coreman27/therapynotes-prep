/**
 * RxJS 06: Error Handling — catchError, retry, finalize
 * Run: node 06_error_handling.js
 *
 * In RxJS, an error TERMINATES the stream. After an error, no more values.
 * These operators let you recover or clean up.
 */

import { of, throwError, timer } from 'rxjs';
import { catchError, retry, retryWhen, delayWhen, finalize, tap, map } from 'rxjs/operators';

// Simulate an API call that fails
let attempt = 0;
const flakyApi = () => {
  attempt++;
  console.log(`  attempt #${attempt}`);
  if (attempt < 3) return throwError(() => new Error('Network error'));
  return of({ data: 'success!' });
};

// ─── catchError ──────────────────────────────────────────────────────────────
console.log('=== catchError — intercept error, return fallback ===\n');

of('a', 'b', 'c')
  .pipe(
    map(v => {
      if (v === 'b') throw new Error('b is bad!');  // simulate error mid-stream
      return v;
    }),
    catchError(err => {
      console.log('  caught:', err.message);
      return of('FALLBACK');   // stream continues with fallback value
      // return EMPTY;          // silently complete with no more values
      // return throwError(() => err);  // rethrow (let caller handle)
    })
  )
  .subscribe({
    next: v => console.log('  got:', v),
    complete: () => console.log('  done'),
  });

// Output: a, caught error, FALLBACK, done
// Notice: 'c' is never emitted because the error replaced the rest of the stream

// ─── retry ───────────────────────────────────────────────────────────────────
console.log('\n=== retry(n) — resubscribe N times on error ===\n');

attempt = 0;  // reset counter

flakyApi()
  .pipe(
    retry(3),  // try up to 3 more times after failure
    catchError(err => {
      console.log('  all retries exhausted:', err.message);
      return of(null);
    })
  )
  .subscribe(result => console.log('  result:', result));

// Output: attempt 1 (fail), attempt 2 (fail), attempt 3 (success!)

// ─── retryWhen with delay ─────────────────────────────────────────────────────
console.log('\n=== retry with exponential backoff ===\n');

attempt = 0;

flakyApi().pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      const wait = retryCount * 100; // 100ms, 200ms, 300ms...
      console.log(`  will retry in ${wait}ms...`);
      return timer(wait);
    }
  }),
  catchError(err => of(`failed after retries: ${err.message}`))
).subscribe(v => console.log('  final:', v));

// ─── finalize ────────────────────────────────────────────────────────────────
setTimeout(() => {
  console.log('\n=== finalize — always runs on complete OR error (like finally) ===\n');

  of(1, 2, 3)
    .pipe(
      tap(v => { if (v === 2) throw new Error('oops'); }),
      catchError(err => {
        console.log('  error caught:', err.message);
        return of(-1);
      }),
      finalize(() => console.log('  finalize: always runs (hide spinner, close connection)'))
    )
    .subscribe(v => console.log('  value:', v));

  // finalize is where you'd hide a loading spinner in Angular
}, 600);
