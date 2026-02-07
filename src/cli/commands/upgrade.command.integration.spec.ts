import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { CliPromptService } from '../cli-prompt.service';
import { PackageJsonLocatorService } from '../package-json-locator.service';
import { PackageJsonWriterService } from '../package-json-writer.service';
import { UpgradeCandidateService } from '../../upgrade-candidate/upgrade-candidate.service';
import { UpgradeCandidate } from '../../upgrade-candidate/types';
import { UpgradeCommand } from './upgrade.command';

describe('UpgradeCommand (integration)', () => {
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
    setTTY(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies selected upgrades to a real temp package.json file', async () => {
    const workspace = await fs.mkdtemp(
      join(tmpdir(), 'pack-up-cli-integration-'),
    );
    const packagePath = join(workspace, 'package.json');

    await fs.writeFile(
      packagePath,
      JSON.stringify(
        {
          name: 'temp-project',
          dependencies: {
            react: '^18.2.0',
          },
          devDependencies: {
            typescript: '~5.7.3',
          },
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );

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
        wantedRange: '~5.7.3',
        targetVersion: '5.8.0',
        criterion: 'latest',
        reason: 'target_not_satisfied_by_range',
      },
    ];

    const upgradeCandidateService = {
      findCandidates: vi.fn().mockResolvedValue({
        candidates,
        skipped: [],
        errors: [],
      }),
    };

    const cliPromptService = {
      selectCandidates: vi.fn().mockResolvedValue(['dependencies:react']),
      confirmApply: vi.fn().mockResolvedValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpgradeCommand,
        PackageJsonLocatorService,
        PackageJsonWriterService,
        {
          provide: UpgradeCandidateService,
          useValue: upgradeCandidateService,
        },
        {
          provide: CliPromptService,
          useValue: cliPromptService,
        },
      ],
    }).compile();

    const command = moduleRef.get(UpgradeCommand);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      return;
    });

    const originalCwd = process.cwd();
    process.chdir(workspace);
    try {
      await command.run([], { minAgeDays: 30 });
    } finally {
      process.chdir(originalCwd);
    }

    expect(upgradeCandidateService.findCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'temp-project' }),
      {
        sourceLabel: packagePath,
        strategy: { kind: 'minAge', minAgeDays: 30 },
      },
    );

    const updated = JSON.parse(await fs.readFile(packagePath, 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(updated.dependencies.react).toBe('^19.0.1');
    expect(updated.devDependencies.typescript).toBe('~5.7.3');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Updated 1 dependencies/),
    );
  });
});
