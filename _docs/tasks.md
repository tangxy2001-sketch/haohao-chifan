# MVP Implementation Backlog

This backlog implements the frozen scope in `_docs/plan.md` using a native WeChat Mini Program, a TypeScript API on CloudBase Run, and CloudBase PostgreSQL. Tasks are ordered to reduce blockers, but each task states a self-contained delivery boundary and should end with its own passing verification and Git commit.

## 1. Bootstrap an empty project with a passing test
Goal: Create the empty solution-two project structure and make one smoke test pass.
Description: Initialize a pnpm workspace containing placeholders for the native WeChat Mini Program, the TypeScript CloudBase Run API, and shared packages, without adding product behavior. Add the minimum Vitest configuration and a smoke test so a clean checkout can install dependencies and run a passing test command.

## 2. Record the architecture decisions
Goal: Document the chosen stack and the boundaries between the client, API, database, and AI provider.
Description: Add concise architecture decision records for native WeChat Mini Program, Fastify on CloudBase Run, CloudBase PostgreSQL, and server-side model access. State that the API is a modular monolith, the database is the source of truth, and AI output cannot directly mutate business data.

## 3. Add repository quality gates
Goal: Make formatting, linting, type checking, and tests reproducible from the repository root.
Description: Configure shared TypeScript, ESLint, and formatting rules for the mini program, API, and shared packages. Add root commands and a CI workflow that fail independently on formatting, lint, type, or test errors without deploying anything.

## 4. Create the empty mini program shell
Goal: Produce a compilable native TypeScript mini program with the four planned top-level tabs.
Description: Configure `project.config.json`, the mini program source root, global application files, and placeholder pages for 首页、库存、AI、我的. Keep every page behavior-free, use a non-secret placeholder AppID strategy, and verify compilation in WeChat Developer Tools or the documented CI fallback.

## 5. Create the API service shell
Goal: Start a production-shaped Fastify service with a passing health check.
Description: Add the TypeScript Fastify application, structured startup and shutdown handling, and a versioned health endpoint suitable for CloudBase Run probes. Verify the endpoint with an automated test and do not add product routes.

## 6. Define environment and secret handling
Goal: Establish safe configuration for local, test, staging, and production environments.
Description: Define validated environment variables for CloudBase, PostgreSQL, API URLs, and model credentials, together with redacted example files. Ensure secrets cannot enter the mini program bundle or Git history and make missing server configuration fail with a clear startup error.

## 7. Add the PostgreSQL migration workflow
Goal: Make database schema changes versioned, repeatable, and testable.
Description: Configure the selected migration tool against CloudBase PostgreSQL and provide commands for creating, applying, and checking migrations. Add an empty baseline migration and verify that a fresh test database can migrate up without manual SQL edits.

## 8. Provision and verify the CloudBase development environment
Goal: Create a non-production CloudBase environment that supports the chosen architecture.
Description: Provision PostgreSQL and a CloudBase Run service target, record environment identifiers outside source-controlled secrets, and verify private database connectivity from the service. Document the repeatable setup and teardown boundaries without creating production resources.

## 9. Define shared API contracts
Goal: Give the mini program and API one versioned contract and client transport for requests, responses, and errors.
Description: Define the standard response envelope, domain error codes, pagination shape, date representation, and idempotency header behavior in a shared package. Generate or validate an OpenAPI document, add a typed mini program transport around the supported request API, and prove contract serialization and error mapping with tests without adding feature endpoints.

## 10. Implement WeChat identity resolution
Goal: Resolve every authenticated API request to a stable internal user without a custom login page.
Description: Use the CloudBase mini program identity flow and trusted server context to map the WeChat identity to an internal `user_id`. Reject forged identities, create the user idempotently on first access, and cover new and returning users with tests.

## 11. Establish database authorization boundaries
Goal: Prevent one user from reading or mutating another user's records.
Description: Add ownership columns, least-privilege service roles, and RLS policies or equivalent server-only access rules for user-scoped tables. Test both permitted access and cross-user denial, and keep all privileged multi-table writes behind the API.

