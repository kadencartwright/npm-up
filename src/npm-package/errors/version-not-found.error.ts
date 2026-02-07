import { NpmPackageError } from './npm-package.error';

export class VersionNotFoundError extends NpmPackageError {
  readonly packageName: string;
  readonly version: string;

  constructor(packageName: string, version: string) {
    super(`Version '${version}' of package '${packageName}' not found`, 404);
    this.name = 'VersionNotFoundError';
    this.packageName = packageName;
    this.version = version;
    Object.setPrototypeOf(this, VersionNotFoundError.prototype);
  }
}
