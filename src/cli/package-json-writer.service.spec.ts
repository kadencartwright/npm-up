import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PackageJsonWriterService } from './package-json-writer.service';
import { UpgradeCandidate } from '../upgrade-candidate/types';

describe('PackageJsonWriterService', () => {
  const service = new PackageJsonWriterService();

  it('updates selected candidates and preserves range prefix', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'npm-up-write-'));
    const packagePath = join(dir, 'package.json');

    await fs.writeFile(
      packagePath,
      JSON.stringify(
        {
          name: 'demo',
          dependencies: {
            react: '^18.2.0',
            lodash: '~4.17.20',
          },
          devDependencies: {
            typescript: '5.7.3',
          },
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );

    const updated = await service.applyUpgradesFromFile(packagePath, [
      {
        name: 'react',
        section: 'dependencies',
        wantedRange: '^18.2.0',
        targetVersion: '19.0.1',
        criterion: 'latest',
        reason: 'target_not_satisfied_by_range',
      },
      {
        name: 'lodash',
        section: 'dependencies',
        wantedRange: '~4.17.20',
        targetVersion: '4.17.21',
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
    ] satisfies UpgradeCandidate[]);

    expect(updated).toBe(3);

    const content = await fs.readFile(packagePath, 'utf8');
    const parsed = JSON.parse(content) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(parsed.dependencies.react).toBe('^19.0.1');
    expect(parsed.dependencies.lodash).toBe('~4.17.21');
    expect(parsed.devDependencies.typescript).toBe('5.8.0');
    expect(content.endsWith('\n')).toBe(true);
  });

  it('ignores candidates not present in target sections', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'npm-up-write-'));
    const packagePath = join(dir, 'package.json');

    await fs.writeFile(
      packagePath,
      JSON.stringify({ name: 'demo', dependencies: {} }, null, 2) + '\n',
      'utf8',
    );

    const updated = await service.applyUpgradesFromFile(packagePath, [
      {
        name: 'react',
        section: 'dependencies',
        wantedRange: '^18.2.0',
        targetVersion: '19.0.1',
        criterion: 'latest',
        reason: 'target_not_satisfied_by_range',
      },
    ]);

    expect(updated).toBe(0);
  });
});
