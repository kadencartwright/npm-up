import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UpgradeCandidateModule } from '../upgrade-candidate/upgrade-candidate.module';
import { NpmPackageModule } from '../npm-package/npm-package.module';
import { CliPromptService } from './cli-prompt.service';
import { UpgradeCommand } from './commands/upgrade.command';
import { PackageJsonLocatorService } from './package-json-locator.service';
import { PackageJsonWriterService } from './package-json-writer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UpgradeCandidateModule,
    NpmPackageModule,
  ],
  providers: [
    UpgradeCommand,
    PackageJsonLocatorService,
    PackageJsonWriterService,
    CliPromptService,
  ],
})
export class CliModule {}
