export { NpmPackageModule } from './npm-package/npm-package.module';
export { PackageJsonModule } from './package-json/package-json.module';
export { UpgradeCandidateModule } from './upgrade-candidate/upgrade-candidate.module';
export { UpgradeCandidateService } from './upgrade-candidate/upgrade-candidate.service';
export { PackageJsonService } from './package-json/package-json.service';
export type {
  DependencySection,
  ParseOptions,
  ParsedDependency,
} from './package-json/types';
export type {
  CandidateError,
  CandidateStrategy,
  FindUpgradeCandidatesOptions,
  FindUpgradeCandidatesResult,
  SkippedDependency,
  UpgradeCandidate,
} from './upgrade-candidate/types';
