# Angular: Routing

## Route Configuration

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { patientResolver } from './resolvers/patient.resolver';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'patients',
    canActivate: [authGuard],
    children: [
      { path: '', component: PatientListComponent },
      {
        path: ':id',
        component: PatientDetailComponent,
        resolve: { patient: patientResolver },
        canDeactivate: [unsavedChangesGuard]
      },
      { path: 'new', component: PatientFormComponent }
    ]
  },

  // Lazy loading (critical for performance)
  {
    path: 'billing',
    loadChildren: () => import('./billing/billing.routes').then(m => m.BILLING_ROUTES)
  },

  // Standalone component lazy loading
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(c => c.ReportsComponent)
  },

  { path: '**', component: NotFoundComponent }
];
```

## Route Guards (Functional Style — Angular 15.2+)

```typescript
// Auth guard
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Role guard
export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    return roles.some(role => authService.hasRole(role));
  };
};

// Usage
{ path: 'admin', canActivate: [roleGuard(['admin', 'superuser'])] }

// Unsaved changes guard
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  return confirm('Discard unsaved changes?');
};

// Async guard (e.g., fetch permissions from API)
export const featureGuard: CanActivateFn = () => {
  const featureService = inject(FeatureService);
  return featureService.isEnabled('billing').pipe(
    map(enabled => enabled || inject(Router).createUrlTree(['/not-authorized']))
  );
};
```

## Route Resolvers

Pre-fetch data before the component activates. Component gets data from route snapshot.

```typescript
// Functional resolver (Angular 15.2+)
export const patientResolver: ResolveFn<Patient> = (route) => {
  const patientService = inject(PatientService);
  const router = inject(Router);
  const id = +route.paramMap.get('id')!;

  return patientService.getById(id).pipe(
    catchError(() => {
      router.navigate(['/not-found']);
      return EMPTY;
    })
  );
};

// Component reads resolved data
@Component({ ... })
export class PatientDetailComponent implements OnInit {
  patient!: Patient;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.patient = this.route.snapshot.data['patient'];
    // or observable: this.route.data.pipe(map(d => d['patient']))
  }
}
```

## Reading Route Information

```typescript
@Component({ ... })
export class PatientDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Snapshot (static, doesn't update if route param changes for same component)
    const id = this.route.snapshot.paramMap.get('id');
    const tab = this.route.snapshot.queryParamMap.get('tab');

    // Observable (reactive, handles reuse when params change)
    this.route.paramMap.pipe(
      switchMap(params => this.service.getById(+params.get('id')!)),
      takeUntil(this.destroy$)
    ).subscribe(patient => this.patient = patient);
  }

  navigate(): void {
    // Imperative navigation
    this.router.navigate(['/patients', this.patient.id], {
      queryParams: { tab: 'appointments' }
    });

    // Relative navigation
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
```

## Router Link

```html
<!-- Basic -->
<a routerLink="/patients">Patients</a>

<!-- With params -->
<a [routerLink]="['/patients', patient.id]">{{ patient.name }}</a>

<!-- With query params -->
<a [routerLink]="['/patients']" [queryParams]="{ status: 'active' }">Active Patients</a>

<!-- Active class -->
<a routerLink="/patients" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
  Patients
</a>
```

## Router Events (for loading indicators, analytics)

```typescript
@Component({ ... })
export class AppComponent {
  loading = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart || e instanceof NavigationEnd),
    ).subscribe(event => {
      this.loading = event instanceof NavigationStart;
    });
  }
}
```
