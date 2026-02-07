import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { NpmPackageService } from './npm-package.service';
import { PackageNotFoundError } from './errors/package-not-found.error';
import { NetworkError } from './errors/network.error';

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

    configService.get.mockImplementation((key: string, defaultValue: unknown) =>
      defaultValue,
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

    configService.get.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'NPM_REGISTRY_URL') {
        return 'https://custom.registry.local/';
      }
      if (key === 'NPM_TIMEOUT') {
        return 2500;
      }
      return defaultValue;
    });
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

    configService.get.mockImplementation((key: string, defaultValue: unknown) =>
      defaultValue,
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

    configService.get.mockImplementation((key: string, defaultValue: unknown) =>
      defaultValue,
    );
    httpService.get.mockReturnValue(
      throwError(() => ({
        response: { status: 404 },
      })),
    );

    await expect(service.fetchPackageMetadata('missing-pkg')).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
  });

  it('throws NetworkError for non-404 request failures', async () => {
    const service = await createService();

    configService.get.mockImplementation((key: string, defaultValue: unknown) =>
      defaultValue,
    );
    httpService.get.mockReturnValue(
      throwError(() => new Error('Connection timeout')),
    );

    await expect(service.fetchPackageMetadata('lodash')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});
