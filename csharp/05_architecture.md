# Architecture: SOA, Event-Driven, REST

## Service-Oriented Architecture (SOA)

SOA organizes functionality into discrete, loosely coupled services with well-defined interfaces.

```
┌─────────────────────────────────────────┐
│           API Gateway / Controllers     │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │   Service Layer │  ← business logic lives here
       └───────┬────────┘
               │
       ┌───────┴────────┐
       │ Repository Layer│  ← data access abstraction
       └───────┬────────┘
               │
       ┌───────┴────────┐
       │   Database      │
       └────────────────┘
```

**Key principles for a senior dev:**
- Services own their domain — `AppointmentService` doesn't reach into `PatientRepository` directly
- Cross-cutting concerns (logging, auth, caching) handled by middleware/decorators, not in services
- Services communicate through interfaces, not concrete types

## Event-Driven Patterns

### Domain Events (in-process)

```csharp
// Event
public record AppointmentScheduledEvent(int AppointmentId, int PatientId, DateTime ScheduledAt);

// Publisher
public interface IDomainEventPublisher
{
    Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : class;
}

// Service raises event, handler reacts
public class AppointmentService
{
    private readonly IAppointmentRepository _repo;
    private readonly IDomainEventPublisher _publisher;

    public async Task<Appointment> ScheduleAsync(ScheduleRequest request, CancellationToken ct)
    {
        var appt = new Appointment(request.PatientId, request.ProviderId, request.Start);
        await _repo.AddAsync(appt, ct);

        // Raise domain event — email, notification, billing can all react independently
        await _publisher.PublishAsync(
            new AppointmentScheduledEvent(appt.Id, appt.PatientId, appt.Start), ct);

        return appt;
    }
}

// Handler (could be in separate bounded context)
public class SendAppointmentReminderHandler
    : INotificationHandler<AppointmentScheduledEvent>
{
    public async Task Handle(AppointmentScheduledEvent e, CancellationToken ct)
        => await _emailService.SendReminderAsync(e.PatientId, e.ScheduledAt, ct);
}
```

### Message Queue Pattern (out-of-process)

```csharp
// Producer — send to queue (RabbitMQ, Azure Service Bus, etc.)
public class AppointmentService
{
    private readonly IMessageBus _bus;

    public async Task ScheduleAsync(...)
    {
        // ... save to DB
        await _bus.PublishAsync(new AppointmentCreatedMessage { ... });
        // Consumer runs independently — decoupled, resilient
    }
}
```

## REST API Design

### HTTP Verb semantics
| Verb | Use | Idempotent? | Safe? |
|------|-----|-------------|-------|
| GET | Read | Yes | Yes |
| POST | Create | No | No |
| PUT | Full replace | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove | Yes | No |

### Status codes to know

```
200 OK            — successful GET, PUT, PATCH
201 Created       — successful POST with Location header
204 No Content    — successful DELETE or PUT with no body
400 Bad Request   — invalid input / validation failure
401 Unauthorized  — missing/invalid auth token
403 Forbidden     — authenticated but lacks permission
404 Not Found     — resource doesn't exist
409 Conflict      — concurrency or duplicate
422 Unprocessable — syntactically valid but semantically wrong
429 Too Many Req  — rate limited
500 Server Error  — unexpected server failure
```

### Resource naming

```
GET    /api/patients              — list patients
POST   /api/patients              — create patient
GET    /api/patients/{id}         — get patient
PUT    /api/patients/{id}         — full update
PATCH  /api/patients/{id}         — partial update
DELETE /api/patients/{id}         — delete patient

GET    /api/patients/{id}/appointments    — patient's appointments
POST   /api/patients/{id}/appointments   — schedule appointment for patient
```

## CQRS (Command Query Responsibility Segregation)

Common pattern in SOA systems. Read models are separate from write models.

```csharp
// Query (read)
public record GetPatientQuery(int Id) : IRequest<PatientDto>;

public class GetPatientHandler : IRequestHandler<GetPatientQuery, PatientDto>
{
    public async Task<PatientDto> Handle(GetPatientQuery request, CancellationToken ct)
    {
        // Use optimized read model / projections
        return await _readRepository.GetPatientDtoAsync(request.Id, ct);
    }
}

// Command (write)
public record CreatePatientCommand(string FirstName, string LastName, DateTime Dob)
    : IRequest<int>;

public class CreatePatientHandler : IRequestHandler<CreatePatientCommand, int>
{
    public async Task<int> Handle(CreatePatientCommand cmd, CancellationToken ct)
    {
        var patient = new Patient(cmd.FirstName, cmd.LastName, cmd.Dob);
        await _repo.AddAsync(patient, ct);
        return patient.Id;
    }
}
```

## Unit of Work Pattern

```csharp
public interface IUnitOfWork : IDisposable
{
    IPatientRepository Patients { get; }
    IAppointmentRepository Appointments { get; }
    Task<int> CommitAsync(CancellationToken ct = default);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    public IPatientRepository Patients { get; }
    public IAppointmentRepository Appointments { get; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Patients = new PatientRepository(context);
        Appointments = new AppointmentRepository(context);
    }

    public Task<int> CommitAsync(CancellationToken ct = default)
        => _context.SaveChangesAsync(ct);

    public void Dispose() => _context.Dispose();
}
```
