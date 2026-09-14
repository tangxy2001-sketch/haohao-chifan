# MVP Manual Golden Path

## Purpose

This scenario is the stable manual acceptance path reused across implementation stages. It validates the MVP's primary journey from safety confirmation and inventory entry through recommendation, cooking, atomic deduction, and history. Product behavior remains defined by [`plan.md`](./plan.md); this document records an observable acceptance path, not additional requirements.

## Test setup

- Use a user whose allergy/avoidance safety fields require confirmation, or reset them to `unconfirmed` when the stage supports it.
- Choose a supported chicken-breast quantity, unit, purchase date, and storage state that produce a reliable system suggested use date in the configured reminder threshold without already being past an objective date.
- Ensure the available, unreserved inventory can satisfy the final recipe. Choose the chicken-breast starting quantity and actual usage so that a positive, unambiguous remainder is expected.
- Test fixtures may provide any other inventory, pantry availability, preferences, and default servings needed for the path. Record the initial quantities and expected final chicken-breast remainder before starting.

## Golden path

1. **Enter and confirm safety information.** Open the Mini Program. When allergy/avoidance information is unconfirmed, browsing remains possible, but an executable recommendation cannot be generated until the user records either applicable restrictions or an explicit absence of them. After confirmation, that safety gate is satisfied for the recommendation flow.
2. **Add chicken breast manually.** Enter one batch of chicken breast with its quantity, supported unit, purchase date, storage method, and any applicable packaging expiry, opened, or thawed state, then review and confirm the entry.
3. **Verify inventory.** The inventory page shows one chicken-breast batch with the confirmed display name, quantity, unit, dates, storage state, and other entered state intact.
4. **Verify the suggested use date.** Before saving, and afterward on the batch details, the same system-calculated suggested use date is shown with a brief basis and accessible source when a reliable rule applies. If a packaging expiry date also exists, both dates remain visible and neither overwrites the other.
5. **Verify the home reminder.** With the fixture date inside the configured category threshold, the chicken-breast batch appears in the applicable `即将到期` or `今天优先使用` state on the home expiry card. Its state is derived from the earlier of the objective dates.
6. **Start from the expiry card.** Tap `用这些做饭`. The recommendation flow opens with the expiring chicken breast carried into the current context as the ingredient to prioritize.
7. **Receive an inventory-constrained recommendation.** The system returns a best recipe result that respects confirmed hard safety constraints, uses actual available inventory after reservations, prioritizes the selected chicken breast, and accurately distinguishes available ingredients, optional items, substitutions, and any required purchase gaps.
8. **Adjust the current recipe with AI.** Request one supported change to the current recipe, such as a taste, time, cookware, serving, or ingredient adjustment. The proposed key changes are visible before application; after user confirmation, the current recipe, quantities, steps, inventory availability, reservations preview, and purchase-gap preview are mutually consistent. A single undo to the previous complete version is available.
9. **Confirm the final recipe.** Confirm the adjusted recipe as the version to make. The displayed final version continues to satisfy hard constraints and shows its final ingredients, quantities, steps, and any purchase gaps consistently.
10. **Add it to `待制作`.** Use the explicit interface action to add the final recipe. It appears as a pending recipe with the confirmed snapshot and its own persisted purchase list, if one is needed.
11. **Verify reservation.** The inventory required for that pending recipe is reserved immediately by batch. Available quantity shown to new recommendations excludes that reservation, while the physical on-hand quantity has not yet been deducted.
12. **Enter guided cooking.** Start cooking from the pending recipe. The full preparation list and required preprocessing appear first; guided mode then shows one current step at a time with that step's ingredients and quantities.
13. **Progress and finish the recipe.** Move through the steps using the supported previous/next controls until the last step is completed. Completion leads directly to review of actual ingredients and quantities used.
14. **Confirm actual usage.** Review the suggested usage, change it to the fixture's actual chicken-breast quantity if needed, and confirm the final ingredient and quantity list. The resulting chicken-breast remainder matches the value recorded in the test setup.
15. **Verify atomic deduction.** After confirmation succeeds, the recipe's matching reservation is consumed first, unused reserved quantity is released, and any permitted excess is deducted from unreserved inventory using FEFO. Inventory never becomes negative, and reservation, inventory, pending-recipe, and completion results are visible together rather than in a partial state.
16. **Verify removal from `待制作`.** The completed recipe no longer appears in the pending list and no active reservation remains for it.
17. **Verify `已制作历史`.** The completed recipe appears at the appropriate position in the read-only history with its name, cooking time, and final confirmed recipe snapshot.
18. **Verify remaining inventory.** Return to inventory. The chicken-breast batch shows the positive expected remaining quantity recorded in the test setup and no longer includes the consumed reservation.

## How it evolves

Exercise this same behavioral path against, in order:

- mock frontend services;
- the real Fastify API;
- PostgreSQL persistence;
- CloudBase development/staging;
- an eventual automated end-to-end test.

The observable expectations stay stable while the backing layer changes.

### Staged evidence

These are requirements for future verification, not a record that a demonstration, service boundary, or integration has already run. The initial #14 demonstration may exercise only its existing three steps (add food, view expiry, request a recipe); it need not exercise all 18 steps. Record the corresponding golden-path step numbers and leave the others explicitly unverified.

For each exercised step, record in the relevant Issue or PR: candidate revision, backing layer and environment, deterministic fixture/reset state, expected result, observed result and evidence, and remaining unverified integration with its owning Issue. Distinguish a failed check from a check that has not run; do not infer full acceptance from a partial demonstration.

| Backing layer | Evidence and limits |
| --- | --- |
| Mock frontend | Demonstrates the exercised UI behavior against identified fake responses only. It cannot prove database atomicity, persistence, production identity, or production safety enforcement. |
| Real API | Identifies the Fastify service revision, identity setup, and whether persistence or model calls remain fake; verifies only the exercised server behavior. |
| Real PostgreSQL | Identifies the local/CI database setup and schema revision; transaction claims require relevant atomicity, rollback, and consistency tests, not merely a successful UI journey. Local/CI setup belongs to #7. |
| CloudBase development/staging | Identifies the separately authorized environment and actual service, database, and trusted-identity integrations exercised (#8, #10, and staging verification in #83 as applicable). Local or mock evidence does not establish these integrations or production verification. |

#9 owns the minimal replaceable frontend service boundary; feature Issues own their contracts, needed fake behavior, and real-service integration. #14 owns deterministic, resettable fixtures and fake behavior for its isolated three-step demonstration. Later path evidence should name the relevant feature owner, for example #46/#54 for recommendation and validation, #57/#63 for confirmed adjustments, #61 for pending reservations, and #72/#73 for completion. Demo data must remain separate from real account state and must not create real inventory, reminders, reservations, favorites, shopping items, or cooking history.

## Rules

- The golden path does not replace feature-specific tests.
- Do not weaken hard safety constraints just to make the scenario pass.
- Test fixtures may choose dates and quantities that deliberately trigger the required expiry state.
- When product behavior intentionally changes, update `_docs/plan.md` first if scope changes, then update this document accordingly.
