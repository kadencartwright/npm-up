import { PackageJsonParseError } from './package-json-parse.error';

export class InvalidPackageJsonError extends PackageJsonParseError {
  constructor(sourceLabel?: string, cause?: unknown) {
    const location = sourceLabel ? ` in '${sourceLabel}'` : '';
    super(`Invalid package.json JSON${location}`, sourceLabel);
    this.name = 'InvalidPackageJsonError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
    Object.setPrototypeOf(this, InvalidPackageJsonError.prototype);
  }
}
