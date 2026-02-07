import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NpmPackageService } from './npm-package.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('NPM_CACHE_TTL', 300000),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NpmPackageService],
  exports: [NpmPackageService],
})
export class NpmPackageModule {}
