## Projecty Structure

CampaignTrackingApp/
- WebAPI/              (Part 1)Backend (.NET API, DbContext, Migrations, Dockerfile)
- WebFrontend/         (Part 1)Frontend (Angular app, Dockerfile)
- Infrastructure/      (Part 1)main.bicep
- AI-Workflow/         (Part 2)
- docker-compose.yml   API + SQL Server + frontend
- .env                 (NOT committed) real local password
- CLAUDE.md            (Part 3)
- .gitignore
- README.md



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

https://localhost:7194/swagger


DB:

┌──────────────────────┐              ┌──────────────────────┐
│      Campaigns       │              │        Events        │
├──────────────────────┤              ├──────────────────────┤
│ Id (PK)              │ 1          * │ Id (PK)              │
│ Name                 │──────────────│ EventType            │
│ StartDate            │              │ Timestamp            │
│ EndDate              │              │ CampaignId (FK) ─────┼──► Campaigns.Id
└──────────────────────┘              └──────────────────────┘
   One campaign ...                      ... has many events



I separated the API, frontend and infrastructure so each can be built, tested
and deployed independently, and so the Bicep and Docker files stay at the
boundary between application code and platform.

## Where to find each part of the assessment

| Assessment item | Location |
|---|---|
| GET / POST endpoints | `WebAPI/Controllers/CampaignController.cs` |
| Validation (DTOs) | `WebAPI/Dtos/CampaignDtos.cs` |
| DbContext and 1-to-many config | `WebAPI/Data/CampaignDbContext.cs` |
| EF Core migrations | `WebAPI/Migrations/` |
| Angular form, detail, service, routing | `WebFrontend/src/app/` |
| Bicep (Plan, App Service, connection string) | `infra/main.bicep` |
| Part 2: AI code review | `ai-workflow/` |
| Part 3: AI context file | `CLAUDE.md` |

## Quick start (Docker)

**Prerequisites:** Docker Desktop.

```bash
git clone https://github.com/<you>/CampaignTrackingApp.git
cd CampaignTrackingApp

cp .env.example .env        # Windows: copy .env.example .env
# Edit .env and set a strong MSSQL_SA_PASSWORD

docker compose up --build -d
docker compose ps           # wait until mssql is "healthy" and webapi is "running"
```

- Swagger UI: http://localhost:8080/swagger (use **http**, not https)
- The API applies EF migrations automatically at startup.

Stop and clean up:

```bash
docker compose down          # keep the database data
docker compose down -v       # also delete the database volume
```

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

Swagger is shown in the console output (for example https://localhost:7194/swagger).

### Frontend

```bash
cd WebFrontend
npm install
ng serve
```

Open http://localhost:4200. The API URL is configured in
`src/environments/environment.ts`. CORS allows `http://localhost:4200`.

## API

| Method | Route | Description |
|---|---|---|
| GET | `/api/campaigns/{id}` | Campaign with its events (`404` if not found) |
| POST | `/api/campaigns` | Create a campaign (`201`, or `400` if invalid) |

Example request:

```json
{ "name": "Spring Sale", "startDate": "2026-03-01T00:00:00", "endDate": "2026-03-31T00:00:00" }
```

## Design decisions

- **No N+1 queries:** the GET endpoint projects campaign and events into DTOs
  with `.Select()`, so EF issues one SQL query with a join. It uses
  `AsNoTracking()` because the query is read-only.
- **DTOs instead of entities:** clients can only set the fields the API allows
  (no over-posting), and responses avoid serialization cycles.
- **EF Core migrations:** the schema is versioned in `WebAPI/Migrations/`.
  The relationship is Campaign 1 → * Event with a required foreign key and
  cascade delete.

## Security approach

| Threat | Mitigation |
|---|---|
| SQL injection | All queries go through EF Core/LINQ, which sends parameterized SQL. No raw SQL or string concatenation. |
| XSS | Input is length-limited and rejects `<` and `>` in `Name`. Output is escaped by Angular's template binding (`{{ }}`); `innerHTML` is not used. |
| Invalid input | Data annotations plus `IValidatableObject` (`Name` required, `EndDate` after `StartDate`). Failures return `400` with details. |
| Over-posting | Request DTO exposes only `Name`, `StartDate`, `EndDate`. |
| Secrets | Nothing sensitive is committed. `.env` is gitignored, local dev uses user-secrets, and Azure uses app settings / Key Vault references. |
| Transport | App Service is configured `httpsOnly` with TLS 1.2+. |

**Tested cases:** valid POST → `201`; empty name, `<script>` in name, name over
200 characters, and `endDate` before `startDate` → `400`; SQL-injection text
(`'; DROP TABLE Campaigns; --`) is stored as plain text and the table is
unaffected.

## Infrastructure (Azure Bicep)

`infra/main.bicep` deploys an App Service Plan, an App Service (HTTPS only,
TLS 1.2, FTPS disabled) and an application setting for the database
connection string, passed in as a `@secure()` parameter.

```bash
az bicep build --file infra/main.bicep
az deployment group what-if -g <resource-group> -f infra/main.bicep \
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