# Ledger Customer 360

## Production implementation

The production application is the NestJS API in [apps/api](apps/api) and the Angular frontend in [apps/web](apps/web). This is the enterprise implementation for the Customer 360 platform.

- Backend: NestJS + TypeScript in [apps/api](apps/api)
- Frontend: Angular + TypeScript in [apps/web](apps/web)
- Shared contracts: [packages/contracts](packages/contracts)
- Infrastructure: [infra](infra)
- Local runtime stack: [docker-compose.yml](docker-compose.yml)

## Demo-only legacy layer

The files in the project root such as [server.js](server.js), [app.js](app.js), [data.js](data.js), [index.html](index.html), [styles.css](styles.css), and [schema.sql](schema.sql) are legacy demo assets used for early prototyping and local flow validation. They are not the production application architecture.

The Express mock server remains available only as a demonstration and should be treated as a demo artifact, not as the enterprise system of record.

## Run locally

### Production apps

```powershell
npm install
npm run dev:api
npm run dev:web
```

The API runs under the NestJS app in [apps/api](apps/api), and the Angular app runs in [apps/web](apps/web).

### Demo mock app (legacy)

```powershell
npm install
npm run start:demo
```

This starts the root Express demo on `http://localhost:4000` and is for demonstration only.

## Included workflows

Role-aware login and server-side masking, customer search, profile and account/loan/card views, paginated transaction history, interaction notes, service requests with enforced transitions, grounded AI summary/NBA/chat/contact-plan flows, manager portfolio metrics, and searchable/exportable audit history are all wired through the client.

## Target production architecture

- **Frontend:** Angular + TypeScript + Angular Material. The current API contract remains the typed service boundary and the view layer is structured in standalone components, route guards, and Material tables/dialogs.
- **Backend:** Node.js + NestJS + TypeScript. Split modules into `Auth`, `Customers`, `ServiceRequests`, `Copilot`, and `Audit`; use Keycloak OIDC/JWT guards and role decorators.
- **Data:** PostgreSQL is the system of record for customer, portfolio, product, workflow, and audit entities. Enable `pgvector` for grounded retrieval. Use MongoDB for conversation/session documents and model traces that do not need relational joins.
- **AI:** Ollama hosts a small open-weight model behind a NestJS provider. Retrieval must build context from authorized PostgreSQL rows, return source IDs, and persist every generation and human decision.
- **Observability:** Instrument NestJS and database calls with OpenTelemetry. Export OTLP to the Collector, scrape application metrics with Prometheus, and use Grafana dashboards for latency, errors, AI calls, and workflow throughput.
- **Deployment:** [docker-compose.yml](docker-compose.yml) provides the local dependency topology. For cloud deployment, publish the app image to a registry, use managed PostgreSQL/MongoDB, run Keycloak with an external database, keep Ollama on a GPU node when needed, and provision secrets through the cloud secret manager.

The Angular workspace contains standalone Material UI, typed models, an auth interceptor, a debounced customer search service, portfolio KPIs, risk/status signals, and a responsive relationship detail panel. The Nest workspace contains the API bootstrap, Swagger, Keycloak guard, PostgreSQL repository, pgvector retrieval service, MongoDB conversation persistence, Ollama provider, and OpenTelemetry startup.

## Local platform services

```powershell
docker compose up --build
```

This starts the demo app on `4000`, Angular on `4200`, NestJS on `4100`, Keycloak on `8080`, Grafana on `3000`, Prometheus on `9090`, PostgreSQL on `5432`, MongoDB on `27017`, and Ollama on `11434`. The Compose file is infrastructure scaffolding; production credentials and Keycloak realm configuration must be supplied separately.

## Security notes

The demo token store is intentionally not production authentication. Replace it with Keycloak-issued JWT validation before deployment. Keep raw card/PAN data out of application databases, enforce portfolio checks in every service handler, redact sensitive fields at the API boundary, and retain immutable audit events for data access and AI decisions.