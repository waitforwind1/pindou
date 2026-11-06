---
name: code-review
description: Review this Perler bead generator for domain-boundary, data-integrity, pattern-model, and preview/export consistency defects. Use for requested code reviews or before accepting changes that touch core algorithms, palettes, generation, rendering, statistics, or export.
---

# Code Review

Review behavior and invariants, not formatting preferences. Report findings by severity and cite an exact file and line.

## Required Checks

1. **Domain purity**: `src/core/**` must not import React, DOM APIs, Canvas, File, browser storage, or network code.
2. **Single truth**: preview, editing, statistics, palette legend, and export must read the same versioned `PatternDocument`; reject parallel colour matrices or cached counts used as truth.
3. **Cell semantics**: empty cells are exactly `null`; no `-1`, zero, white, or transparent-colour sentinels. Every non-empty `colorIndex` resolves inside the matching immutable palette.
4. **Palette integrity**: codes, names, reference RGB, source locations, version, and checksum remain traceable. Reject invented or remapped-looking codes and silent palette substitution.
5. **Stats synchronization**: counts derive from cells and match `stateVersion`; edits, undo/redo, legend, and export must not drift.
6. **Render/export parity**: both paths consume the same `RenderScene`; export must not screenshot the preview or omit grid, codes, coordinates, legend, or source notes.
7. **P0 protection**: identify any P0 removal, hidden option, weakened readability, or substitution by P1/P2 work.
8. **Tests**: check the smallest algorithm-level test first, then integration and P0 acceptance coverage. Distinguish unrun tests from failures.

## Output

Order findings as Blocker, Major, Minor. For each finding include impact, evidence, and the smallest safe fix. Mention missing tests as findings only when they leave a concrete P0/P1 risk. Do not modify unrelated code or restate the entire diff.
