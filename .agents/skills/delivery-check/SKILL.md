---
name: delivery-check
description: Run this Perler bead generator's release gates, verify P0 acceptance evidence, and report blockers without overstating results. Use when preparing a demo, release candidate, final handoff, or explicit delivery audit.
---

# Delivery Check

Validate the actual artifact against `docs/acceptance.md`; do not infer success from code inspection alone.

## Gate Sequence

Run from the repository root:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run check` may replace the first four commands. Run Playwright separately because it needs a browser binary and a running preview server. If a command cannot run, record the exact blocker instead of calling it passed.

## P0 Review

- Verify AC-01 through AC-23 and all three required E2E scenarios.
- Confirm the bundled palette has 67 unique official Hama codes, a source record, access date, sampling method, document hash, and matching checksum. Check a sample against the official source when possible.
- Confirm A < 128 becomes `null`, A >= 128 is composited on white, and an all-transparent image is blocked.
- Confirm 32/48/64 and contain/nearest-neighbour behavior, including an 8x4 source inside 64x64.
- Confirm every non-empty cell resolves to a visible code and every layer uses the same `PatternDocument`/`stateVersion`.
- Download the PNG, inspect its signature/dimensions, and open it offline in an independent viewer. Verify visible grid, codes, coordinates, legend, and source disclosure.
- Confirm no invented brand, code, official-RGB claim, or unverified test result is present.

## Report

Return a compact table of gate, command, result, and evidence path. List Blocker and Major defects first. Use “not run” or “blocked” when that is the truth; never report partial evidence as a pass. Preserve generated artifacts under the project's test/evidence directories so the result can be reviewed.
