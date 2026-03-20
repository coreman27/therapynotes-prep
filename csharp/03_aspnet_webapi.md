# ASP.NET Core Web API

## Dependency Injection

ASP.NET Core has a built-in IoC container. Three lifetimes:

```csharp
// Startup / Program.cs
builder.Services.AddTransient<IEmailService, EmailService>();   // new instance every injection
builder.Services.AddScoped<IPatientService, PatientService>();  // one per HTTP request
builder.Services.AddSingleton<ICacheService, CacheService>();   // one for app lifetime
```

**Choosing lifetime:**
- **Transient**: Lightweight, stateless services (formatters, validators)
- **Scoped**: Services that need per-request context (DbContext, UoW)
- **Singleton**: Expensive to create, thread-safe state (caches, config)

**Captive dependency trap**: Never inject Transient or Scoped into a Singleton — the shorter-lived dependency gets stuck in the longer-lived one.

```csharp
// WRONG: AppDbContext (Scoped) injected into Singleton
public class BadSingletonService
{
    public BadSingletonService(AppDbContext ctx) { ... }  // ctx held forever
}

// Fix: inject IServiceScopeFactory and create a scope manually
public class GoodSingletonService
{
    private readonly IServiceScopeFactory _factory;
    public GoodSingletonService(IServiceScopeFactory factory) { _factory = factory; }

    public async Task DoWorkAsync()
    {
        using var scope = _factory.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // use ctx...
    }
}
```

---

## Controller Anatomy

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]  // require auth for all actions
public class PatientsController : ControllerBase
{
    private readonly IPatientService _service;

    public PatientsController(IPatientService service) => _service = service;

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PatientDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PatientDto>>> GetAll(
        CancellationToken ct)
    {
        var patients = await _service.GetAllAsync(ct);
        return Ok(patients);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(int id, CancellationToken ct)
    {
        var patient = await _service.GetByIdAsync(id, ct);
        return patient is null ? NotFound() : Ok(patient);
    }

    [HttpPost]
    public async Task<ActionResult<PatientDto>> Create(
        [FromBody] CreatePatientRequest request, CancellationToken ct)
    {
        var patient = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id, [FromBody] UpdatePatientRequest request, CancellationToken ct)
    {
        await _service.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
```

### [ApiController] benefits
- Automatic model validation (returns 400 if ModelState invalid)
- Binding source inference (`[FromBody]`, `[FromRoute]`, `[FromQuery]` inferred)
- Problem Details responses for errors

---

## Middleware Pipeline

Middleware processes requests and responses in a pipeline. Order matters.

```csharp
var app = builder.Build();

// Order matters — each middleware wraps the next
app.UseExceptionHandler("/error");     // catches exceptions from everything below
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();               // must be before UseAuthorization
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();
```

### Custom middleware

```csharp
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);  // call the next middleware
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation("{Method} {Path} took {Elapsed}ms",
                context.Request.Method,
                context.Request.Path,
                sw.ElapsedMilliseconds);
        }
    }
}

// Register
app.UseMiddleware<RequestTimingMiddleware>();
```

---

## Filters

Filters run at specific points in the action invocation pipeline.

```csharp
// Action filter — runs before/after an action
public class ValidatePatientIdFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ActionArguments.TryGetValue("id", out var id) && (int)id <= 0)
        {
            context.Result = new BadRequestObjectResult("Invalid patient ID");
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}

// Exception filter
public class GlobalExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        context.Result = new ObjectResult(new { error = context.Exception.Message })
        {
            StatusCode = 500
        };
        context.ExceptionHandled = true;
    }
}

// Register globally
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();
});
```

**Filter vs Middleware:** Filters have access to MVC context (action, model, result); Middleware operates at HTTP level only.

---

## Model Validation

```csharp
public class CreatePatientRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Date)]
    [Range(typeof(DateTime), "1900-01-01", "2100-01-01")]
    public DateTime DateOfBirth { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    [Phone]
    public string? Phone { get; set; }
}

// Custom validation attribute
public class FutureDateAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
    {
        if (value is DateTime date && date <= DateTime.Today)
            return new ValidationResult("Date must be in the future.");
        return ValidationResult.Success;
    }
}
```

---

## JWT Authentication

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Generating a token
private string GenerateToken(User user)
{
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Role, user.Role)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

---

## Problem Details (RFC 7807)

```csharp
// Best practice for error responses in .NET 7+
builder.Services.AddProblemDetails();

// Returns structured errors:
// { "type": "https://...", "title": "Not Found", "status": 404, "detail": "Patient 123 not found" }
```