## 12. Create the user preference model and API
Goal: Persist the long-term settings defined in the product plan.
Description: Model default servings, allergies, hard or soft avoidances, taste likes and dislikes, preset mode, cookware, time, difficulty, and expiry thresholds. Add read and update endpoints with validation that distinguishes `has`, `explicit_none`, and `unconfirmed` safety states.

## 13. Build the safety-first onboarding flow
Goal: Collect allergy, avoidance, and default-serving information before the first executable recommendation.
Description: Implement the skippable onboarding sequence and persist each completed step through the preference API. Allow browsing while safety fields are unconfirmed, but block the first executable recommendation until the user explicitly completes the required confirmation.

## 14. Isolate onboarding demonstration data
Goal: Provide the three-step demonstration without affecting real user records.
Description: Create an in-memory or explicitly namespaced demo dataset for adding food, viewing expiry, and requesting a recipe. Verify that demo actions never create real inventory, reminders, reservations, favorites, shopping items, or cooking history.

## 15. Create the standard ingredient catalog
Goal: Store canonical ingredients, categories, aliases, and supported unit dimensions.
Description: Add the ingredient and alias schema with stable identifiers and the seven categories defined in the plan. Seed a small reviewed fixture set for development and test duplicate canonical names, aliases, and unsupported dimensions.

## 16. Implement ingredient-name normalization
Goal: Map clear user aliases to canonical ingredients without guessing ambiguous names.
Description: Build a deterministic lookup that preserves the user's display name while resolving known aliases such as 西红柿 to 番茄. Return an explicit clarification result for ambiguous terms such as 青菜、肉、鱼 and test exact, alias, unknown, and ambiguous inputs.

## 17. Implement quantity and unit rules
Goal: Validate quantities and perform only the reliable conversions allowed by the plan.
Description: Support `g / kg / ml / L / 个 / 份 / 包 / 盒 / 瓶`, allowing decimals only for continuous units and integers for discrete units. Implement only `g ↔ kg` and `ml ↔ L` conversions plus user-supplied package contents, and reject unsupported cross-dimension guesses with tests.

## 18. Model expiry rules and source evidence
Goal: Store versioned shelf-life rules backed by official or public-institution sources.
Description: Define rule fields for ingredient, storage method, opened or thawed state, duration, source reference, effective version, and review status. Include a small test fixture and ensure a rule cannot be activated without its source metadata.

## 19. Implement the expiry calculation engine
Goal: Derive the system use-by date, expiry basis date, and recommendation eligibility deterministically.
Description: Calculate dates from the active rule version and objective batch state, choosing the earlier of package expiry and system use-by dates. Cover missing rules, changed storage or opened state, past dates, corrected facts, and no-reliable-date behavior with unit tests.

## 20. Create the inventory batch schema
Goal: Persist precise batch state and parent-child relationships without allowing invalid quantities.
Description: Model canonical and display names, quantity, unit, optional package contents, dates, storage, opened and thawed states, status, soft deletion, and `parent_batch_id`. Add database constraints for non-negative quantities, valid state combinations, ownership, and timestamp consistency.

## 21. Create the inventory event ledger
Goal: Make every inventory-changing operation auditable without exposing a user-facing history page.
Description: Add append-only events for add, edit, consume, used up, discard, soft delete, split, merge, reserve, and release with actor and correlation metadata. Verify that events cannot be silently updated and that private operational data is excluded from ordinary client responses.

## 22. Implement the add-batch API
Goal: Add a validated inventory batch and its audit event atomically.
Description: Accept canonicalized ingredient data, quantity, unit, storage state, purchase date, and optional package expiry or package contents. Calculate derived expiry fields, return possible matching batches without auto-merging, and commit the confirmed batch and event in one transaction.

## 23. Build the add-ingredient interface
Goal: Let the user manually create a batch with clear confirmation of normalized data and suggested dates.
Description: Build the form, ingredient clarification, quantity and unit controls, date and storage fields, and the new-batch versus merge choice. Show the calculated use-by date and evidence before final confirmation, and handle unknown or unreliable shelf-life data explicitly.

