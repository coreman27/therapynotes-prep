# C# Coding Challenges

---

## Challenge 1: Async Patient Lookup with Error Handling

**Problem:** Write an async service method that fetches a patient by ID. If not found, throw a custom `NotFoundException`. If the ID is invalid (<=0), throw `ArgumentException`. Log both errors. Method should accept a `CancellationToken`.

```csharp
// Your solution:
public async Task<Patient> GetPatientAsync(int id, CancellationToken ct = default)
{
    // ...
}
```

**Solution:**
```csharp
public async Task<Patient> GetPatientAsync(int id, CancellationToken ct = default)
{
    if (id <= 0)
        throw new ArgumentException("Patient ID must be positive.", nameof(id));

    var patient = await _repository.GetByIdAsync(id, ct);

    if (patient is null)
    {
        _logger.LogWarning("Patient with ID {Id} was not found.", id);
        throw new NotFoundException($"Patient {id} not found.");
    }

    return patient;
}
```

---

## Challenge 2: LINQ — Find Overdue Appointments

**Problem:** Given a list of `Appointment` objects with properties `PatientId`, `ProviderId`, `ScheduledDate`, `Status`, and `PatientName`: Return a list of `OverdueAppointmentDto` (PatientName, ScheduledDate, DaysOverdue) for appointments that are `"Scheduled"` and more than 2 days past their scheduled date. Sort by most overdue first.

```csharp
public record Appointment(int Id, string PatientName, DateTime ScheduledDate, string Status);
public record OverdueAppointmentDto(string PatientName, DateTime ScheduledDate, int DaysOverdue);
```

**Solution:**
```csharp
public IEnumerable<OverdueAppointmentDto> GetOverdueAppointments(
    IEnumerable<Appointment> appointments)
{
    var cutoff = DateTime.Today.AddDays(-2);

    return appointments
        .Where(a => a.Status == "Scheduled" && a.ScheduledDate < cutoff)
        .Select(a => new OverdueAppointmentDto(
            a.PatientName,
            a.ScheduledDate,
            (int)(DateTime.Today - a.ScheduledDate).TotalDays
        ))
        .OrderByDescending(a => a.DaysOverdue);
}
```

---

## Challenge 3: Generic Repository Interface

**Problem:** Design a generic `IRepository<T>` interface and implement a concrete `InMemoryRepository<T>` for testing. T must be a class with an `int Id` property.

**Solution:**
```csharp
public interface IEntity { int Id { get; } }

public interface IRepository<T> where T : class, IEntity
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}

public class InMemoryRepository<T> : IRepository<T> where T : class, IEntity
{
    private readonly Dictionary<int, T> _store = new();
    private int _nextId = 1;

    public Task<T?> GetByIdAsync(int id)
        => Task.FromResult(_store.TryGetValue(id, out var entity) ? entity : null);

    public Task<IEnumerable<T>> GetAllAsync()
        => Task.FromResult(_store.Values.AsEnumerable());

    public Task AddAsync(T entity)
    {
        _store[entity.Id == 0 ? _nextId++ : entity.Id] = entity;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(T entity)
    {
        if (!_store.ContainsKey(entity.Id))
            throw new KeyNotFoundException($"Entity {entity.Id} not found.");
        _store[entity.Id] = entity;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(int id)
    {
        _store.Remove(id);
        return Task.CompletedTask;
    }
}
```

---

## Challenge 4: Decorator for Caching

**Problem:** Implement a `CachingPatientRepository` that wraps `IPatientRepository` and caches `GetByIdAsync` results in memory for 5 minutes. Use `IMemoryCache`.

**Solution:**
```csharp
public class CachingPatientRepository : IPatientRepository
{
    private readonly IPatientRepository _inner;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public CachingPatientRepository(IPatientRepository inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public async Task<Patient?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var key = $"patient:{id}";

        if (_cache.TryGetValue(key, out Patient? cached))
            return cached;

        var patient = await _inner.GetByIdAsync(id, ct);

        if (patient is not null)
            _cache.Set(key, patient, CacheDuration);

        return patient;
    }

    // Delegate all other methods to inner
    public Task<IEnumerable<Patient>> GetAllAsync(CancellationToken ct = default)
        => _inner.GetAllAsync(ct);

    public async Task AddAsync(Patient patient, CancellationToken ct = default)
    {
        await _inner.AddAsync(patient, ct);
        // Could also pre-warm the cache here
    }

    public async Task UpdateAsync(Patient patient, CancellationToken ct = default)
    {
        await _inner.UpdateAsync(patient, ct);
        _cache.Remove($"patient:{patient.Id}");  // invalidate cache
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await _inner.DeleteAsync(id, ct);
        _cache.Remove($"patient:{id}");
    }
}
```

---

## Challenge 5: REST API Controller

**Problem:** Write a complete `AppointmentsController` with:
- GET all appointments (optionally filtered by patientId query param)
- GET by ID (404 if not found)
- POST to create (201 with Location)
- DELETE (204)
- Input validation
- Async throughout

**Solution:**
```csharp
[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _service;

    public AppointmentsController(IAppointmentService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetAll(
        [FromQuery] int? patientId,
        CancellationToken ct)
    {
        var appointments = patientId.HasValue
            ? await _service.GetByPatientAsync(patientId.Value, ct)
            : await _service.GetAllAsync(ct);

        return Ok(appointments);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id, CancellationToken ct)
    {
        var appointment = await _service.GetByIdAsync(id, ct);
        return appointment is null ? NotFound() : Ok(appointment);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(
        [FromBody] CreateAppointmentRequest request,
        CancellationToken ct)
    {
        var appointment = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, appointment);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var exists = await _service.ExistsAsync(id, ct);
        if (!exists) return NotFound();

        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
```
