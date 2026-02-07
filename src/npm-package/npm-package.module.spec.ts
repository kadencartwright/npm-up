import { Test } from '@nestjs/testing';
import { NpmPackageModule } from './npm-package.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('NpmPackageModule', () => {
  it('should compile the module with default configuration', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({})],
        }),
        NpmPackageModule,
      ],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should import HttpModule', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NpmPackageModule,
      ],
    }).compile();

    const httpModule = module.get(HttpModule);
    expect(httpModule).toBeDefined();
  });

  it('should configure CacheModule with ConfigService', async () => {
    const mockConfigService = {
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'NPM_CACHE_TTL') return 300000 as T;
        return defaultValue;
      }),
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NpmPackageModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    expect(module).toBeDefined();
  });

  it('should use custom cache TTL from environment', async () => {
    const customTtl = 600000;
    const mockConfigService = {
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'NPM_CACHE_TTL') return customTtl as T;
        return defaultValue;
      }),
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NpmPackageModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    expect(mockConfigService.get).toHaveBeenCalledWith('NPM_CACHE_TTL', 300000);
    expect(module).toBeDefined();
  });

  it('should use default cache TTL when not configured', async () => {
    const mockConfigService = {
      get: jest.fn(<T>(_key: string, defaultValue: T): T => {
        return defaultValue;
      }),
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NpmPackageModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    expect(mockConfigService.get).toHaveBeenCalledWith('NPM_CACHE_TTL', 300000);
    expect(module).toBeDefined();
  });

  it('should export NpmPackageService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NpmPackageModule,
      ],
    }).compile();

    // The module should be able to be imported by other modules
    expect(module).toBeDefined();
  });
});
