---
name: develop-issue
description: Coordinate the existing pilot PM, SWE, and QA roles for one explicitly selected haohao-chifan Issue when the user explicitly invokes this supervised workflow.
---

# Develop one selected Issue

Use this entry point in the coordinating main session only, on explicit user invocation of `$develop-issue`. Require one user-selected Issue and explicit activation for that Issue before calling a role. Skill installation, setup approval, or a request to edit this skill is not product activation. If the selection or activation is missing, ask for that missing input and stop before a role call; do not choose an Issue automatically.

Read [AGENTS.md](../../../AGENTS.md), the current selected GitHub Issue, and [_docs/process.md](../../../_docs/process.md), especially “Issue workflow” and “Opt-in supervised Issue #4 pilot”. Resolve these links from this skill directory. The process owns approval, evidence, repair, and merge rules; follow its source-document routing for product scope and architecture rather than reproducing those documents here.

Use the existing named roles and their mapped responsibility documents:

- [pilot_pm](../../../.codex/agents/pilot_pm.toml) → [Product Manager](../../../_docs/team/pm.md)
- [pilot_swe](../../../.codex/agents/pilot_swe.toml) → [Software Engineer](../../../_docs/team/software-engineer.md)
- [pilot_qa](../../../.codex/agents/pilot_qa.toml) → [QA Engineer](../../../_docs/team/qa-engineer.md)

The TOMLs hold runtime configuration and concise routing boundaries; the team documents hold role-specific responsibilities. Read both for the selected handoff. Reconstruct the durable checkpoint from the conversation and PR evidence before resuming; missing or ambiguous state is BLOCKED.

1. Invoke native `pilot_pm` for the selected Issue to propose a version-identifiable specification. Return it to the user and wait for explicit approval of that revision before SWE.
2. Invoke native `pilot_swe` with the approved specification, approval evidence, base, and checkpoint to implement on a feature branch and submit an unmerged PR with the required gates and candidate evidence.
3. Invoke fresh native `pilot_qa` with the exact specification, candidate/base, checkpoint, and independently inspectable artifacts/CI evidence. Apply the process's evidence-based PASS/FAIL/BLOCKED rules; SWE claims cannot establish PASS and unavailable evidence must remain NOT VERIFIED.
4. On failure, follow the existing bounded repair policy: charge at most two repairs before work, use fresh SWE then fresh QA for each (including the second), and preserve attempt identity across resumption. On PASS, stop for explicit user approval binding the exact candidate, base, and specification before merge. Follow the process's revalidation and merge-verification rules only when separately authorized; do not automatically close an Issue or select another.

For every call use `collaboration.spawn_agent` with the actual `agent_type` (`pilot_pm`, `pilot_swe`, or `pilot_qa`) and `fork_turns="none"`; do not substitute a default agent or override role model/effort. Send only the selected Issue/case, relevant source references, specification and approval evidence, candidate/base as applicable, and checkpoint. Children do not delegate. Keep SWE and QA in separate fresh contexts, including repairs.

Wait with supported native controls and confirm completion before attempting the next role, keeping the [configured cap](../../../.codex/config.toml) unchanged. Stop on an actual invocation failure or unestablished completion; never raise the cap, use interrupt as closure, or switch clients to continue. Sequential acceptance does not prove closure, reclamation, cap enforcement, effective model/permissions, or full setup acceptance. Preserve unresolved runtime verification items from the process and checkpoint.

PM and QA remain read-only and make no remote writes. Preserve every approval and permission boundary in the process. This skill grants no cloud actions, deployments, repository-permission changes, or automatic next-Issue work.
