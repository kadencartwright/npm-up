# pack-up

`pack-up` provides NestJS modules and a CLI command to analyze `package.json` dependencies and select upgrades.

## Install

```bash
npm install
```

## CLI

Run the interactive upgrade workflow:

```bash
npm run start:cli -- upgrade
```

Options:

- `--package-json <path>`: read dependencies from a specific `package.json`.
- `--min-age-days <n>`: only consider versions at least `n` days old.

Behavior:

- analyzes `dependencies` and `devDependencies`
- skips non-semver specifiers and reports skips
- lets you select which candidates to apply
- confirms before writing changes
- updates only selected dependencies in `package.json`
- preserves range style (`^`, `~`, exact)
- requires an interactive terminal

## Library Modules

### `NpmPackageModule` / `NpmPackageService`

Methods:

- `getVersionAge(packageName, version)`
- `getLatestVersion(packageName)`
- `getLatestVersionAtLeastNDaysOld(packageName, days)`

### `PackageJsonModule` / `PackageJsonService`

Methods:

- `parsePackageJsonString(content, options?)`
- `parsePackageJsonObject(input, options?)`

Parsed dependencies include:

- `name`
- `wantedRange`
- `section` (`dependencies` | `devDependencies`)
- optional `sourceLabel`

### `UpgradeCandidateModule` / `UpgradeCandidateService`

Method:

- `findCandidates(packageJsonContent, options?)`

`findCandidates` returns:

- `candidates`
- `skipped`
- `errors`

## Environment

```bash
NPM_REGISTRY_URL=https://registry.npmjs.org
NPM_TIMEOUT=10000
NPM_CACHE_TTL=300000
NPM_INCLUDE_PRERELEASE=false
NPM_INCLUDE_DEPRECATED=false
```

## Development

```bash
npm run build
npm run lint
npm test
npm run test:cov
```
