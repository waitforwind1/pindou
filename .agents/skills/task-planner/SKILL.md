---
name: task-planner
description: Plan and update this Perler bead tool's implementation tasks against the frozen P0/P1/P2 requirements. Use when decomposing requirements, sequencing development, estimating work, or maintaining docs/tasks.md.
---

# Task Planner

Create a task plan that preserves the project's delivery contract instead of producing a generic backlog.

## Read Before Planning

Use the authority order in `AGENTS.md`. At minimum read:

1. `docs/requirements.md`
2. `docs/acceptance.md`
3. `docs/feature-priority.md`
4. `docs/architecture.md`
5. `docs/tasks.md`

Treat the original P0 requirements as immutable unless the user explicitly changes scope. Label inferred or newly proposed work separately; never relabel a P1/P2 enhancement as P0.

## Decomposition Rules

- Split work into outcomes that can be implemented and verified independently.
- State inputs, outputs, dependencies, and the affected acceptance IDs.
- Keep algorithm work testable without React, DOM, Canvas, or a browser.
- Put data-authenticity work (palette source, sampling record, checksum) on the critical path; it is not a documentation afterthought.
- Prevent P1/P2 work from being scheduled ahead of a complete P0 gate.
- Prefer the smallest architecture change that satisfies the confirmed documents.

## Update `docs/tasks.md`

Use only these states:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete with verification evidence
- `[!]` blocked or awaiting a decision

When changing a status, record the exact command or artifact used to verify it. Do not mark a task complete because code was written, a test was planned, or a previous model said it passed.

If a requirement conflict blocks sequencing, describe the conflict and ask the user before changing P0 scope.
