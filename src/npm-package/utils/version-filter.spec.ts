import {
  isPrereleaseVersion,
  isDeprecatedVersion,
  shouldIncludeVersion,
  filterVersions,
} from './version-filter';

describe('Version Filter', () => {
  describe('isPrereleaseVersion', () => {
    it('should return true for pre-release versions', () => {
      expect(isPrereleaseVersion('1.0.0-beta.1')).toBe(true);
      expect(isPrereleaseVersion('2.0.0-alpha')).toBe(true);
      expect(isPrereleaseVersion('1.0.0-rc.2')).toBe(true);
      expect(isPrereleaseVersion('3.0.0-next.0')).toBe(true);
    });

    it('should return false for stable versions', () => {
      expect(isPrereleaseVersion('1.0.0')).toBe(false);
      expect(isPrereleaseVersion('2.1.3')).toBe(false);
      expect(isPrereleaseVersion('0.0.1')).toBe(false);
    });

    it('should handle invalid semver gracefully', () => {
      expect(isPrereleaseVersion('latest')).toBe(false);
      expect(isPrereleaseVersion('invalid')).toBe(false);
    });
  });

  describe('isDeprecatedVersion', () => {
    it('should return true when deprecated field is present', () => {
      expect(
        isDeprecatedVersion({ deprecated: 'This version is deprecated' }),
      ).toBe(true);
      expect(isDeprecatedVersion({ deprecated: '' })).toBe(true);
    });

    it('should return false when deprecated field is missing', () => {
      expect(isDeprecatedVersion({})).toBe(false);
    });
  });

  describe('shouldIncludeVersion', () => {
    it('should include stable versions by default', () => {
      expect(shouldIncludeVersion('1.0.0', {})).toBe(true);
    });

    it('should exclude pre-release versions by default', () => {
      expect(shouldIncludeVersion('1.0.0-beta.1', {})).toBe(false);
    });

    it('should exclude deprecated versions by default', () => {
      expect(shouldIncludeVersion('1.0.0', { deprecated: 'old' })).toBe(false);
    });

    it('should include pre-release when includePrerelease is true', () => {
      expect(
        shouldIncludeVersion('1.0.0-beta.1', {}, { includePrerelease: true }),
      ).toBe(true);
    });

    it('should include deprecated when includeDeprecated is true', () => {
      expect(
        shouldIncludeVersion(
          '1.0.0',
          { deprecated: 'old' },
          { includeDeprecated: true },
        ),
      ).toBe(true);
    });

    it('should exclude when both conditions fail', () => {
      expect(shouldIncludeVersion('1.0.0-beta.1', { deprecated: 'old' })).toBe(
        false,
      );
    });
  });

  describe('filterVersions', () => {
    const versions = {
      '1.0.0': {},
      '1.1.0': { deprecated: 'Use 1.1.1 instead' },
      '1.2.0-beta.1': {},
      '1.2.0': {},
      '2.0.0-alpha': {},
    };

    it('should filter out pre-release and deprecated by default', () => {
      const result = filterVersions(versions);
      expect(result).toEqual(['1.0.0', '1.2.0']);
    });

    it('should include pre-release when configured', () => {
      const result = filterVersions(versions, { includePrerelease: true });
      expect(result).toContain('1.2.0-beta.1');
      expect(result).toContain('2.0.0-alpha');
      expect(result).not.toContain('1.1.0'); // still deprecated
    });

    it('should include deprecated when configured', () => {
      const result = filterVersions(versions, { includeDeprecated: true });
      expect(result).toContain('1.1.0');
      expect(result).not.toContain('1.2.0-beta.1'); // still prerelease
    });

    it('should include all when both options are true', () => {
      const result = filterVersions(versions, {
        includePrerelease: true,
        includeDeprecated: true,
      });
      expect(result).toHaveLength(5);
    });
  });
});
