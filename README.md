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
- .env.example         Template for .env configuration
- CLAUDE.md            Part 3: rules for AI coding agents
- .gitignore           
- README.md            Read me file to guide user
```

**Note:** \
the backend API (WebAPI), frontend (WebFrontend) and Infrastructure are separate top-level
folders, so each can be built, tested and deployed independently. Docker and
Bicep files sit at the boundary between application code and platform.

 ## Reference
 
| Item | Location |
|---|---|
| Campaign endpoints | `WebAPI/Controllers/CampaignsController.cs` |
| Event endpoints | `WebAPI/Controllers/EventsController.cs` |
| Business and data access logic | `WebAPI/Services/` (`CampaignService`, `EventService` and their interfaces) |
| Validation (DTOs) | `WebAPI/Dtos/CampaignDtos.cs` |
| DbContext and 1-to-many configuration | `WebAPI/Data/CampaignDbContext.cs` |
| EF Core migrations | `WebAPI/Migrations/` |
| Angular create form | `WebFrontend/src/app/campaign-form/` |
| Angular campaign list | `WebFrontend/src/app/campaign-list/` |
| Angular campaign detail | `WebFrontend/src/app/campaign-detail/` |
| Angular service (`HttpClient`, Observables) | `WebFrontend/src/app/services/service.ts` |
| Angular routing | `WebFrontend/src/app/app.routes.ts` |
| Bicep (Plan, App Service, connection string setting) | `Infrastructure/main.bicep` |
| Security explanation | [4 Security approach](#4-security-approach) |
| Part 2: AI code review and workflow | `AI-workflow/` [Section 6.1](#61--part-2-ai-code-review--workflow) |
| Part 3: AI context file | `CLAUDE.md` [Section 6.2](#62-part-3-ai-context-configuration-optional-parts-3) |
 
---

## 2 Quick start for setup with docker

### 2.1 setup

**Prerequisite:** Download and install Docker Desktop. Nothing else needs to be installed.
 https://docs.docker.com/desktop/setup/install/windows-install/

```bash
git clone https://github.com/Hendyley/Campaign_Tracking_App.git
cd Campaign_Tracking_App
 
copy .env.example .env         
# Edit .env and set a strong MSSQL_SA_PASSWORD
# Password must be 8 to 128 characters long and include characters from at least three of the four complexity categories. If the password does not meet these requirements, the container will immediately exit with a validation error.
 
