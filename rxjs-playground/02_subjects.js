/**
 * RxJS 02: Subjects
 * Run: node 02_subjects.js
 *
 * A Subject is BOTH an Observable (you can subscribe to it)
 * AND an Observer (you can push values into it manually).
 * Think of it as a microphone + speaker combo.
 */

import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

console.log('=== Subject — late subscriber misses past values ===');
const subject$ = new Subject();

subject$.next('before any subscriber');  // nobody listening — LOST

const sub1 = subject$.subscribe(v => console.log('  sub1 got:', v));
subject$.next('after sub1');             // sub1 hears this

const sub2 = subject$.subscribe(v => console.log('  sub2 got:', v));
subject$.next('after both');             // both hear this

sub1.unsubscribe();
subject$.next('sub1 left');              // only sub2 hears this

// Output shows sub2 missed "after sub1" — that's the key gotcha with plain Subject

console.log('\n=== BehaviorSubject — holds current value, late subscribers get it ===');
// BehaviorSubject requires an INITIAL value
const currentUser$ = new BehaviorSubject(null);  // starts as null (no user logged in)

// Late subscriber immediately gets the current value
currentUser$.subscribe(v => console.log('  listener A sees:', v));

currentUser$.next({ name: 'Alice' });            // user logs in

// This subscriber joins AFTER Alice logged in — still gets Alice
currentUser$.subscribe(v => console.log('  listener B sees:', v));

currentUser$.next({ name: 'Bob' });              // user changes

// You can also read the current value synchronously (no subscribe needed)
console.log('  current value right now:', currentUser$.getValue());

/**
 * BehaviorSubject is what you'll use most in Angular services.
 * Classic pattern:
 *
 *   private patients$ = new BehaviorSubject<Patient[]>([]);
 *   readonly patients = this.patients$.asObservable();  // hide the .next() from outside
 *
 * Components subscribe to `patients` and always get the current list immediately.
 */

console.log('\n=== ReplaySubject — replays last N values to new subscribers ===');
const replay$ = new ReplaySubject(2);  // remember last 2

replay$.next('msg1');
replay$.next('msg2');
replay$.next('msg3');

// Late subscriber gets msg2 and msg3 (the last 2)
replay$.subscribe(v => console.log('  late subscriber got:', v));