## 24. Implement inventory list queries
Goal: Return user inventory grouped, filtered, searched, and sorted as specified.
Description: Support grouping by ingredient category or storage location, search by display and canonical name, and filters for expiry, opened, chilled, frozen, and room temperature. Implement fastest-expiry, latest-purchase, and name sorting while excluding removed records and treating undated batches correctly.

## 25. Build the inventory page
Goal: Present complete current inventory with the planned grouping and discovery controls.
Description: Render grouped batches, search, filters, sort controls, and the category versus location switch using the inventory query contract. Include empty, loading, error, expired, undated, and partially packaged states without adding batch operations.

## 26. Implement batch detail and edit operations
Goal: Read and edit one batch while recalculating every affected derived field.
Description: Add detail and field-level edit endpoints for quantity, unit, storage, purchase date, package expiry, opened state, and thawed state. Preserve valid reservations, recalculate expiry when objective state changes, block edits that violate reserved quantity, and write an audit event atomically.

## 27. Build the batch detail and edit interface
Goal: Let the user inspect and edit a batch with visible consequences before saving.
Description: Display packaging semantics, remaining base quantity, both objective dates, expiry basis, recommendation status, and source evidence. Provide validated edit controls and show changed expiry or reservation conflicts before submitting the update.

## 28. Implement atomic batch splitting
Goal: Split part of a batch into a child batch while preserving total quantity and reservations.
Description: Create a transaction that reduces the parent, creates the child with `parent_batch_id`, migrates reservations according to objective FEFO ordering, and recalculates both expiry states. Reject invalid amounts or incompatible units and prove rollback behavior with concurrency tests.

## 29. Build the batch-splitting interface
Goal: Let the user move part of a batch to a different storage state with an explicit preview.
Description: Collect the split quantity and new objective state, then preview parent and child quantities, dates, and any reservation movement. Require confirmation before calling the atomic split operation and render transaction failures without changing local state.

## 30. Implement atomic batch merging
Goal: Merge only objectively identical compatible batches and preserve all reservation ownership.
Description: Validate matching purchase date, storage, opened state, thawed state, and package expiry before creating the merged result. Aggregate reservations by pending-recipe instance, record lineage and events, recalculate expiry, and roll back the entire operation on any conflict.

## 31. Build the batch-merging interface
Goal: Let the user choose and confirm a valid merge without automatic data loss.
Description: Show only compatible candidate batches and preview the resulting quantity, package representation, dates, and reservations. Keep “new batch” as a distinct path and explain why an incompatible batch cannot be merged.

## 32. Implement pantry-item management
Goal: Track staple ingredients as available or unavailable without precise quantities.
Description: Add user-scoped pantry records and read or toggle endpoints keyed by canonical ingredient. Keep pantry items separate from batch inventory, include them in later missing-ingredient checks, and write appropriate audit metadata.

## 33. Build the pantry-item interface
Goal: Let the user search and toggle common staples from the inventory area.
Description: Present clear available and unavailable states without quantity or expiry controls. Persist toggles through the pantry API and cover empty, filtered, offline-error, and optimistic-update rollback behavior.

## 34. Implement non-recipe consumption operations
Goal: Support “used some,” “used up,” “discard,” and corrective soft deletion safely.
Description: Create transactional operations that update or remove the batch, enforce quantity and unit rules, and append the correct event type. Block any result below active reservations until an explicit cancellation or reallocation occurs, and require a separate confirmation token for soft deletion.

## 35. Build inventory quick actions
Goal: Expose the four non-recipe inventory actions with appropriate confirmation and error recovery.
Description: Add quantity entry for partial use and distinct confirmation flows for used up, discard, and corrective deletion. Preview reservation conflicts, never label deletion as waste, and refresh the batch only after the server transaction succeeds.

## 36. Implement expiry reminder queries
Goal: Return the most urgent ingredients and complete expiry groups from one consistent calculation.
Description: Build queries for the home-card maximum of two urgent items and for the full 今天优先使用、即将到期、正常 groups. Use only `expiry_basis_date`, user category thresholds, and current batch status, excluding undated and non-recommendable batches where required.