docker compose up --build -d
docker compose ps             
# wait until mssql is "healthy" and webapi/frontend are "running"
```


| Service | URL |
|---|---|
| SQL Server (in docker) | `localhost,1433` (user `sa`, password from `.env`) |
| Backend API Swagger UI (WebAPI) | http://localhost:8080/swagger  |
| Frontend (WebFrontend) | http://localhost:4200  or  http://localhost:4200/campaigns/new |



The API applies EF Core migrations automatically at startup, so the database (CampaignDB) and empty
table are created on first run.
 
```bash
docker compose down        # stop, keep the database data
docker compose down -v     # stop and delete the database volume (fresh start)
```
  
### 2.2 Using the app

### Frontend pages
 
| Page | What it does |
|---|---|
| `/campaigns/new` (also `/`) | Create a campaign. Events can be added in a pop-up before saving (optional, up to 50). |
| `/campaigns/all` | Paged list of campaigns (20 per page, Previous and Next), with event counts and a delete button. |
| `/campaigns/{id}` | One campaign with its events. Add an event (pop-up), delete an event, delete the campaign. |
 
### API
 
| Method | Route | Description | Status codes |
|---|---|---|---|
| GET | `/api/campaigns?page=1&pageSize=20` | Paged campaign summaries (`id`, `name`, dates, `eventCount`). `pageSize` is capped at 100. | 200 |
| GET | `/api/campaigns/{id}` | Campaign with its events (ordered by time, first 100) and the total `eventCount` | 200, 404 |
| POST | `/api/campaigns` | Create a campaign. An optional `events` array (max 50) is saved in the same transaction. | 201, 400 |
| DELETE | `/api/campaigns/{id}` | Delete a campaign and its events | 204, 404 |
| POST | `/api/events` | Create an event. `campaignId` is required in the body. | 201, 400 |
| GET | `/api/events/{id}` | One event | 200, 404 |
| DELETE | `/api/events/{id}` | Delete an event | 204, 404 |

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
and error states. `CampaignService` wraps `HttpClient` and returns `Observable<T>`. Events are
added in an ng-bootstrap pop-up, both when creating a campaign and on the detail page.
 
**Thin controllers, services behind interfaces.** Controllers validate HTTP input, call
`ICampaignService` or `IEventService` and map the result to a status code. Data access lives in
the services, and every action and service method takes a `CancellationToken`.
 
**Events.** `campaignId` is sent in the request body, so the frontend does not build URLs. A
missing or unknown `campaignId` returns `400` with an error on that field, because it is a
validation problem and not a missing route. Events created together with a campaign use a DTO
without `CampaignId`, so they cannot point at another campaign.
 
**Deletes.** Each delete runs a single `ExecuteDeleteAsync` statement and loads nothing. The
database's `ON DELETE CASCADE` removes a campaign's events. These are hard deletes, and a
missing resource returns `404`.
 
**Limits and why they differ.**
 
| Limit | Value | What it protects |
|---|---|---|
| Page size for the campaign list | 100 | Response size and query cost of a list request |
| Events accepted when creating a campaign | 50 | The size of a single `POST` and its transaction. It is not a cap on data: more events can be added afterwards with `POST /api/events`. |
| Events returned by the campaign detail | 100 | Response size. The response also carries the true `eventCount`, and the page shows "first 100 of N" when more exist. |
 
**Dates.** Campaign dates are whole days and the end date is inclusive. The form sends the start
date at `00:00:00` and the end date at `23:59:59`, so a one-day campaign is allowed while the API
keeps the strict rule that `EndDate` must be after `StartDate`. A caller that sends equal
timestamps gets `400`.
 
**Event timestamps.** The frontend stores the date and time entered (wall-clock, no time zone) and
displays it as stored, so there is no time zone shift. Events created through the API without a
timestamp default to the server's UTC time.
 
---
 


## 4 Security approach
 
| Threat | Mitigation |
|---|---|
| **SQL injection** | All data access goes through EF Core/LINQ, which sends parameterized SQL. There is no raw SQL and no string concatenation. |
| **XSS** | `Name` and `EventType` are length-limited and reject `<` and `>` on the server (and in the forms). On output, Angular escapes template bindings (`{{ }}`), and `innerHTML` / `bypassSecurityTrust*` are not used. Output encoding is the primary defence; input rejection is defence in depth. |
| **Invalid input** | Data annotations (`[Required]`, `[StringLength]`, `[RegularExpression]`, `[Range]`, `[MaxLength]`) plus `IValidatableObject` for `EndDate > StartDate`. `[ApiController]` returns `400` with details automatically, including for each event inside a campaign. |
| **Over-posting** | Request DTOs expose only the fields a client may set. |
| **Referential integrity** | An event for a missing campaign returns `400`. The foreign key is the final guard if the campaign is deleted at the same moment. |
| **Delete requests** | The route only accepts an integer id (`{id:int}`), the delete runs as one parameterized statement, a missing id returns `404`, and there is no bulk delete endpoint. The frontend asks for confirmation before deleting. |
| **Unbounded requests** | `pageSize` is capped at 100, a campaign accepts at most 50 events on creation, and the detail view returns at most 100. |
| **Secrets** | Nothing sensitive is committed. `.env` is gitignored (`.env.example` holds placeholders), local development uses `dotnet user-secrets`, and the Bicep connection string is a `@secure()` parameter. |
| **Transport** | The App Service is configured `httpsOnly` with TLS 1.2 minimum. |
 
**Known gap: there is no authentication or authorization.** Anyone who can reach the API can create
or delete data, and the confirmation dialog is a convenience, not a control. This is out of scope
for the exercise. Production would add authentication (for example Microsoft Entra ID with JWT
bearer tokens), role checks on the delete endpoints, and soft delete or an audit trail. CORS only
restricts browsers, so it is not an access control.
 
### Test results
 
| Request | Result |
|---|---|
| `POST /api/campaigns` valid | `201 Created` |
| `POST /api/campaigns` valid, with 2 events | `201`, `eventCount: 2` |
| `POST /api/campaigns` empty name | `400` |
| `POST /api/campaigns` name `<script>alert(1)</script>` | `400` |
| `POST /api/campaigns` name longer than 200 characters | `400` |
| `POST /api/campaigns` `endDate` before or equal to `startDate` (same timestamp) | `400` |
| One-day campaign created from the form (end date sent as `23:59:59`) | `201` |
| `POST /api/campaigns` event type `<b>x</b>` | `400`, and no campaign is created |
| `POST /api/campaigns` name `'; DROP TABLE Campaigns; --` | `201`; stored as plain text, table unaffected (parameterized) |
| `POST /api/events` valid | `201` |
| `POST /api/events` without `campaignId` | `400` |
| `POST /api/events` with a `campaignId` that does not exist | `400` |
| `GET /api/campaigns/999` | `404` |
| `DELETE /api/events/{id}` twice | `204`, then `404` |
| `DELETE /api/campaigns/{id}` | `204`, and its events return `404` |
| `DELETE /api/campaigns/abc` (non-integer id) | `404` |




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
| `Select` projection, no in-memory loop | `CampaignService` projects to DTOs with `Select`, and `eventCount` is a SQL `COUNT` |
| `AsNoTracking()` | Used on every read in `CampaignService` and `EventService` |
| Stable `OrderBy`, `Skip`/`Take`, clamped inputs | `GetPageAsync` orders by `Id`, pages, and clamps `page` and `pageSize` (default 20, maximum 100) |
| Nothing loaded that is not needed | Deletes use `ExecuteDeleteAsync`, and the campaign check for a new event is an `AnyAsync` |
| DTOs, not entities | `CampaignDto`, `CampaignSummaryDto` and `EventDto` for output, `CreateCampaignRequest` and `CreateEventRequest` for input |
| `CancellationToken` | Every controller action and service method takes `ct` |
| Service behind an interface | `ICampaignService` and `IEventService`, registered with `AddScoped` |
| Thin controller | Controllers only call a service and return `Ok`, `NotFound`, `NoContent` or `CreatedAtAction` |

