import { Injectable } from '@nestjs/common';
import { DependencySection } from '../package-json/types';
import { UpgradeCandidate } from '../upgrade-candidate/types';

@Injectable()
export class CliPromptService {
  async selectCandidates(candidates: UpgradeCandidate[]): Promise<string[]> {
    const { checkbox } = await import('@inquirer/prompts');
    return checkbox({
      message: 'Select dependencies to upgrade',
      choices: candidates.map((candidate) => ({
        name: this.formatCandidateLabel(candidate),
        value: this.createCandidateKey(candidate.section, candidate.name),
      })),
      pageSize: 15,
    });
  }

  async confirmApply(
    selectedCount: number,
    packageJsonPath: string,
  ): Promise<boolean> {
    const { confirm } = await import('@inquirer/prompts');
    return confirm({
      message: `Apply ${selectedCount} selected upgrade(s) to ${packageJsonPath}?`,
      default: true,
    });
  }

  private formatCandidateLabel(candidate: UpgradeCandidate): string {
    return `${candidate.section} | ${candidate.name} | ${candidate.wantedRange} -> ${candidate.targetVersion}`;
  }

  private createCandidateKey(section: DependencySection, name: string): string {
    return `${section}:${name}`;
  }
}
