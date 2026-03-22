/**
 * RxJS 01: Creating Observables
 * Run: node 01_creating.js
 *
 * An Observable is a stream of values over time.
 * Think of it like an array, but values can arrive now OR in the future.
 */

import { of, from, interval, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

console.log('=== of() ===');
// of() — emits each argument, then completes. Synchronous.
// Like giving someone a list: "here's 1, here's 2, here's 3, done."
of(1, 2, 3).subscribe({
  next: value => console.log('  got:', value),
  complete: () => console.log('  completed'),
});

console.log('\n=== from() ===');
// from() — converts an array (or Promise) into an observable
// Each array item becomes a separate emission
from(['Alice', 'Bob', 'Carol']).subscribe({
  next: name => console.log('  patient:', name),
  complete: () => console.log('  completed'),
});

console.log('\n=== new Observable() — custom ===');
// You control exactly when next/complete/error fire
const custom$ = new Observable(subscriber => {
  subscriber.next('first');
  subscriber.next('second');
  // Simulate async: emit after 100ms
  setTimeout(() => {
    subscriber.next('third (async)');
    subscriber.complete(); // tells subscriber "no more values coming"
  }, 100);
});

custom$.subscribe({
  next: v => console.log('  got:', v),
  complete: () => console.log('  completed'),
});

console.log('\n=== interval() — emits every N ms ===');
// interval() never completes on its own — we use take(3) to stop after 3 values
// Like a repeating timer
interval(200)          // emits 0, 1, 2, 3... every 200ms
  .pipe(take(3))       // stop after 3 emissions (auto-completes)
  .subscribe({
    next: v => console.log('  tick:', v),
    complete: () => console.log('  done ticking'),
  });

/**
 * KEY INSIGHT:
 * Nothing happens until you call .subscribe()
 * The observable is just a BLUEPRINT of what will happen.
 * subscribe() is what pulls the trigger.
 */
