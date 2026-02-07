export class PackageJsonParseError extends Error {
  readonly sourceLabel?: string;

  constructor(message: string, sourceLabel?: string) {
    super(message);
    this.name = 'PackageJsonParseError';
    this.sourceLabel = sourceLabel;
    Object.setPrototypeOf(this, PackageJsonParseError.prototype);
  }
}
