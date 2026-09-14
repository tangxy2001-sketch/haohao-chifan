# Repository Guide

## Project

This repository is a native WeChat Mini Program for ingredient inventory management, expiry-aware food management, inventory-constrained recipe recommendation, and AI-assisted recipe adjustment. `_docs/plan.md` defines the frozen MVP product scope.

## Sources of truth

- `_docs/plan.md` — frozen product scope and MVP requirements.
- Current architecture document — technical architecture and system boundaries. No architecture document is tracked yet; GitHub Issue #2 establishes it.
- GitHub Issues — canonical active implementation backlog.
- `_docs/tasks.md` — versioned snapshot of the original backlog; do not treat it as the active task tracker after Issues have been created.
- `_docs/process.md` — development workflow and Git rules.

## Commands

No project bootstrap, development, test, lint, formatting, or migration commands exist yet. Update this section after bootstrap establishes and verifies the real repository commands.

## Rules

- Work on one GitHub Issue at a time unless explicitly instructed otherwise.
- Read the current GitHub Issue before starting implementation.
- Do not expand product scope beyond `_docs/plan.md` unless explicitly requested.
- Read the architecture document before architectural, backend, database, authentication, infrastructure, or AI-boundary changes.
- Do not add dependencies that are not required by the currently approved GitHub Issue or established architecture without explicit user approval.
- Never commit secrets, API keys, database URLs, tokens, credentials, private AppIDs, or model credentials.
- Do not create, modify, or delete CloudBase or other cloud resources without explicit user approval.
- Do not deploy to staging or production without explicit user approval.
- Keep changes small and independently reviewable.
- Run relevant verification before declaring a task complete.
- Commit meaningful completed work.
- Do not automatically start the next Issue.
- Product-scope or architecture changes must not be silently inferred from implementation details.
- Incorporate reusable corrections into the relevant living project documentation.
