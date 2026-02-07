import { describe, it, expect } from 'vitest';
import { UpgradeCandidateModule } from './upgrade-candidate/upgrade-candidate.module';
import { UpgradeCandidateService } from './upgrade-candidate/upgrade-candidate.service';
import { NpmPackageModule, PackageJsonModule } from './index';

describe('index exports', () => {
  it('exports service modules and services', () => {
    expect(NpmPackageModule).toBeDefined();
    expect(PackageJsonModule).toBeDefined();
    expect(UpgradeCandidateModule).toBeDefined();
    expect(UpgradeCandidateService).toBeDefined();
  });
});
