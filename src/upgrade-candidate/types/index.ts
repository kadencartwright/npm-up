import { DependencySection } from '../../package-json/types';

export type CandidateStrategy =
  | { kind: 'latest' }
  | { kind: 'minAge'; minAgeDays: number };

export interface FindUpgradeCandidatesOptions {
  strategy?: CandidateStrategy;
  sourceLabel?: string;
  concurrency?: number;
}

export interface UpgradeCandidate {
  name: string;
  section: DependencySection;
  wantedRange: string;
  targetVersion: string;
  criterion: 'latest' | 'minAge';
  minAgeDays?: number;
  sourceLabel?: string;
  reason: 'target_not_satisfied_by_range';
}

export interface SkippedDependency {
  name: string;
  section: DependencySection;
  wantedRange: string;
  sourceLabel?: string;
  reason: 'non_semver_specifier' | 'no_eligible_target_for_min_age';
}

export interface CandidateError {
  name: string;
  section: DependencySection;
  wantedRange: string;
  sourceLabel?: string;
  reason: 'package_not_found' | 'network_error' | 'unknown_error';
  message: string;
}

export interface FindUpgradeCandidatesResult {
  candidates: UpgradeCandidate[];
  skipped: SkippedDependency[];
  errors: CandidateError[];
}
