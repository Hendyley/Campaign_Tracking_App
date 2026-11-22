# Campaign Tracking App
 
A marketing campaign tracking app: create a campaign, then view it with its events.

**Stack:** .NET 10 Web API (Controllers) · EF Core · SQL Server · Angular · Docker Compose · Azure Bicep
 

## 1 Project Structure and documentation
```
Campaign_Tracking_App/
- WebAPI/              ASP.NET Core API, EF Core DbContext, migrations, Dockerfile
- WebFrontend/         Angular app (form, detail, service, routing), Dockerfile, nginx.conf
- Infrastructure/      main.bicep
- AI-Workflow/         Part 2: AI prompt, raw output, review and 3-bullet diff
- docker-compose.yml   API + SQL Server + frontend
- .env.example         Template for .env
- CLAUDE.md            Part 3: rules for AI coding agents
- .gitignore           
- README.md            Read me file to guide user
```

**Why this layout:** the API, frontend and infrastructure are separate top-level
folders, so each can be built, tested and deployed independently. Docker and
Bicep files sit at the boundary between application code and platform.

 ## Reference
 
| Item | Location |
|---|---|
| GET and POST endpoints | `WebAPI/Controllers/CampaignController.cs` |
| Validation (DTOs) | `WebAPI/Dtos/CampaignDtos.cs` |
| DbContext and 1-to-many configuration | `WebAPI/Data/CampaignDbContext.cs` |
| EF Core migrations | `WebAPI/Migrations/` |
| Angular campaign form | `WebFrontend/src/app/campaign-form/` |
| Angular campaign detail | `WebFrontend/src/app/campaign-detail/` |
| Angular service (`HttpClient`, Observables) | `WebFrontend/src/app/services/service.ts` |
| Angular routing | `WebFrontend/src/app/app.routes.ts` |
| Bicep (Plan, App Service, connection string setting) | `Infrastructure/main.bicep` |
| Security explanation | [4 Security approach](#4-security-approach) |
| Part 2: AI code review and workflow | `AI-workflow/` [Section 6.1](#61--part-2-ai-code-review--workflow) |
| Part 3: AI context file | `CLAUDE.md` [Section 6.2](#62-part-3-ai-context-configuration-optional-parts-3) |
 
---

 ## 2 Quick start for setup with docker
 
**Prerequisite:** Docker Desktop. Nothing else needs to be installed.
 https://docs.docker.com/desktop/setup/install/windows-install/

```bash
git clone https://github.com/Hendyley/Campaign_Tracking_App.git
cd Campaign_Tracking_App
 
copy .env.example .env         # cp .env.example .env (For linux)
# Edit .env and set a strong MSSQL_SA_PASSWORD
# Password must be 8 to 128 characters long and include characters from at least three of the four complexity categories. If the password does not meet these requirements, the container will immediately exit with a validation error.
 
docker compose up --build -d
docker compose ps             
# wait until mssql is "healthy" and webapi/frontend are "running"
```

The frontend calls the API through the relative path `/api/...`. In development
`WebFrontend/proxy.conf.json` forwards `/api` to the API; set its `target` to the
address your API is running on (`http://localhost:8080` when using Docker). In
Docker, nginx does the same job (see `WebFrontend/nginx.conf`).


| Service | URL |
|---|---|
| SQL Server (in docker) | `localhost,1433` (user `sa`, password from `.env`) |
| Backend API Swagger UI | http://localhost:8080/swagger (port set by `API_PORT`; use **http**, not https) |
| Backend GET method to get all campaigns | http://localhost:8080/api/campaigns/{id} (id refer to the campaign id) or http://localhost:8080/api/campaigns (get all campaigns) |
| Backend POST method to Create a campaign | http://localhost:8080/api/campaigns with json body {name, startDate, endDate}|
| Frontend to Add new campaign | http://localhost:4200  or  http://localhost:4200/campaigns/new |
| Frontend to view campaign | http://localhost:4200/campaigns/all  or  http://localhost:4200/campaigns/{id} (id refer to the campaign id) |



The API applies EF Core migrations automatically at startup, so the database and
tables are created on first run.
 
```bash
docker compose down        # stop, keep the database data
docker compose down -v     # stop and delete the database volume (fresh start)
```
  

## 3 Design decisions
 
**Data model.** One `Campaign` has many `Event`s. `Event.CampaignId` is a required
foreign key with cascade delete, configured in `OnModelCreating`:
 
```
Campaigns                         Events
┌───────────────┐ 1          *  ┌────────────────────┐
│ Id (PK)       │───────────────│ Id (PK)            │
│ Name          │               │ EventType          │
│ StartDate     │               │ Timestamp          │
│ EndDate       │               │ CampaignId (FK) ───┼──► Campaigns.Id
└───────────────┘               └────────────────────┘
```
 
**No N+1 queries.** `GET /api/campaigns/{id}` projects the campaign and its events
into DTOs with `.Select(...)`, so EF Core issues a single SQL query with a join and
selects only the needed columns. It uses `AsNoTracking()` because the query is
read-only.
 
**DTOs instead of entities.** Clients can only set the fields the API allows
(no over-posting), and responses avoid serialization cycles between `Campaign`
and `Event`.
 
**Migrations.** The schema is versioned in `WebAPI/Migrations/` and applied with
`dotnet ef database update` (or automatically at API startup in Docker).
 
**Frontend.** Standalone Angular components. The form is a reactive form with a
cross-field validator for the date rule. The detail page handles loading, not-found
and error states. `CampaignService` wraps `HttpClient` and returns `Observable<T>`.
 
---
 


 
## 4 Security approach
 
| Threat | Mitigation |
|---|---|
| **SQL injection** | All data access goes through EF Core/LINQ, which sends parameterized SQL. There is no raw SQL and no string concatenation. |
| **XSS** | `Name` is length-limited (200) and rejects `<` and `>` on the server (and in the form). On output, Angular escapes template bindings (`{{ }}`), and `innerHTML` / `bypassSecurityTrust*` are not used. Output encoding is the primary defence; input rejection is defence in depth. |
| **Invalid input** | Data annotations (`[Required]`, `[StringLength]`, `[RegularExpression]`) plus `IValidatableObject` for `EndDate > StartDate`. `[ApiController]` returns `400` with details automatically. |
| **Over-posting** | The request DTO exposes only `Name`, `StartDate` and `EndDate`. |
| **Secrets** | Nothing sensitive is committed. `.env` is gitignored (`.env.example` holds placeholders), local development uses `dotnet user-secrets`, and the Bicep connection string is a `@secure()` parameter. |
| **Transport** | The App Service is configured `httpsOnly` with TLS 1.2 minimum. |

### Test results
 
| Request (`POST /api/campaigns`) | Result |
|---|---|
| Valid campaign | `201 Created` |
| Empty name | `400` |
| Name `<script>alert(1)</script>` | `400` |
| Name longer than 200 characters | `400` |
| `endDate` before or equal to `startDate` | `400` |
| Name `'; DROP TABLE Campaigns; --` | `201`; stored as plain text, table unaffected (parameterized) |
| `GET /api/campaigns/999` | `404` |





## 5 Infrastructure (Azure Bicep)
 
`Infrastructure/main.bicep` is an Infrastructure as Code template for a resource
group. It deploys:

| Resource | Details |
|---|---|
| App Service Plan | Linux, size from the `skuName` parameter (`B1` by default) |
| App Service (web app) | .NET 10 runtime (`DOTNETCORE\|10.0`), HTTPS only, TLS 1.2 minimum, FTPS disabled, HTTP/2, system-assigned managed identity |
| Application setting | `ConnectionStrings__DefaultConnection`, which ASP.NET Core reads as `ConnectionStrings:DefaultConnection` (the same key used in `docker-compose.yml`) |

**Parameters**

| Parameter | Description |
|---|---|
| `appName` | Globally unique web app name (becomes `<appName>.azurewebsites.net`) |
| `sqlConnectionString` | Marked `@secure()`: supplied at deploy time, never stored in the repository |
| `location` | Defaults to the resource group's region |
| `skuName` | `B1`, `B2` or `P0v3` (default `B1`) |
| `dotnetcoreVersion` | Linux runtime stack (default `DOTNETCORE\|10.0`) |
| `tags` | Tags applied to both resources |

**Outputs:** `webAppName`, `webAppUrl` and `principalId` (the identity that would be
granted access to Key Vault or Azure SQL).

### Validate

The template was validated with bicep build and bicep lint and has not been deployed to a live subscription. It deploys the App Service only; a real deployment needs a database reachable from Azure (for example Azure SQL with a managed identity), because the local mssql container doesn’t exist there.

No Azure account is needed to compile and lint the template:

```bash
bicep build Infrastructure/main.bicep
bicep lint Infrastructure/main.bicep
```
 

## 6 AI Code Review & Workflow 

### 6.1  Part 2: AI Code Review & Workflow

The following code was generated by an AI assistant. Review it critically. Include your files in the repo and reference them in README.md.

Code generated by an AI assistant:
```csharp
public async Task<List<Order>> GetOrdersWithTotalAsync() {
    var orders = await _context.Orders.ToListAsync();
    foreach (var order in orders)
    {
        order.Total = order.Items.Sum(i => i.Price * i.Quantity);
    }
    return orders;
}
```

### 6.1.1 Identify the performance and architectural issues in this code.
1. `Items` is never loaded, so the method either runs one query per order (lazy loading, N+1) or returns silent zeros (no lazy loading). This is the most serious issue: it is either slow or wrong.
2. No filter or paging, and every column of every row is loaded. Memory and latency grow linearly with the table.
3. The sum happens in application memory, but the database should compute it.
4. Change tracking on read-only data, and writing a derived `Total` onto a tracked entity risks accidental updates.
5. It returns the entity instead of a DTO, has no `CancellationToken`, returns a mutable `List<T>`, and may use a floating-point money type.

---

### 6.1.2 Rewrite it to be production-ready.
---

Production ready code:
```csharp
public sealed record OrderSummaryDto(int Id, decimal Total);

public interface IOrderService
{
    Task<IReadOnlyList<OrderSummaryDto>> GetOrderSummariesAsync(
        int page, int pageSize, CancellationToken cancellationToken = default);
}

public class OrderService : IOrderService
{
    private const int MaxPageSize = 100;
    private readonly AppDbContext _context;
    public OrderService(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<OrderSummaryDto>> GetOrderSummariesAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        page = Math.Clamp(page, 1, int.MaxValue / pageSize);   // (page - 1) * pageSize cannot overflow

        return await _context.Orders
            .AsNoTracking()                                    
            .OrderBy(o => o.Id)                                
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderSummaryDto(
                o.Id,
                o.Items.Sum(i => i.Price * i.Quantity)))       
            .ToListAsync(cancellationToken);
    }
}
```
*What the production version does**

- **One query, sum computed in SQL.** `Select` with `Sum` replaces the in-memory loop, so only `Id` and `Total` leave the database.
- **No change tracking.** `AsNoTracking()` is used because the data is read-only, and nothing is written onto an entity.
- **Bounded and ordered result.** `OrderBy` with `Skip`/`Take`, and `pageSize` clamped to 1 to `MaxPageSize` (100), so memory stays constant as the table grows (issue 2).
- **Safe paging arithmetic.** `page` is capped at `int.MaxValue / pageSize`, so `(page - 1) * pageSize` cannot overflow.
- **DTO boundary.** `OrderSummaryDto` and `IReadOnlyList` replace the entity and the mutable `List<T>`.
- **Cancellable.** The `CancellationToken` stops the query when the client disconnects.
- **A proper home in the architecture.** The method sits behind `IOrderService`, registered with `AddScoped`, so controllers depend on an abstraction.

**How this compares with the WebAPI in this repository**

The campaign endpoints use the same pattern, so the fix is applied in real code and not only described.

| Part 2 fix | In this repo |
|---|---|
| `Select` projection, no in-memory loop | `CampaignService` projects to `CampaignDto` and `EventDto` with a shared `ToDto` expression, so events load in one query (no N+1) |
| `AsNoTracking()` | Used in `GetAsync` and `GetPageAsync` |
| Stable `OrderBy`, `Skip`/`Take`, clamped inputs | `GetPageAsync` orders by `Id`, pages, and clamps `page` and `pageSize` (default 20, maximum 100) |
| DTOs, not entities | `CampaignDto` and `EventDto` for output, `CreateCampaignRequest` for input |
| `CancellationToken` | Every controller action and service method takes `ct` |
| Service behind an interface | `ICampaignService` / `CampaignService`, registered with `AddScoped` |
| Thin controller | `CampaignsController` only calls the service and returns `Ok`, `NotFound` or `CreatedAtAction` |

---


### 6.1.3 Provide the prompt you used, the raw AI output, and a 3-bullet diff explaining what you changed and why.
---
Prompt used and raw AI output are stored in `AI-Workflow/AIprompt.mhtml`
3-bullet diff is stored in `AI-Workflow/3-bullet-diff.md`

3-bullet diff explaining what you changed and why.
1. Enforced the paging limits inside the method 
- What changed: Added line
  ```
  pageSize = Math.Clamp(pageSize, 1, MaxPageSize) 
  page = Math.Clamp(page, 1, int.MaxValue / pageSize)
  ```
- Why: The AI’s code has no limits, and its checklist only says to cap pageSize at the caller or service level, which leaves it unenforced. Without the clamp, a negative page gives a negative Skip, pageSize = 0 returns nothing, a huge pageSize loads the whole table (the same unbounded problem as issue 2), and a very large page overflows (page - 1) * pageSize.

2. Wrapped the method in IOrderService and OrderService (critical: architecture)
- What changed: The AI’s bare method that reads _context became a service class behind an interface, registered with AddScoped.
- Why: The AI flagged “mixed responsibilities” (issue 9) but its fix is still a loose method with no home. The interface lets controllers depend on an abstraction and be tested without a database. It matches ICampaignService in this repo, and the DbContext lifetime follows the service.

3. Remove `OrderDate` 
- What changed: Remove `OrderDate` reference
- Why: because the AI said it was assuming that property exists but the prompt never mentions it.


## 6.2 Part 3: AI Context Configuration (Optional) (Parts 3)

`CLAUDE.md` defines the rules AI coding agents must follow in this repo.

---
<br>





<br>

## Notes

### Running with Docker (default)

Everything above uses Docker Compose. The connection string comes from the
`ConnectionStrings__DefaultConnection` environment variable in `docker-compose.yml`
(built from `MSSQL_SA_PASSWORD` in `.env`), and the API applies the EF Core
migrations automatically at startup. No .NET, Node or EF tools need to be installed.

### Running manually (without Docker for the API and frontend)

**Prerequisites:** .NET 10 SDK, Node.js 20+ (LTS), Angular CLI, and a SQL Server.
The simplest SQL Server is the one from Docker Compose:

```bash
# 1. Start only the database (or use your own SQL Server)
docker compose up -d mssql

# 2. Store the connection string in user-secrets (kept outside the repo)
cd WebAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CampaignDB;User Id=sa;Password=<MSSQL_SA_PASSWORD from .env>;TrustServerCertificate=True"

# 3. Install the EF Core CLI tool (once; use "update" instead if already installed)
dotnet tool install --global dotnet-ef

# 4. Create the database and tables (creates CampaignDB if it is missing)
dotnet ef database update

# 5. Run the API (Swagger URL is printed in the console)
dotnet run
```

```bash
# 6. Run the frontend in another terminal
cd WebFrontend
npm install
ng serve --port 3000                      # http://localhost:3000
```

The migration `InitialCreate` is already committed in `WebAPI/Migrations/`.
Only create a new migration when the model changes:

```bash
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

When running the API with `dotnet run`, set the `target` in
`WebFrontend/proxy.conf.json` to the address the API prints in the console, because
the default points to the Docker port (`http://localhost:8080`).

### This is a time-boxed exercise, so some local conveniences are deliberate:
 
- The `sa` account is used for SQL Server. Production should use a least-privilege
  login, or Azure SQL with a Managed Identity and Key Vault references.
- `TrustServerCertificate=True` is for the local container only.
- The Docker setup serves plain HTTP on localhost and runs the API in the
  `Development` environment (Swagger on). In Azure, TLS terminates at App Service.
- Migrations run at API startup for convenience. In production they would be a
  separate pipeline step.
- Not included: authentication, paging on list endpoints, an endpoint to create
  events, automated tests, and a CI/CD pipeline.








cd E:\Project\Git
git clone https://github.com/Hendyley/Campaign_Tracking_App.git fresh-test
cd fresh-test
copy .env.example .env
# edit .env, then:
docker compose up --build -d
docker compose ps



dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CampaignDB;User Id=sa;Password=;TrustServerCertificate=True"

dotnet tool install --global dotnet-ef
dotnet tool update --global dotnet-ef
dotnet ef migrations add InitialCreate  
dotnet ef database update   => Create DB if Missing

Angular CLI
npm install -g @angular/cli
ng version
ng new WebFrontend --routing --style=css --skip-git
ng generate environments
ng generate component campaign-form
ng generate component campaign-detail


npm install
ng serve


winget install -e --id Microsoft.Bicep

https://localhost:7194/swagger



## Run locally without Docker for the API

**Prerequisites:** .NET 10 SDK, Docker (for the database), Node 20+ (frontend).

```bash
# 1. Start only the database
docker compose up -d mssql

# 2. Store the connection string in user-secrets (kept outside the repo)
cd WebAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Server=localhost,1433;Database=CampaignDB;User Id=sa;Password=<your .env password>;TrustServerCertificate=True"

# 3. Apply migrations and run
dotnet tool install --global dotnet-ef
dotnet ef database update
dotnet run
```

### Frontend

```bash
cd WebFrontend
npm install
ng serve
```

Open http://localhost:4200. The API URL is configured in
`src/environments/environment.ts`. CORS allows `http://localhost:4200`.

## Infrastructure (Azure Bicep)

`Infrastructure/main.bicep` deploys an App Service Plan, an App Service (HTTPS only,
TLS 1.2, FTPS disabled) and an application setting for the database
connection string, passed in as a `@secure()` parameter.

```bash
az bicep build --file Infrastructure/main.bicep
az deployment group what-if -g <resource-group> -f Infrastructure/main.bicep \
  -p appName=<unique-name> sqlConnectionString="<value>"
```

## AI workflow (Parts 2 and 3)

- `ai-workflow/` contains the prompt, the raw AI output, my review and the
  3-bullet diff for the `GetOrdersWithTotalAsync` snippet.
- `CLAUDE.md` defines the rules for AI agents working in this repo.

## Trade-offs and production notes

Because this is a time-boxed exercise, these are local shortcuts:

- The `sa` account is used for SQL Server. Production should use a
  least-privilege login or Azure SQL with a Managed Identity.
- `TrustServerCertificate=True` is for the local container only.
- The Docker setup runs with `ASPNETCORE_ENVIRONMENT=Development` (Swagger on)
  and serves HTTP on localhost. In Azure, TLS terminates at App Service.
- Migrations run at API startup for convenience. In production I would run them
  as a separate pipeline step.
- Not included: authentication, paging, automated deployment pipeline.