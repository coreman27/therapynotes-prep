# Angular Coding Challenges

---

## Challenge 1: Patient Search Component

**Problem:** Build a `PatientSearchComponent` that:
- Has a text input for search
- Debounces input by 300ms
- Calls `PatientService.search(query)` which returns `Observable<Patient[]>`
- Shows results (or "No results" if empty)
- Cancels in-flight requests when new input arrives
- Properly unsubscribes on destroy
- Uses `OnPush` change detection

**Solution:**

```typescript
@Component({
  selector: 'app-patient-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input [formControl]="searchControl" placeholder="Search patients..." />

    @if (loading()) {
      <app-spinner />
    }

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @for (patient of results(); track patient.id) {
      <app-patient-card [patient]="patient" />
    } @empty {
      @if (!loading() && searchControl.value) {
        <p>No patients found.</p>
      }
    }
  `
})
export class PatientSearchComponent implements OnInit {
  searchControl = new FormControl('');
  results = signal<Patient[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private destroy$ = new Subject<void>();

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(query =>
        query?.trim()
          ? this.patientService.search(query).pipe(
              catchError(err => {
                this.error.set('Search failed. Please try again.');
                return of([]);
              })
            )
          : of([])
      ),
      takeUntil(this.destroy$)
    ).subscribe(patients => {
      this.results.set(patients);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## Challenge 2: Reactive Patient Form

**Problem:** Build a patient intake form with:
- First name, last name (required, min 2 chars)
- Date of birth (required, must be in the past)
- Email (optional, must be valid format)
- At least one phone number (FormArray, with add/remove)
- Show validation errors only after touched
- Disable submit button if invalid
- On submit, emit a `patientCreated` event with the form value

**Solution:**

```typescript
@Component({
  selector: 'app-patient-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">

      <label>First Name
        <input formControlName="firstName" />
        @if (firstName.invalid && firstName.touched) {
          <span>{{ getError(firstName) }}</span>
        }
      </label>

      <label>Last Name
        <input formControlName="lastName" />
      </label>

      <label>Date of Birth
        <input type="date" formControlName="dateOfBirth" />
        @if (dob.errors?.['futureDate'] && dob.touched) {
          <span>Date must be in the past</span>
        }
      </label>

      <label>Email
        <input formControlName="email" type="email" />
      </label>

      <div formArrayName="phones">
        @for (ctrl of phones.controls; track $index) {
          <input [formControlName]="$index" placeholder="Phone" />
          <button type="button" (click)="removePhone($index)">×</button>
        }
      </div>
      <button type="button" (click)="addPhone()">Add Phone</button>

      <button type="submit" [disabled]="form.invalid">Save Patient</button>
    </form>
  `
})
export class PatientFormComponent {
  @Output() patientCreated = new EventEmitter<CreatePatientRequest>();

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    dateOfBirth: [null as Date | null, [Validators.required, pastDateValidator()]],
    email: ['', [Validators.email]],
    phones: this.fb.array([this.fb.control('')])
  });

  get firstName() { return this.form.controls.firstName; }
  get dob() { return this.form.controls.dateOfBirth; }
  get phones() { return this.form.controls.phones; }

  constructor(private fb: FormBuilder) {}

  addPhone(): void {
    this.phones.push(this.fb.control(''));
  }

  removePhone(index: number): void {
    if (this.phones.length > 1) this.phones.removeAt(index);
  }

  getError(ctrl: AbstractControl): string {
    if (ctrl.errors?.['required']) return 'This field is required.';
    if (ctrl.errors?.['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.patientCreated.emit(this.form.value as CreatePatientRequest);
    this.form.reset();
  }
}

// Validator
export function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const date = new Date(control.value);
    return date >= new Date() ? { futureDate: true } : null;
  };
}
```

---

## Challenge 3: HTTP Interceptor — Auth + Retry

**Problem:** Write an HTTP interceptor that:
1. Adds `Authorization: Bearer <token>` to all requests (except `/auth/login`)
2. On 401 response, calls `authService.refresh()` and retries the original request once
3. If refresh fails, redirects to `/login`

**Solution:**

```typescript
export const authRetryInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.url.includes('/auth/login')) return next(req);

  const addToken = (request: HttpRequest<unknown>) => {
    const token = authService.getToken();
    return token
      ? request.clone({ headers: request.headers.set('Authorization', `Bearer ${token}`) })
      : request;
  };

  return next(addToken(req)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);

      // Try to refresh once
      return authService.refresh().pipe(
        switchMap(() => next(addToken(req))),  // retry with new token
        catchError(() => {
          router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    })
  );
};
```

---

## Challenge 4: State Service with BehaviorSubject

**Problem:** Build an `AppointmentStateService` that:
- Loads appointments from API
- Exposes loading, error, and data as observables
- Allows adding/updating/removing appointments from local state without re-fetching
- Exposes a `upcomingAppointments$` derived observable (filtered and sorted)

**Solution:**

```typescript
interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
}

const initialState: AppointmentState = { appointments: [], loading: false, error: null };

@Injectable({ providedIn: 'root' })
export class AppointmentStateService {
  private readonly state$ = new BehaviorSubject<AppointmentState>(initialState);

  readonly loading$ = this.state$.pipe(map(s => s.loading), distinctUntilChanged());
  readonly error$ = this.state$.pipe(map(s => s.error), distinctUntilChanged());
  readonly appointments$ = this.state$.pipe(map(s => s.appointments));

  readonly upcomingAppointments$ = this.appointments$.pipe(
    map(appts => appts
      .filter(a => a.date >= new Date() && a.status === 'Scheduled')
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    )
  );

  constructor(private http: HttpClient) {}

  loadAll(): void {
    this.patchState({ loading: true, error: null });
    this.http.get<Appointment[]>('/api/appointments').pipe(
      finalize(() => this.patchState({ loading: false }))
    ).subscribe({
      next: appointments => this.patchState({ appointments }),
      error: err => this.patchState({ error: 'Failed to load appointments.' })
    });
  }

  add(appointment: Appointment): void {
    this.patchState({
      appointments: [...this.state$.getValue().appointments, appointment]
    });
  }

  update(updated: Appointment): void {
    this.patchState({
      appointments: this.state$.getValue().appointments.map(a =>
        a.id === updated.id ? updated : a
      )
    });
  }

  remove(id: number): void {
    this.patchState({
      appointments: this.state$.getValue().appointments.filter(a => a.id !== id)
    });
  }

  private patchState(partial: Partial<AppointmentState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}
```
