# Upgrade Version Selection Plan

## Summary

Add an optional version-selection step to the `upgrade` CLI flow so users can choose a non-latest target version per selected package when latest is not preferred.

## Design Decisions

- Keep the existing candidate discovery logic (`latest` / `minAge`) as the default recommendation source.
- Add a second interactive prompt after dependency selection to choose a target version for each selected package.
- Show only eligible versions already accepted by current filtering rules (semver-valid, prerelease/deprecation filters).
- Limit displayed choices to a configurable recent window (default 10) plus the recommended version and current installed-satisfying baseline when needed for context.
- Preserve existing range-style behavior in `package.json` (`^`, `~`, exact).
- Keep the version-selection step optional with a single confirmation toggle: `Use recommended versions for all selected packages?`.

## Tradeoffs To Confirm

1. Version list size per package

- `10` choices (recommended): faster prompt navigation and lower cognitive load.
- `25` choices: better flexibility, but noticeably noisier for large selections.

2. Selection UX for many packages

- Per-package sequential list (recommended): simplest implementation and clearest ownership of each change.
- One large matrix-like interaction: faster bulk editing but higher implementation/test complexity.

3. CLI option surface

- No new CLI flags initially (recommended): keep workflow interactive-first and reduce parsing complexity.
- Add `--max-version-choices <n>` now: more control, but adds validation/doc burden in first iteration.

## Tasks

- [x] (complete) Add/extend failing command-level tests for optional version-selection flow, including:
- [x] (complete) prompt skipped when user accepts recommended versions
- [x] (complete) prompt invoked when user opts to customize
- [x] (complete) writer receives selected per-package target versions (not always latest)
- [x] (complete) cancellation/empty selection behavior remains unchanged
- [x] (complete) Add/extend failing prompt-service tests for version list formatting and deterministic choice keys.
- [x] (complete) Add `NpmPackageService` method to return sorted eligible versions for a package (shared filtering rules).
- [x] (complete) Extend upgrade candidate/prompt DTOs to carry version-choice metadata needed by the CLI.
- [x] (complete) Implement optional per-package version picker prompt and wire it into `UpgradeCommand` flow.
- [x] (complete) Ensure selected target version is propagated to `PackageJsonWriterService.applyUpgradesFromFile` unchanged.
- [x] (complete) Update README CLI behavior docs to describe optional version selection.
- [x] (complete) Run full test suite (`npm test`) and resolve regressions.
- [x] (complete) Mark all tasks complete and move plan file to `plans/archive/` after implementation is fully done.
