# npm Package Metadata Service

## Overview

Build an interface to fetch and query npm package metadata with capabilities to:

- Return the age in days of a given package version
- Find the most recent version of a package
- Find the most recent version that is at least n days old (configurable)

**Filtering**: Pre-release and deprecated versions are excluded by default, but can be included via configuration.

## Design Decisions

### 1. API Design Pattern

**Decision**: Use NestJS Injectable Service pattern. The `NpmPackageService` uses `@Injectable()` decorator for proper dependency injection, following NestJS conventions.

### 2. npm Registry API

**Decision**: Use the official npm Registry API (registry.npmjs.org) directly for reliability and complete version metadata.

### 3. HTTP Client

**Decision**: Use `HttpService` from `@nestjs/axios` for consistency with NestJS ecosystem and built-in observability features.

### 4. Caching Strategy

**Decision**: Use NestJS `CacheModule` with `CACHE_MANAGER` token for standardized caching across the application. Configure via `registerAsync()` with `ConfigService`.

### 5. Error Handling

**Decision**: Use exceptions with custom error classes co-located with the service. Extend from NestJS `HttpException` where appropriate for HTTP status code mapping.

### 6. Date Calculation

**Decision**: Use the `time` field from npm registry which contains ISO 8601 timestamps for each version to calculate age in days.

### 7. Version Filtering

**Decision**: Filter pre-release and deprecated versions by default. Configuration via `ConfigService` or module options (`includePrerelease`, `includeDeprecated`).

**Implementation Notes:**

- Pre-release detection: Check for semver pre-release identifiers (e.g., `1.0.0-beta.1`)
- Deprecated detection: Check npm's `deprecated` field in version metadata
- Filtering applied consistently across all methods

## Proposed API

```typescript
// Module registration
@Module({
  imports: [
    HttpModule,
    CacheModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        ttl: config.get('NPM_CACHE_TTL', 300000), // 5 minutes
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NpmPackageService],
  exports: [NpmPackageService],
})
export class NpmPackageModule {}

// Module options interface
interface NpmPackageModuleOptions {
  registryUrl?: string;
  timeoutMs?: number;
  includePrerelease?: boolean; // Default: false
  includeDeprecated?: boolean; // Default: false
}

// Main service class
@Injectable()
class NpmPackageService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  // Get age in days of a specific version
  getVersionAge(packageName: string, version: string): Promise<number>;

  // Get most recent version
  getLatestVersion(packageName: string): Promise<PackageVersion>;

  // Get most recent version at least n days old
  getLatestVersionAtLeastNDaysOld(
    packageName: string,
    days: number,
  ): Promise<PackageVersion | null>;

  // Optional: Batch operations
  getVersionsInfo(packageName: string): Promise<PackageVersion[]>;
}

// Types
interface PackageVersion {
  version: string;
  publishedAt: Date;
  ageInDays: number;
}
```

## Implementation Tasks

- [x] Create project structure and TypeScript configuration
- [x] Implement `NpmPackageModule` with proper imports
- [x] Implement npm registry API client using `HttpService`
- [x] Configure `CacheModule` with TTL support via `ConfigService`
- [x] Implement error handling with custom error classes (co-located with service)
- [x] Implement version filtering (pre-release & deprecated detection)
- [x] Define TypeScript interfaces (`PackageVersion`) and implement date calculation utilities (`calculateAgeInDays`, `createPackageVersion`)
- [x] Implement `@Injectable()` `NpmPackageService` with constructor injection
- [x] Implement `getVersionAge` method with filtering support
- [x] Implement `getLatestVersion` method with filtering support
- [x] Implement `getLatestVersionAtLeastNDaysOld` method with filtering support
- [x] Write comprehensive unit tests using `@nestjs/testing`
- [x] Write integration tests with mocked npm API
- [x] Add documentation and usage examples
- [ ] Verify all tests pass

## File Structure

Following NestJS design conventions, organized as a feature module:

```
src/
  index.ts                               # Main exports
  npm-package/
    npm-package.module.ts                # NestJS module definition
    npm-package.service.ts               # Main service class
    npm-package.service.spec.ts          # Unit tests
    errors/
      npm-package.error.ts               # Base error class
      package-not-found.error.ts
      version-not-found.error.ts
      network.error.ts
    types/
      index.ts                           # TypeScript interfaces
    utils/
      date.utils.ts                      # Date calculation utilities
      version-filter.ts                  # Pre-release & deprecated filtering logic
```

## Dependencies

- **Production**:
  - `@nestjs/common` - Core NestJS decorators and utilities
  - `@nestjs/axios` - HttpService for HTTP requests
  - `@nestjs/config` - ConfigService for environment configuration
  - `@nestjs/cache-manager` - Standardized caching
  - `cache-manager` - Cache manager implementation
  - `semver` - For pre-release version detection
- **Development**:
  - `@nestjs/testing` - Testing utilities
  - TypeScript
  - Jest
  - MSW (API mocking for tests)
  - ESLint + Prettier

## Example Usage

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NpmPackageModule } from './npm-package';

@Module({
  imports: [ConfigModule.forRoot(), NpmPackageModule],
})
export class AppModule {}

// my-service.ts
import { Injectable } from '@nestjs/common';
import { NpmPackageService } from './npm-package';

@Injectable()
export class MyService {
  constructor(private readonly npmPackageService: NpmPackageService) {}

  async checkPackageAge() {
    // Get age of a specific version
    const age = await this.npmPackageService.getVersionAge('lodash', '4.17.21');
    console.log(`lodash@4.17.21 is ${age} days old`);

    // Get latest version (excludes pre-release and deprecated by default)
    const latest = await this.npmPackageService.getLatestVersion('react');
    console.log(`Latest stable react version: ${latest.version}`);

    // Get version at least 30 days old (useful for stability requirements)
    const stable = await this.npmPackageService.getLatestVersionAtLeastNDaysOld(
      'express',
      30,
    );
    if (stable) {
      console.log(`Latest stable express (30+ days old): ${stable.version}`);
    }
  }
}
```

### Environment Configuration

```bash
# .env
NPM_REGISTRY_URL=https://registry.npmjs.org
NPM_CACHE_TTL=300000
NPM_TIMEOUT=10000
NPM_INCLUDE_PRERELEASE=false
NPM_INCLUDE_DEPRECATED=false
```

## Notes

- npm registry returns version timestamps in the `time` object of package metadata
- Version format should support semver (e.g., '1.2.3', '^1.0.0', 'latest')
- Consider edge cases: pre-release versions, deprecated versions, scoped packages (@org/pkg)
- Rate limiting: npm registry has rate limits, implement respectful delays if needed
- **Version Filtering**: By default, both pre-release versions (e.g., `2.0.0-beta.1`) and deprecated versions are filtered out. Configure via `ConfigService` using `NPM_INCLUDE_PRERELEASE` and `NPM_INCLUDE_DEPRECATED` environment variables.
- **Dependency**: `semver` package is required for reliable pre-release detection
- **NestJS Patterns**: Service uses `@Injectable()` decorator, constructor injection for dependencies (`HttpService`, `CACHE_MANAGER`, `ConfigService`), and is exported via `NpmPackageModule`
- **Testing**: Use `Test.createTestingModule()` from `@nestjs/testing` to properly test the service with its dependencies
