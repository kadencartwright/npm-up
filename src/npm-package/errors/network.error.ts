import { NpmPackageError } from './npm-package.error';

export class NetworkError extends NpmPackageError {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(`Network error: ${message}`, 503);
    this.name = 'NetworkError';
    this.cause = cause;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
