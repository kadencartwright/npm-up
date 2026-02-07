import { PackageJsonParseError } from './package-json-parse.error';

export class InvalidDependenciesShapeError extends PackageJsonParseError {
  constructor(section: string, sourceLabel?: string) {
    const location = sourceLabel ? ` in '${sourceLabel}'` : '';
    super(
      `Invalid ${section} section in package.json${location}: expected object<string, string>`,
      sourceLabel,
    );
    this.name = 'InvalidDependenciesShapeError';
    Object.setPrototypeOf(this, InvalidDependenciesShapeError.prototype);
  }
}
