/**
 * RxJS 03: Core Operators — map, filter, tap, take, debounceTime, distinctUntilChanged
 * Run: node 03_operators.js
 *
 * Operators are functions you chain in .pipe() to transform the stream.
 * Think of pipe() like an assembly line — each operator does one job.
 */

import { of, from, interval } from 'rxjs';
import { map, filter, tap, take, distinctUntilChanged, scan } from 'rxjs/operators';

console.log('=== map() — transform each value ===');
// Like Array.map but for streams
of(1, 2, 3, 4, 5)
  .pipe(
    map(n => n * 10)     // multiply each by 10
  )
  .subscribe(v => console.log('  ', v));

console.log('\n=== filter() — only pass matching values ===');
of(1, 2, 3, 4, 5)
  .pipe(
    filter(n => n % 2 === 0)  // only even numbers
  )
  .subscribe(v => console.log('  ', v));

console.log('\n=== tap() — side effect without changing the value ===');
// tap is like a "peek" — great for logging, doesn't affect the stream
of(1, 2, 3)
  .pipe(
    tap(v => console.log('  before map:', v)),   // log original
    map(v => v * 100),
    tap(v => console.log('  after map:', v)),    // log transformed
  )
  .subscribe();  // values already logged by tap, no need to log again

console.log('\n=== chaining operators — build a pipeline ===');
// Simulate a list of patients, extract only active ones, format names
const patients = [
  { id: 1, name: 'alice smith', isActive: true },
  { id: 2, name: 'bob jones', isActive: false },
  { id: 3, name: 'carol white', isActive: true },
  { id: 4, name: 'dave brown', isActive: false },
];

from(patients)
  .pipe(
    filter(p => p.isActive),                          // only active
    map(p => p.name.replace(/\b\w/g, c => c.toUpperCase())),  // title case
    tap(name => console.log('  processing:', name))
  )
  .subscribe(name => console.log('  result:', name));

console.log('\n=== distinctUntilChanged() — skip duplicate consecutive values ===');
// Great for search inputs — don't fire if user types then deletes back to same value
of('a', 'a', 'b', 'b', 'b', 'c', 'a')
  .pipe(
    distinctUntilChanged()
  )
  .subscribe(v => console.log('  ', v));
// Output: a, b, c, a — duplicates in a row are skipped

console.log('\n=== scan() — running accumulation (like Array.reduce but continuous) ===');
// Each emission adds to running total — useful for counters, state accumulation
of(10, 20, 30, 40)
  .pipe(
    scan((total, current) => total + current, 0)  // running sum, starting at 0
  )
  .subscribe(v => console.log('  running total:', v));

console.log('\n=== take() — complete after N emissions ===');
// Without take(), interval() runs forever
interval(50)
  .pipe(take(4))
  .subscribe({
    next: v => console.log('  tick:', v),
    complete: () => console.log('  stopped after 4'),
  });
