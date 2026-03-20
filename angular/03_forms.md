# Angular: Forms

Two approaches: Reactive Forms (preferred for complex forms) and Template-Driven Forms.

## Reactive Forms

```typescript
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-patient-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="firstName" />
      <div *ngIf="firstName.invalid && firstName.touched">
        <span *ngIf="firstName.errors?.['required']">Required</span>
        <span *ngIf="firstName.errors?.['minlength']">Min 2 characters</span>
      </div>

      <div formGroupName="address">
        <input formControlName="street" />
        <input formControlName="city" />
      </div>

      <div formArrayName="phoneNumbers">
        <div *ngFor="let phone of phones.controls; let i = index">
          <input [formControlName]="i" />
          <button type="button" (click)="removePhone(i)">Remove</button>
        </div>
      </div>
      <button type="button" (click)="addPhone()">Add Phone</button>

      <button type="submit" [disabled]="form.invalid">Save</button>
    </form>
  `
})
export class PatientFormComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', Validators.required],
      dateOfBirth: [null, Validators.required],
      email: ['', [Validators.email]],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        zip: ['', Validators.pattern(/^\d{5}(-\d{4})?$/)]
      }),
      phoneNumbers: this.fb.array([
        this.fb.control('', Validators.pattern(/^\d{10}$/))
      ])
    });
  }

  // Typed accessors
  get firstName() { return this.form.get('firstName')!; }
  get phones() { return this.form.get('phoneNumbers') as FormArray; }

  addPhone(): void {
    this.phones.push(this.fb.control(''));
  }

  removePhone(index: number): void {
    this.phones.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);  // typed values
    } else {
      this.form.markAllAsTouched();  // show all validation errors
    }
  }
}
```

## Custom Validators

```typescript
// Synchronous validator
export function noFutureDate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const date = new Date(control.value);
    return date > new Date() ? { futureDate: true } : null;
  };
}

// Async validator (e.g., check email uniqueness)
export function uniqueEmailValidator(service: PatientService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return timer(300).pipe(  // debounce
      switchMap(() => service.checkEmailExists(control.value)),
      map(exists => exists ? { emailTaken: true } : null),
      catchError(() => of(null))
    );
  };
}

// Cross-field validator (passwords match)
export function passwordsMatch(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password !== confirm ? { mismatch: true } : null;
  };
}

// Apply to FormGroup
this.fb.group({
  password: ['', Validators.required],
  confirmPassword: ['', Validators.required],
}, { validators: passwordsMatch() });
```

## Form State

```typescript
// Status
form.valid       // all validators pass
form.invalid     // any validator fails
form.pending     // async validator running
form.pristine    // not been modified
form.dirty       // has been modified
form.touched     // field has been blurred
form.untouched

// Methods
form.setValue({ firstName: 'Alice', ... });   // must set ALL fields
form.patchValue({ firstName: 'Alice' });       // set partial fields
form.reset();                                  // reset to initial state
form.markAllAsTouched();                       // trigger all error messages
form.disable(); / form.enable();

// Value changes
this.form.get('email')!.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(email => this.service.checkEmail(email))
).subscribe(...);
```

## Typed Forms (Angular 14+)

```typescript
// Strongly typed — TypeScript knows the shape of form.value
interface PatientForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  dateOfBirth: FormControl<Date | null>;
}

const form = new FormGroup<PatientForm>({
  firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  lastName: new FormControl('', { nonNullable: true }),
  dateOfBirth: new FormControl<Date | null>(null),
});

// form.value is typed: { firstName: string, lastName: string, dateOfBirth: Date | null }
```

## Template-Driven Forms

Simpler but less testable. Uses `ngModel`.

```html
<form #f="ngForm" (ngSubmit)="onSubmit(f)">
  <input
    name="firstName"
    [(ngModel)]="patient.firstName"
    required
    minlength="2"
    #firstName="ngModel"
  />
  <span *ngIf="firstName.invalid && firstName.touched">Required</span>
  <button [disabled]="f.invalid">Save</button>
</form>
```

**When to use which:**
- **Reactive**: Complex validation, dynamic fields, unit testing, async validators → use this for senior-level work
- **Template-driven**: Simple forms, quick prototypes, minimal logic
