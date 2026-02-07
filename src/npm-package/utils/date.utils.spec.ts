import { describe, it, expect } from 'vitest';
import { calculateAgeInDays, createPackageVersion } from './date.utils';
import { PackageVersion } from '../types/index.js';

describe('calculateAgeInDays', () => {
  it('returns 0 for a date that is today', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const publishedAt = new Date('2025-06-15T08:00:00Z');
    expect(calculateAgeInDays(publishedAt, now)).toBe(0);
  });

  it('returns 1 for a date published exactly 1 day ago', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const publishedAt = new Date('2025-06-14T12:00:00Z');
    expect(calculateAgeInDays(publishedAt, now)).toBe(1);
  });

  it('returns correct number of days for a date many days ago', () => {
    const now = new Date('2025-06-15T00:00:00Z');
    const publishedAt = new Date('2025-01-01T00:00:00Z');
    // Jan 1 00:00 to Jun 15 00:00 = 165 full days elapsed
    // (31 Jan + 28 Feb + 31 Mar + 30 Apr + 31 May + 14 remaining) = 165
    expect(calculateAgeInDays(publishedAt, now)).toBe(165);
  });

  it('floors partial days (returns whole days only)', () => {
    const now = new Date('2025-06-15T23:59:59Z');
    const publishedAt = new Date('2025-06-14T00:00:01Z');
    // Just under 2 full days, should return 1
    expect(calculateAgeInDays(publishedAt, now)).toBe(1);
  });

  it('accepts ISO 8601 string as publishedAt', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    expect(calculateAgeInDays('2025-06-10T12:00:00Z', now)).toBe(5);
  });

  it('accepts ISO 8601 string as referenceDate', () => {
    const publishedAt = new Date('2025-06-10T12:00:00Z');
    expect(calculateAgeInDays(publishedAt, '2025-06-15T12:00:00Z')).toBe(5);
  });

  it('uses current date as default reference when not provided', () => {
    // Publish date far in the past, age should be > 0
    const publishedAt = new Date('2020-01-01T00:00:00Z');
    const age = calculateAgeInDays(publishedAt);
    expect(age).toBeGreaterThan(0);
  });

  it('returns 0 when publishedAt is in the future relative to reference', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const publishedAt = new Date('2025-06-20T12:00:00Z');
    expect(calculateAgeInDays(publishedAt, now)).toBe(0);
  });

  it('throws for an invalid date string', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    expect(() => calculateAgeInDays('not-a-date', now)).toThrow(
      'Invalid date: not-a-date',
    );
  });
});

describe('createPackageVersion', () => {
  it('creates a PackageVersion with correct version string', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const result = createPackageVersion('1.2.3', '2025-06-10T12:00:00Z', now);
    expect(result.version).toBe('1.2.3');
  });

  it('creates a PackageVersion with publishedAt as a Date object', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const result = createPackageVersion('1.2.3', '2025-06-10T12:00:00Z', now);
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(result.publishedAt.toISOString()).toBe('2025-06-10T12:00:00.000Z');
  });

  it('computes ageInDays correctly', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const result = createPackageVersion('1.2.3', '2025-06-10T12:00:00Z', now);
    expect(result.ageInDays).toBe(5);
  });

  it('accepts a Date object as publishedAt', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const publishDate = new Date('2025-06-05T12:00:00Z');
    const result = createPackageVersion('2.0.0', publishDate, now);
    expect(result.ageInDays).toBe(10);
    expect(result.publishedAt).toEqual(publishDate);
  });

  it('returns a properly typed PackageVersion object', () => {
    const now = new Date('2025-06-15T12:00:00Z');
    const result: PackageVersion = createPackageVersion(
      '3.1.4',
      '2025-06-01T00:00:00Z',
      now,
    );
    expect(result).toEqual({
      version: '3.1.4',
      publishedAt: new Date('2025-06-01T00:00:00Z'),
      ageInDays: 14,
    });
  });
});
