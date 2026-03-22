/**
 * RxJS 07: Cleanup — takeUntil, unsubscribe, memory leaks
 * Run: node 07_cleanup.js
 *
 * The most common Angular bug: forgetting to unsubscribe.
 * A subscription to an interval/websocket/BehaviorSubject keeps running
 * even after the component is destroyed — causing memory leaks and
 * callbacks firing on destroyed components.
 */

import { interval, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

// ─── Manual unsubscribe ───────────────────────────────────────────────────────
console.log('=== Manual unsubscribe ===');

const sub = interval(100).subscribe(v => console.log('  tick:', v));

setTimeout(() => {
  sub.unsubscribe();        // stop the interval
  console.log('  unsubscribed — no more ticks');
}, 350);

// ─── takeUntil pattern ───────────────────────────────────────────────────────
setTimeout(() => {
  console.log('\n=== takeUntil — the Angular component pattern ===');
  console.log('  This is how you clean up in ngOnDestroy\n');

  // In Angular, this would be: private destroy$ = new Subject<void>();
  const destroy$ = new Subject();

  interval(100)
    .pipe(takeUntil(destroy$))  // auto-completes when destroy$ emits
    .subscribe({
      next: v => console.log('  interval:', v),
      complete: () => console.log('  stream completed cleanly'),
    });

  // In Angular, you call this in ngOnDestroy()
  setTimeout(() => {
    console.log('  component destroyed — calling destroy$.next()');
    destroy$.next(null);   // emits → takeUntil sees it → stream completes
    destroy$.complete();   // clean up the subject itself
  }, 350);

}, 500);

// ─── Memory leak demo ─────────────────────────────────────────────────────────
setTimeout(() => {
  console.log('\n=== What a memory leak looks like ===\n');

  // Simulates creating a component 3 times without unsubscribing
  for (let i = 1; i <= 3; i++) {
    interval(200)
      .pipe(take(3))
      // No takeUntil, no unsubscribe — in a real app these pile up
      .subscribe(v => console.log(`  component-${i} still alive, tick: ${v}`));
  }

  // All 3 "components" are running simultaneously
  // In Angular, if you navigate away without cleanup,
  // old component subscriptions keep firing on the destroyed component

}, 1100);

/**
 * ANGULAR CLEANUP PATTERNS (ranked):
 *
 * 1. async pipe in template          — auto-unsubscribes, preferred
 * 2. takeUntilDestroyed() (ng16+)    — inject DestroyRef, no ngOnDestroy needed
 * 3. takeUntil(this.destroy$)        — classic pattern
 * 4. manual sub.unsubscribe()        — fine for a single subscription
 *
 * Rule of thumb: if you manually .subscribe() in a component, you must unsubscribe.
 * If you use the async pipe, Angular handles it for you.
 */
