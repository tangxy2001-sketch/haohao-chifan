# Development Process

GitHub Issues are the canonical active backlog. `_docs/tasks.md` is the original versioned backlog snapshot and is not the active task tracker.

## Issue workflow

1. Work on one GitHub Issue at a time unless explicitly instructed otherwise.
2. For a non-trivial Issue, begin with a fresh PM/grooming session. Read the Issue, `_docs/plan.md`, and the context documents relevant to the change, including the current architecture document when applicable.
3. The PM produces or refines:
   - Goal
   - Acceptance Criteria
   - Out of Scope
   - Constraints
   - Deferred Decisions, when relevant
4. The user reviews and approves the groomed specification before implementation.
5. A fresh Software Engineer session implements only the approved Issue and must not rewrite or silently reinterpret its approved Acceptance Criteria.
6. The Engineer runs relevant tests and checks, reviews the diff, commits completed work with a meaningful message, and stops.
7. A fresh independent QA session verifies every Acceptance Criterion against the actual repository state without fixing problems or modifying the implementation.
8. One failed Acceptance Criterion makes the overall result `FAIL`.
9. On `FAIL`, return the Issue to a fresh Software Engineer session for the smallest required correction, then run independent QA again.
10. On `PASS`, the Issue may be closed.
11. Do not start the next Issue automatically.
12. When a recurring correction reveals a reusable rule, update the appropriate living document in a separate change.

Very small repository-maintenance or documentation-only tasks may skip formal grooming when the requested change is already unambiguous. Fresh sessions are preferred between PM, Software Engineer, and QA to preserve context independence. The user remains the orchestrator for now.

Do not introduce automated orchestration, parallel agents, worktrees, or reusable Skills yet. Introduce them only after this workflow has been exercised enough to justify automation.
