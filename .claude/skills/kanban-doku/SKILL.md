---
name: kanban-doku
description: Tracks work progress, decisions, and milestones for the JLU Design System as cards on this repo's kanban board (kanban-mcp). Use whenever a task is started, the status of an in-progress task changes (e.g. in progress, in review, done), or an interim result/decision should be recorded. Trigger phrases: "put it on the board", "kanban", "create/move a card", "track progress", completing a milestone.
---

# Kanban tracking (kanban-mcp)

This project tracks tasks and progress on a Kanban board in addition to the Markdown docs, so that
across sessions it stays visible what is open / in progress / done.

## Board coordinates (kanban-mcp tools)

- Workspace: `KI` — publicId `o8h0ip5s4bvv`
- Board: `JLU Design System` — publicId `2jndfdkukjwa` (slug `jlu-design-system-components`)

**Lists** (in order) — use these publicIds directly:

| List | publicId | Meaning |
|---|---|---|
| `Backlog` | `ufnbo2903wz6` | Known future work, not scheduled yet |
| `To Do` | `o99qy0x98v5f` | Scheduled, ready to pick up next |
| `Needs Decision` | `rp5lhfs3hdey` | **Blocked on user input** — see rule below |
| `In Progress` | `7u3f8zan9jrk` | **Actively being worked right now** |
| `Code Review` | `t3tanijo46nm` | Finished, awaiting review/verification |
| `Done` | `7ahgbomojvew` | Finished and verified |

**`Needs Decision` rule:** whenever a card is blocked on input only the user can give
(a go/no-go, a scope choice, infrastructure, priorities), move it to `Needs Decision`
instead of leaving it in Backlog/To Do — and **append a "Decision needed:" section to the
card description** stating the concrete question and the options, so the user can decide
asynchronously from the board alone. Once decided, move the card back into the normal flow
and record the decision (with date) in the description.

**Labels** — publicIds:

| Label | publicId |
|---|---|
| `Bug` | `n0ckzznhqef8` |
| `Feature` | `4y9ruxgp2rnw` |
| `Enhancement` | `05bxdlmccgto` |
| `Critical` | `cvmyaopg0mgl` |
| `Documentation` | `cgwfopxy1xt1` |
| `review: approved` | `yfcmdkvnhmgf` |
| `review: changes requested` | `87vv36kmidv9` |
| `review: comments` | `9ftpe8ba6nqh` |

The three `review:` labels are the reviewer's verdict on the board: **the code-reviewer stamps its
own verdict label (`toggle_card_label`), never the PM** — a verdict transmitted by the PM is a
verdict the PM could shade. `approved` and `changes requested` are mutually exclusive;
`review: comments` is **additive** (non-blocking findings, legal next to `approved`). A card wearing
both `approved` and `changes requested` is a broken state to report, not to tidy up.

> If a call fails with a stale-id error (board recreated, lists renamed, etc.), re-resolve:
> `list_workspaces` → the workspace → `get_board` with the board publicId → read the current
> `lists`/`labels` ids, **and update the tables above in this file** so the next session is correct
> again. Do **not** use `find_board_by_name` (throws an internal error on a name mismatch instead of
> a clean "not found"); use `get_board` / `get_board_by_slug`.

## Language

Cards on this board are written in **English** (titles and descriptions).

## The core rule: `In Progress` must mirror reality

**Whenever you are actively working a milestone, exactly that card must be in `In Progress`.**
This applies to **carded work** (the pipeline lane). A quick-edit batch (see the `project-manager`
skill) needs no card: its record is the PR. If a batch completes an existing card, move that card
to `Done` with the PR record once the batch merges.

Concretely, on every carded task:

1. **Before starting work** — make sure a card exists for it (create one if not) and move it to
   `In Progress` (`update_card` with the `In Progress` list publicId, `index: 0`). If a card
   is already in `In Progress` for the previous task, resolve it first (step 3) — don't leave
   two cards in `In Progress` unless both really are in flight.
