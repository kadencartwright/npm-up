import { Injectable } from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import * as semver from 'semver';
import { DependencySection } from '../package-json/types';
import { UpgradeCandidate } from '../upgrade-candidate/types';

interface PackageJsonDependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

@Injectable()
export class PackageJsonWriterService {
  async applyUpgradesFromFile(
    packageJsonPath: string,
    candidates: UpgradeCandidate[],
  ): Promise<number> {
    const content = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content) as PackageJsonDependencies;
    const selected = new Map(
      candidates.map((candidate) => [
        this.createCandidateKey(candidate.section, candidate.name),
        candidate,
      ]),
    );

    let updatedCount = 0;

    for (const section of ['dependencies', 'devDependencies'] as const) {
      const entries = packageJson[section];
      if (!entries || typeof entries !== 'object') {
        continue;
      }

      for (const [name, currentRange] of Object.entries(entries)) {
        const key = this.createCandidateKey(section, name);
        const candidate = selected.get(key);
        if (!candidate || typeof currentRange !== 'string') {
          continue;
        }

        entries[name] = this.rewriteRange(
          currentRange,
          candidate.targetVersion,
        );
        updatedCount += 1;
      }
    }

    await writeFile(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      'utf8',
    );
    return updatedCount;
  }

  private rewriteRange(currentRange: string, targetVersion: string): string {
    if (currentRange.startsWith('^')) {
      return `^${targetVersion}`;
    }
    if (currentRange.startsWith('~')) {
      return `~${targetVersion}`;
    }
    if (semver.valid(currentRange) !== null) {
      return targetVersion;
    }
    return targetVersion;
  }

  private createCandidateKey(section: DependencySection, name: string): string {
    return `${section}:${name}`;
  }
}
