# Development Process

GitHub Issues are the canonical active backlog. `_docs/tasks.md` is the original versioned backlog snapshot and is not the active task tracker.

## Issue workflow

1. Work on one GitHub Issue at a time unless explicitly instructed otherwise.
2. Before implementation, read the Issue, `_docs/plan.md`, and the context documents relevant to the change, including the current architecture document when applicable.
3. Groom the task, when needed, into:
   - Goal
   - Acceptance Criteria
   - Out of Scope
   - Constraints
4. Implement the smallest change that satisfies the accepted criteria.
5. Run the relevant tests and checks.
6. Review the diff.
7. Commit completed work separately with a meaningful message.
8. Do not start the next Issue automatically.
9. When a recurring correction reveals a reusable rule, update the appropriate living document in a separate change.

The workflow may later evolve to PM → Software Engineer → QA subagents. Do not create or orchestrate that agent team until the workflow has been explicitly adopted.
