import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliPromptService } from './cli-prompt.service';
import { UpgradeCandidate } from '../upgrade-candidate/types';

describe('CliPromptService source', () => {
  it('sets inquirer checkbox loop to false to prevent wrap-around navigation', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/cli/cli-prompt.service.ts'),
      'utf8',
    );

    expect(source).toContain('loop: false');
  });

  it('supports v hotkey to open package version selection inline', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/cli/cli-prompt.service.ts'),
      'utf8',
    );

    expect(source).toContain("key.name === 'v'");
    expect(source).toContain('keys: ↑↓ navigate • enter choose • esc/v back');
  });

  it('builds deterministic version choice keys', () => {
    const service = new CliPromptService() as unknown as {
      createVersionChoiceKey: (
        section: 'dependencies' | 'devDependencies',
        name: string,
        version: string,
      ) => string;
    };

    const first = service.createVersionChoiceKey(
      'dependencies',
      'react',
      '19.0.1',
    );
    const second = service.createVersionChoiceKey(
      'dependencies',
      'react',
      '19.0.1',
    );

    expect(first).toBe('dependencies:react:19.0.1');
    expect(first).toBe(second);
  });

  it('formats version choices with recommended and baseline labels', () => {
    const service = new CliPromptService() as unknown as {
      buildVersionChoices: (candidate: UpgradeCandidate) => Array<{
        name: string;
        value: string;
      }>;
    };

    const candidate: UpgradeCandidate = {
      name: 'react',
      section: 'dependencies',
      wantedRange: '^18.2.0',
      targetVersion: '19.0.1',
      criterion: 'latest',
      reason: 'target_not_satisfied_by_range',
      eligibleVersions: ['19.0.1', '18.3.1', '18.2.0'],
      currentBaselineVersion: '18.2.0',
    };

    const choices = service.buildVersionChoices(candidate);
    const labels = choices.map((choice) => choice.name);

    expect(labels).toContain('19.0.1 (recommended)');
    expect(labels).toContain('18.2.0 (current range baseline)');
  });
});
