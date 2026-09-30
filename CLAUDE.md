# JLU Design System

## Dev harness

This repo runs an agent-loop port: **the main session is the project manager**. Quick edits it
makes itself, batched on a `dev/<topic>` branch and reviewed once by a `code-review` skill run when
the batch ships. Board cards it delegates to subagents in temporary worktrees, with an independent
`code-reviewer`. See `.claude/README.md` (architecture, guard, deviations from upstream) and
`.claude/skills/project-manager/` (both lanes and the PM loop).

## Parallel work runs in a temporary worktree — always

Any work that runs alongside other activity in this repo — subagent workers, parallel tasks,
background jobs — happens in a **temporary git worktree** (Agent tool `isolation: "worktree"`,
or `git worktree add`), never in the main working tree. The main checkout belongs to the
interactive session (the PM). It is on `main` and clean, except while a quick-edit batch is open
on a `dev/<topic>` branch. That batch is the interactive session's own work, not parallel work. A
worker must be told it is in a worktree and must not cd into or modify the main checkout.

## Commit messages

Conventional Commits, one short lowercase summary line:

```
fix(docker): npm auth for @ki4jlu/design-system in frontend image build
```

- Format: `type(scope): summary` — types: feat, fix, chore, docs, refactor, test, ci
- The summary starts lowercase, with a **PascalCase component name** (`feat(sidebar):
  SidebarUserMenu …`), or with a **version** — releases are `chore(release): 0.23.0`.
- **Summary is the message. Max 72 characters, and usually that is the whole commit.**
- **A body is at most 3 lines, and only for a decision or a non-obvious *why*.** Never restate the
  diff or list what was verified — the kanban card is the durable record and is where reviewers look.
- Enforced by `.githooks/commit-msg`; wire it once per clone with `git config core.hooksPath
  .githooks`. Merges, reverts and fixups are exempt.
- Do NOT add a `Co-Authored-By: Claude` trailer. Co-author trailers are for humans only.