---


### 6.1.3 Provide the prompt you used, the raw AI output, and a 3-bullet diff explaining what you changed and why.
---
- Prompt used and raw AI output are stored in `AI-Workflow/AIprompt.mhtml`
- 3-bullet diff is stored in `AI-Workflow/3-bullet-diff.md`


**3-bullet diff** against the AI's suggested code. The AI's version already moved the sum into SQL,
removed tracking, returned a DTO and added a `CancellationToken`. These are my changes on top of it:

1. Enforced the paging limits inside the method 
- What changed: Added line
  ```
  pageSize = Math.Clamp(pageSize, 1, MaxPageSize) 
  page = Math.Clamp(page, 1, int.MaxValue / pageSize)
  ```
- Why: The AI’s code has no limits, and its checklist only says to cap pageSize at the caller or service level, which leaves it unenforced. Without the clamp, a negative page gives a negative Skip, pageSize = 0 returns nothing, a huge pageSize loads the whole table (the same unbounded problem as issue 2), and a very large page overflows (page - 1) * pageSize.

2. Wrapped the method in IOrderService and OrderService
- What changed: The AI’s bare method that reads _context became a service class behind an interface, registered with AddScoped.
- Why: The AI flagged “mixed responsibilities” but its fix is still a loose method with no home. The interface lets controllers depend on an abstraction and be tested without a database. It matches ICampaignService in this repo, and the DbContext lifetime follows the service.

3. Remove `OrderDate` 
- What changed: Remove `OrderDate` reference
- Why: because the AI said it was assuming that property exists but the prompt never mentions it.


## 6.2 Part 3: AI Context Configuration (Optional) (Parts 3)

`CLAUDE.md` defines the rules AI coding agents must follow in this repo.


1. Keep secrets and configuration out of the code (`.env`, user-secrets, `@secure()` Bicep
   parameters, service names inside Docker Compose).
2. Backend: thin controllers, data access in services behind interfaces.
3. Backend: reads use projections to DTOs, `AsNoTracking`, ordered and clamped paging, validation
   at the boundary, no SQL built from strings.
4. Frontend: strict, typed Angular, an `HttpClient` service, no `innerHTML`.
5. Do not invent APIs, and do not claim work that was not run.


---
<br>


## 7 Notes
 
### Running without Docker for the API and frontend
 
**Prerequisites:** .NET 10 SDK, Node.js 20+ (LTS), Angular CLI, and a SQL Server. The simplest SQL
Server is the one from Docker Compose.
 
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
 
# 5. Run the API (the Swagger URL is printed in the console)
dotnet run
```
 
```bash
# 6. Run the frontend in another terminal
cd WebFrontend
npm install
ng serve  --port 3000                    # http://localhost:3000 (Can choose port)
```
 
The API base URL used by the frontend is set in `WebFrontend/src/environments/environment.ts`, and
the API's CORS policy allows `http://localhost:4200` and `http://localhost:3000`. The migrations are
already committed in `WebAPI/Migrations/`. Create a new one only when the model changes:
 
```bash
dotnet ef migrations add <MigrationName>
dotnet ef database update
```
 
### Trade-offs and production notes
 
This is a time-boxed exercise, so some local conveniences are deliberate:
 
- The `sa` account is used for SQL Server. Production should use a least-privilege login, or Azure
  SQL with a Managed Identity and Key Vault references.
- `TrustServerCertificate=True` is for the local container only.
- The Docker setup serves plain HTTP on localhost and runs the API in the `Development` environment
  (Swagger on). In Azure, TLS terminates at App Service.
- Migrations run at API startup for convenience. In production they would be a separate pipeline step.
- The frontend asks for confirmation with `window.confirm` before deleting. A modal would be nicer in
  production.
  
### Not included
 
- Authentication and authorization (anyone who can reach the API can create or delete data)
- Automated tests (the service interfaces are there so controllers can be tested without a database)
- A CI/CD pipeline, and a database in the Bicep template
- A total count for the campaign list, and paging of the events inside one campaign (the detail page
  shows the first 100 and the total)
- Server-side enforcement that an event's timestamp falls within its campaign's dates. This rule is
  checked in the frontend forms only.
- Soft delete or an audit trail (deletes are permanent)
 























