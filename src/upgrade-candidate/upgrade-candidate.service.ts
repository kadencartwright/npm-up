import { Injectable } from '@nestjs/common';
import * as semver from 'semver';
import { NetworkError } from '../npm-package/errors/network.error';
import { PackageNotFoundError } from '../npm-package/errors/package-not-found.error';
import { NpmPackageService } from '../npm-package/npm-package.service';
import { ParsedDependency } from '../package-json/types';
import { PackageJsonService } from '../package-json/package-json.service';
import { InvalidUpgradeCandidateOptionsError } from './errors/invalid-upgrade-candidate-options.error';
import {
  CandidateError,
  FindUpgradeCandidatesOptions,
  FindUpgradeCandidatesResult,
  SkippedDependency,
  UpgradeCandidate,
} from './types';

interface DependencyBase {
  name: string;
  section: ParsedDependency['section'];
  wantedRange: string;
  sourceLabel?: string;
}

@Injectable()
export class UpgradeCandidateService {
  constructor(
    private readonly packageJsonService: PackageJsonService,
    private readonly npmPackageService: NpmPackageService,
  ) {}

  async findCandidates(
    packageJsonContent: unknown,
    options: FindUpgradeCandidatesOptions = {},
  ): Promise<FindUpgradeCandidatesResult> {
    const concurrency = this.resolveConcurrency(options.concurrency);
    this.validateStrategy(options);

    const dependencies =
      typeof packageJsonContent === 'string'
        ? this.packageJsonService.parsePackageJsonString(packageJsonContent, {
            sourceLabel: options.sourceLabel,
          })
        : this.packageJsonService.parsePackageJsonObject(packageJsonContent, {
            sourceLabel: options.sourceLabel,
          });

    const candidates: UpgradeCandidate[] = [];
    const skipped: SkippedDependency[] = [];
    const errors: CandidateError[] = [];

    await this.processWithConcurrency(
      dependencies,
      concurrency,
      async (dep) => {
        const base = this.asDependencyBase(dep);

        if (!this.isSemverRange(dep.wantedRange)) {
          skipped.push({ ...base, reason: 'non_semver_specifier' });
          return;
        }

        try {
          const strategy = options.strategy;
          if (strategy?.kind === 'minAge') {
            const target =
              await this.npmPackageService.getLatestVersionAtLeastNDaysOld(
                dep.name,
                strategy.minAgeDays,
              );

            if (!target) {
              skipped.push({
                ...base,
                reason: 'no_eligible_target_for_min_age',
              });
              return;
            }

            if (!semver.satisfies(target.version, dep.wantedRange)) {
              candidates.push({
                ...base,
                targetVersion: target.version,
                criterion: 'minAge',
                minAgeDays: strategy.minAgeDays,
                reason: 'target_not_satisfied_by_range',
              });
            }
            return;
          }

          const latest = await this.npmPackageService.getLatestVersion(
            dep.name,
          );
          if (!semver.satisfies(latest.version, dep.wantedRange)) {
            candidates.push({
              ...base,
              targetVersion: latest.version,
              criterion: 'latest',
              reason: 'target_not_satisfied_by_range',
            });
          }
        } catch (error) {
          errors.push({
            ...base,
            reason: this.mapErrorReason(error),
            message:
              error instanceof Error ? error.message : 'Unknown lookup failure',
          });
        }
      },
    );

    return { candidates, skipped, errors };
  }

  private validateStrategy(options: FindUpgradeCandidatesOptions): void {
    const strategy = options.strategy;
    if (!strategy || strategy.kind !== 'minAge') {
      return;
    }

    if (!Number.isInteger(strategy.minAgeDays) || strategy.minAgeDays < 0) {
      throw new InvalidUpgradeCandidateOptionsError(
        'strategy.minAgeDays',
        'must be an integer >= 0',
      );
    }
  }

  private resolveConcurrency(concurrency: number | undefined): number {
    if (concurrency === undefined) {
      return 8;
    }

    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new InvalidUpgradeCandidateOptionsError(
        'concurrency',
        'must be an integer >= 1',
      );
    }

    return concurrency;
  }

  private async processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    handler: (item: T) => Promise<void>,
  ): Promise<void> {
    let index = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (index < items.length) {
          const currentIndex = index;
          index += 1;
          await handler(items[currentIndex]);
        }
      },
    );

    await Promise.all(workers);
  }

  private isSemverRange(value: string): boolean {
    return semver.validRange(value) !== null;
  }

  private asDependencyBase(dependency: ParsedDependency): DependencyBase {
    return {
      name: dependency.name,
      section: dependency.section,
      wantedRange: dependency.wantedRange,
      ...(dependency.sourceLabel
        ? { sourceLabel: dependency.sourceLabel }
        : {}),
    };
  }

  private mapErrorReason(error: unknown): CandidateError['reason'] {
    if (error instanceof PackageNotFoundError) {
      return 'package_not_found';
    }
    if (error instanceof NetworkError) {
      return 'network_error';
    }
    return 'unknown_error';
  }
}
