# Repository Guide

## Project

This repository is a native WeChat Mini Program for ingredient inventory management, expiry-aware food management, inventory-constrained recipe recommendation, and AI-assisted recipe adjustment. `_docs/plan.md` defines the frozen MVP product scope.

## Sources of truth

- `_docs/plan.md` — frozen product scope and MVP requirements.
- `_docs/architecture.md` — current technical architecture and system boundaries.
- GitHub Issues — canonical active implementation backlog.
- `_docs/tasks.md` — versioned snapshot of the original backlog; do not treat it as the active task tracker after Issues have been created.
- `_docs/process.md` — development workflow and Git rules.
- `_docs/manual-golden-path.md` — stable end-to-end manual acceptance path for the MVP.

## Commands

- `corepack pnpm install --frozen-lockfile` — install the pinned workspace dependencies from the lockfile.
- `corepack pnpm format:check` — check deterministic formatting without modifying files.
- `corepack pnpm lint` — run ESLint across the declared repository scope.
- `corepack pnpm typecheck` — type-check the root and all three workspace packages without emitting files.
- `corepack pnpm test` — run the Vitest test suite once.

## Rules

- Work on one GitHub Issue at a time unless explicitly instructed otherwise.
- Read the current GitHub Issue before starting implementation.
- Follow `_docs/process.md` for future non-trivial implementation: approved version-identifiable specification, feature branch and PR, candidate-specific CI and independent QA evidence, explicit user approval to merge, merge verification, then Issue closure.
- Do not expand product scope beyond `_docs/plan.md` unless explicitly requested.
- Read the architecture document before architectural, backend, database, authentication, infrastructure, or AI-boundary changes.
- Do not add dependencies that are not required by the currently approved GitHub Issue or established architecture without explicit user approval.
- Never commit secrets, API keys, database URLs, tokens, credentials, private AppIDs, or model credentials.
- Obtain explicit user approval for product-scope or architecture changes, cloud-resource changes, deployments or other production actions, and repository-permission changes.
- Keep changes small and independently reviewable.
- Run relevant verification before declaring a task complete.
- Commit meaningful completed work.
- Do not automatically start the next Issue.
- Product-scope or architecture changes must not be silently inferred from implementation details.
- Incorporate reusable corrections into the relevant living project documentation.
- Native `pilot_pm`, `pilot_swe`, and `pilot_qa` availability is not authorization to invoke them. Follow the opt-in supervised pilot subsection in `_docs/process.md`; setup approval does not activate Issue #4 or unattended development.
