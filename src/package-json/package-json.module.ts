import { Module } from '@nestjs/common';
import { PackageJsonService } from './package-json.service';

@Module({
  providers: [PackageJsonService],
  exports: [PackageJsonService],
})
export class PackageJsonModule {}
