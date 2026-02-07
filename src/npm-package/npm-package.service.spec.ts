import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NpmPackageService } from './npm-package.service';

describe('NpmPackageService', () => {
  it('resolves when constructor dependencies are provided', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NpmPackageService,
        { provide: HttpService, useValue: {} },
        { provide: CACHE_MANAGER, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(NpmPackageService)).toBeDefined();
  });
});
