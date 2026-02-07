# Vitest Migration (Jest -> Vitest)

## Summary

Migrate the repository from Jest to Vitest in one cutover while preserving `npm test` as the canonical test command.

## Design Decisions

- Use a big-bang migration in a single change set.
- Use explicit imports from `vitest` in test files.
- Use Vitest `v8` coverage provider.
- Keep existing test file patterns (`*.spec.ts`, `*.integration.spec.ts`).

## Task Checklist

- [x] (complete) Baseline current test behavior with Jest and identify Jest-specific APIs in test files.
- [x] (complete) Replace Jest dependencies/scripts/config with Vitest equivalents.
- [x] (complete) Migrate test source files from `jest.*` APIs to `vi.*` and add explicit Vitest imports.
- [x] (complete) Update lint/test toolchain configuration for Vitest.
- [x] (complete) Run validation (`npm test`, `npm run test:cov`, `npm run lint`) and fix regressions.
- [x] (complete) Mark all tasks complete and archive this plan in `plans/archive/`.

## Tradeoffs (Settled)

- Chosen: explicit Vitest imports in every test file.
  - Tradeoff: a larger one-time edit, but tighter API clarity and fewer hidden globals.
- Chosen: single-step cutover instead of dual-runner transition.
  - Tradeoff: higher immediate change volume, but avoids long-lived split tooling.
