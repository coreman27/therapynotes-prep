# Angular: HttpClient, Interceptors, and State Management

## HttpClient

```typescript
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly baseUrl = '/api/patients';

  constructor(private http: HttpClient) {}

  getAll(filters?: PatientFilters): Observable<Patient[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.providerId) params = params.set('providerId', filters.providerId);

    return this.http.get<Patient[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`);
  }

  create(request: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, request);
  }

  update(id: number, request: UpdatePatientRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${id}`, request);
  }

  patch(id: number, changes: Partial<Patient>): Observable<Patient> {
    return this.http.patch<Patient>(`${this.baseUrl}/${id}`, changes);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Full response with status and headers
  getWithHeaders(id: number): Observable<HttpResponse<Patient>> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`, { observe: 'response' });
  }
}
```

## HTTP Interceptors (Functional — Angular 15+)

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

// Add Authorization header
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) return next(req);

  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  return next(authReq);
};

// Error handling interceptor
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          router.navigate(['/login']);
          break;
        case 403:
          notificationService.error('Permission denied');
          break;
        case 404:
          notificationService.error('Resource not found');
          break;
        case 500:
          notificationService.error('Server error. Please try again.');
          break;
      }
      return throwError(() => error);
    })
  );
};

// Loading indicator interceptor
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  loadingService.show();
  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};

// Register in app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor])
    )
  ]
};
```

## State Management Patterns

### Service + BehaviorSubject (Simple/Preferred for most cases)

```typescript
@Injectable({ providedIn: 'root' })
export class PatientStateService {
  private readonly patients$ = new BehaviorSubject<Patient[]>([]);
  private readonly selectedPatient$ = new BehaviorSubject<Patient | null>(null);
  private readonly loading$ = new BehaviorSubject<boolean>(false);

  // Public read-only observables
  readonly patients = this.patients$.asObservable();
  readonly selectedPatient = this.selectedPatient$.asObservable();
  readonly loading = this.loading$.asObservable();

  constructor(private http: HttpClient) {}

  loadAll(): void {
    this.loading$.next(true);
    this.http.get<Patient[]>('/api/patients').pipe(
      finalize(() => this.loading$.next(false))
    ).subscribe({
      next: patients => this.patients$.next(patients),
      error: err => console.error(err)
    });
  }

  select(patient: Patient): void {
    this.selectedPatient$.next(patient);
  }

  add(patient: Patient): void {
    this.patients$.next([...this.patients$.getValue(), patient]);
  }

  update(updated: Patient): void {
    const patients = this.patients$.getValue().map(p =>
      p.id === updated.id ? updated : p
    );
    this.patients$.next(patients);
  }

  remove(id: number): void {
    this.patients$.next(this.patients$.getValue().filter(p => p.id !== id));
  }
}

// Component
@Component({ ... })
export class PatientListComponent implements OnInit {
  patients$ = this.state.patients;
  loading$ = this.state.loading;

  constructor(private state: PatientStateService) {}

  ngOnInit(): void {
    this.state.loadAll();
  }
}
```

### Angular Signals (Angular 16+)

```typescript
import { signal, computed, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PatientSignalService {
  readonly patients = signal<Patient[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly loading = signal(false);

  // Computed — automatically recalculates when deps change
  readonly selectedPatient = computed(() =>
    this.patients().find(p => p.id === this.selectedId()) ?? null
  );

  readonly activePatients = computed(() =>
    this.patients().filter(p => p.isActive)
  );

  // Effect — runs side effects when signals change
  private logEffect = effect(() => {
    console.log('Selected patient:', this.selectedPatient());
  });

  updatePatient(updated: Patient): void {
    this.patients.update(patients =>
      patients.map(p => p.id === updated.id ? updated : p)
    );
  }
}

// Component with signals
@Component({
  template: `
    @for (patient of patients(); track patient.id) {
      <li>{{ patient.name }}</li>
    }
  `
})
export class PatientListComponent {
  patients = this.service.patients;  // signal, not observable

  constructor(private service: PatientSignalService) {}
}
```
