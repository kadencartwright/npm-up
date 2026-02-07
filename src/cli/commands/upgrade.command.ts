import { Inject } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as semver from 'semver';
import { CliPromptService } from '../cli-prompt.service';
import { PackageJsonLocatorService } from '../package-json-locator.service';
import { PackageJsonWriterService } from '../package-json-writer.service';
import { DependencySection } from '../../package-json/types';
import { UpgradeCandidateService } from '../../upgrade-candidate/upgrade-candidate.service';
import { UpgradeCandidate } from '../../upgrade-candidate/types';
import { NpmPackageService } from '../../npm-package/npm-package.service';

export interface UpgradeCommandOptions {
  packageJson?: string;
  minAgeDays?: number;
}

@Command({
  name: 'upgrade',
  description: 'Find and apply eligible package upgrades',
})
export class UpgradeCommand extends CommandRunner {
  constructor(
    @Inject(UpgradeCandidateService)
    private readonly upgradeCandidateService: UpgradeCandidateService,
    @Inject(PackageJsonLocatorService)
    private readonly packageJsonLocatorService: PackageJsonLocatorService,
    @Inject(PackageJsonWriterService)
    private readonly packageJsonWriterService: PackageJsonWriterService,
    @Inject(CliPromptService)
    private readonly cliPromptService: CliPromptService,
    @Inject(NpmPackageService)
    private readonly npmPackageService: NpmPackageService,
  ) {
    super();
  }

  async run(_: string[], options: UpgradeCommandOptions = {}): Promise<void> {
    this.assertInteractiveTerminal();

    const packageJsonPath =
      await this.packageJsonLocatorService.resolvePackageJsonPath(
        options.packageJson,
      );
    const packageJson =
      await this.packageJsonLocatorService.readPackageJson(packageJsonPath);

    const minAgeDays = options.minAgeDays ?? 0;
    const result = await this.upgradeCandidateService.findCandidates(
      packageJson,
      {
        sourceLabel: packageJsonPath,
        ...(minAgeDays > 0
          ? { strategy: { kind: 'minAge' as const, minAgeDays } }
          : {}),
      },
    );

    if (result.candidates.length === 0) {
      console.log('No eligible packages found to upgrade.');
      return;
    }

    const selection = await this.cliPromptService.selectCandidates(
      await this.enrichVersionSelectionMetadata(result.candidates),
    );
    if (selection.selectedCandidates.length === 0) {
      console.log('No packages selected. No changes made.');
      return;
    }

    const selected = selection.selectedCandidates;
    const manualTargets = selected.filter((candidate) =>
      selection.manualVersionKeys.includes(
        this.createCandidateKey(candidate.section, candidate.name),
      ),
    );
    const remainingTargets = selected.filter(
      (candidate) =>
        !selection.manualVersionKeys.includes(
          this.createCandidateKey(candidate.section, candidate.name),
        ),
    );

    let selectedTargets: UpgradeCandidate[] = selected;
    if (manualTargets.length > 0 && remainingTargets.length > 0) {
      const useRecommendedVersions =
        await this.cliPromptService.confirmUseRecommendedVersions();
      const processedRemaining = useRecommendedVersions
        ? remainingTargets
        : ((await this.cliPromptService.selectTargetVersions(
            remainingTargets,
          )) ?? remainingTargets);
      selectedTargets = selected.map((candidate) => {
        const key = this.createCandidateKey(candidate.section, candidate.name);
        const match = [...manualTargets, ...processedRemaining].find(
          (next) => this.createCandidateKey(next.section, next.name) === key,
        );
        return match ?? candidate;
      });
    } else if (manualTargets.length === 0) {
      const useRecommendedVersions =
        await this.cliPromptService.confirmUseRecommendedVersions();
      selectedTargets = useRecommendedVersions
        ? selected
        : await this.cliPromptService.selectTargetVersions(selected);
    } else {
      selectedTargets = selected;
    }

    const confirmed = await this.cliPromptService.confirmApply(
      selectedTargets.length,
      packageJsonPath,
    );
    if (!confirmed) {
      console.log('Upgrade canceled. No changes made.');
      return;
    }

    const updated = await this.packageJsonWriterService.applyUpgradesFromFile(
      packageJsonPath,
      selectedTargets,
    );
    console.log(`Updated ${updated} dependencies in ${packageJsonPath}.`);
  }

  @Option({
    flags: '-p, --package-json <path>',
    description: 'Path to package.json (defaults to ./package.json)',
  })
  parsePackageJsonOption(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error('--package-json requires a non-empty path');
    }
    return trimmed;
  }

  @Option({
    flags: '-m, --min-age-days <days>',
    description: 'Minimum package version age in days for eligibility',
  })
  parseMinAgeDays(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error('--min-age-days must be an integer >= 0');
    }
    return parsed;
  }

  private assertInteractiveTerminal(): void {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error(
        'This command requires an interactive terminal. Re-run in a TTY session.',
      );
    }
  }

  private createCandidateKey(section: DependencySection, name: string): string {
    return `${section}:${name}`;
  }

  private async enrichVersionSelectionMetadata(
    candidates: UpgradeCandidate[],
  ): Promise<UpgradeCandidate[]> {
    return Promise.all(
      candidates.map(async (candidate) => {
        try {
          const eligibleVersions =
            await this.npmPackageService.getEligibleVersions(candidate.name);
          return {
            ...candidate,
            eligibleVersions,
            currentBaselineVersion: semver.minVersion(candidate.wantedRange)
              ?.version,
          };
        } catch {
          return {
            ...candidate,
            eligibleVersions: [candidate.targetVersion],
            currentBaselineVersion: semver.minVersion(candidate.wantedRange)
              ?.version,
          };
        }
      }),
    );
  }
}
