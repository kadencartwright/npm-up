export class NpmPackageError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'NpmPackageError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NpmPackageError.prototype);
  }
}
