# Upgrade Command Feature Plan

## Summary

Implement a Nest Commander `upgrade` command that discovers or accepts a package.json path, filters upgrade candidates by minimum age, allows interactive selection, and updates selected dependencies in package.json.

## Design Decisions

- Use `nest-commander` with a dedicated CLI bootstrap (`src/cli.ts`) and separate `CliModule`.
- Command name is `upgrade`.
- Default package discovery uses only `./package.json` in current working directory.
- `--min-age-days` is integer >= 0 with default 0.
- Selected updates preserve existing range prefix (`^`, `~`, or exact).
- Non-TTY execution fails with guidance.
- Only `package.json` is modified; lockfiles are not touched.

## Tasks

- [x] (complete) Add and validate failing tests for CLI path resolution, min-age handling, non-TTY behavior, selection, and package.json writes.
- [x] (complete) Implement CLI bootstrap/module/command wiring and option parsing.
- [x] (complete) Implement package.json location and update utilities.
- [x] (complete) Integrate candidate analysis + interactive selection + confirmation flow.
- [x] (complete) Update README with command usage and behavior.
- [x] (complete) Run full test suite (`npm test`) and fix regressions.
- [x] (complete) Mark plan complete and move plan file to `plans/archive/`.
