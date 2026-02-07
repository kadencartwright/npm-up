import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { UpgradeCommand, UpgradeCommandOptions } from './upgrade.command';
import { UpgradeCandidateService } from '../../upgrade-candidate/upgrade-candidate.service';
import { PackageJsonLocatorService } from '../package-json-locator.service';
import { PackageJsonWriterService } from '../package-json-writer.service';
import { CliPromptService } from '../cli-prompt.service';
import { UpgradeCandidate } from '../../upgrade-candidate/types';

describe('UpgradeCommand', () => {
  const packagePath = '/repo/package.json';
  const packageJson = {
    dependencies: {
      react: '^18.2.0',
    },
  };

  function createCommand() {
    const upgradeCandidateService = {
      findCandidates: vi.fn(),
    } as unknown as Mocked<UpgradeCandidateService>;
    const locator = {
      resolvePackageJsonPath: vi.fn(),
      readPackageJson: vi.fn(),
    } as unknown as Mocked<PackageJsonLocatorService>;
    const writer = {
      applyUpgradesFromFile: vi.fn(),
    } as unknown as Mocked<PackageJsonWriterService>;
    const prompts = {
      selectCandidates: vi.fn(),
      confirmApply: vi.fn(),
    } as unknown as Mocked<CliPromptService>;

    const command = new UpgradeCommand(
      upgradeCandidateService,
      locator,
      writer,
      prompts,
    );

    return { command, upgradeCandidateService, locator, writer, prompts };
  }

  function setTTY(value: boolean): void {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value,
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    setTTY(true);
  });

  it('throws when interactive terminal is unavailable', async () => {
    const { command } = createCommand();
    setTTY(false);

    await expect(command.run([], {})).rejects.toThrow(
      /requires an interactive terminal/,
    );
  });

  it('uses latest strategy when minAgeDays is omitted', async () => {
    const { command, upgradeCandidateService, locator, prompts } =
      createCommand();

    locator.resolvePackageJsonPath.mockResolvedValue(packagePath);
    locator.readPackageJson.mockResolvedValue(packageJson);
    upgradeCandidateService.findCandidates.mockResolvedValue({
      candidates: [],
      skipped: [],
      errors: [],
    });

    await command.run([], {});

    expect(upgradeCandidateService.findCandidates.mock.calls).toEqual([
      [packageJson, { sourceLabel: packagePath }],
    ]);
    expect(prompts.selectCandidates.mock.calls).toHaveLength(0);
  });

  it('uses minAge strategy when minAgeDays is provided', async () => {
    const { command, upgradeCandidateService, locator } = createCommand();

    locator.resolvePackageJsonPath.mockResolvedValue(packagePath);
    locator.readPackageJson.mockResolvedValue(packageJson);
    upgradeCandidateService.findCandidates.mockResolvedValue({
      candidates: [],
      skipped: [],
      errors: [],
    });

    await command.run([], { minAgeDays: 30 });

    expect(upgradeCandidateService.findCandidates.mock.calls).toEqual([
      [
        packageJson,
        {
          sourceLabel: packagePath,
          strategy: { kind: 'minAge', minAgeDays: 30 },
        },
      ],
    ]);
  });

  it('writes only selected candidates after confirmation', async () => {
    const { command, upgradeCandidateService, locator, prompts, writer } =
      createCommand();

    const candidates: UpgradeCandidate[] = [
      {
        name: 'react',
        section: 'dependencies',
        wantedRange: '^18.2.0',
        targetVersion: '19.0.1',
        criterion: 'latest',
        reason: 'target_not_satisfied_by_range',
      },
      {
        name: 'typescript',
        section: 'devDependencies',
        wantedRange: '5.7.3',
        targetVersion: '5.8.0',
        criterion: 'latest',
        reason: 'target_not_satisfied_by_range',
      },
    ];

    locator.resolvePackageJsonPath.mockResolvedValue(packagePath);
    locator.readPackageJson.mockResolvedValue(packageJson);
    upgradeCandidateService.findCandidates.mockResolvedValue({
      candidates,
      skipped: [],
      errors: [],
    });
    prompts.selectCandidates.mockResolvedValue(['dependencies:react']);
    prompts.confirmApply.mockResolvedValue(true);
    writer.applyUpgradesFromFile.mockResolvedValue(1);

    await command.run([], {} as UpgradeCommandOptions);

    expect(writer.applyUpgradesFromFile.mock.calls).toEqual([
      [packagePath, [candidates[0]]],
    ]);
  });
});
