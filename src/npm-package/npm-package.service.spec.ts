import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { NpmPackageService } from './npm-package.service';
import { PackageNotFoundError } from './errors/package-not-found.error';
import { NetworkError } from './errors/network.error';
import { VersionNotFoundError } from './errors/version-not-found.error';
import { PackageVersion } from './types';

describe('NpmPackageService', () => {
  const httpService = { get: jest.fn() };
  const cacheManager = {};
  const configService = { get: jest.fn() };

  async function createService(): Promise<NpmPackageService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NpmPackageService,
        { provide: HttpService, useValue: httpService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    return moduleRef.get(NpmPackageService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves when constructor dependencies are provided', async () => {
    await expect(createService()).resolves.toBeDefined();
  });

  it('fetches package metadata using default registry URL and timeout', async () => {
    const service = await createService();
    const metadata = { name: 'lodash', versions: {}, time: {} };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(service.fetchPackageMetadata('lodash')).resolves.toEqual(
      metadata,
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://registry.npmjs.org/lodash',
      {
        timeout: 10000,
      },
    );
  });

  it('uses configured registry URL and timeout', async () => {
    const service = await createService();
    const metadata = { name: 'react', versions: {}, time: {} };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => {
        if (key === 'NPM_REGISTRY_URL') {
          return 'https://custom.registry.local/';
        }
        if (key === 'NPM_TIMEOUT') {
          return 2500;
        }
        return defaultValue;
      },
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await service.fetchPackageMetadata('react');
    expect(httpService.get).toHaveBeenCalledWith(
      'https://custom.registry.local/react',
      {
        timeout: 2500,
      },
    );
  });

  it('encodes scoped package names in request URL', async () => {
    const service = await createService();

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: { name: '@scope/pkg' } }));

    await service.fetchPackageMetadata('@scope/pkg');
    expect(httpService.get).toHaveBeenCalledWith(
      'https://registry.npmjs.org/%40scope%2Fpkg',
      {
        timeout: 10000,
      },
    );
  });

  it('throws PackageNotFoundError for npm 404 responses', async () => {
    const service = await createService();

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(
      throwError(() => ({
        response: { status: 404 },
      })),
    );

    await expect(
      service.fetchPackageMetadata('missing-pkg'),
    ).rejects.toBeInstanceOf(PackageNotFoundError);
  });

  it('throws NetworkError for non-404 request failures', async () => {
    const service = await createService();

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(
      throwError(() => new Error('Connection timeout')),
    );

    await expect(service.fetchPackageMetadata('lodash')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('returns age in days for an existing stable version', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.0.0': {},
      },
      time: {
        '1.0.0': '2025-01-10T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(service.getVersionAge('example-pkg', '1.0.0')).resolves.toBe(
      15,
    );
    jest.useRealTimers();
  });

  it('throws VersionNotFoundError when the version does not exist', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.0.0': {},
      },
      time: {
        '1.0.0': '2025-01-10T00:00:00.000Z',
      },
    };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getVersionAge('example-pkg', '2.0.0'),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it('excludes prerelease versions by default', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '2.0.0-beta.1': {},
      },
      time: {
        '2.0.0-beta.1': '2025-01-10T00:00:00.000Z',
      },
    };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getVersionAge('example-pkg', '2.0.0-beta.1'),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it('includes prerelease versions when enabled by config', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '2.0.0-beta.1': {},
      },
      time: {
        '2.0.0-beta.1': '2025-01-10T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-20T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => {
        if (key === 'NPM_INCLUDE_PRERELEASE') {
          return true;
        }
        return defaultValue;
      },
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getVersionAge('example-pkg', '2.0.0-beta.1'),
    ).resolves.toBe(10);
    jest.useRealTimers();
  });

  it('excludes deprecated versions by default', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.5.0': { deprecated: 'Use 2.x' },
      },
      time: {
        '1.5.0': '2025-01-10T00:00:00.000Z',
      },
    };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getVersionAge('example-pkg', '1.5.0'),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it('includes deprecated versions when configured with env string true', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.5.0': { deprecated: 'Use 2.x' },
      },
      time: {
        '1.5.0': '2025-01-10T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-20T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => {
        if (key === 'NPM_INCLUDE_DEPRECATED') {
          return 'true';
        }
        return defaultValue;
      },
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(service.getVersionAge('example-pkg', '1.5.0')).resolves.toBe(
      10,
    );
    jest.useRealTimers();
  });

  it('returns the most recent stable version by default', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.0.0': {},
        '1.1.0': { deprecated: 'avoid' },
        '1.2.0-beta.1': {},
        '1.2.0': {},
      },
      time: {
        '1.0.0': '2025-01-01T00:00:00.000Z',
        '1.1.0': '2025-01-10T00:00:00.000Z',
        '1.2.0-beta.1': '2025-01-20T00:00:00.000Z',
        '1.2.0': '2025-01-15T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersion('example-pkg'),
    ).resolves.toEqual<PackageVersion>({
      version: '1.2.0',
      publishedAt: new Date('2025-01-15T00:00:00.000Z'),
      ageInDays: 10,
    });
    jest.useRealTimers();
  });

  it('includes prerelease and deprecated versions when both are enabled', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.2.0': {},
        '1.3.0-beta.1': { deprecated: 'replace' },
      },
      time: {
        '1.2.0': '2025-01-10T00:00:00.000Z',
        '1.3.0-beta.1': '2025-01-20T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => {
        if (
          key === 'NPM_INCLUDE_PRERELEASE' ||
          key === 'NPM_INCLUDE_DEPRECATED'
        ) {
          return true;
        }
        return defaultValue;
      },
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersion('example-pkg'),
    ).resolves.toEqual<PackageVersion>({
      version: '1.3.0-beta.1',
      publishedAt: new Date('2025-01-20T00:00:00.000Z'),
      ageInDays: 5,
    });
    jest.useRealTimers();
  });

  it('throws VersionNotFoundError when no versions remain after filtering', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '2.0.0-beta.1': {},
        '1.5.0': { deprecated: 'old' },
      },
      time: {
        '2.0.0-beta.1': '2025-01-20T00:00:00.000Z',
        '1.5.0': '2025-01-10T00:00:00.000Z',
      },
    };

    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersion('example-pkg'),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it('returns latest version that is at least N days old', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.0.0': {},
        '1.1.0': {},
        '1.2.0': {},
      },
      time: {
        '1.0.0': '2025-01-01T00:00:00.000Z',
        '1.1.0': '2025-01-10T00:00:00.000Z',
        '1.2.0': '2025-01-20T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersionAtLeastNDaysOld('example-pkg', 10),
    ).resolves.toEqual<PackageVersion>({
      version: '1.1.0',
      publishedAt: new Date('2025-01-10T00:00:00.000Z'),
      ageInDays: 15,
    });
    jest.useRealTimers();
  });

  it('returns null when no eligible version meets the minimum age', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.2.0': {},
      },
      time: {
        '1.2.0': '2025-01-20T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersionAtLeastNDaysOld('example-pkg', 10),
    ).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('applies filtering before age selection', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        '1.0.0': {},
        '2.0.0-beta.1': {},
      },
      time: {
        '1.0.0': '2025-01-01T00:00:00.000Z',
        '2.0.0-beta.1': '2025-01-10T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersionAtLeastNDaysOld('example-pkg', 5),
    ).resolves.toEqual<PackageVersion>({
      version: '1.0.0',
      publishedAt: new Date('2025-01-01T00:00:00.000Z'),
      ageInDays: 24,
    });
    jest.useRealTimers();
  });

  it('ignores invalid semver entries when selecting latest version', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        foo: {},
        '1.2.0': {},
      },
      time: {
        foo: '2025-01-20T00:00:00.000Z',
        '1.2.0': '2025-01-10T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersion('example-pkg'),
    ).resolves.toEqual<PackageVersion>({
      version: '1.2.0',
      publishedAt: new Date('2025-01-10T00:00:00.000Z'),
      ageInDays: 15,
    });
    jest.useRealTimers();
  });

  it('ignores invalid semver entries for N-days-old lookup', async () => {
    const service = await createService();
    const metadata = {
      name: 'example-pkg',
      versions: {
        foo: {},
        '1.1.0': {},
      },
      time: {
        foo: '2025-01-20T00:00:00.000Z',
        '1.1.0': '2025-01-05T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) => defaultValue,
    );
    httpService.get.mockReturnValue(of({ data: metadata }));

    await expect(
      service.getLatestVersionAtLeastNDaysOld('example-pkg', 10),
    ).resolves.toEqual<PackageVersion>({
      version: '1.1.0',
      publishedAt: new Date('2025-01-05T00:00:00.000Z'),
      ageInDays: 20,
    });
    jest.useRealTimers();
  });
});
