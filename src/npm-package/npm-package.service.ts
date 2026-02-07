import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { NetworkError } from './errors/network.error';
import { PackageNotFoundError } from './errors/package-not-found.error';

export interface NpmPackageMetadata {
  name: string;
  versions: Record<string, unknown>;
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
}
