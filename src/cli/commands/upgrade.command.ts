import { Command, CommandRunner, Option } from 'nest-commander';
import { CliPromptService } from '../cli-prompt.service';
import { PackageJsonLocatorService } from '../package-json-locator.service';
import { PackageJsonWriterService } from '../package-json-writer.service';
import { DependencySection } from '../../package-json/types';
import { UpgradeCandidateService } from '../../upgrade-candidate/upgrade-candidate.service';

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
    private readonly upgradeCandidateService: UpgradeCandidateService,
    private readonly packageJsonLocatorService: PackageJsonLocatorService,
    private readonly packageJsonWriterService: PackageJsonWriterService,
    private readonly cliPromptService: CliPromptService,
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

    const selectedKeys = await this.cliPromptService.selectCandidates(
      result.candidates,
    );
    if (selectedKeys.length === 0) {
      console.log('No packages selected. No changes made.');
      return;
    }

    const selected = result.candidates.filter((candidate) =>
      selectedKeys.includes(
        this.createCandidateKey(candidate.section, candidate.name),
      ),
    );

    const confirmed = await this.cliPromptService.confirmApply(
      selected.length,
      packageJsonPath,
    );
    if (!confirmed) {
      console.log('Upgrade canceled. No changes made.');
      return;
    }

    const updated = await this.packageJsonWriterService.applyUpgradesFromFile(
      packageJsonPath,
      selected,
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
}
