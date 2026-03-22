/**
 * RxJS 05: Combination Operators — forkJoin, combineLatest, withLatestFrom
 * Run: node 05_combination.js
 *
 * These operators merge multiple observables together.
 */

import { forkJoin, combineLatest, BehaviorSubject, of } from 'rxjs';
import { delay, map, withLatestFrom } from 'rxjs/operators';

// Simulate API calls
const getPatient = id => of({ id, name: `Patient ${id}` }).pipe(delay(100));
const getAppointments = id => of([`Appt A for ${id}`, `Appt B for ${id}`]).pipe(delay(150));
const getInsurance = id => of({ plan: 'BlueCross' }).pipe(delay(80));

// ─── forkJoin ────────────────────────────────────────────────────────────────
console.log('=== forkJoin — wait for ALL to complete, emit once ===');
console.log('  Like Promise.all — parallel requests, single result\n');

forkJoin({
  patient: getPatient(42),
  appointments: getAppointments(42),
  insurance: getInsurance(42),
}).subscribe(result => {
  console.log('  All loaded at once:');
  console.log('  patient:', result.patient);
  console.log('  appointments:', result.appointments);
  console.log('  insurance:', result.insurance);
});

// KEY: forkJoin only works if ALL observables complete.
// If any never completes (like a BehaviorSubject), forkJoin hangs forever.

setTimeout(() => {
  // ─── combineLatest ─────────────────────────────────────────────────────────
  console.log('\n=== combineLatest — emits when ANY source emits, with latest from ALL ===');
  console.log('  Use for: form with multiple filters, live dashboard\n');

  const statusFilter$ = new BehaviorSubject('active');
  const providerFilter$ = new BehaviorSubject('all');
  const searchTerm$ = new BehaviorSubject('');

  combineLatest([statusFilter$, providerFilter$, searchTerm$])
    .pipe(
      map(([status, provider, search]) => ({ status, provider, search }))
    )
    .subscribe(filters => {
      console.log('  filters changed:', filters);
      // In Angular: would trigger a filtered patient list re-fetch
    });

  // Each time any filter changes, combineLatest re-emits with all latest values
  setTimeout(() => statusFilter$.next('inactive'), 50);
  setTimeout(() => providerFilter$.next('Dr. Smith'), 100);
  setTimeout(() => searchTerm$.next('alice'), 150);

}, 300);

setTimeout(() => {
  // ─── withLatestFrom ────────────────────────────────────────────────────────
  console.log('\n=== withLatestFrom — only trigger from SOURCE, grab latest from other ===');
  console.log('  Use for: save button that grabs latest form value\n');

  const saveClick$ = new BehaviorSubject('click');   // the trigger
  const formValue$ = new BehaviorSubject({ name: 'Alice', dob: '1990-01-01' });

  saveClick$.pipe(
    withLatestFrom(formValue$)  // when saveClick$ fires, grab latest formValue$
  ).subscribe(([_click, formData]) => {
    console.log('  saving form data:', formData);
    // Only fires when user clicks save — not every time form changes
  });

  // Change the form (withLatestFrom does NOT re-emit for this)
  formValue$.next({ name: 'Alice Updated', dob: '1990-01-01' });

  // Save click fires — grabs the LATEST form value
  setTimeout(() => saveClick$.next('click'), 100);

}, 700);

/**
 * KEY DIFFERENCE:
 *
 *  forkJoin        — parallel calls, one final result (like Promise.all)
 *  combineLatest   — re-emits whenever ANY source changes (live/reactive)
 *  withLatestFrom  — only reacts to ONE source, samples the other
 */
