# C# Multiple Choice Practice Questions

---

**Q1.** What is the output?
```csharp
class Animal { public virtual string Speak() => "..."; }
class Dog : Animal { public override string Speak() => "Woof"; }
class Cat : Animal { public new string Speak() => "Meow"; }

Animal dog = new Dog();
Animal cat = new Cat();
Console.WriteLine(dog.Speak());
Console.WriteLine(cat.Speak());
```
A) Woof / Meow
B) Woof / ...
C) ... / Meow
D) ... / ...

**Answer: B** — `override` is polymorphic; `new` hides the base method but only when accessed through the derived type reference.

---

**Q2.** Which DI lifetime creates a new instance for each HTTP request?
A) Transient
B) Scoped
C) Singleton
D) Contextual

**Answer: B**

---

**Q3.** What happens when you call `.Result` on a `Task` inside an async ASP.NET controller?
A) Returns the value immediately
B) Blocks until the task completes
C) Can cause a deadlock
D) Both B and C

**Answer: D** — `.Result` blocks the thread, which in ASP.NET with a synchronization context can deadlock because the continuation needs the same thread.

---

**Q4.** Which operator selects the correct approach for search-as-you-type?
A) `mergeMap`
B) `concatMap`
C) `switchMap`
D) `exhaustMap`

**Answer: C** — `switchMap` cancels the previous inner observable when a new value arrives.

---

**Q5.** What does `AsNoTracking()` do in EF Core?
A) Disables lazy loading
B) Prevents SaveChanges from being called
C) Returns entities not tracked by the change tracker, improving read performance
D) Excludes the query from EF Core migrations

**Answer: C**

---

**Q6.** Which SOLID principle does this violate?
```csharp
public class Report
{
    public void Generate() { ... }
    public void SaveToFile(string path) { ... }
    public void SendByEmail(string to) { ... }
}
```
A) Open/Closed
B) Liskov Substitution
C) Single Responsibility
D) Interface Segregation

**Answer: C**

---

**Q7.** What does `ConfigureAwait(false)` do?
A) Disables the async keyword
B) Resumes execution on a thread pool thread instead of capturing the synchronization context
C) Forces the await to run synchronously
D) Cancels the task if the caller context is lost

**Answer: B** — Important for library code to avoid deadlocks and improve performance.

---

**Q8.** What's the difference between `First()` and `Single()` in LINQ?
A) `First()` returns one result; `Single()` returns multiple
B) `First()` throws if empty; `Single()` returns null
C) Both throw if empty, but `Single()` also throws if more than one element exists
D) `Single()` is an alias for `FirstOrDefault()`

**Answer: C**

---

**Q9.** Which pattern correctly implements the Unit of Work?
A) One `SaveChanges` call per repository operation
B) Multiple DbContext instances per request
C) A single transaction boundary where multiple repository operations are committed together
D) Using `BeginTransaction` on every controller action

**Answer: C**

---

**Q10.** In C# 9+, what is a `record` type best used for?
A) Logging structured output
B) Mutable state containers
C) Immutable data transfer objects with value equality
D) Database entity mapping

**Answer: C**

---

**Q11.** Which middleware order is correct?
A) `UseAuthorization` → `UseAuthentication`
B) `UseAuthentication` → `UseAuthorization`
C) `UseRouting` → `UseAuthentication` → `UseAuthorization`
D) B and C are both valid

**Answer: D** — C is the full correct order; B describes the relative order of auth middleware.

---

**Q12.** What does `sealed` mean on a class?
A) It cannot be instantiated
B) It cannot be inherited
C) It cannot have public members
D) It cannot override base class methods

**Answer: B**

---

**Q13.** In EF Core, what is the N+1 query problem?
A) Running N migrations before the initial create
B) One query to get a list of N items, then N additional queries for related data
C) Querying the same record N+1 times due to caching issues
D) A performance issue caused by using Include() too many times

**Answer: B** — Fixed by using `.Include()` or projecting with `.Select()`.

---

**Q14.** What is the difference between `IEnumerable<T>` and `IQueryable<T>`?
A) `IQueryable` is faster for in-memory collections
B) `IEnumerable` executes queries on the database; `IQueryable` executes in memory
C) `IQueryable` translates LINQ to SQL; `IEnumerable` operates on in-memory collections
D) There is no difference

**Answer: C**

---

**Q15.** Which HTTP status code indicates successful resource creation?
A) 200
B) 201
C) 202
D) 204

**Answer: B** — 201 Created, typically with a `Location` header pointing to the new resource.
