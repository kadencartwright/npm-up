# Upgrade Candidate Analysis Service (v1)

## Summary

Build a NestJS service that analyzes `package.json` dependency specs and returns upgrade candidates.

## Settled Design Decisions

- One public method: `findCandidates(packageJsonContent, options?)`.
- Default candidacy criterion: dependency range does not satisfy the latest eligible version.
- Optional candidacy criterion: dependency range does not satisfy the latest eligible version at least `minAgeDays` old.
- Analyze only `dependencies` and `devDependencies`.
- Non-semver specs are skipped and returned with reason.
- Registry failures produce partial results with per-package error details.

## Task Checklist

- [x] (complete) Add failing tests for `UpgradeCandidateService` default strategy behavior.
- [x] (complete) Add failing tests for non-semver skips and partial error handling.
- [x] (complete) Implement upgrade-candidate types and service for default strategy.
- [x] (complete) Add failing tests for age strategy and options validation.
- [x] (complete) Implement age strategy and option validation.
- [x] (complete) Add `UpgradeCandidateModule` and export surface via `src/index.ts`.
- [x] (complete) Document service usage in `README.md`.
- [ ] (pending) For each logical chunk: run `npm run lint` and `npm test`, then commit and push.
- [ ] (pending) After all tasks are complete and tests are green, move this plan to `plans/archive/`.

## Chunking Protocol

- Complete one logical chunk at a time.
- Verify with `npm run lint` and `npm test` after each chunk.
- Commit the chunk with a focused message.
- Push to `origin` immediately after each chunk commit.
