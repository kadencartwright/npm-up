import { Injectable } from '@nestjs/common';
import * as semver from 'semver';
import { NetworkError } from '../npm-package/errors/network.error';
import { PackageNotFoundError } from '../npm-package/errors/package-not-found.error';
import { NpmPackageService } from '../npm-package/npm-package.service';
import { ParsedDependency } from '../package-json/types';
import { PackageJsonService } from '../package-json/package-json.service';
import {
  CandidateError,
  FindUpgradeCandidatesOptions,
  FindUpgradeCandidatesResult,
  SkippedDependency,
  UpgradeCandidate,
} from './types';

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

    for (const dependency of dependencies) {
      if (!this.isSemverRange(dependency.wantedRange)) {
        skipped.push({
          ...this.asDependencyBase(dependency),
          reason: 'non_semver_specifier',
        });
        continue;
      }

      try {
        const latest = await this.npmPackageService.getLatestVersion(
          dependency.name,
        );

        if (!semver.satisfies(latest.version, dependency.wantedRange)) {
          candidates.push({
            ...this.asDependencyBase(dependency),
            targetVersion: latest.version,
            criterion: 'latest',
            reason: 'target_not_satisfied_by_range',
          });
        }
      } catch (error) {
        errors.push({
          ...this.asDependencyBase(dependency),
          reason: this.mapErrorReason(error),
          message:
            error instanceof Error ? error.message : 'Unknown lookup failure',
        });
      }
    }

    return { candidates, skipped, errors };
  }

  private isSemverRange(value: string): boolean {
    return semver.validRange(value) !== null;
  }

  private asDependencyBase(dependency: ParsedDependency): {
    name: string;
    section: ParsedDependency['section'];
    wantedRange: string;
    sourceLabel?: string;
  } {
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
