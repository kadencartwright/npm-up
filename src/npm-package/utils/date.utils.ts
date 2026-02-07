import { PackageVersion } from '../types/index.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value: Date | string): Date {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    const displayValue = value instanceof Date ? value.toISOString() : value;
    throw new Error(`Invalid date: ${displayValue}`);
  }
  return date;
}

export function calculateAgeInDays(
  publishedAt: Date | string,
  referenceDate?: Date | string,
): number {
  const published = toDate(publishedAt);
  const reference = referenceDate ? toDate(referenceDate) : new Date();

  const diffMs = reference.getTime() - published.getTime();
  if (diffMs < 0) {
    return 0;
  }
  return Math.floor(diffMs / MS_PER_DAY);
}

export function createPackageVersion(
  version: string,
  publishedAt: Date | string,
  referenceDate?: Date | string,
): PackageVersion {
  const published = toDate(publishedAt);
  const ageInDays = calculateAgeInDays(published, referenceDate);

  return {
    version,
    publishedAt: published,
    ageInDays,
  };
}
