import * as semver from 'semver';

export interface VersionFilterOptions {
  includePrerelease?: boolean;
  includeDeprecated?: boolean;
}

export interface VersionMetadata {
  deprecated?: string;
}

export function isPrereleaseVersion(version: string): boolean {
  const parsed = semver.parse(version);
  return parsed !== null && parsed.prerelease.length > 0;
}

export function isDeprecatedVersion(metadata: VersionMetadata): boolean {
  return metadata.deprecated !== undefined;
}

export function shouldIncludeVersion(
  version: string,
  metadata: VersionMetadata,
  options: VersionFilterOptions = {},
): boolean {
  const { includePrerelease = false, includeDeprecated = false } = options;

  const isPrerelease = isPrereleaseVersion(version);
  const isDeprecated = isDeprecatedVersion(metadata);

  if (isPrerelease && !includePrerelease) {
    return false;
  }

  if (isDeprecated && !includeDeprecated) {
    return false;
  }

  return true;
}

export function filterVersions(
  versions: Record<string, VersionMetadata>,
  options: VersionFilterOptions = {},
): string[] {
  return Object.entries(versions)
    .filter(([version, metadata]) =>
      shouldIncludeVersion(version, metadata, options),
    )
    .map(([version]) => version);
}
