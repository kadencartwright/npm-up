import { Test } from '@nestjs/testing';
import { NpmPackageService } from '../npm-package/npm-package.service';
import { PackageJsonService } from '../package-json/package-json.service';
import { NetworkError } from '../npm-package/errors/network.error';
import { PackageNotFoundError } from '../npm-package/errors/package-not-found.error';
import { UpgradeCandidateService } from './upgrade-candidate.service';

describe('UpgradeCandidateService', () => {
  const npmPackageService = {
    getLatestVersion: jest.fn(),
    getLatestVersionAtLeastNDaysOld: jest.fn(),
  };

  async function createService(): Promise<UpgradeCandidateService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpgradeCandidateService,
        PackageJsonService,
        { provide: NpmPackageService, useValue: npmPackageService },
      ],
    }).compile();

    return moduleRef.get(UpgradeCandidateService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns candidates when latest version is outside the wanted range', async () => {
    const service = await createService();

    npmPackageService.getLatestVersion.mockImplementation((name: string) => {
      if (name === 'react') {
        return Promise.resolve({
          version: '19.0.0',
          publishedAt: new Date('2025-01-01T00:00:00.000Z'),
          ageInDays: 30,
        });
      }
      if (name === 'rxjs') {
        return Promise.resolve({
          version: '7.8.1',
          publishedAt: new Date('2025-01-01T00:00:00.000Z'),
          ageInDays: 30,
        });
      }
      throw new Error('unexpected package lookup');
    });

    const result = await service.findCandidates({
      dependencies: {
        react: '^18.3.0',
        rxjs: '^7.8.0',
      },
    });

    expect(result).toEqual({
      candidates: [
        {
          name: 'react',
          section: 'dependencies',
          wantedRange: '^18.3.0',
          targetVersion: '19.0.0',
          criterion: 'latest',
          reason: 'target_not_satisfied_by_range',
        },
      ],
      skipped: [],
      errors: [],
    });
  });

  it('skips non-semver dependency specifiers with a reason', async () => {
    const service = await createService();

    const result = await service.findCandidates({
      dependencies: {
        localLib: 'file:../local-lib',
        workspaceLib: 'workspace:*',
      },
    });

    expect(result).toEqual({
      candidates: [],
      skipped: [
        {
          name: 'localLib',
          section: 'dependencies',
          wantedRange: 'file:../local-lib',
          reason: 'non_semver_specifier',
        },
        {
          name: 'workspaceLib',
          section: 'dependencies',
          wantedRange: 'workspace:*',
          reason: 'non_semver_specifier',
        },
      ],
      errors: [],
    });
    expect(npmPackageService.getLatestVersion).not.toHaveBeenCalled();
  });

  it('returns partial results when one package lookup fails', async () => {
    const service = await createService();

    npmPackageService.getLatestVersion.mockImplementation((name: string) => {
      if (name === 'ok-pkg') {
        return Promise.resolve({
          version: '2.0.0',
          publishedAt: new Date('2025-01-01T00:00:00.000Z'),
          ageInDays: 30,
        });
      }
      if (name === 'missing-pkg') {
        return Promise.reject(new PackageNotFoundError('missing-pkg'));
      }
      if (name === 'flaky-pkg') {
        return Promise.reject(new NetworkError('timeout'));
      }
      throw new Error('unexpected package lookup');
    });

    const result = await service.findCandidates({
      dependencies: {
        'ok-pkg': '^1.0.0',
        'missing-pkg': '^1.0.0',
        'flaky-pkg': '^1.0.0',
      },
    });

    expect(result).toEqual({
      candidates: [
        {
          name: 'ok-pkg',
          section: 'dependencies',
          wantedRange: '^1.0.0',
          targetVersion: '2.0.0',
          criterion: 'latest',
          reason: 'target_not_satisfied_by_range',
        },
      ],
      skipped: [],
      errors: [
        {
          name: 'missing-pkg',
          section: 'dependencies',
          wantedRange: '^1.0.0',
          reason: 'package_not_found',
          message: "Package 'missing-pkg' not found",
        },
        {
          name: 'flaky-pkg',
          section: 'dependencies',
          wantedRange: '^1.0.0',
          reason: 'network_error',
          message: 'Network error: timeout',
        },
      ],
    });
  });
});