## 37. Build home and expiry reminder views
Goal: Show the correct home decision state and the complete expiry detail page.
Description: Implement the urgent card, “查看全部,” contextual “用这些做饭,” and the primary or secondary “今天做什么” placement for pending-recipe and empty-inventory home variants. Render the detail groups in the required order and avoid adding push notifications, which remain outside MVP.

## 38. Add expiry-threshold settings
Goal: Let the user override category-specific reminder thresholds safely.
Description: Add validated settings controls and API persistence for each ingredient category while retaining documented defaults. Recalculate visible group membership after a successful update without changing objective expiry dates.

## 39. Create the recipe and snapshot schema
Goal: Persist structured recipes and immutable snapshots used by favorites, pending recipes, and history.
Description: Model source metadata, servings, time, difficulty, cookware, tags, required or optional ingredients, quantities, steps, and meal composition limited to main, side, and staple components. Define immutable snapshot fields and ensure later recipe-source changes cannot rewrite saved user snapshots.

## 40. Define the recipe-source ingestion contract
Goal: Establish a legal and quality-controlled boundary for structured recipe sources.
Description: Document the required fields, provenance, licensing status, update policy, rejection reasons, and normalized output for any recipe provider or curated import. Provide reviewed fixtures covering a valid recipe and representative invalid records without scraping an unapproved source.

## 41. Implement recipe ingestion validation
Goal: Normalize approved recipe input into the canonical schema without inventing required data.
Description: Validate ingredients, units, steps, time, difficulty, cooking method, cuisine, and scenario tags before storage. Allow AI-enriched optional tags only through a marked and rule-checked path, reject incomplete or unlicensed inputs, and prevent nutrition tags from becoming precise intake values or health claims.

## 42. Implement available-inventory calculation
Goal: Compute usable quantity per ingredient after active reservations and expiry exclusions.
Description: Aggregate compatible batch units, subtract reservations, exclude objectively expired non-recommendable batches, and order allocatable batches by the plan's FEFO tie breakers. Return explainable batch allocations and shortages and cover packaging conversion and undated batches with tests.

## 43. Implement constraint resolution
Goal: Merge long-term preferences and one-request conditions into explicit hard and soft constraints.
Description: Represent allergies, hard or soft avoidances, tastes, preset mode, cuisine, cooking method, time, difficulty, cookware, servings, required ingredients, and excluded ingredients. Enforce non-overridable allergies, allow temporary soft overrides, detect hard conflicts, and return a human-readable resolution summary.

## 44. Implement structured recipe candidate retrieval
Goal: Find feasible structured recipes before invoking generative AI.
Description: Query approved recipes using required ingredients, exclusions, cookware, time, difficulty, meal shape, and available inventory. Return a bounded candidate set with computed shortages and reject recipes that violate any hard constraint.

## 45. Implement deterministic recipe ranking
Goal: Rank candidates by expiry priority, available stock, low purchasing need, and soft preferences.
Description: Create a versioned scoring policy covering urgent and relevant opened foods, usable inventory, shopping burden, mode, time, difficulty, and cookware. Return one best result plus at most two alternatives and generate one to three concise reasons without exposing raw scores.

## 46. Create the recommendation API
Goal: Serve a validated single-dish or complete-meal recommendation from structured recipes.
Description: Accept servings and temporary conditions, resolve constraints, retrieve candidates, rank them, and return ingredient allocations, substitutions, and shopping previews. Distinguish no feasible result from a closest soft-constraint match and leave AI fallback behind an explicit interface.

## 47. Build recommendation result and recipe detail views
Goal: Present the best recipe and optional alternatives without exposing source-type labels.
Description: Show recipe structure, servings, time, difficulty, cookware, feature labels, shopping-burden category, ingredients, steps, and concise reasons. Support single-dish and meal results, allow expanding up to two alternatives, and keep favorite and pending actions separate.

## 48. Implement inventory-based substitutions
Goal: Propose safe ingredient substitutions without applying them automatically.
Description: Search current unreserved inventory and available pantry items first, retaining allergies, avoidances, temporary constraints, and unit compatibility. Return the changed quantities, steps, inventory allocation, and shopping preview for confirmation and clearly mark when no valid substitute exists.

