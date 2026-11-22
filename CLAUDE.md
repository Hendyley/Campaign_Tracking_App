# CLAUDE.md

Rules for AI coding agents working in this repository.

## Project

Campaign tracking app. `WebAPI/` is a .NET 10 ASP.NET Core API (controllers, EF Core,
SQL Server), `WebFrontend/` is an Angular app (standalone components), `Infrastructure/`
holds the Azure Bicep template, and `docker-compose.yml` runs the stack locally
(`mssql`, `webapi`, `frontend`).

Commands that must pass before a change is considered done:

```bash
dotnet build WebAPI
cd WebFrontend && ng build
bicep build Infrastructure/main.bicep
docker compose config -q
```

If the .NET SDK or Node is not installed, run `docker compose build` instead of the first
two commands. It compiles both apps inside their images.

## Rules

1. **Keep secrets and configuration out of the code.**
   Connection strings and passwords come from `.env` (gitignored), `dotnet user-secrets`
   locally, and `@secure()` Bicep parameters or Key Vault references in Azure. A new
   variable gets a placeholder in `.env.example`. Inside Docker Compose, services reach
   each other by service name (`mssql`, `webapi`), never `localhost`, and host ports come
   from `API_PORT` and `NODE_PORT`.
   *Because:* a committed secret stays in git history, and `localhost` inside a container
   points at the container itself.

2. **Backend: keep controllers thin and put data access in services behind interfaces.**
   Controllers validate HTTP input, call an `I...Service` and map the result to a status
   code. No `DbContext`, LINQ or entities in controllers. Follow `ICampaignService` and
   register new services with `AddScoped`.
   *Because:* controllers stay testable and each rule has one home.

3. **Backend: reads project to DTOs and never fetch more than needed.**
   Use `.AsNoTracking()` and a `.Select(...)` projection. Never call `ToListAsync()` before
   filtering or projecting, never loop over entities to compute values, and never return
   entities. List endpoints use a stable `OrderBy` with `Skip`/`Take`, clamp `page` and
   `pageSize` inside the service, and take a `CancellationToken`. Validate request DTOs
   at the boundary, and use EF Core/LINQ only, with no SQL built from strings.
   *Because:* the unbounded, tracked, N+1 query in the Part 2 review is the defect this
   prevents, and parameterised queries close SQL injection.

4. **Frontend: strict, typed Angular that treats all data as untrusted.**
   No `any`: use typed models that match the API DTOs. API calls go through a service that
   uses `HttpClient` and returns `Observable<T>`, with the base URL from `environment.ts`
   and never hardcoded in a component. Never use `innerHTML` or `bypassSecurityTrust*`
   with user data, so Angular's template escaping stays on.
   *Because:* typed models catch contract drift at build time, and escaping is the main
   defence against XSS.

5. **Do not invent APIs, and do not claim work you did not run.**
   If a property, package or setting is not in the repository, say it is an assumption
   instead of writing code that depends on it. Report a change as built, tested or
   deployed only if you ran it. Keep `README.md` paths and folder names in sync with the
   repo, because they are case-sensitive on Linux.
   *Because:* the Part 2 review found the AI had built code on an assumed `OrderDate`
   property.