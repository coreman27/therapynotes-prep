/**
 * RxJS 04: The *Map Family — THE most tested RxJS topic
 * Run: node 04_switchmap_family.js
 *
 * These operators handle the pattern: "when this emits, start another observable"
 * The difference is WHAT HAPPENS to the previous inner observable when a new one starts.
 *
 * Real-world analogy: You're calling a restaurant to place an order.
 *
 *  switchMap  — hang up and call again (cancel old, start new)
 *  mergeMap   — call on multiple lines simultaneously (run all at once)
 *  concatMap  — wait on hold until previous call finishes (queue)
 *  exhaustMap — busy signal until current call finishes (ignore new)
 */

import { Subject, of, timer } from 'rxjs';
import { switchMap, mergeMap, concatMap, exhaustMap, tap, delay } from 'rxjs/operators';

// Helper: simulate an async API call that takes `ms` milliseconds
// Returns the label when done
const fakeApiCall = (label, ms) =>
  of(label).pipe(
    delay(ms),
    tap(() => console.log(`    ✓ ${label} completed after ${ms}ms`))
  );

// ─── switchMap ────────────────────────────────────────────────────────────────
console.log('=== switchMap — cancels previous, starts new ===');
console.log('  Use for: search-as-you-type, route param changes');
console.log('  Scenario: user types "a", then "ab", then "abc" quickly\n');

const search$ = new Subject();

search$.pipe(
  switchMap(query => fakeApiCall(`search("${query}")`, 200))
).subscribe(result => console.log('  result:', result));

search$.next('a');   // starts search("a")
search$.next('ab');  // cancels search("a"), starts search("ab")
search$.next('abc'); // cancels search("ab"), starts search("abc")
// Only search("abc") will complete

setTimeout(() => {
  // ─── mergeMap ──────────────────────────────────────────────────────────────
  console.log('\n=== mergeMap — runs all concurrently ===');
  console.log('  Use for: parallel requests where order does not matter');
  console.log('  Scenario: load profile for 3 patients simultaneously\n');

  const patientIds$ = new Subject();

  patientIds$.pipe(
    mergeMap(id => fakeApiCall(`patient(${id})`, 150 - id * 10)) // faster for higher IDs
  ).subscribe(result => console.log('  loaded:', result));

  patientIds$.next(1);  // starts all 3...
  patientIds$.next(2);  //   ...concurrently
  patientIds$.next(3);  // results arrive in completion order (3, 2, 1 since 3 is fastest)

}, 400);

setTimeout(() => {
  // ─── concatMap ─────────────────────────────────────────────────────────────
  console.log('\n=== concatMap — queues, runs one at a time in order ===');
  console.log('  Use for: sequential saves, ordered processing\n');

  const saves$ = new Subject();

  saves$.pipe(
    concatMap(item => fakeApiCall(`save(${item})`, 100))
  ).subscribe(result => console.log('  saved:', result));

  saves$.next('note-1');  // starts immediately
  saves$.next('note-2');  // waits for note-1 to finish
  saves$.next('note-3');  // waits for note-2 to finish
  // Always completes in order: note-1, note-2, note-3

}, 900);

setTimeout(() => {
  // ─── exhaustMap ────────────────────────────────────────────────────────────
  console.log('\n=== exhaustMap — ignores new emissions while busy ===');
  console.log('  Use for: login button, form submit — prevent double submit\n');

  const clicks$ = new Subject();

  clicks$.pipe(
    exhaustMap(() => fakeApiCall('login request', 300))
  ).subscribe(result => console.log('  response:', result));

  clicks$.next('click 1');  // starts login
  clicks$.next('click 2');  // IGNORED — still processing click 1
  clicks$.next('click 3');  // IGNORED — still processing click 1
  // Only ONE login request fires

  setTimeout(() => {
    clicks$.next('click 4'); // this one works — previous finished
  }, 350);

}, 1500);

/**
 * CHEAT SHEET:
 *
 *  switchMap  → search box, route changes           "cancel and restart"
 *  mergeMap   → parallel HTTP requests              "run all at once"
 *  concatMap  → sequential saves, analytics events  "wait your turn"
 *  exhaustMap → submit button, login                "I'm busy, try later"
 */