## 49. Implement zero-purchase and shortage outcomes
Goal: Enforce zero-purchase as a hard constraint and handle ordinary shortages transparently.
Description: In zero-purchase mode, return only plans fully supported by usable inventory or the best explicitly limited feasible result without shopping items. In ordinary mode, offer scaled servings, exact core shortages, and a better-matching alternative while keeping optional ingredients non-blocking.

## 50. Add the server-side model gateway
Goal: Isolate model credentials and provider-specific APIs behind one tested interface.
Description: Define request, structured-response, timeout, retry, cancellation, token-usage, and error contracts for model calls made only from CloudBase Run. Add a deterministic fake provider for tests and ensure prompts, secrets, and sensitive user data are redacted from ordinary logs.

## 51. Create scoped Agent session storage
Goal: Persist only the current recipe conversation and discard it when the flow ends.
Description: Model a user-owned session containing current recipe context, temporary constraints, messages needed for the active turn, and lifecycle status. Prevent a user-visible history list, expire abandoned sessions according to a documented policy, and delete or close the session on exit or completion.

## 52. Implement natural-language constraint extraction
Goal: Convert supported cooking requests into typed hard and soft constraints.
Description: Extract cuisine, taste, method, time, difficulty, cookware, servings, exclusions, required ingredients, and strength cues such as 只能 versus 最好. Validate model output against the supported schema, preserve the original text, and ask for clarification rather than guessing ambiguous hard requirements.

## 53. Implement AI recipe fallback generation
Goal: Generate a structured candidate only when approved recipe retrieval cannot satisfy the request.
Description: Supply the model with minimized inventory and constraint context and require the same canonical recipe schema as stored recipes. Mark generated provenance only in backend metadata and reject malformed, unsafe, or unsupported-unit output before it reaches the client.

## 54. Build the deterministic Agent validation pipeline
Goal: Validate every AI proposal before display and again before confirmed application.
Description: Check allergies, hard avoidances, temporary exclusions and requirements, unit convertibility, available inventory, reservations, and shopping shortages in a pure domain pipeline. Make ordinary shortages legal only as explicit shopping gaps, require full inventory for zero-purchase mode, and return machine-readable failure reasons.

## 55. Build the AI chat and contextual entry flow
Goal: Support text chat, fixed quick tasks, and context from expiry, inventory, or recipe pages.
Description: Implement the AI tab with the three fixed tasks and one or two dynamic inventory suggestions, plus contextual navigation payloads from other pages. Handle loading, retry, clarification, cancellation, and session exit without voice input or a conversation-history list.

## 56. Implement recipe-adjustment proposals
Goal: Let the Agent propose a changed current recipe without mutating saved state.
Description: Accept natural-language adjustments, allow core ingredient replacement, recompute quantities, steps, inventory allocation, and shopping preview, and run pre-display validation. Return a concise diff between current and proposed versions and require explicit user confirmation.

## 57. Apply a recipe adjustment with one-step undo
Goal: Persist a confirmed recipe version and retain exactly one previous complete snapshot.
Description: Revalidate the proposal against current database state before applying it, then update the active recipe and all derived data in one transaction. Implement one undo to the immediately previous version, while explicitly excluding restoration of other pending recipes affected by separate reallocation transactions.

## 58. Implement grounded read-only Agent answers
Goal: Answer supported inventory, ingredient, recipe, preference, and cooking questions without mutating product state.
Description: Expose user-scoped read tools to the Agent and include the immutable current recipe and step when a cooking question needs that context. Refuse general chat, medical nutrition judgments, and remote food-edibility determinations; give only rule-based safety guidance and never rewrite later steps or execute favorite, pending, cooking, inventory, or shopping actions.

## 59. Implement recommendation shopping previews
Goal: Calculate temporary required and optional purchase gaps for the current recommendation.
Description: Subtract usable inventory from canonical recipe requirements, keep optional items outside the list by default, and report missing pantry staples only as recipe notices. Recalculate the preview after servings, substitution, or recipe changes without persisting it before the recipe becomes pending.

