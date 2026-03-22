/**
 * RxJS 08: Real-World Scenario — Search-as-you-type with debounce
 * Run: node 08_real_world.js
 *
 * This simulates exactly what happens in an Angular patient search:
 *  1. User types in a search box
 *  2. We debounce (wait for them to pause)
 *  3. Skip if value hasn't changed
 *  4. Cancel any in-flight request (switchMap)
 *  5. Handle errors gracefully
 *  6. Show loading state
 */

import { Subject, of, throwError } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  tap,
  filter,
} from 'rxjs/operators';

// Simulate a patient search API
let callCount = 0;
const searchApi = (query) => {
  callCount++;
  const thisCall = callCount;
  console.log(`    [API] call #${thisCall} — searching "${query}"...`);

  return new Subject().pipe(
    // Fake: resolve after 200ms with results
    // In real Angular this is: this.http.get(`/api/patients?q=${query}`)
  );
};

// Better simulation
const fakeSearch = (query) => {
  const id = ++callCount;
  console.log(`    [API #${id}] started: "${query}"`);

  return new Promise(resolve =>
    setTimeout(() => {
      console.log(`    [API #${id}] resolved: "${query}"`);
      resolve([`Patient matching "${query}"`]);
    }, 200)
  );
};

import { from } from 'rxjs';

// ─── The full search pipeline ─────────────────────────────────────────────────

const searchInput$ = new Subject(); // in Angular: this.searchControl.valueChanges
let isLoading = false;

searchInput$.pipe(
  debounceTime(300),           // wait 300ms after last keystroke
  distinctUntilChanged(),      // skip if same as last value
  filter(q => q.length >= 2), // don't search for 0 or 1 char
  tap(q => {
    isLoading = true;
    console.log(`  [UI] showing spinner, searching: "${q}"`);
  }),
  switchMap(query =>           // cancel previous request, start new
    from(fakeSearch(query)).pipe(
      catchError(err => {
        console.log('  [UI] search failed:', err.message);
        return of([]);         // return empty results on error
      })
    )
  ),
  tap(() => {
    isLoading = false;
    console.log('  [UI] hiding spinner');
  })
).subscribe(results => {
  console.log('  [UI] displaying results:', results);
});

// ─── Simulate user typing ─────────────────────────────────────────────────────

console.log('User starts typing...\n');

// User types "a", "al", "ali", "alic", "alice" quickly
// Only "alice" (the last one after the pause) should trigger the API
searchInput$.next('a');
setTimeout(() => searchInput$.next('al'), 50);
setTimeout(() => searchInput$.next('ali'), 100);
setTimeout(() => searchInput$.next('alic'), 150);
setTimeout(() => searchInput$.next('alice'), 200);

// After 600ms, user types another search — switchMap cancels "alice" if still in-flight
setTimeout(() => {
  console.log('\nUser types a new query...\n');
  searchInput$.next('bob');
  setTimeout(() => searchInput$.next('bob'), 50);   // same value — distinctUntilChanged skips
  setTimeout(() => searchInput$.next('bobby'), 100);
}, 800);

/**
 * WHAT THIS DEMONSTRATES:
 *
 * Without debounceTime: API called on EVERY keystroke (dozens of calls)
 * Without distinctUntilChanged: API called even when value hasn't changed
 * Without switchMap: old requests can arrive AFTER newer ones (race condition)
 *
 * Together: exactly one API call per meaningful search, results always fresh.
 */
