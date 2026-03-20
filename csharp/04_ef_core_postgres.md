# Entity Framework Core + PostgreSQL

## Setup

```csharp
// Install packages
// dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
// dotnet add package Microsoft.EntityFrameworkCore.Tools

// Program.cs
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// appsettings.json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=therapynotes;Username=app;Password=secret"
  }
}
```

## DbContext

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Provider> Providers => Set<Provider>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration<T> in assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

// Entity configuration (Fluent API — preferred over attributes)
public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("patients");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).UseIdentityColumn();

        builder.Property(p => p.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Email)
            .HasMaxLength(255);

        builder.HasIndex(p => p.Email).IsUnique();

        // One patient has many appointments
        builder.HasMany(p => p.Appointments)
            .WithOne(a => a.Patient)
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

## Common Queries

```csharp
public class PatientRepository : IPatientRepository
{
    private readonly AppDbContext _context;
    public PatientRepository(AppDbContext context) => _context = context;

    // Simple find
    public async Task<Patient?> GetByIdAsync(int id, CancellationToken ct = default)
        => await _context.Patients.FindAsync(new object[] { id }, ct);

    // With includes (eager loading)
    public async Task<Patient?> GetWithAppointmentsAsync(int id, CancellationToken ct = default)
        => await _context.Patients
            .Include(p => p.Appointments)
                .ThenInclude(a => a.Provider)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    // Projection — only load what you need
    public async Task<IEnumerable<PatientSummaryDto>> GetSummariesAsync(CancellationToken ct = default)
        => await _context.Patients
            .Where(p => p.IsActive)
            .OrderBy(p => p.LastName)
            .Select(p => new PatientSummaryDto
            {
                Id = p.Id,
                FullName = p.FirstName + " " + p.LastName,
                AppointmentCount = p.Appointments.Count
            })
            .ToListAsync(ct);

    // Paging
    public async Task<(IEnumerable<Patient> Items, int Total)> GetPagedAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Patients.Where(p => p.IsActive);
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    // Add / Update / Delete
    public async Task AddAsync(Patient patient, CancellationToken ct = default)
    {
        await _context.Patients.AddAsync(patient, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Patient patient, CancellationToken ct = default)
    {
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var patient = await GetByIdAsync(id, ct) ?? throw new NotFoundException(id);
        _context.Patients.Remove(patient);
        await _context.SaveChangesAsync(ct);
    }
}
```

## Tracking vs No-Tracking

```csharp
// Tracked (default) — changes to entity are detected and saved on SaveChanges
var patient = await _context.Patients.FindAsync(id);
patient.Name = "New Name";
await _context.SaveChangesAsync();  // UPDATE generated automatically

// No-tracking — read-only, better performance for queries
var patients = await _context.Patients
    .AsNoTracking()
    .ToListAsync();
```

## Migrations

```bash
# Create migration
dotnet ef migrations add AddPatientEmailIndex

# Apply to database
dotnet ef database update

# Generate SQL script (for production)
dotnet ef migrations script --idempotent

# Rollback
dotnet ef database update PreviousMigrationName
```

## Concurrency Handling

```csharp
// Optimistic concurrency with row version
public class Patient
{
    public int Id { get; set; }
    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}

// Catch conflict
try
{
    await _context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    // Two users tried to update the same record — decide whose wins
    var entry = ex.Entries.Single();
    var databaseValues = await entry.GetDatabaseValuesAsync();
    // Resolve: client wins, database wins, or merge
}
```

## N+1 Query Problem

```csharp
// BAD — 1 query for patients, then N queries for appointments
var patients = await _context.Patients.ToListAsync();
foreach (var p in patients)
{
    var appts = p.Appointments;  // lazy loading fires N queries
}

// GOOD — single JOIN query
var patients = await _context.Patients
    .Include(p => p.Appointments)
    .ToListAsync();

// BETTER for read-only — project to DTO
var dtos = await _context.Patients
    .Select(p => new { p.Name, Count = p.Appointments.Count })
    .ToListAsync();
```