## 60. Create pending-recipe, reservation, and shopping schemas
Goal: Persist per-instance pending state without conflating repeated uses of the same recipe.
Description: Add immutable recipe snapshots, active or completed pending status, batch-level reservation rows, and shopping rows bound to `pending_recipe_id`. Enforce non-negative values, ownership, valid status transitions, and uniqueness rules needed for per-instance reservation accounting.

## 61. Add a recipe to pending with atomic FEFO reservation
Goal: Reserve available batches and persist the recipe's shopping list in one transaction.
Description: Allocate unreserved quantities by objective FEFO order, create the pending snapshot and reservations, and persist required or optional shopping gaps together. Make the request idempotent, never consume inventory at this stage, and roll back fully on a conflict.

## 62. Build pending-recipe list and detail views
Goal: Show pending count, recent home items, full pending recipes, reservations, and per-recipe shopping links.
Description: Implement the home summary and secondary list and detail pages using `pending_recipe_id` as the instance identity. Display stale-expiry or shortage warnings and keep favorite state independent from pending state.

## 63. Modify or cancel a pending recipe atomically
Goal: Recalculate reservations and shopping data on modification and release them on cancellation.
Description: For a confirmed modification, lock relevant rows, validate current stock, replace allocations and shopping items, and retain one recipe-version undo where allowed. For cancellation, release every active reservation and remove the instance from pending without deleting its source recipe or favorite.

## 64. Implement explicit reservation reallocation
Goal: Move stock reserved by another pending recipe only through a separate confirmed transaction.
Description: Preview the affected recipe, verify the new allocation can succeed, then atomically release the old reservations, exit the old recipe from pending, and reserve the new plan. If any condition fails, preserve both original states and do not include this transaction in ordinary recipe-version undo.

## 65. Implement persisted shopping overrides
Goal: Let users change or decline generated shopping quantities without hiding recipe shortages.
Description: Support quantity override, explicit do-not-buy, deletion, and optional-item inclusion only for items derived from that pending recipe. Recalculate after recipe, substitution, servings, or inventory changes; mark incompatible overrides for review instead of silently carrying them forward.

## 66. Build the per-recipe shopping-list interface
Goal: Present and edit required and optional shopping items for one pending recipe.
Description: Show calculated need, available amount, buy amount, substitutes, override state, and any unresolved core shortage. Do not merge lists across recipes or allow unrelated manual items, and surface recalculation conflicts before accepting edits.

## 67. Implement favorites
Goal: Save and remove immutable recipe snapshots independently of pending status.
Description: Add idempotent favorite APIs and a reverse-chronological favorite list with no search or filters. Build the favorite controls and list action that revalidates current inventory and hard constraints before adding a favorite snapshot to pending.

## 68. Create cooking-session progress storage
Goal: Persist the current step and display preferences for a pending recipe.
Description: Model one resumable cooking session per pending instance with current step, paused state, large-text preference, and timestamps. Validate ownership and recipe status, and prevent a completed or invalidated pending recipe from starting through the guided flow.

## 69. Build the guided cooking interface
Goal: Provide preparation review and one-step-at-a-time cooking with free backward and forward navigation.
Description: Show the full preparation list first, then render each step with its ingredients and quantities, previous and next controls, large-text mode, and screen-awake behavior. Save progress after navigation, pause cleanly on exit, and omit timers and landscape support.

## 70. Integrate current-step AI questions
Goal: Let the user ask the Agent about the visible cooking step without changing the recipe.
Description: Pass the current immutable recipe snapshot and step index to the guarded cooking-question endpoint. Display the answer inline or in a focused conversation surface and verify that no recipe, inventory, reservation, or later step is mutated.

## 71. Implement cooking completion calculations
Goal: Validate actual usage and compute reservation release plus FEFO supplemental deductions.
Description: Compare actual ingredient and batch usage with the pending recipe's own reservations, consume matched amounts, release unused amounts, and allocate excess only from unreserved stock by FEFO. Block insufficient stock, negative results, or silent use of another recipe's reservations and return a complete confirmation preview.

## 72. Commit cooking completion atomically
Goal: Apply confirmed usage, close reservations, and create history without partial state.
Description: In one transaction, deduct inventory, record actual usage and inventory events, release remaining reservations, remove the recipe from pending, and create the immutable cooked-history snapshot. Make retries idempotent and prove that any failure rolls back every table change.

