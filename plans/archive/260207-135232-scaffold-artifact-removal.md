# Scaffold Artifact Removal

## Summary

Remove legacy Nest starter scaffold files/content that are unrelated to archived implementation plans, while preserving current npm-up library and CLI behavior.

## Settled Design Decisions

- Remove all scaffold HTTP app artifacts (`src/main.ts`, `src/app.*`, default e2e scaffold).
- Reorganize README around npm-up's implemented services and CLI command.
- Prune package-level scaffold leftovers (scripts, config references, dependencies).
- Keep all feature work and archived plans intact.

## Task Checklist

- [x] (complete) Add a failing regression test that detects scaffold artifacts and confirms expected active entrypoint/scripts.
- [x] (complete) Remove scaffold source and test files.
- [x] (complete) Prune scaffold-only scripts and dependencies from `package.json`.
- [x] (complete) Rewrite `README.md` to project-specific documentation.
- [x] (complete) Run verification (`npm test`, `npm run lint`) and resolve issues.
- [x] (complete) Mark all tasks complete and move this plan to `plans/archive/`.
