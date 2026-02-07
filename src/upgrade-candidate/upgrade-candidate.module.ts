import { Module } from '@nestjs/common';
import { NpmPackageModule } from '../npm-package/npm-package.module';
import { PackageJsonModule } from '../package-json/package-json.module';
import { UpgradeCandidateService } from './upgrade-candidate.service';

@Module({
  imports: [PackageJsonModule, NpmPackageModule],
  providers: [UpgradeCandidateService],
  exports: [UpgradeCandidateService],
})
export class UpgradeCandidateModule {}
