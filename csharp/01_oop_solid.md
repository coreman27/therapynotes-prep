# OOP, SOLID, and Design Patterns

## SOLID Principles (Know these cold)

### S — Single Responsibility
Each class does one thing. A `PatientService` handles patient data; it doesn't also send emails.

```csharp
// BAD
public class PatientService
{
    public Patient GetPatient(int id) { ... }
    public void SendWelcomeEmail(Patient p) { ... }  // wrong class
}

// GOOD
public class PatientService { public Patient GetPatient(int id) { ... } }
public class EmailService { public void SendWelcomeEmail(Patient p) { ... } }
```

### O — Open/Closed
Open for extension, closed for modification. Use abstractions.

```csharp
public abstract class BillingCalculator
{
    public abstract decimal Calculate(Appointment appt);
}

public class InsuranceBilling : BillingCalculator
{
    public override decimal Calculate(Appointment appt) => appt.Rate * 0.8m;
}

public class SelfPayBilling : BillingCalculator
{
    public override decimal Calculate(Appointment appt) => appt.Rate;
}
// Adding a new billing type doesn't touch existing classes
```

### L — Liskov Substitution
Subtypes must be substitutable for base types without breaking behavior.

```csharp
// VIOLATION: Square overrides SetWidth but Square can't behave like Rectangle
public class Rectangle { public virtual int Width { get; set; } public virtual int Height { get; set; } }
public class Square : Rectangle
{
    public override int Width { set { base.Width = base.Height = value; } }  // breaks LSP
}
```

### I — Interface Segregation
Don't force clients to implement interfaces they don't use. Prefer many small interfaces.

```csharp
// BAD — forces all "users" to implement scheduling even if they don't schedule
public interface IUser { string Name { get; } void Schedule(); void GenerateReport(); }

// GOOD
public interface IUser { string Name { get; } }
public interface ISchedulable { void Schedule(); }
public interface IReportable { void GenerateReport(); }
```

### D — Dependency Inversion
Depend on abstractions, not concretions. High-level modules shouldn't depend on low-level modules.

```csharp
// BAD
public class AppointmentService
{
    private readonly SqlPatientRepository _repo = new SqlPatientRepository();  // concrete
}

// GOOD
public class AppointmentService
{
    private readonly IPatientRepository _repo;
    public AppointmentService(IPatientRepository repo) { _repo = repo; }  // injected abstraction
}
```

---

## Key Design Patterns

### Repository Pattern
Abstracts data access behind an interface — very common in .NET + EF Core.

```csharp
public interface IPatientRepository
{
    Task<Patient> GetByIdAsync(int id);
    Task<IEnumerable<Patient>> GetAllAsync();
    Task AddAsync(Patient patient);
    Task UpdateAsync(Patient patient);
    Task DeleteAsync(int id);
}

public class PatientRepository : IPatientRepository
{
    private readonly AppDbContext _context;
    public PatientRepository(AppDbContext context) { _context = context; }

    public async Task<Patient> GetByIdAsync(int id) =>
        await _context.Patients.FindAsync(id);
}
```

### Factory Pattern
Creates objects without exposing instantiation logic.

```csharp
public interface IDocumentFactory { IDocument Create(string type); }

public class DocumentFactory : IDocumentFactory
{
    public IDocument Create(string type) => type switch
    {
        "SOAP" => new SoapNote(),
        "Progress" => new ProgressNote(),
        _ => throw new ArgumentException($"Unknown type: {type}")
    };
}
```

### Decorator Pattern
Add behavior to objects without modifying their class.

```csharp
public class LoggingPatientRepository : IPatientRepository
{
    private readonly IPatientRepository _inner;
    private readonly ILogger _logger;

    public LoggingPatientRepository(IPatientRepository inner, ILogger logger)
    { _inner = inner; _logger = logger; }

    public async Task<Patient> GetByIdAsync(int id)
    {
        _logger.LogInformation("Fetching patient {Id}", id);
        return await _inner.GetByIdAsync(id);
    }
}
```

### Strategy Pattern
Encapsulates interchangeable algorithms.

```csharp
public interface INotificationStrategy { Task SendAsync(string message, string recipient); }

public class EmailNotification : INotificationStrategy { ... }
public class SmsNotification : INotificationStrategy { ... }

public class NotificationService
{
    private readonly INotificationStrategy _strategy;
    public NotificationService(INotificationStrategy strategy) { _strategy = strategy; }
    public Task NotifyAsync(string msg, string to) => _strategy.SendAsync(msg, to);
}
```

### Observer / Event Pattern
Objects subscribe to events from a publisher.

```csharp
public class AppointmentService
{
    public event EventHandler<Appointment> AppointmentCreated;

    public void CreateAppointment(Appointment appt)
    {
        // ... save to db
        AppointmentCreated?.Invoke(this, appt);
    }
}
```

---

## MCQ Traps to Watch For

- **Abstract class vs interface**: Abstract class can have state/implementation; interfaces (pre-C#8) are pure contracts. C#8+ interfaces can have default implementations.
- **`sealed` class**: Cannot be inherited. Use for security-sensitive classes or performance optimization.
- **`virtual` vs `abstract`**: virtual has a default implementation; abstract forces override.
- **`new` vs `override`**: `override` participates in polymorphism; `new` hides the base method and breaks polymorphism.

```csharp
Base b = new Derived();
b.Method();  // calls Derived.Method() if override; calls Base.Method() if new
```
