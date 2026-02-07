import { Injectable } from '@nestjs/common';
import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePagination,
  useState,
} from '@inquirer/core';
import { cursorHide } from '@inquirer/ansi';
import { DependencySection } from '../package-json/types';
import { UpgradeCandidate } from '../upgrade-candidate/types';

interface SelectUpgradeCandidatesConfig {
  message: string;
  choices: Array<{
    name: string;
    value: string;
    candidate: UpgradeCandidate;
    versionChoices: string[];
  }>;
  pageSize?: number;
  loop?: boolean;
}

interface PromptChoice {
  name: string;
  value: string;
  candidate: UpgradeCandidate;
  versionChoices: string[];
  checked: boolean;
  manualVersionSelected: boolean;
}

export interface CandidateSelectionResult {
  selectedCandidates: UpgradeCandidate[];
  manualVersionKeys: string[];
}

const selectUpgradeCandidatesPrompt = createPrompt<
  CandidateSelectionResult,
  SelectUpgradeCandidatesConfig
>((config, done) => {
  const pageSize = config.pageSize ?? 15;
  const loop = config.loop ?? false;
  const [items, setItems] = useState<PromptChoice[]>(
    config.choices.map((choice) => ({
      ...choice,
      candidate: choice.candidate,
      versionChoices: choice.versionChoices,
      checked: false,
      manualVersionSelected: false,
    })),
  );
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'packages' | 'versions'>('packages');
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  useKeypress((key) => {
    if (mode === 'versions') {
      const activeItem = items[active];
      const versionChoices = activeItem?.versionChoices ?? [];
      if (isUpKey(key) || isDownKey(key)) {
        if (versionChoices.length === 0) {
          return;
        }
        const delta = isUpKey(key) ? -1 : 1;
        if (loop) {
          setActiveVersionIndex(
            (activeVersionIndex + delta + versionChoices.length) %
              versionChoices.length,
          );
        } else {
          const nextIndex = activeVersionIndex + delta;
          if (nextIndex >= 0 && nextIndex < versionChoices.length) {
            setActiveVersionIndex(nextIndex);
          }
        }
        return;
      }

      if (isEnterKey(key)) {
        if (activeItem && versionChoices[activeVersionIndex]) {
          const selectedVersion = versionChoices[activeVersionIndex];
          setItems(
            items.map((item, index) => {
              if (index !== active) {
                return item;
              }
              return {
                ...item,
                checked: true,
                manualVersionSelected: true,
                candidate: {
                  ...item.candidate,
                  targetVersion: selectedVersion,
                },
              };
            }),
          );
        }
        setMode('packages');
        return;
      }

      if (key.name === 'escape' || key.name === 'v') {
        setMode('packages');
      }
      return;
    }

    if (isEnterKey(key)) {
      const selected = items.filter((item) => item.checked);
      setTimeout(() => {
        done({
          selectedCandidates: selected.map((item) => item.candidate),
          manualVersionKeys: selected
            .filter((item) => item.manualVersionSelected)
            .map((item) => item.value),
        });
      }, 0);
      return;
    }

    if (isUpKey(key) || isDownKey(key)) {
      if (
        loop ||
        (isUpKey(key) && active > 0) ||
        (isDownKey(key) && active < items.length - 1)
      ) {
        const delta = isUpKey(key) ? -1 : 1;
        setActive((active + delta + items.length) % items.length);
      }
      return;
    }

    if (isSpaceKey(key)) {
      setItems(
        items.map((item, index) => {
          if (index !== active) {
            return item;
          }
          const checked = !item.checked;
          return {
            ...item,
            checked,
            manualVersionSelected: checked ? item.manualVersionSelected : false,
            candidate: checked
              ? item.candidate
              : {
                  ...item.candidate,
                  targetVersion: item.candidate.targetVersion,
                },
          };
        }),
      );
      return;
    }

    if (key.name === 'v') {
      const activeItem = items[active];
      if (!activeItem) {
        return;
      }
      const initialIndex = Math.max(
        0,
        activeItem.versionChoices.findIndex(
          (version) => version === activeItem.candidate.targetVersion,
        ),
      );
      setActiveVersionIndex(initialIndex);
      setMode('versions');
      return;
    }

    if (isNumberKey(key)) {
      const selectedIndex = Number(key.name) - 1;
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        setActive(selectedIndex);
        setItems(
          items.map((item, index) => {
            if (index !== selectedIndex) {
              return item;
            }
            const checked = !item.checked;
            return {
              ...item,
              checked,
              manualVersionSelected: checked
                ? item.manualVersionSelected
                : false,
            };
          }),
        );
      }
    }
  });

  const page = usePagination({
    items,
    active,
    pageSize,
    loop,
    renderItem({ item, isActive }) {
      const cursor = isActive ? '>' : ' ';
      const checkboxIcon = item.checked ? '[x]' : '[ ]';
      const manual = item.manualVersionSelected ? ' (custom version)' : '';
      return `${cursor}${checkboxIcon} ${item.name} -> ${item.candidate.targetVersion}${manual}`;
    },
  });

  const activeItem = items[active];
  const versionPage = usePagination({
    items: activeItem?.versionChoices ?? [],
    active: activeVersionIndex,
    pageSize,
    loop,
    renderItem({ item, isActive }) {
      const cursor = isActive ? '>' : ' ';
      return `${cursor}${item}`;
    },
  });

  const lines = [
    mode === 'packages'
      ? config.message
      : `Select version for ${activeItem?.candidate.section}:${activeItem?.candidate.name}`,
    mode === 'packages' ? page : versionPage,
    ' ',
    mode === 'packages'
      ? 'keys: ↑↓ navigate • space select • v choose version • enter submit'
      : 'keys: ↑↓ navigate • enter choose • esc/v back',
  ]
    .filter(Boolean)
    .join('\n')
    .trimEnd();

  return `${lines}${cursorHide}`;
});

