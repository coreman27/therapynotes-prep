# C# Language Features

## Async / Await (High Priority)

### How it works
`async`/`await` is syntactic sugar over the Task Parallel Library. The method returns a `Task` and the compiler builds a state machine.

```csharp
// The two forms are equivalent in behavior
public async Task<Patient> GetPatientAsync(int id)
{
    var patient = await _repo.GetByIdAsync(id);
    return patient;
}

// Without async/await (avoid this style)
public Task<Patient> GetPatientAsync(int id) => _repo.GetByIdAsync(id);
```

### Common traps

```csharp
// TRAP 1: async void — only valid for event handlers, exceptions are unhandled
public async void OnButtonClick() { ... }  // bad in services
public async Task DoWorkAsync() { ... }    // correct

// TRAP 2: .Result / .Wait() causes deadlocks in ASP.NET contexts
var result = GetPatientAsync(1).Result;  // DEADLOCK risk
var result = await GetPatientAsync(1);   // correct

// TRAP 3: Not awaiting causes fire-and-forget bugs
public async Task ProcessAsync()
{
    SaveToDatabase();  // NOT awaited — exceptions swallowed, ordering unpredictable
    await SaveToDatabase();  // correct
}

// TRAP 4: ConfigureAwait(false) — use in library code to avoid capturing sync context
var data = await _repo.GetAsync().ConfigureAwait(false);
```

### Task.WhenAll vs Task.WhenAny

```csharp
// Run in parallel, wait for all
var tasks = patientIds.Select(id => _repo.GetByIdAsync(id));
var patients = await Task.WhenAll(tasks);

// Wait for first to complete
var fastest = await Task.WhenAny(task1, task2);
```

### CancellationToken — expect this in senior assessments

```csharp
public async Task<IEnumerable<Patient>> SearchAsync(
    string query, CancellationToken ct = default)
{
    return await _context.Patients
        .Where(p => p.Name.Contains(query))
        .ToListAsync(ct);  // passes CT to EF Core
}
```

---

## LINQ (Know these operators)

```csharp
var patients = new List<Patient> { ... };

// Filtering
var active = patients.Where(p => p.IsActive);

// Projection
var names = patients.Select(p => p.FullName);

// Flattening
var allAppointments = patients.SelectMany(p => p.Appointments);

// Aggregates
var count = patients.Count(p => p.IsActive);
var avgAge = patients.Average(p => p.Age);

// Ordering
var sorted = patients.OrderBy(p => p.LastName).ThenBy(p => p.FirstName);

// Grouping
var byProvider = patients.GroupBy(p => p.ProviderId);

// Joining
var result = patients.Join(
    appointments,
    p => p.Id,
    a => a.PatientId,
    (p, a) => new { p.Name, a.Date }
);

// First/Single
var p1 = patients.FirstOrDefault(p => p.Id == 1);  // null if not found
var p2 = patients.SingleOrDefault(p => p.Id == 1); // throws if >1 found
var p3 = patients.First(p => p.IsActive);          // throws if empty

// Deferred vs Immediate execution
var query = patients.Where(p => p.IsActive);  // DEFERRED — not executed yet
var list = query.ToList();                    // IMMEDIATE — executes now
var any = patients.Any(p => p.IsActive);      // IMMEDIATE
```

### LINQ gotcha — deferred execution

```csharp
var query = _context.Patients.Where(p => p.IsActive);  // IQueryable, not executed
// If context is disposed here, the next line throws
var results = query.ToList();  // executes HERE — SQL sent to DB
```

---

## Generics

```csharp
public class Repository<T> where T : class, IEntity
{
    private readonly AppDbContext _context;
    private readonly DbSet<T> _set;

    public Repository(AppDbContext context)
    {
        _context = context;
        _set = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id) => await _set.FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync() => await _set.ToListAsync();
}

// Constraints
public class GenericService<T>
    where T : class           // reference type
    where T : new()           // has parameterless constructor
    where T : IComparable<T>  // implements interface
    where T : BaseEntity      // inherits from class
```

---

## Delegates, Func, Action, Events

```csharp
// Delegate type
public delegate void AppointmentHandler(Appointment appt);

// Func<TIn, TOut> — has return value
Func<int, Task<Patient>> getPatient = id => _repo.GetByIdAsync(id);

// Action<T> — no return value
Action<string> log = msg => Console.WriteLine(msg);

// Predicate<T> — returns bool (shorthand for Func<T, bool>)
Predicate<Patient> isActive = p => p.IsActive;

// Events
public class AppointmentService
{
    public event EventHandler<AppointmentEventArgs> Created;

    protected virtual void OnCreated(AppointmentEventArgs e)
        => Created?.Invoke(this, e);
}
```

---

## Nullable Reference Types (C# 8+)

```csharp
// Enable in .csproj: <Nullable>enable</Nullable>

string name = null;      // WARNING: non-nullable
string? name = null;     // OK: nullable

public Patient? GetPatient(int id) => _repo.Find(id);  // may return null

// Null-coalescing
var name = patient?.Name ?? "Unknown";

// Null-conditional
var city = patient?.Address?.City;

// Null-forgiving operator (use sparingly)
var name = patient!.Name;  // tells compiler "I know this isn't null"
```

---

## Records (C# 9+)

```csharp
// Immutable by default, value equality, with-expressions
public record PatientDto(int Id, string Name, DateTime DateOfBirth);

var p1 = new PatientDto(1, "Alice", new DateTime(1990, 1, 1));
var p2 = p1 with { Name = "Bob" };  // creates a copy with Name changed

// Records are equal if all properties are equal
Console.WriteLine(p1 == new PatientDto(1, "Alice", new DateTime(1990, 1, 1)));  // true
```

---

## Pattern Matching (C# 8+)

```csharp
// Switch expression
string GetBillingType(PaymentMethod method) => method switch
{
    PaymentMethod.Insurance => "Insurance",
    PaymentMethod.SelfPay => "Self-Pay",
    PaymentMethod.Sliding => "Sliding Scale",
    _ => "Unknown"
};

// Property pattern
string Describe(Patient p) => p switch
{
    { IsActive: true, Age: > 65 } => "Active Senior",
    { IsActive: true } => "Active Patient",
    _ => "Inactive"
};
```

---

## Exception Handling Best Practices

```csharp
// Specific exceptions first, general last
try
{
    var patient = await _repo.GetByIdAsync(id);
}
catch (NotFoundException ex)
{
    _logger.LogWarning(ex, "Patient {Id} not found", id);
    return NotFound();
}
catch (DbUpdateConcurrencyException ex)
{
    _logger.LogError(ex, "Concurrency conflict for patient {Id}", id);
    throw;  // re-throw preserves stack trace
}
catch (Exception ex) when (ex is not OutOfMemoryException)  // exception filter
{
    _logger.LogError(ex, "Unexpected error");
    throw;
}
```
