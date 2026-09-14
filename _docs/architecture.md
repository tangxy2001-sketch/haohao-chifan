# MVP Architecture

## Status and scope

This document is the current architecture source of truth for the MVP. It records approved system boundaries and technology decisions; [`plan.md`](./plan.md) remains authoritative for product behavior, and [`manual-golden-path.md`](./manual-golden-path.md) remains the observable end-to-end acceptance path.

This is not an implementation guide. It intentionally does not define endpoints, database schemas, migrations, cloud provisioning, or detailed implementation steps.

## System context

```text
User
  |
  v
Native WeChat Mini Program (TypeScript)
  |  REST, described by OpenAPI
  v
Backend API (Node.js + TypeScript + Fastify)
  |  modular monolith; one CloudBase Run service
  |
  +---- typed database access / controlled raw SQL ----> CloudBase PostgreSQL
  |                                                     (system of record)
  |
  +---- model-provider adapter ------------------------> Model provider
                                                        (untrusted proposals)
```

All business-data and model-provider access from the Mini Program crosses the backend boundary. The Mini Program must not connect directly to PostgreSQL or a model provider. The database and model provider do not communicate directly.

## Architecture decisions

### 1. Native TypeScript client behind an API boundary

**Decision.** The client is a native WeChat Mini Program written in TypeScript. It accesses business data only through the backend's REST interface, whose machine-readable contract is OpenAPI.

**Rationale.** A single server boundary keeps identity, credentials, validation, and persistence authority outside the distributable client while giving client and server implementations an explicit contract.

**Consequences.** The Mini Program may manage presentation and transient interaction state, but it cannot be authoritative for persisted business state or transaction consistency. Whether OpenAPI is contract-first or code-first, its version, and its artifact location are deferred.

### 2. Fastify modular monolith on CloudBase Run

**Decision.** The backend is a Node.js and TypeScript Fastify application deployed to CloudBase Run as a modular monolith. Business capabilities may be separated into internal modules, but the entire MVP backend is deployed as one service.

**Rationale.** Internal module boundaries preserve separation of concerns without adding distributed-system and deployment complexity to the MVP.

**Consequences.** Internal modules communicate in-process and expose client-facing behavior through the single REST API boundary. Splitting modules into independently deployed services is not part of the MVP architecture.

### 3. Server-resolved WeChat identity

**Decision.** CloudBase WeChat identity arrives as trusted server-side context. The backend resolves that context to an internal `user_id`, and persisted user-owned data is associated with that internal identifier.

**Rationale.** User isolation must rely on identity established at the trusted server boundary rather than assertions controlled by a client.

**Consequences.** Client-supplied identity claims are never authoritative. The exact trusted-context or token-exchange mechanism and the details of user creation, authorization, and session handling remain deferred to later work.

### 4. PostgreSQL as the consistency authority

**Decision.** CloudBase PostgreSQL is the system of record for persisted business state. Database access must be typed, using either Drizzle ORM or typed SQL. Raw SQL is permitted when transaction-critical operations require tighter control; this decision does not select an ORM or migration tool.

Database transactions and constraints are authoritative for consistency in inventory changes, reservations, reallocation, and deduction. These operations must preserve the atomicity and rollback behavior required by [`plan.md`](./plan.md) and the completion flow in [`manual-golden-path.md`](./manual-golden-path.md).

**Rationale.** The database is the shared serialization and integrity boundary for concurrent changes to inventory and reservations.

**Consequences.** Client state, AI output, and in-memory application checks are not authoritative for these guarantees. Implementations may use them for feedback or early validation, but a failed critical operation must roll back without partial inventory, reservation, pending-recipe, or completion state. Selection of Drizzle versus typed SQL, migration tooling, and database schema details remains deferred.

### 5. Server-side AI behind a provider adapter

**Decision.** Model calls are server-side only and isolated behind a model-provider adapter. Business modules depend on that adapter rather than a provider-specific API. Model credentials are server-only configuration: they must never be included in the Mini Program bundle or committed to the repository.

AI output is an untrusted proposal. It cannot directly mutate inventory, reservations, shopping lists, recipes, or any other persisted business state. Before display and again before application, applicable deterministic rules validate AI-originated proposals. Only after the applicable explicit user action may backend business logic perform an authorized state change through the normal transaction and constraint boundary.

**Rationale.** Provider isolation limits vendor coupling, while deterministic validation and explicit authorization keep probabilistic output outside the trusted write path.

**Consequences.** Business rules, inventory arithmetic, reservation behavior, hard-constraint enforcement, and persisted writes cannot be delegated to a model. The model provider, SDK, model, retry policy, and prompt design remain deferred.

### 6. Test transaction-critical behavior on PostgreSQL

**Decision.** Vitest is the project test runner. Transaction-critical database behavior requires integration tests against real PostgreSQL, including assertions for rollback, atomicity, constraints, and consistent inventory/reservation outcomes. Mocks alone are insufficient for that behavior.

**Rationale.** Mocked persistence cannot establish the behavior of real transactions, concurrency controls, or database constraints.

**Consequences.** Unit tests may still use mocks where appropriate, but critical consistency claims are not complete until exercised against PostgreSQL. How local and CI PostgreSQL test databases are provisioned remains deferred.

## Deferred decisions

The following choices are intentionally unresolved and must not be inferred from this architecture:

- whether Drizzle ORM or typed SQL is the default persistence approach, and which concrete persistence tooling is installed;
- whether OpenAPI is contract-first or code-first, including the OpenAPI version and artifact location;
- the precise trusted-context or token-exchange mechanism for server-side CloudBase WeChat identity resolution;
- the concrete model provider, SDK, model, retry policy, and prompt design behind the provider adapter;
- how real PostgreSQL integration-test databases are provisioned locally and in CI;
- any broader architecture-document filename or ADR-directory convention beyond this discoverable entry point.

Resolving any of these requires a later approved Issue or another authoritative project decision.