2. **While working** — keep interim results/decisions on the card. Update the card **description** to
   capture the "why" of a decision. *(See caveat on comments below.)*
3. **When finishing** — move the card **out of `In Progress`**:
   - → `Code Review` if someone should verify the result first (default for milestones that produce
     an artifact to inspect), **or**
   - → `Done` if it is a small, self-evidently complete step.

**Anti-patterns to actively avoid:**
- Working on something while `In Progress` is empty. If you catch this, move the right card in.
- Leaving a completed task sitting in `To Do`/`Backlog`. If work is done, it belongs in
  `Code Review` or `Done`, never in a pre-start list.
- A card in `In Progress` that nobody is working on. Pausing mid-milestone is fine (it *is* in
  progress) — but a finished one must be moved.

## The PM owns planning and every card move

Card planning (creating cards, writing briefs, attaching labels) and **every list move** belong
to the PM — the orchestrating session. Worker and reviewer agents never move cards; they record
their result as a card comment, and the PM moves the card based on that report. The move is due
**immediately when the stage completes**, in the same session — a comment describing the new
state without the corresponding move is exactly how the board goes stale.

| Stage just completed | PM moves the card to |
|---|---|
| worker reports finished, gates green | `Code Review` |
| reviewer reports **PASS** | stays in `Code Review` (awaits merge) |
| reviewer reports **FAIL** | back to `In Progress` |
| PR merged (or merge observed) | `Done`, with a comment citing PR number + merge commit |

If the merge happens outside a session (e.g. the owner merges on GitHub), the **first session
that notices the merge** makes the `Done` move. A PM delegating work must fold each agent's
report into the board before treating the delegation as finished — an unmoved card means the
PM's job is not done yet.

**Session-start reconciliation (mandatory):** `get_board`, and for every card in `In Progress`
and `Code Review`, cross-check against git — is the card's branch/PR merged into `main`
(`gh pr list --state merged`, `git log`)? If yes, move it to `Done` with the merge record
before starting new work.

## The PM loop — run until no workable card remains

When the session has a mandate to work the board, the PM does not stop between stages to ask
what comes next. Finishing one stage **is** the trigger for dispatching the next:

1. Pick the top workable card (`In Progress` first, then `To Do` top-down; respect
   dependencies noted on cards). Move it to `In Progress`.
2. Dispatch a **worker** agent (in a temporary worktree, per CLAUDE.md). Fold its report into
   the card, move to `Code Review`.
3. Dispatch an independent **reviewer** agent over the worker's diff.
   - **FAIL** → card back to `In Progress`, re-dispatch the worker with the findings.
   - **PASS** → commit on the feature branch, open the PR, merge it, card → `Done` with
     PR number + merge commit.
4. Go to 1.

A card blocked on input only the user can give goes to `Needs Decision` (rule above) and the
loop continues with the next card — a blocked card never stalls the loop. The loop ends only
when `To Do` and `In Progress` are empty and nothing in `Code Review` is actionable; whatever
sits in `Backlog`/`Needs Decision` is then reported to the user as the stopping state.

## When to create a card

- A new milestone is started.
- A non-trivial bug or open uncertainty is found that should be tracked beyond this session.

Create in `Backlog` or directly in `To Do` (`create_card`). Title short and concrete
(conventional-commit style, e.g. `feat: ...`, `fix: ...`, matching the board's existing cards);
description with context and a reference to the related doc if any. Attach the right label
(`toggle_card_label`).

## Tooling caveats (verified on this kanban server)

- **`update_label`** may require `colourCode` even when you only want to rename a label.
- Use `update_card` `index: 0` to place a moved card at the **top** of its target list.

## What does not belong on the board

- No secrets/credentials/tokens in card text or comments.
- Nothing the repo's docs mark as off-limits for a hosted third-party service.
