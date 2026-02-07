import { NpmPackageError } from './npm-package.error';

export class PackageNotFoundError extends NpmPackageError {
  readonly packageName: string;

  constructor(packageName: string) {
    super(`Package '${packageName}' not found`, 404);
    this.name = 'PackageNotFoundError';
    this.packageName = packageName;
    Object.setPrototypeOf(this, PackageNotFoundError.prototype);
  }
}
