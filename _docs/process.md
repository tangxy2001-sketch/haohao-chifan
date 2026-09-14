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
4. Give the specification a version-identifiable revision. The user must approve that revision before implementation; a Software Engineer must not rewrite or silently reinterpret approved Acceptance Criteria.
5. A fresh Software Engineer session implements only the approved Issue on a feature branch and submits a pull request. Future non-trivial implementation work must not be pushed directly to `main`.
6. The Engineer runs the four root gates (`format:check`, `lint`, `typecheck`, and `test`), reviews the diff, commits completed work with a meaningful message, and records the candidate commit in the PR.
7. CI and a fresh independent QA session verify the identified candidate. QA reports findings and does not repair the implementation. A fresh QA session provides sufficient independence; a second human reviewer is not required, and the solo developer remains the decision-maker.
8. QA evidence identifies the Issue and approved specification revision, candidate and base commits, commit actually tested, CI run and relevant verification environment, and evidence for every Acceptance Criterion. Prefer existing GitHub metadata and links instead of a separate evidence system. Identify mock-based checks as mocks.
9. Use `PASS` only when every required criterion is verified, `FAIL` when at least one criterion is demonstrably unmet, and `BLOCKED / NOT VERIFIED` when required evidence is unavailable. Missing required evidence cannot produce an overall `PASS`.
10. After an initial QA failure, permit at most two repair attempts. Each attempt returns to a fresh Software Engineer session for the smallest correction and then to independent QA. Stop earlier for conflicting specifications, required scope changes, missing authorization, or an unavailable required environment.
11. Any changed candidate requires renewed relevant verification and approval: rerun all four root gates, retest affected criteria and regressions, and account for every criterion in the new verdict. Relevant unchanged evidence may be referenced rather than duplicated.
12. The user must explicitly approve the exact candidate before merge. After merge, verify that the approved change reached `main`, record the reviewed commit and resulting merge information, and distinguish the feature commit from any newly created merge commit. Only then may the Issue be closed.
13. Do not start the next Issue automatically.
14. When a recurring correction reveals a reusable rule, update the appropriate living document in a separate change.

Very small repository-maintenance or documentation-only tasks may skip formal grooming when the requested change is already unambiguous. Fresh sessions are preferred between PM, Software Engineer, and QA to preserve context independence. The user remains the orchestrator for now.

Do not introduce automated orchestration, parallel agents, worktrees, or reusable Skills yet. Introduce them only after this workflow has been exercised enough to justify automation.

Product-scope or architecture changes, cloud-resource changes, deployments or other production actions, and repository-permission changes require explicit user approval. Branch protection or rulesets may reinforce this process, but changing repository settings is a separately approved action.