## 73. Build actual-usage confirmation and completion UI
Goal: Let the user review and correct actual ingredients and quantities before final deduction.
Description: Open the same confirmation flow after the last cooking step or from a pending recipe when the user records a previously completed meal, prefill planned usage, and allow valid ingredient, batch, and quantity corrections. Show the server calculation preview, resolve insufficiency or reallocation errors explicitly, and report completion only after the atomic transaction succeeds.

## 74. Build cooked-history views
Goal: Show a read-only reverse-chronological list of completed recipe snapshots.
Description: Display only recipe name, cooking time, and the final immutable recipe snapshot, with no search, filtering, “cook again,” or editable actual-usage detail. Verify that favorite changes and later source-recipe updates do not alter history.

## 75. Complete the settings area
Goal: Provide one coherent interface for preferences, safety states, defaults, cookware, and expiry thresholds.
Description: Integrate the preference and threshold APIs into the 我的 tab with clear hard-versus-soft language and validation. Keep long-term cuisine preference, custom modes, medical claims, and other V1-only settings out of the MVP interface.

## 76. Add database invariant and concurrency tests
Goal: Prove the critical inventory and reservation rules under simultaneous requests.
Description: Test competing reservations, split or merge with reservations, edit below reserved quantity, reallocation, completion retries, and rollback using a real PostgreSQL instance. Assert that inventory never becomes negative, reservations never become orphaned, and audit events match committed state.

## 77. Add the onboarding and inventory end-to-end flow
Goal: Verify the first-use journey through manual inventory management on a realistic mini program build.
Description: Automate or document a reproducible test covering safety confirmation, default servings, adding a batch, expiry display, edit, split, merge, pantry toggle, partial use, used up, discard, and soft delete. Include clean-environment setup and assert that demo data remains isolated.

## 78. Add the recommendation and Agent end-to-end flow
Goal: Verify structured recommendation, AI fallback, adjustments, and hard-constraint enforcement together.
Description: Exercise best result plus alternatives, servings changes, substitution, zero-purchase, ambiguous constraints, AI generation, confirmation, and one-step undo with deterministic fixtures. Assert that unsafe or invalid AI output is never displayed as feasible and never mutates persisted state.

## 79. Add the pending-to-cooking end-to-end flow
Goal: Verify reservation, shopping, guided cooking, completion, and history as one coherent lifecycle.
Description: Cover adding the same recipe as separate pending instances, shopping overrides, modification, cancellation, explicit reallocation, progress resume, current-step questions, actual usage, FEFO deduction, and history creation. Include transaction-failure cases and assert that favorite state remains independent.

## 80. Add observability and operational diagnostics
Goal: Make production failures traceable without logging sensitive content.
Description: Add correlation IDs, structured logs, latency and error metrics, database and model-call timing, health checks, and actionable error categories for the modular API. Redact credentials, WeChat identifiers, allergy details, prompts, and conversation content by default and document the debugging escalation path.

## 81. Perform a security and privacy review
Goal: Verify identity, authorization, secrets, data minimization, and AI boundaries before release.
Description: Review RLS and service permissions, cross-user tests, API authorization, replay and idempotency behavior, input validation, dependency risks, log redaction, retention, and model-provider data handling. Record findings and close all release-blocking issues without expanding the product scope.

## 82. Validate accessibility, performance, and real-device behavior
Goal: Confirm the MVP is usable and responsive on representative WeChat devices.
Description: Test loading and empty states, touch targets, contrast, text scaling, large-text cooking mode, screen-awake cleanup, long lists, network loss, cold starts, and low-end device responsiveness. Record measurable budgets and fix only issues within the frozen MVP scope.

## 83. Prepare staging deployment and release verification
Goal: Produce a repeatable non-production deployment with all release checks passing.
Description: Build the mini program and API from a clean checkout, apply staging migrations, configure authorized domains and environment values, deploy CloudBase Run, and run smoke plus critical end-to-end tests. Document rollback, database backup, model-provider disablement, and WeChat Developer Tools preview steps without publishing to production.