@Injectable()
export class CliPromptService {
  async selectCandidates(
    candidates: UpgradeCandidate[],
  ): Promise<CandidateSelectionResult> {
    return selectUpgradeCandidatesPrompt({
      message: 'Select dependencies to upgrade',
      choices: candidates.map((candidate) => ({
        name: this.formatCandidateLabel(candidate),
        value: this.createCandidateKey(candidate.section, candidate.name),
        candidate,
        versionChoices: this.buildVersionChoices(candidate).map((choice) =>
          this.parseVersionFromChoiceKey(choice.value),
        ),
      })),
      pageSize: 15,
      loop: false,
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

  async confirmUseRecommendedVersions(): Promise<boolean> {
    const { confirm } = await import('@inquirer/prompts');
    return confirm({
      message: 'Use recommended versions for all selected packages?',
      default: true,
    });
  }

  async selectTargetVersions(
    candidates: UpgradeCandidate[],
  ): Promise<UpgradeCandidate[]> {
    const { select } = await import('@inquirer/prompts');
    const customized: UpgradeCandidate[] = [];

    for (const candidate of candidates) {
      const choices = this.buildVersionChoices(candidate);
      const selectedKey = await select({
        message: `Select target version for ${candidate.section}:${candidate.name}`,
        choices,
        pageSize: 15,
        loop: false,
      });

      customized.push({
        ...candidate,
        targetVersion: this.parseVersionFromChoiceKey(selectedKey),
      });
    }

    return customized;
  }

  private formatCandidateLabel(candidate: UpgradeCandidate): string {
    return `${candidate.section} | ${candidate.name} | ${candidate.wantedRange} -> ${candidate.targetVersion}`;
  }

  private createCandidateKey(section: DependencySection, name: string): string {
    return `${section}:${name}`;
  }

  private buildVersionChoices(candidate: UpgradeCandidate): Array<{
    name: string;
    value: string;
  }> {
    const eligibleVersions =
      candidate.eligibleVersions && candidate.eligibleVersions.length > 0
        ? candidate.eligibleVersions
        : [candidate.targetVersion];

    const selectedVersions = new Set(eligibleVersions.slice(0, 10));
    selectedVersions.add(candidate.targetVersion);

    if (
      candidate.currentBaselineVersion &&
      eligibleVersions.includes(candidate.currentBaselineVersion)
    ) {
      selectedVersions.add(candidate.currentBaselineVersion);
    }

    return eligibleVersions
      .filter((version) => selectedVersions.has(version))
      .map((version) => {
        const tags: string[] = [];
        if (version === candidate.targetVersion) {
          tags.push('recommended');
        }
        if (version === candidate.currentBaselineVersion) {
          tags.push('current range baseline');
        }
        const suffix = tags.length > 0 ? ` (${tags.join(', ')})` : '';
        return {
          name: `${version}${suffix}`,
          value: this.createVersionChoiceKey(
            candidate.section,
            candidate.name,
            version,
          ),
        };
      });
  }

  private createVersionChoiceKey(
    section: DependencySection,
    name: string,
    version: string,
  ): string {
    return `${section}:${name}:${version}`;
  }

  private parseVersionFromChoiceKey(choiceKey: string): string {
    const segments = choiceKey.split(':');
    return segments[segments.length - 1] ?? choiceKey;
  }
}
