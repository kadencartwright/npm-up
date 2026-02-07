import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import * as semver from 'semver';
import { NetworkError } from './errors/network.error';
import { PackageNotFoundError } from './errors/package-not-found.error';
import { VersionNotFoundError } from './errors/version-not-found.error';
import { calculateAgeInDays, createPackageVersion } from './utils/date.utils';
import { shouldIncludeVersion } from './utils/version-filter';
import { PackageVersion } from './types';

export interface NpmVersionMetadata {
  deprecated?: string;
}

export interface NpmPackageMetadata {
  name: string;
  versions: Record<string, NpmVersionMetadata>;
  time: Record<string, string>;
}

@Injectable()
export class NpmPackageService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async fetchPackageMetadata(packageName: string): Promise<NpmPackageMetadata> {
    const registryUrl = this.configService.get<string>(
      'NPM_REGISTRY_URL',
      'https://registry.npmjs.org',
    );
    const timeout = this.configService.get<number>('NPM_TIMEOUT', 10000);
    const encodedPackageName = encodeURIComponent(packageName);
    const normalizedRegistryUrl = registryUrl.replace(/\/+$/, '');
    const requestUrl = `${normalizedRegistryUrl}/${encodedPackageName}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<NpmPackageMetadata>(requestUrl, { timeout }),
      );
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status === 404) {
        throw new PackageNotFoundError(packageName);
      }
      const message = error instanceof Error ? error.message : 'Request failed';
      throw new NetworkError(message, error instanceof Error ? error : undefined);
    }
  }

  async getVersionAge(packageName: string, version: string): Promise<number> {
    const metadata = await this.fetchPackageMetadata(packageName);
    const versionMetadata = metadata.versions[version];
    const publishedAt = metadata.time[version];

    if (!versionMetadata || !publishedAt) {
      throw new VersionNotFoundError(packageName, version);
    }

    const includePrerelease = this.readBooleanConfig('NPM_INCLUDE_PRERELEASE');
    const includeDeprecated = this.readBooleanConfig('NPM_INCLUDE_DEPRECATED');
    const isIncluded = shouldIncludeVersion(version, versionMetadata, {
      includePrerelease,
      includeDeprecated,
    });

    if (!isIncluded) {
      throw new VersionNotFoundError(packageName, version);
    }

    return calculateAgeInDays(publishedAt);
  }

  async getLatestVersion(packageName: string): Promise<PackageVersion> {
    const metadata = await this.fetchPackageMetadata(packageName);
    const includePrerelease = this.readBooleanConfig('NPM_INCLUDE_PRERELEASE');
    const includeDeprecated = this.readBooleanConfig('NPM_INCLUDE_DEPRECATED');

    const latestVersion = Object.keys(metadata.versions)
      .filter((version) => {
        const versionMetadata = metadata.versions[version];
        const publishedAt = metadata.time[version];
        if (!versionMetadata || !publishedAt) {
          return false;
        }
        return shouldIncludeVersion(version, versionMetadata, {
          includePrerelease,
          includeDeprecated,
        });
      })
      .sort((a, b) => semver.rcompare(a, b))[0];

    if (!latestVersion) {
      throw new VersionNotFoundError(packageName, 'latest');
    }

    return createPackageVersion(latestVersion, metadata.time[latestVersion]);
  }

  private readBooleanConfig(key: string): boolean {
    const value = this.configService.get<boolean | string>(key, false);
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 'true';
  }
}
