# 0001. One prop vocabulary for variant, intent and size

**ID:** 0001
**Date:** 2026-11-15 (record created)
**Status:** Proposed
**Deciders:** [unknown — ask the maintainers in `.github/CODEOWNERS`]
**Author:** API audit of v0.16.0 (component-api-validator); proposal for maintainer review

This is the first record in `docs/decisions/`. No earlier decision records were found in the repository.

## Context

Click UI's public props name the same concepts in several ways. Counted from the v0.16.0 source with `react-docgen-typescript` over every component exported from `src/index.ts`:

- `type` appears on 21 components with at least five meanings:
  - **Visual style:** Button, IconButton, SplitButton, ButtonGroup, Badge, Toast, VerticalStepper.
  - **Layout:** Alert (`default | banner`).
  - **Size:** ProgressBar (`default | small`).
  - **Layout context:** the four Sidebar components (`main | sqlSidebar`).
  - **HTML semantics:** Title (`h1`–`h6`), and TextField, NumberField and PasswordField (the native input type).
- `variant` appears on one component (Checkbox), yet it is the name the component skeleton in AGENTS.md section 5 teaches.
- `state` is semantic intent on Alert, Badge and Icon (`success | warning | danger | info`), but `default | muted` on BigStat. Button and IconButton put intent inside `type` (`danger`, `info`).
- `size` uses at least five scales:
  - `sm | md` (Badge, FileUpload)
  - `small | medium` (Alert, default `small`)
  - `default | sm | xs` (IconButton)
  - `sm | lg` (BigStat)
  - `xs`–`xxl` (Separator)
- Selection is `selected` on the Sidebar components and ButtonGroup, but `isSelected` on CardPrimary and CardHorizontal.

`src/components/Button/Button.types.ts` already records the cost: `type` hides the native `<button type>`, so consumers cannot pass `type="submit"`. The package is pre-1.0, and AGENTS.md section 9 allows a breaking change as a `minor` with a migration note.

## Decision drivers

1. **A native attribute is shadowed.** Button's `type` blocks form submission (TODO in `Button.types.ts`). AGENTS.md section 5 already forbids naming a prop after a native attribute it would hide.
2. **The written convention and the code disagree.** AGENTS.md teaches `variant`; 1 of 79 exported components uses it. Agents and contributors told to copy an existing component reproduce the inconsistency.
3. **Breaking changes are cheapest before v1.0.** Until then they ship as a `minor` with a migration note (AGENTS.md section 9). After v1.0 each rename becomes a major.
4. **Consumers can't transfer what they learn.** A team that learns `size="sm"` on Badge has to discover `size="small"` on Alert. [unknown — ask maintainers whether consumer teams have reported this]

## Options considered

These options come from this audit and have not yet been discussed with maintainers.

### A. Unify now, with deprecated aliases (proposed)

Adopt one name per concept:

- `variant` for the visual treatment.
- `tone` for semantic intent: `neutral | info | success | warning | danger`.
- `size` on one scale: `xs | sm | md | lg | xl`.
- `selected` for selection.
- `as` / `level` for heading semantics.

`type` is left to native meaning only.

Old names keep working for at least one minor, marked `@deprecated`, with a dev-only console warning. A codemod handles consumer call sites. This is viable because the change can be made one component family per release.

### B. Keep the names and document them per component

This has no migration cost. It was not chosen because it leaves the native `type` shadowing in place and the AGENTS.md convention contradicted.

### C. Rename everything in one breaking v1.0 release

This gives one migration instead of several. It was not chosen as the default because it puts the whole migration on consumers at once and delays the Button form fix until v1.0. [unknown — ask maintainers whether a single cut-over is preferred]

## Decision

**Proposed:** option A. Starting with the button family (Button, IconButton, SplitButton, ButtonGroup), the visual prop becomes `variant` and Button's `type` becomes the native attribute again.

The trade-off being accepted: several consecutive minors carry deprecation noise, and the library supports two names per concept for one deprecation window.

## Impact assessment

| Impact dimension | Measurement |
|---|---|
| Components affected | `type`: 21. `state`: 8. `size` scale changes: at least 7 (Alert family ×5, IconButton, BigStat). `isSelected`: 2 |
| Files affected | Not measured. Run `codebase-index` for the in-repo graph |
| Consuming teams affected | Not measured. Run `adoption-report` against consumer repos |
| Migration effort | Not measured |
| Token/API changes required | Props only. Token names are unaffected |
| Breaking changes | Yes, after the deprecation window: removal of `type` (visual), `state`, `isSelected` and the `small/medium` size values |
| Timeline to full adoption | Not measured |

## Consequences

**Easier:**
- One mental model across components.
- Form submission with Button works.
- Agents and docs can describe the API once.
- `type` stops colliding with HTML.

**Harder:**
- Each family's release needs a changeset with a **Breaking:** migration note.
- A codemod per rename (`codemod-generator`).
- Deprecation warnings in consumer consoles until they migrate.
- Visual specs must prove each rename is pure: no snapshot regeneration.

**Closed off:** shipping new components with `type`, `state` or bespoke size scales. Lint should enforce this once the vocabulary is accepted (`governance-encoder`).

## Supersedes / superseded by

None.

## Related records

None yet. Follow-ups expected: a deprecation plan per component family, and a v1.0 stability contract.

## Review trigger

Revisit before cutting v1.0, or sooner if a component family's migration shows consumer breakage the codemod did not cover.
