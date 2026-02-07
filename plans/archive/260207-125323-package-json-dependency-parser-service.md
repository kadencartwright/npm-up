# Package.json Dependency Parser Service

## Summary

Add a dedicated parser service that reads `package.json` content and returns normalized dependency entries from `dependencies` and `devDependencies` so they can be compared with latest-version results from the npm metadata service.

## Settled Design Decisions

- Input support in v1: parse from raw JSON string and already-parsed object.
- Output entries include package name, requested range/specifier, and section source.
- Duplicate package names across sections are preserved as separate entries.
- Non-semver specifiers are preserved as-is.
- Invalid JSON and invalid dependency-shape inputs throw typed errors.
- Parser performs no file I/O and no npm registry calls.

## Public Interfaces

- `PackageJsonService.parsePackageJsonString(content: string, options?: ParseOptions): ParsedDependency[]`
- `PackageJsonService.parsePackageJsonObject(input: unknown, options?: ParseOptions): ParsedDependency[]`
- `type DependencySection = 'dependencies' | 'devDependencies'`
- `interface ParsedDependency { name: string; wantedRange: string; section: DependencySection; sourceLabel?: string }`
- `interface ParseOptions { sourceLabel?: string }`

## Task Checklist

- [x] (complete) Add failing tests for valid parsing from JSON string and object input.
- [x] (complete) Add failing tests for output shape and optional `sourceLabel`.
- [x] (complete) Add failing tests for duplicate dependency names across sections.
- [x] (complete) Add failing tests for non-semver specifier preservation.
- [x] (complete) Add failing tests for empty/missing dependency sections.
- [x] (complete) Add failing tests for invalid JSON and invalid dependency map shapes.
- [x] (complete) Implement `PackageJsonService` with minimal code to satisfy tests.
- [x] (complete) Implement typed parser errors.
- [x] (complete) Add `PackageJsonModule` and public exports.
- [x] (complete) Document parser usage in `README.md`.
- [x] (complete) Run `npm test` and confirm all tests pass.
- [x] (complete) Mark all tasks complete and archive this plan.
